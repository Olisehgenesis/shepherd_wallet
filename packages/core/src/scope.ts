/** How far a session may delegate. A child cannot outlive or outspend its parent. */
export const MAX_DEPTH = 3;
export const MAX_CHILDREN = 8;
export const DEFAULT_TTL_SECONDS = 3600;

export interface Delegation {
  expiry: bigint;
  valueCap: bigint;
}

export interface AgentNode {
  id: string;
  parentId: string;
  depth: number;
}

export function delegate(input: {
  parentExpiry: bigint;
  parentCap: bigint;
  now: bigint;
  ttlSeconds: number;
  requestedCap: bigint | null;
  depth: number;
  childCount: number;
}): Delegation | { error: string } {
  if (input.depth >= MAX_DEPTH) {
    return {
      error: `This agent is at depth ${input.depth}. Spawning stops at depth ${MAX_DEPTH}. Revoke a deeper agent or start from a shallower parent.`,
    };
  }
  if (input.childCount >= MAX_CHILDREN) {
    return {
      error: `This parent already has ${input.childCount} children. Revoke one with shepherd_revoke_agent before spawning another.`,
    };
  }
  if (input.parentCap <= 0n || input.parentExpiry <= input.now) {
    return {
      error: "The parent session is expired or has no value cap. Grant the parent again, then spawn.",
    };
  }
  const cap = input.requestedCap ?? input.parentCap;
  if (cap <= 0n) return { error: "valueCapWei has to be a positive integer string, in wei." };
  if (cap > input.parentCap) {
    return {
      error: `Child cap ${cap.toString()} is above the parent cap ${input.parentCap.toString()}. Pass a smaller valueCapWei.`,
    };
  }
  let expiry = input.now + BigInt(input.ttlSeconds);
  if (expiry > input.parentExpiry) expiry = input.parentExpiry;
  if (expiry <= input.now) {
    return { error: "The parent session expires too soon to hand a child any time. Grant a longer parent session." };
  }
  return { expiry, valueCap: cap };
}

/** Agent plus descendants, deepest first, so cascade revoke clears children before the parent. */
export function revokeCascadeOrder<T extends AgentNode>(agents: T[], agentId: string): T[] {
  const ids = new Set<string>();
  const walk = (id: string) => {
    ids.add(id);
    for (const agent of agents) {
      if (agent.parentId === id) walk(agent.id);
    }
  };
  walk(agentId);
  return agents.filter((agent) => ids.has(agent.id)).sort((a, b) => b.depth - a.depth);
}

export function buildTree<T extends AgentNode>(agents: T[]) {
  const byParent = new Map<string, T[]>();
  for (const agent of agents) {
    const list = byParent.get(agent.parentId) ?? [];
    list.push(agent);
    byParent.set(agent.parentId, list);
  }
  type Nested = T & { children: Nested[] };
  const nest = (parentId: string): Nested[] =>
    (byParent.get(parentId) ?? []).map((agent) => ({ ...agent, children: nest(agent.id) }));
  return nest("root");
}
