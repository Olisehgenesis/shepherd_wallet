import { MSG_SOURCE } from "./config";

export type ExtRequest =
  | { type: "shepherd/getState" }
  | { type: "shepherd/create"; door?: import("./storage").DoorWallet }
  | { type: "shepherd/import"; ownerKey: `0x${string}`; door?: import("./storage").DoorWallet }
  | { type: "shepherd/linkDoor"; door: import("./storage").DoorWallet }
  | { type: "shepherd/unlinkDoor" }
  | { type: "shepherd/reset" }
  | { type: "shepherd/provider"; method: string; params?: unknown[] }
  | { type: "shepherd/doorDiscover" }
  | { type: "shepherd/doorConnect"; uuid?: string };

export type ExtResponse =
  | { ok: true; data: unknown }
  | { ok: false; error: string; code?: number };

export function isShepherdWindowMessage(data: unknown): data is {
  source: typeof MSG_SOURCE;
  id: string;
  method: string;
  params?: unknown[];
} {
  return (
    typeof data === "object" &&
    data !== null &&
    (data as { source?: string }).source === MSG_SOURCE &&
    typeof (data as { id?: unknown }).id === "string" &&
    typeof (data as { method?: unknown }).method === "string"
  );
}
