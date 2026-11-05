import { encodeFunctionData, toFunctionSelector, type Address, type Hex } from "viem";
import { ALLOW, HIGH, vaultAbi } from "./abi.js";
import { SESSION_VALUE_CAP } from "./config.js";

export type MirrorVerdict = "allow" | "TargetDenied" | "ValueCap" | "NeedsCosign" | "SessionInactive";

/** Same order as `ShepherdRules.check`. The chain still re-checks. */
export function mirror(input: {
  active: boolean;
  value: bigint;
  cap: bigint;
  rule: number;
}): MirrorVerdict {
  if (!input.active) return "SessionInactive";
  if (input.rule !== ALLOW && input.rule !== HIGH) return "TargetDenied";
  if (input.value > input.cap) return "ValueCap";
  if (input.rule === HIGH) return "NeedsCosign";
  return "allow";
}

export const PING = toFunctionSelector("ping()");
export const SWEEP = toFunctionSelector("sweep()");

export function pingCall(vault: Address) {
  return {
    to: vault,
    data: encodeFunctionData({ abi: vaultAbi, functionName: "ping" }),
    value: 0n,
  };
}

export function sweepCall(vault: Address) {
  return {
    to: vault,
    data: encodeFunctionData({ abi: vaultAbi, functionName: "sweep" }),
    value: 0n,
  };
}

export function drainCall(target: Address) {
  return { to: target, data: "0x" as Hex, value: 1n };
}

export const defaultCap = SESSION_VALUE_CAP;
