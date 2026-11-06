import { encodeFunctionData, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { accountAbi, ALLOW, HIGH } from "./abi.js";
import {
  balance,
  chainId,
  code,
  deployStack,
  fundFromFaucet,
  nonce,
  readRule,
  readSession,
  readStake,
  sendLegacy,
  setRule,
  waitReceipt,
} from "./chain.js";
import { CHAIN_ID, EXPIRY_VERIFIER, SESSION_VALUE_CAP, STAKE_WEI } from "./config.js";
import {
  buildAgentTx,
  buildOwnerTx,
  fundCallData,
  grantCall,
  packTx,
  p256Call,
  p256Identity,
  revokeCall,
  signP256,
  signSecp,
  stakeCall,
  transferCall,
  type Call,
} from "./frame.js";
import { drainCall, mirror, pingCall, PING, sweepCall, SWEEP, type MirrorVerdict } from "./mirror.js";
import { ChainError, rpc } from "./rpc.js";
import { explorerTxUrl } from "./redact.js";

export interface Outcome {
  verdict: "admitted" | "rejected" | "waiting" | "ready";
  reason: string;
  explorerUrl?: string;
  route: "alt" | "canonical" | "local";
}

async function submit(kind: "alt" | "canonical", wire: unknown, raw: Hex): Promise<Hex> {
  if (kind === "alt") return (await rpc("eth_sendFrameTransaction", [wire])) as Hex;
  return (await rpc("eth_sendRawTransaction", [raw])) as Hex;
}

async function mined(hash: Hex, route: Outcome["route"]): Promise<Outcome> {
  const receipt = await waitReceipt(hash);
  if (receipt.status !== "0x1") {
    return { verdict: "rejected", reason: "frame-reverted", explorerUrl: explorerTxUrl(hash), route };
  }
  return { verdict: "admitted", reason: "included", explorerUrl: explorerTxUrl(hash), route };
}

function rejected(error: unknown, route: Outcome["route"]): Outcome {
  if (error instanceof ChainError) return { verdict: "rejected", reason: error.verdict, route };
  return { verdict: "rejected", reason: "rejected", route };
}

export async function ensureFunds(owner: Address): Promise<"funded" | "already"> {
  const have = await balance(owner);
  if (have > 50_000_000_000_000_000n) return "already";
  // Docs: no faucet. Fund once from the published genesis key via ethrex.
  await fundFromFaucet(owner);
  return "funded";
}

export async function setup(ownerKey: Hex): Promise<{ policy: Address; vault: Address; account: Address }> {
  const id = await chainId();
  if (id !== CHAIN_ID) throw new ChainError(`gateway chain is ${id}, expected ${CHAIN_ID}`);
  const owner = privateKeyToAccount(ownerKey).address;
  await ensureFunds(owner);
  const deployed = await deployStack(ownerKey);
  await setRule(ownerKey, deployed.policy, deployed.vault, PING, ALLOW);
  await setRule(ownerKey, deployed.policy, deployed.vault, SWEEP, HIGH);
  return deployed;
}

async function ownerFrame(account: Address, ownerKey: Hex, call: Call): Promise<Outcome> {
  const owner = privateKeyToAccount(ownerKey).address;
  const tx = await signSecp(buildOwnerTx(account, owner, await nonce(account), call), ownerKey);
  const packed = packTx(tx);
  try {
    const hash = await submit("alt", packed.wire, packed.raw);
    return mined(hash, "alt");
  } catch (error) {
    return rejected(error, "alt");
  }
}

/** Send ETH from the Shepherd account on the owner path. */
export function sendFromAccount(account: Address, ownerKey: Hex, to: Address, value: bigint): Promise<Outcome> {
  return ownerFrame(account, ownerKey, transferCall(to, value));
}

/** Top up the Shepherd account by calling fund() from the frame-signer EOA. Plain transfers revert. */
export async function topUpAccount(account: Address, funderKey: Hex, value: bigint): Promise<Outcome> {
  try {
    const data = encodeFunctionData({ abi: accountAbi, functionName: "fund" });
    const hash = await sendLegacy(funderKey, { to: account, data, value, gas: 120_000n });
    return mined(hash, "canonical");
  } catch (error) {
    return rejected(error, "canonical");
  }
}

export { fundCallData };

export function grantSession(
  account: Address,
  ownerKey: Hex,
  session: Address,
  expiry: bigint,
  valueCap: bigint = SESSION_VALUE_CAP,
): Promise<Outcome> {
  return ownerFrame(account, ownerKey, grantCall(account, session, expiry, valueCap));
}

export function revoke(account: Address, ownerKey: Hex, session: Address): Promise<Outcome> {
  return ownerFrame(account, ownerKey, revokeCall(account, session));
}

export function registerP256(account: Address, ownerKey: Hex, p256Key: Hex): Promise<Outcome> {
  const who = p256Identity(p256Key).address;
  return ownerFrame(account, ownerKey, p256Call(account, who));
}

export function stake(account: Address, ownerKey: Hex): Promise<Outcome> {
  return ownerFrame(account, ownerKey, stakeCall(STAKE_WEI));
}

export interface AgentRequest {
  account: Address;
  policy: Address;
  sessionKey: Hex;
  call: { to: Address; data?: Hex; value?: bigint };
  expiry?: bigint;
  cosign?: { scheme: "secp256k1" | "p256"; key: Hex };
}

/** Local mirror, then a chain submission. `sign` false stops after the mirror (healthy agent). */
export async function agentAct(req: AgentRequest, opts: { route: "alt" | "canonical"; sign: boolean }): Promise<Outcome> {
  const session = privateKeyToAccount(req.sessionKey).address;
  const record = await readSession(req.account, session);
  const selector = ((req.call.data ?? "0x") + "00000000").slice(0, 10) as Hex;
  const rule = req.call.data && req.call.data.length >= 10 ? await readRule(req.policy, req.call.to, selector) : 0;
  const local: MirrorVerdict = mirror({
    active: record.active,
    value: req.call.value ?? 0n,
    cap: record.valueCap,
    rule,
  });
  if (!opts.sign) {
    return {
      verdict: local === "allow" ? "ready" : local === "NeedsCosign" ? "waiting" : "rejected",
      reason: local,
      route: "local",
    };
  }
  const cosigner = req.cosign
    ? {
        scheme: req.cosign.scheme,
        address: req.cosign.scheme === "p256" ? p256Identity(req.cosign.key).address : privateKeyToAccount(req.cosign.key).address,
      }
    : undefined;
  let tx = buildAgentTx({
    account: req.account,
    session,
    nonce: await nonce(req.account),
    call: req.call,
    expiry: req.expiry,
    cosigner,
  });
  tx = await signSecp(tx, req.sessionKey, 0);
  if (req.cosign?.scheme === "secp256k1") tx = await signSecp(tx, req.cosign.key, 1);
  if (req.cosign?.scheme === "p256") tx = signP256(tx, req.cosign.key, 1);
  const packed = packTx(tx);
  try {
    const hash = await submit(opts.route, packed.wire, packed.raw);
    return mined(hash, opts.route);
  } catch (error) {
    return rejected(error, opts.route);
  }
}

export async function expiryIfLive(nowSec: bigint): Promise<bigint | undefined> {
  const deployed = await code(EXPIRY_VERIFIER);
  if (!deployed || deployed === "0x") return undefined;
  return nowSec + 900n;
}

export function inPolicyCall(vault: Address) {
  return pingCall(vault);
}

export function highRiskCall(vault: Address) {
  return sweepCall(vault);
}

export function injectedCall(): { to: Address; data: Hex; value: bigint } {
  return drainCall("0x0000000000000000000000000000000000000bAd");
}

export async function posture(account: Address, session: Address): Promise<{ active: boolean; staked: boolean }> {
  const [sessionRow, stakeRow] = await Promise.all([readSession(account, session), readStake(account)]);
  return { active: sessionRow.active, staked: stakeRow.staked };
}
