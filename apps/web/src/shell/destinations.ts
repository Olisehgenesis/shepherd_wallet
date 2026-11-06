/**
 * Console information architecture.
 * Other slices should import these paths instead of hard-coding old primary-nav URLs.
 *
 * Primary: Home, Agents, Activity, You.
 * Policy and session grant/revoke live under Agents.
 * Approvals open as a queue sheet (search `queue=approvals`).
 * Wallet, backup, network, and demo tools live under You.
 */

export const primaryNav = [
  { id: "home", to: "/console", label: "Home", end: true },
  { id: "agents", to: "/console/agents", label: "Agents", end: false },
  { id: "activity", to: "/console/activity", label: "Activity", end: true },
  { id: "you", to: "/console/you", label: "You", end: false },
] as const;

export type PrimaryNavId = (typeof primaryNav)[number]["id"];

export const paths = {
  home: "/console",
  agents: "/console/agents",
  session: "/console/agents/session",
  policy: "/console/agents/policy",
  agent: (agentId: string) => `/console/agents/${encodeURIComponent(agentId)}`,
  agentPolicy: (agentId: string) => `/console/agents/${encodeURIComponent(agentId)}/policy`,
  activity: "/console/activity",
  you: "/console/you",
  wallet: "/console/wallet",
  demo: "/console/you/demo",
  mempool: "/console/you/demo/mempool",
  reads: "/console/you/demo/reads",
  intents: "/console/you/demo/intents",
  approvals: "/console?queue=approvals",
} as const;

/** Old primary-nav URLs that still resolve. */
export const legacyRedirects = [
  { from: "/console/session", to: paths.session },
  { from: "/console/policy", to: paths.policy },
  { from: "/console/intents", to: paths.intents },
  { from: "/console/reads", to: paths.reads },
  { from: "/console/mempool", to: paths.mempool },
  { from: "/console/approvals", to: paths.approvals },
] as const;
