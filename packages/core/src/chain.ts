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
  LEGACY_GAS,
  LEGACY_GAS_PRICE,
  STAKING_REGISTRY,
} from "./config.js";
import { rpc, sleep } from "./rpc.js";

export async function chainId(): Promise<number> {
  return Number(await rpc("eth_chainId", []));
}

export async function balance(address: Address): Promise<bigint> {
  return BigInt((await rpc("eth_getBalance", [address, "latest"])) as string);
}

export async function code(address: Address): Promise<Hex> {
  return (await rpc("eth_getCode", [address, "latest"])) as Hex;
}

export async function nonce(address: Address): Promise<bigint> {
  return BigInt((await rpc("eth_getTransactionCount", [address, "pending"])) as string);
}

export async function fundFromFaucet(to: Address): Promise<Hex> {
  let result: { txHash?: Hex } | Hex;
  try {
    result = (await rpc("skandha_explorer_faucet", [to])) as { txHash?: Hex } | Hex;
  } catch (error) {
    const message = error instanceof Error ? error.message : "faucet failed";
    if (/empty/i.test(message)) {
      throw new Error(
        "Devnet faucet is empty right now. Reuse a funded key, wait for a refill, or ask the alt-mempool stall for ETH.",
      );
    }
    if (/once|hour|rate|already|cooldown/i.test(message)) {
      throw new Error("Faucet already hit this address in the last hour. Reuse the funded key or wait.");
    }
    throw error;
  }
  const hash = typeof result === "string" ? result : result.txHash;
  if (!hash) throw new Error("Faucet returned no transaction.");
  await waitReceipt(hash);
  return hash;
}

export async function sendLegacy(key: Hex, tx: { to?: Address; data?: Hex; value?: bigint; gas?: bigint }): Promise<Hex> {
  const account = privateKeyToAccount(key);
  for (let attempt = 0; attempt < 8; attempt++) {
    const next = Number(await rpc("eth_getTransactionCount", [account.address, "pending"]));
    const raw = await account.signTransaction({
      chainId: CHAIN_ID,
      nonce: next,
      to: tx.to,
      value: tx.value ?? 0n,
      data: tx.data ?? "0x",
      gas: tx.gas ?? LEGACY_GAS,
      gasPrice: LEGACY_GAS_PRICE,
      type: "legacy",
    });
    try {
      return (await rpc("eth_sendRawTransaction", [raw])) as Hex;
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (!/nonce/i.test(message) || attempt === 7) throw error;
      await sleep(400);
    }
  }
  throw new Error("legacy send failed");
}

export async function waitReceipt(hash: Hex, timeoutMs = 120_000): Promise<{ status: string; contractAddress?: Address }> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const receipt = (await rpc("eth_getTransactionReceipt", [hash])) as {
      status?: string;
      contractAddress?: Address;
    } | null;
    if (receipt) return { status: receipt.status ?? "0x0", contractAddress: receipt.contractAddress };
    await sleep(2000);
  }
  throw new Error("transaction was not mined within 120s");
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
