import type { ExtRequest, ExtResponse } from "../../lib/messages";
import type { DoorWallet } from "../../lib/storage";

export interface WalletState {
  ready: boolean;
  chainId: number;
  chainName: string;
  address?: string;
  balanceEth?: string;
  door?: DoorWallet | null;
  createdAt?: number;
}

async function call<T>(message: ExtRequest): Promise<T> {
  const response = (await browser.runtime.sendMessage(message)) as ExtResponse;
  if (!response?.ok) throw new Error(response?.error ?? "Extension request failed");
  return response.data as T;
}

export const api = {
  getState: () => call<WalletState>({ type: "shepherd/getState" }),
  create: (door?: DoorWallet) => call({ type: "shepherd/create", door }),
  importKey: (ownerKey: `0x${string}`, door?: DoorWallet) =>
    call({ type: "shepherd/import", ownerKey, door }),
  linkDoor: (door: DoorWallet) => call({ type: "shepherd/linkDoor", door }),
  unlinkDoor: () => call({ type: "shepherd/unlinkDoor" }),
  reset: () => call({ type: "shepherd/reset" }),
  discoverDoors: () => call<Array<DoorWallet & { uuid: string }>>({ type: "shepherd/doorDiscover" }),
  connectDoor: (uuid?: string) => call<DoorWallet>({ type: "shepherd/doorConnect", uuid }),
};

export function shortAddress(value: string) {
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}
