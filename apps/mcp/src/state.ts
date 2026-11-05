import fs from "node:fs";
import type { Address, Hex } from "viem";

const statePath = new URL("../../../.shepherd-state.json", import.meta.url);

export interface AgentRecord {
  id: string;
  parentId: string;
  depth: number;
  address: Address;
  sessionKey: Hex;
  valueCap: string;
  expiry: string;
}

export interface ShepherdState {
  ownerKey: Hex;
  sessionKey: Hex;
  policy?: Address;
  vault?: Address;
  account?: Address;
  agents?: AgentRecord[];
}

export function loadState(): ShepherdState {
  if (!fs.existsSync(statePath)) {
    throw new Error("No .shepherd-state.json. Run npm run demo so the account and the root session exist, then spawn.");
  }
  return JSON.parse(fs.readFileSync(statePath, "utf8")) as ShepherdState;
}

export function saveState(state: ShepherdState) {
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
}

export function requireDeployed(state: ShepherdState): { policy: Address; vault: Address; account: Address } {
  if (!state.policy || !state.vault || !state.account) {
    throw new Error("The state file has keys but no deployed account. Run npm run demo, then call shepherd_spawn_agent.");
  }
  return { policy: state.policy, vault: state.vault, account: state.account };
}
