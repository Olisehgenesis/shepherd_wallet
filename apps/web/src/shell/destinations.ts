/**
 * Console information architecture.
 *
 * Primary nav: Agents, MCP, Wallet.
 * Policy and session grant/revoke live under Agents.
 * Approvals open as a queue sheet (search `queue=approvals`).
 * Demo tools stay under You → Demo (reachable from Wallet / legacy URLs).
 */

export const primaryNav = [
  { id: "agents", to: "/console/agents", label: "Agents", end: false },
  { id: "mcp", to: "/console/mcp", label: "MCP", end: true },
  { id: "wallet", to: "/console/wallet", label: "Wallet", end: true },
] as const;

export type PrimaryNavId = (typeof primaryNav)[number]["id"];

export const paths = {
  home: "/console",
  agents: "/console/agents",
  session: "/console/agents/session",
  policy: "/console/agents/root/permissions",
  agent: (agentId: string) => `/console/agents/${encodeURIComponent(agentId)}`,
  agentPolicy: (agentId: string) => `/console/agents/${encodeURIComponent(agentId)}/permissions`,
  activity: "/console/activity",
  mcp: "/console/mcp",
  you: "/console/you",
  wallet: "/console/wallet",
  demo: "/console/you/demo",
  mempool: "/console/you/demo/mempool",
  reads: "/console/you/demo/reads",
  intents: "/console/you/demo/intents",
  approvals: "/console?queue=approvals",
} as const;

/** Nested destinations shown under the Agents dropdown. */
export const agentsMenu = [
  { to: paths.agents, label: "All agents", description: "Sessions and child agents" },
  { to: paths.session, label: "Session", description: "Grant or revoke the root key" },
  { to: paths.policy, label: "Root permissions", description: "Allow, co-sign, or deny" },
] as const;

/** Old primary-nav URLs that still resolve. */
export const legacyRedirects = [
  { from: "/console/session", to: paths.session },
  { from: "/console/policy", to: paths.policy },
  { from: "/console/intents", to: paths.intents },
  { from: "/console/reads", to: paths.reads },
  { from: "/console/mempool", to: paths.mempool },
  { from: "/console/approvals", to: paths.approvals },
] as const;
