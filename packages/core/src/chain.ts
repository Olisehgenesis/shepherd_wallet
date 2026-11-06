import {
  encodeDeployData,
  encodeFunctionData,
  decodeFunctionResult,
  numberToHex,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { accountAbi, policyAbi, stakeAbi, vaultAbi } from "./abi.js";
import { bytecode } from "./bytecode.js";
import {
  ACCOUNT_FUND_WEI,
  CHAIN_ID,
  ETHREX_URL,
  FUND_AMOUNT_WEI,
  FUND_TRANSFER_GAS,
  GATEWAY_URL,
  LEGACY_GAS,
  LEGACY_GAS_PRICE,
  SHARED_FUNDER,
  SHARED_FUNDER_KEY,
  STAKING_REGISTRY,
} from "./config.js";
import { rpc, sleep } from "./rpc.js";

export async function chainId(): Promise<number> {
  return Number(await rpc("eth_chainId", [], ETHREX_URL));
}

/** Latest ethrex block number and age. Used to fail fast when the public chain is stalled. */
export async function latestBlock(): Promise<{ number: bigint; ageSec: number }> {
  const block = (await rpc("eth_getBlockByNumber", ["latest", false], ETHREX_URL)) as {
    number?: string;
    timestamp?: string;
  } | null;
  if (!block?.number || !block.timestamp) throw new Error("ethrex returned no latest block");
  const number = BigInt(block.number);
  const ageSec = Math.max(0, Math.floor(Date.now() / 1000) - Number(block.timestamp));
  return { number, ageSec };
}

/** Throw if ethrex has not produced a block recently (funding/deploys cannot finish). */
export async function assertChainLive(maxAgeSec = 120): Promise<void> {
  const { number, ageSec } = await latestBlock();
  if (ageSec > maxAgeSec) {
    throw new Error(
      `Public ethrex is not mining — latest block ${number.toString()} is ${ageSec}s old. Funding and Prepare cannot finish until the stall clears. Check https://explorer.altmempool.wtf/ and retry.`,
    );
  }
}

export async function balance(address: Address): Promise<bigint> {
  return BigInt((await rpc("eth_getBalance", [address, "latest"], ETHREX_URL)) as string);
}

export async function code(address: Address): Promise<Hex> {
  return (await rpc("eth_getCode", [address, "latest"], ETHREX_URL)) as Hex;
}

export async function nonce(address: Address): Promise<bigint> {
  return BigInt((await rpc("eth_getTransactionCount", [address, "pending"], ETHREX_URL)) as string);
}

async function networkGasPrice(): Promise<bigint> {
  try {
    const hex = (await rpc("eth_gasPrice", [], ETHREX_URL)) as string;
    const network = BigInt(hex);
    return network > LEGACY_GAS_PRICE ? network : LEGACY_GAS_PRICE;
  } catch {
    return LEGACY_GAS_PRICE;
  }
}

/**
 * Fund `to` from the published genesis key.
 * Docs (Public devnet): there is no faucet — fund once from genesis.values.env via a plain transfer.
 * Gas ≥250k for brand-new accounts (Amsterdam+).
 */
export async function fundFromShared(to: Address, amount = FUND_AMOUNT_WEI): Promise<Hex> {
  const funderBal = await balance(SHARED_FUNDER);
  if (funderBal < amount + LEGACY_GAS_PRICE * FUND_TRANSFER_GAS) {
    throw new Error(
      "Shared genesis funder is low on ETH. Everyone shares that key — wait and retry, or ask the stall.",
    );
  }
  const hash = await sendLegacy(SHARED_FUNDER_KEY, { to, value: amount, gas: FUND_TRANSFER_GAS });
  const receipt = await waitReceipt(hash);
  if (receipt.status !== "0x1") {
    throw new Error("Shared-key fund transfer reverted. Retry — nonce collisions on the shared funder are expected.");
  }
  return hash;
}

/** Optional leftover RPC some sidecars still expose. Prefer fundFromShared. */
async function fundFromSkandhaRpc(to: Address): Promise<Hex> {
  const result = (await rpc("skandha_explorer_faucet", [to], GATEWAY_URL)) as { txHash?: Hex } | Hex;
  const hash = typeof result === "string" ? result : result.txHash;
  if (!hash) throw new Error("skandha_explorer_faucet returned no transaction");
  const receipt = await waitReceipt(hash);
  if (receipt.status !== "0x1") throw new Error("Faucet transfer reverted");
  return hash;
}

/** Fund an address: shared genesis key first (docs), then optional skandha faucet fallback. */
export async function fundFromFaucet(to: Address): Promise<Hex> {
  try {
    return await fundFromShared(to);
  } catch (sharedError) {
    try {
      return await fundFromSkandhaRpc(to);
    } catch {
      throw sharedError;
    }
  }
}

export async function sendLegacy(key: Hex, tx: { to?: Address; data?: Hex; value?: bigint; gas?: bigint }): Promise<Hex> {
  const account = privateKeyToAccount(key);
  const gasPrice = await networkGasPrice();
  for (let attempt = 0; attempt < 12; attempt++) {
    const next = Number(await rpc("eth_getTransactionCount", [account.address, "pending"], ETHREX_URL));
    const raw = await account.signTransaction({
      chainId: CHAIN_ID,
      nonce: next,
      to: tx.to,
      value: tx.value ?? 0n,
      data: tx.data ?? "0x",
      gas: tx.gas ?? LEGACY_GAS,
      gasPrice,
      type: "legacy",
    });
    try {
      // Legacy txs → ethrex. Frame txs use the sidecar GATEWAY_URL elsewhere.
      return (await rpc("eth_sendRawTransaction", [raw], ETHREX_URL)) as Hex;
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (!/nonce/i.test(message) || attempt === 11) throw error;
      await sleep(200 + Math.floor(Math.random() * 400));
    }
  }
  throw new Error("legacy send failed");
}

export async function waitReceipt(hash: Hex, timeoutMs = 120_000): Promise<{ status: string; contractAddress?: Address }> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const receipt = (await rpc("eth_getTransactionReceipt", [hash], ETHREX_URL)) as {
      status?: string;
      contractAddress?: Address;
    } | null;
    if (receipt) return { status: receipt.status ?? "0x0", contractAddress: receipt.contractAddress };
    await sleep(2000);
  }
  throw new Error(
    `Transaction ${hash} was not mined within ${Math.round(timeoutMs / 1000)}s. The public ethrex may be stalled — check the explorer and retry.`,
  );
}

function artifact(name: "ShepherdAccount" | "ShepherdPolicy" | "ShepherdVault"): Hex {
  const value = bytecode[name];
  if (!value) throw new Error("contract bytecode is missing; run npm run build:contracts");
  return value as Hex;
}

export async function deploy(key: Hex, name: "ShepherdAccount" | "ShepherdPolicy" | "ShepherdVault", args: unknown[], value = 0n): Promise<Address> {
  const abi = name === "ShepherdAccount" ? accountAbi : name === "ShepherdPolicy" ? policyAbi : vaultAbi;
  const data = encodeDeployData({ abi, bytecode: artifact(name), args: args as never });
  const hash = await sendLegacy(key, { data, value, gas: LEGACY_GAS });
  const receipt = await waitReceipt(hash);
  if (receipt.status !== "0x1" || !receipt.contractAddress) throw new Error("deploy reverted");
  return receipt.contractAddress;
}

export async function deployStack(ownerKey: Hex): Promise<{ policy: Address; vault: Address; account: Address }> {
  const owner = privateKeyToAccount(ownerKey).address;
  const policy = await deploy(ownerKey, "ShepherdPolicy", [owner], 0n);
  const vault = await deploy(ownerKey, "ShepherdVault", [], 0n);
  const account = await deploy(ownerKey, "ShepherdAccount", [owner, policy, STAKING_REGISTRY], ACCOUNT_FUND_WEI);
  return { policy, vault, account };
}

export async function setRule(ownerKey: Hex, policy: Address, target: Address, selector: Hex, mode: number): Promise<Hex> {
  const data = encodeFunctionData({
    abi: policyAbi,
    functionName: "setRule",
    args: [target, selector, mode],
  });
  const hash = await sendLegacy(ownerKey, { to: policy, data, gas: 250_000n });
  const receipt = await waitReceipt(hash);
  if (receipt.status !== "0x1") throw new Error("setRule reverted");
  return hash;
}

export async function readRule(policy: Address, target: Address, selector: Hex): Promise<number> {
  const data = encodeFunctionData({ abi: policyAbi, functionName: "readRule", args: [target, selector] });
  const out = (await rpc("eth_call", [{ to: policy, data }, "latest"])) as Hex;
  return Number(decodeFunctionResult({ abi: policyAbi, functionName: "readRule", data: out }));
}

export async function readSession(account: Address, key: Address): Promise<{ expiry: bigint; valueCap: bigint; active: boolean }> {
  const data = encodeFunctionData({ abi: accountAbi, functionName: "sessionOf", args: [key] });
  const out = (await rpc("eth_call", [{ to: account, data }, "latest"])) as Hex;
  const [expiry, valueCap, active] = decodeFunctionResult({ abi: accountAbi, functionName: "sessionOf", data: out });
  return { expiry, valueCap, active };
}

export async function readStake(account: Address): Promise<{ amount: bigint; staked: boolean }> {
  const data = encodeFunctionData({ abi: stakeAbi, functionName: "getDepositInfo", args: [account] });
  const out = (await rpc("eth_call", [{ to: STAKING_REGISTRY, data }, "latest"])) as Hex;
  if (!out || out === "0x" || out.length < 2 + 64) return { amount: 0n, staked: false };
  const amount = BigInt(out.slice(0, 66));
  return { amount, staked: amount > 0n };
}

export function quantity(value: bigint): Hex {
  return numberToHex(value);
}
