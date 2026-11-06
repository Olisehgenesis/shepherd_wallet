import { p256 } from "@noble/curves/nist.js";
import { getProfile } from "@forshtat/hegota-support/profiles";
import { toWire } from "@forshtat/hegota-support/rpc";
import * as lib from "@forshtat/hegota-support/tx";
import {
  bytesToHex,
  encodeFunctionData,
  hexToBytes,
  keccak256,
  numberToHex,
  type Address,
  type Hex,
} from "viem";
import { accountAbi, stakeAbi } from "./abi.js";
import {
  CHAIN_ID,
  EXPIRY_VERIFIER,
  MAX_FEE,
  SENDER_GAS,
  SENDER_STATE,
  STAKING_REGISTRY,
  UNSTAKE_DELAY,
  OWNER_CALL_GAS,
  OWNER_CALL_STATE,
  VERIFY_AGENT_GAS,
  VERIFY_OWNER_GAS,
} from "./config.js";

export const profile = getProfile("ethrex-eip8141-tracer");

export interface Call {
  to: Address;
  data?: Hex;
  value?: bigint;
  execution?: bigint;
  state?: bigint;
}

export interface BuiltTx {
  wire: ReturnType<typeof toWire>;
  raw: Hex;
  hash: Hex;
}

function baseTx(sender: Address, nonce: bigint, frames: lib.Frame[], signatures: lib.SignatureEntry[]) {
  return lib.newTx({
    chainId: CHAIN_ID,
    sender,
    nonceSeq: nonce,
    frames,
    signatures,
    fees: { maxFeePerGas: MAX_FEE },
  });
}

function senderFrame(call: Call): lib.Frame {
  return lib.frame(profile, "SENDER", {
    target: call.to,
    execution: call.execution ?? SENDER_GAS,
    state: call.state ?? SENDER_STATE,
    value: call.value ?? 0n,
    data: call.data ?? "0x",
  });
}

export function buildOwnerTx(account: Address, owner: Address, nonce: bigint, call: Call) {
  return baseTx(
    account,
    nonce,
    [
      lib.frame(profile, "VERIFY", { scope: "EXECUTION_AND_PAYMENT", execution: VERIFY_OWNER_GAS }),
      senderFrame(call),
    ],
    [lib.secp256k1Placeholder(profile, owner)],
  );
}

export function buildAgentTx(input: {
  account: Address;
  session: Address;
  nonce: bigint;
  call: Call;
  expiry?: bigint;
  cosigner?: { scheme: "secp256k1" | "p256"; address: Address };
}) {
  const frames: lib.Frame[] = [];
  if (input.expiry !== undefined) {
    frames.push(
      lib.frame(profile, "VERIFY", {
        target: EXPIRY_VERIFIER,
        execution: 30_000n,
        state: 0n,
        data: numberToHex(input.expiry, { size: 8 }),
      }),
    );
  }
  frames.push(
    lib.frame(profile, "VERIFY", {
      scope: "EXECUTION_AND_PAYMENT",
      execution: VERIFY_AGENT_GAS,
      data: input.expiry === undefined ? "0x01" : "0x02",
    }),
  );
  frames.push(senderFrame(input.call));
  const signatures = [lib.secp256k1Placeholder(profile, input.session)];
  if (input.cosigner?.scheme === "secp256k1") {
    signatures.push(lib.secp256k1Placeholder(profile, input.cosigner.address));
  } else if (input.cosigner?.scheme === "p256") {
    signatures.push({
      scheme: lib.sigScheme(profile, "P256"),
      signer: input.cosigner.address,
      msg: "0x",
      signature: "0x",
    });
  }
  return baseTx(input.account, input.nonce, frames, signatures);
}

export async function signSecp(tx: lib.FrameTx, privateKey: Hex, index = 0): Promise<lib.FrameTx> {
  return lib.signTx(profile, tx, privateKey, index);
}

export function p256Identity(privateKey: Hex): { address: Address; privateKey: Hex } {
  const pub = p256.getPublicKey(hexToBytes(privateKey), false);
  const hash = keccak256(bytesToHex(pub.slice(1)));
  return { address: `0x${hash.slice(-40)}` as Address, privateKey };
}

export function signP256(tx: lib.FrameTx, privateKey: Hex, index: number): lib.FrameTx {
  const digest = lib.sigHash(profile, tx);
  const sig = p256.sign(hexToBytes(digest), hexToBytes(privateKey), { prehash: false });
  const compact = sig.toCompactRawBytes();
  const pub = p256.getPublicKey(hexToBytes(privateKey), false).slice(1);
  const packed = bytesToHex(new Uint8Array([...compact, ...pub])) as Hex;
  const signatures = tx.signatures.map((entry, i) => (i === index ? { ...entry, signature: packed } : entry));
  return { ...tx, signatures };
}

export function packTx(tx: lib.FrameTx): BuiltTx {
  return { wire: toWire(tx), raw: lib.encodeTx(profile, tx), hash: lib.txHash(profile, tx) };
}

export function grantCall(account: Address, key: Address, expiry: bigint, valueCap: bigint): Call {
  return {
    to: account,
    data: encodeFunctionData({ abi: accountAbi, functionName: "grantSession", args: [key, expiry, valueCap] }),
    execution: OWNER_CALL_GAS,
    state: OWNER_CALL_STATE,
  };
}

export function revokeCall(account: Address, key: Address): Call {
  return {
    to: account,
    data: encodeFunctionData({ abi: accountAbi, functionName: "revokeSession", args: [key] }),
    execution: OWNER_CALL_GAS,
    state: OWNER_CALL_STATE,
  };
}

export function p256Call(account: Address, who: Address): Call {
  return {
    to: account,
    data: encodeFunctionData({ abi: accountAbi, functionName: "setP256Cosigner", args: [who] }),
    execution: OWNER_CALL_GAS,
    state: OWNER_CALL_STATE,
  };
}

export function stakeCall(amount: bigint): Call {
  return {
    to: STAKING_REGISTRY,
    value: amount,
    data: encodeFunctionData({ abi: stakeAbi, functionName: "addStake", args: [UNSTAKE_DELAY] }),
    execution: 180_000n,
    state: 300_000n,
  };
}

/** Owner-path ETH transfer. Empty calldata to an EOA or contract that accepts value. */
export function transferCall(to: Address, value: bigint): Call {
  return {
    to,
    value,
    data: "0x",
    execution: SENDER_GAS,
    state: SENDER_STATE,
  };
}

export function fundCallData(): Hex {
  return encodeFunctionData({ abi: accountAbi, functionName: "fund" });
}
