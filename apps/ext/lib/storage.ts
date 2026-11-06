import { storage } from "wxt/utils/storage";
import type { Address, Hex } from "viem";

export interface DoorWallet {
  name: string;
  address: Address;
  uuid?: string;
  rdns?: string;
  icon?: string;
}

export interface ShepherdVault {
  ownerKey: Hex;
  ownerAddress: Address;
  door?: DoorWallet;
  createdAt: number;
}

const VAULT_KEY = "shepherd.vault";

export async function loadVault(): Promise<ShepherdVault | null> {
  const raw = await storage.getItem<ShepherdVault | null>(`local:${VAULT_KEY}`);
  return raw ?? null;
}

export async function saveVault(vault: ShepherdVault): Promise<void> {
  await storage.setItem(`local:${VAULT_KEY}`, vault);
}

export async function clearVault(): Promise<void> {
  await storage.removeItem(`local:${VAULT_KEY}`);
}

export async function setDoor(door: DoorWallet | undefined): Promise<ShepherdVault | null> {
  const vault = await loadVault();
  if (!vault) return null;
  const next = { ...vault, door };
  await saveVault(next);
  return next;
}
