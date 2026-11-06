import { formatEther } from "viem";
import type { ExtRequest, ExtResponse } from "../lib/messages";
import { loadVault } from "../lib/storage";
import {
  createShepherdWallet,
  getBalanceWei,
  importShepherdWallet,
  linkDoor,
  providerRequest,
  resetWallet,
  unlinkDoor,
} from "../lib/wallet";
import { CHAIN_ID, CHAIN_NAME } from "../lib/config";

export default defineBackground(() => {
  browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    void handle(message as ExtRequest)
      .then((data) => sendResponse({ ok: true, data } satisfies ExtResponse))
      .catch((error: unknown) => {
        const err = error as { message?: string; code?: number };
        sendResponse({
          ok: false,
          error: err.message ?? "request failed",
          code: err.code,
        } satisfies ExtResponse);
      });
    return true;
  });

  console.info("[shepherd-ext] background ready");
});

async function handle(message: ExtRequest): Promise<unknown> {
  switch (message.type) {
    case "shepherd/getState": {
      const vault = await loadVault();
      if (!vault) {
        return {
          ready: false,
          chainId: CHAIN_ID,
          chainName: CHAIN_NAME,
        };
      }
      let balanceEth = "0";
      try {
        balanceEth = formatEther(await getBalanceWei(vault.ownerAddress));
      } catch {
        balanceEth = "—";
      }
      return {
        ready: true,
        chainId: CHAIN_ID,
        chainName: CHAIN_NAME,
        address: vault.ownerAddress,
        door: vault.door ?? null,
        balanceEth,
        createdAt: vault.createdAt,
      };
    }
    case "shepherd/create":
      return createShepherdWallet(message.door);
    case "shepherd/import":
      return importShepherdWallet(message.ownerKey, message.door);
    case "shepherd/linkDoor":
      return linkDoor(message.door);
    case "shepherd/unlinkDoor":
      return unlinkDoor();
    case "shepherd/reset":
      await resetWallet();
      return { reset: true };
    case "shepherd/provider":
      return providerRequest(message.method, message.params ?? []);
    case "shepherd/doorDiscover":
      return sendToActiveTab({ type: "shepherd/doorDiscover" });
    case "shepherd/doorConnect":
      return sendToActiveTab({ type: "shepherd/doorConnect", uuid: message.uuid });
    default:
      throw new Error(`Unknown message ${(message as { type: string }).type}`);
  }
}

async function sendToActiveTab(payload: object) {
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];
  if (!tab?.id) throw new Error("No active tab. Open a normal https page first.");
  if (tab.url?.startsWith("chrome://") || tab.url?.startsWith("chrome-extension://")) {
    throw new Error("Open a normal https site first (doors inject there, not on chrome:// pages).");
  }
  const response = (await browser.tabs.sendMessage(tab.id, payload)) as ExtResponse;
  if (!response?.ok) throw new Error(response?.error ?? "Door request failed");
  return response.data;
}
