/** Shape another owner-safety flow can register. Revoke confirm and reveal-once stay out of this screen. */
export interface RevokeRequest {
  kind: "root" | "child";
  id: string;
  name: string;
}

export interface RevealRequest {
  id: string;
  name: string;
  readKey: () => string | null;
}

export interface AgentSafetyHooks {
  confirmRevoke?: (request: RevokeRequest) => boolean | Promise<boolean>;
  revealKey?: (request: RevealRequest) => void;
}

const registered: AgentSafetyHooks[] = [];

/** Register revoke-confirm or reveal-once when those flows exist. */
export function registerAgentSafety(hooks: AgentSafetyHooks) {
  registered.push(hooks);
}

function installed(): AgentSafetyHooks[] {
  const fromWindow = (globalThis as { __shepherdSafety?: AgentSafetyHooks }).__shepherdSafety;
  return fromWindow ? [...registered, fromWindow] : [...registered];
}

/** Asks a registered confirm flow. Without one, revoke proceeds the way it does today. */
export async function confirmAgentRevoke(request: RevokeRequest): Promise<boolean> {
  for (const hooks of installed()) {
    if (!hooks.confirmRevoke) continue;
    return Boolean(await hooks.confirmRevoke(request));
  }
  return true;
}

/** Hands the key to a registered reveal-once flow. Returns false when this screen should show it. */
export function handoffReveal(request: RevealRequest): boolean {
  for (const hooks of installed()) {
    if (!hooks.revealKey) continue;
    hooks.revealKey(request);
    return true;
  }
  return false;
}
