import { toFunctionSelector } from "viem";

const VERDICTS = [
  "TargetDenied",
  "ValueCap",
  "NeedsCosign",
  "SessionInactive",
  "BadSigner",
  "NoExecution",
  "ExpiredFrame",
  "NotSelf",
] as const;

const SELECTOR = Object.fromEntries(VERDICTS.map((name) => [name, toFunctionSelector(`${name}()`).slice(2).toLowerCase()]));

/** Strip account addresses. Leave 32-byte hashes so explorer links stay intact. */
export function redact(text: string): string {
  return text.replace(/0x[a-fA-F0-9]{40}(?![a-fA-F0-9])/g, "[account]");
}

export function verdictFromMessage(message: string): string {
  if (message.includes("StorageReadNonSender")) return "canonical-storage-read";
  if (/unstaked/i.test(message) && /slot/i.test(message)) return "unstaked-storage-read";
  if (/banned opcode|BannedOpcode/i.test(message)) return "banned-opcode";
  const lower = message.toLowerCase();
  for (const name of VERDICTS) {
    if (message.includes(name) || lower.includes(SELECTOR[name])) return name;
  }
  if (/insufficient funds/i.test(message)) return "insufficient-funds";
  if (/nonce/i.test(message)) return "nonce-mismatch";
  if (/internal error/i.test(message)) return "sidecar-internal-error";
  return "rejected";
}

export function explorerTxUrl(hash: string): string {
  const base = "https://explorer.altmempool.wtf/";
  return `${base}?tx=${hash}`;
}
