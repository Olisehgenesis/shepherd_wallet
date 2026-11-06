import { formatEther } from "viem";
import { ALLOW, HIGH } from "../../../../packages/core/src/abi.js";
import type { RuleMode } from "../persistence";

export type PermissionChoice = "allow" | "cosign" | "deny";

export interface CallPresentation {
  title: string;
  signature: string;
}

/** Maps the three existing rule modes. Deny is mode 0, which removes the rule on-chain. */
export function permissionChoiceToMode(choice: PermissionChoice): RuleMode {
  if (choice === "allow") return ALLOW;
  if (choice === "cosign") return HIGH;
  return 0;
}

export function permissionBadge(mode: number): { label: string; tone: "allow" | "cosign" | "deny" } {
  if (mode === ALLOW) return { label: "Allow", tone: "allow" };
  if (mode === HIGH) return { label: "Needs your co-sign", tone: "cosign" };
  return { label: "Deny", tone: "deny" };
}

export function permissionPhrase(mode: number): string {
  if (mode === ALLOW) return "allow";
  if (mode === HIGH) return "needs your co-sign";
  return "deny";
}

export function permissionLabel(callName: string, signature: string): string | undefined {
  const sig = signature.trim();
  const name = callName.trim();
  if (sig) {
    const derived = presentCall(sig, "").title;
    if (!name || name.toLowerCase() === derived.toLowerCase()) return sig;
    return `${name} — ${sig}`;
  }
  return name || undefined;
}

export function presentCall(label: string | undefined, _selector: string): CallPresentation {
  const raw = (label ?? "").trim();
  const named = raw.match(/^(.+?)\s+—\s+(\S.*)$/);
  if (named && (named[2]?.includes("(") || named[2]?.includes("."))) {
    return { title: named[1] ?? raw, signature: named[2] ?? raw };
  }
  const dotted = raw.match(/^([A-Za-z_][\w]*)\.([A-Za-z_][\w]*)\s*(\(.*\))?$/);
  if (dotted) {
    const contract = dotted[1] ?? "";
    const fn = dotted[2] ?? "";
    const signature = dotted[3] ? raw : `${contract}.${fn}()`;
    return { title: `${titleCase(fn)} ${contract}`, signature };
  }
  const fnOnly = raw.match(/^([A-Za-z_][\w]*)\s*(\(.*\))$/);
  if (fnOnly) return { title: titleCase(fnOnly[1] ?? ""), signature: raw };
  if (!raw || raw.startsWith("0x") || /^(allow|deny|high-risk)\b/i.test(raw)) {
    return { title: "Custom call", signature: "Selector in Advanced" };
  }
  return { title: raw, signature: raw };
}

export function summaryCall(label: string | undefined, selector: string): string {
  const call = presentCall(label, selector);
  return call.signature.includes("(") ? call.signature : call.title;
}

export function agentDisplayName(agent: { id: string; name?: string }): string {
  if (agent.id === "root") return "Root agent";
  const name = agent.name?.trim();
  if (name) return name;
  const suffix = agent.id.replace(/^agent_/, "").slice(0, 4);
  return suffix ? `Child agent ${suffix}` : "Child agent";
}

export function formatCapEth(wei: string | undefined): string {
  if (!wei || wei === "0") return "0 ETH";
  try {
    return `${trimZeros(formatEther(BigInt(wei)))} ETH`;
  } catch {
    return wei;
  }
}

export function formatExpiryShort(sec: number | string | undefined): string {
  const value = typeof sec === "string" ? Number(sec) : sec;
  if (!value) return "—";
  const date = new Date(value * 1000);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", { month: "numeric", day: "numeric" });
}

export function childStillLive(expiry: string | undefined, now = Date.now()): boolean {
  const sec = Number(expiry);
  if (!sec) return true;
  return sec * 1000 > now;
}

function titleCase(fn: string): string {
  if (!fn) return "Call";
  return fn.charAt(0).toUpperCase() + fn.slice(1);
}

function trimZeros(value: string): string {
  if (!value.includes(".")) return value;
  return value.replace(/\.?0+$/, "");
}
