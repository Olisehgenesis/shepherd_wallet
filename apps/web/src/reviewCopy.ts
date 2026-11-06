export type ReviewRow = { label: string; value: string; mono?: boolean };

export type ReviewCopy = {
  title: string;
  body: string;
  rows: ReviewRow[];
  confirmLabel: string;
};

export type SendKind = "ping" | "drain" | "sweep" | "sweep-cosign" | "canonical" | "alt";

export const TTL_NOTE = "Stored and shown. Not enforced on-chain. Revoke is the real stop.";

export const REVEAL_VISIBLE_NOTE =
  "Shown once. This key stays in this tab until you revoke. Refreshing the page hides this field; the key remains so this console can sign, and it will not be shown again.";

export const REVEAL_HIDDEN_NOTE =
  "Key revealed. It stays in this tab for signing until you revoke. It will not be shown again.";

const REVIEW_BODY = "This is the review step. Nothing is submitted until you confirm.";
const DRAIN_TARGET = "0x0000000000000000000000000000000000000bAd";

export function humanCall(label: string): { title: string; call: string } {
  const match = label.trim().match(/^([A-Za-z0-9_]+)\.([A-Za-z0-9_]+)\(\)$/);
  if (!match) return { title: "High-risk call", call: label.trim() || "—" };
  const verb = match[2].charAt(0).toUpperCase() + match[2].slice(1);
  return { title: `${verb} ${match[1]}`, call: label.trim() };
}

export function policyWord(verdict: string): string {
  if (verdict === "allow") return "Allow";
  if (verdict === "NeedsCosign") return "Needs co-sign";
  if (verdict === "TargetDenied") return "Deny";
  if (verdict === "ValueCap") return "Over value cap";
  if (verdict === "SessionInactive") return "Session inactive";
  return verdict;
}

function pingReview(route: string, title: string): ReviewCopy {
  return {
    title,
    body: REVIEW_BODY,
    rows: [
      { label: "Signed by", value: "Root agent session" },
      { label: "Target", value: "vault.ping()", mono: true },
      { label: "Value", value: "0 ETH" },
      { label: "Policy", value: "Allow" },
      { label: "Route", value: route },
    ],
    confirmLabel: "Send",
  };
}

export function intentReview(kind: SendKind): ReviewCopy {
  if (kind === "ping" || kind === "alt") return pingReview("Alt mempool", "In-policy ping");
  if (kind === "canonical") return pingReview("Canonical mempool", "Canonical ping");
  if (kind === "drain") {
    return {
      title: "Injected drain",
      body: "Demo. This call is not on the allowlist. Nothing is submitted until you confirm. VERIFY should reject it.",
      rows: [
        { label: "Signed by", value: "Root agent session" },
        { label: "Target", value: DRAIN_TARGET, mono: true },
        { label: "Value", value: "1 wei" },
        { label: "Policy", value: "Deny" },
        { label: "Route", value: "Alt mempool" },
      ],
      confirmLabel: "Send",
    };
  }
  if (kind === "sweep") {
    return {
      title: "Sweep vault",
      body: "Demo. Nothing is submitted until you confirm. Confirming queues this high-risk call for your co-sign. The session does not sign it alone.",
      rows: [
        { label: "Signed by", value: "Not signed yet" },
        { label: "Target", value: "vault.sweep()", mono: true },
        { label: "Value", value: "0 ETH" },
        { label: "Policy", value: "Needs co-sign" },
        { label: "Route", value: "Waits for approval" },
      ],
      confirmLabel: "Queue",
    };
  }
  return {
    title: "Sweep vault",
    body: "Demo. This is the review step. Nothing is submitted until you confirm. Confirming co-signs with the owner key and sends.",
    rows: [
      { label: "Signed by", value: "Root agent session and owner" },
      { label: "Target", value: "vault.sweep()", mono: true },
      { label: "Value", value: "0 ETH" },
      { label: "Policy", value: "Needs co-sign" },
      { label: "Route", value: "Alt mempool" },
    ],
    confirmLabel: "Send",
  };
}

export function customReview(input: {
  selector: string;
  target: string;
  valueEth: string;
  verdict: string;
  queue: boolean;
}): ReviewCopy {
  const queued = input.queue && input.verdict === "NeedsCosign";
  const cosignNow = !input.queue && input.verdict === "NeedsCosign";
  const named = input.selector.includes(".") ? humanCall(input.selector) : null;
  const heading = named?.title ?? "Custom call";
  const call = named?.call ?? input.selector;
  return {
    title: heading,
    body: queued
      ? "This is the review step. Nothing is submitted until you confirm. Confirming queues it for your co-sign."
      : input.verdict === "allow" || input.verdict === "NeedsCosign"
        ? REVIEW_BODY
        : `${REVIEW_BODY} The mirror expects ${policyWord(input.verdict)}.`,
    rows: [
      {
        label: "Signed by",
        value: queued ? "Not signed yet" : cosignNow ? "Root agent session and owner" : "Root agent session",
      },
      { label: "Target", value: `${call === "—" ? input.selector : call} · ${input.target}`, mono: true },
      { label: "Value", value: `${input.valueEth.trim() || "0"} ETH` },
      { label: "Policy", value: policyWord(input.verdict) },
      { label: "Route", value: queued ? "Waits for approval" : "Alt mempool" },
    ],
    confirmLabel: queued ? "Queue" : "Send",
  };
}

export function sendReview(to: string, amountEth: string): ReviewCopy {
  return {
    title: "Send ETH",
    body: REVIEW_BODY,
    rows: [
      { label: "Signed by", value: "Owner frame signer" },
      { label: "Target", value: to, mono: true },
      { label: "Value", value: `${amountEth} ETH` },
      { label: "Policy", value: "Owner path" },
      { label: "Route", value: "Canonical (ethrex)" },
    ],
    confirmLabel: "Send",
  };
}

export function approvalCopy(input: { agentId: string; callLabel: string; valueLabel: string }): ReviewCopy {
  const agent = input.agentId === "root" ? "Root agent" : input.agentId;
  const { title, call } = humanCall(input.callLabel);
  return {
    title,
    body: `${agent} wants to run a high-risk call. Review, then approve or decline.`,
    rows: [
      { label: "Agent", value: agent },
      { label: "Call", value: call, mono: true },
      { label: "Value", value: input.valueLabel },
      { label: "Why here", value: "Policy mode: needs co-sign" },
    ],
    confirmLabel: "Approve",
  };
}

export function revokeSessionCopy(): ReviewCopy {
  return {
    title: "Revoke session",
    body: "Revoke is the real stop. The session is marked inactive on-chain, so later calls fail VERIFY.",
    rows: [
      { label: "Stops", value: "This session. The agent can no longer pass VERIFY." },
      { label: "Keys wiped", value: "The session private key in this tab." },
      { label: "Stays", value: "The owner frame-signer key. Child agent keys stay until you revoke them." },
    ],
    confirmLabel: "Revoke",
  };
}

export function revokeAgentCopy(agentId: string): ReviewCopy {
  return {
    title: `Revoke ${agentId}`,
    body: "Revoke stops this agent on-chain. Sessions spawned under it are revoked too.",
    rows: [
      { label: "Stops", value: "This agent and any child sessions under it." },
      { label: "Keys wiped", value: "Those session private keys in this tab." },
      { label: "Stays", value: "The owner frame-signer key. The root session stays unless you revoke it on Session." },
    ],
    confirmLabel: "Revoke",
  };
}
