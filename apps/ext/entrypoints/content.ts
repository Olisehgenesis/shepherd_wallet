import { injectScript } from "wxt/utils/inject-script";
import { MSG_SOURCE } from "../lib/config";
import type { ExtResponse } from "../lib/messages";

export default defineContentScript({
  matches: ["*://*/*"],
  runAt: "document_start",
  world: "ISOLATED",
  async main() {
    try {
      await injectScript("/inpage.js", { keepInDom: true });
    } catch (error) {
      console.warn("[shepherd-ext] inpage inject failed", error);
    }

    browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message?.type === "shepherd/doorDiscover") {
        void doorRoundTrip("discover")
          .then((doors) => sendResponse({ ok: true, data: doors } satisfies ExtResponse))
          .catch((error: Error) => sendResponse({ ok: false, error: error.message } satisfies ExtResponse));
        return true;
      }
      if (message?.type === "shepherd/doorConnect") {
        void doorRoundTrip("connect", message.uuid)
          .then((door) => sendResponse({ ok: true, data: door } satisfies ExtResponse))
          .catch((error: Error) => sendResponse({ ok: false, error: error.message } satisfies ExtResponse));
        return true;
      }
      return undefined;
    });

    window.addEventListener("message", (event) => {
      if (event.source !== window) return;
      const data = event.data as { source?: string; id?: string; method?: string; params?: unknown[] };
      if (data?.source !== MSG_SOURCE || !data.id || !data.method) return;

      void browser.runtime
        .sendMessage({
          type: "shepherd/provider",
          method: data.method,
          params: data.params ?? [],
        })
        .then((response: ExtResponse) => {
          if (response?.ok) {
            window.postMessage({ source: `${MSG_SOURCE}-result`, id: data.id, result: response.data }, "*");
          } else {
            window.postMessage(
              {
                source: `${MSG_SOURCE}-result`,
                id: data.id,
                error: { message: response?.error ?? "failed", code: response?.code },
              },
              "*",
            );
          }
        })
        .catch((error: Error) => {
          window.postMessage(
            {
              source: `${MSG_SOURCE}-result`,
              id: data.id,
              error: { message: error.message },
            },
            "*",
          );
        });
    });
  },
});

function doorRoundTrip(type: "discover" | "connect", uuid?: string) {
  const id = `door-${crypto.randomUUID()}`;
  return new Promise<unknown>((resolve, reject) => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== window) return;
      const data = event.data as {
        source?: string;
        id?: string;
        result?: unknown;
        error?: { message?: string };
      };
      if (data?.source !== `${MSG_SOURCE}-door-result` || data.id !== id) return;
      window.removeEventListener("message", onMessage);
      window.clearTimeout(timer);
      if (data.error) reject(new Error(data.error.message ?? "Door request failed"));
      else resolve(data.result);
    };
    const timer = window.setTimeout(() => {
      window.removeEventListener("message", onMessage);
      reject(new Error("Door request timed out. Reload the tab and unlock MetaMask/Rabby."));
    }, 90_000);
    window.addEventListener("message", onMessage);
    window.postMessage({ source: `${MSG_SOURCE}-door`, id, type, uuid }, "*");
  });
}
