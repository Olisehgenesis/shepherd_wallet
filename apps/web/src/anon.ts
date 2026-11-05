import { AnonRpcWorker } from "@anon-rpc/browser-harness";
import { ANON_BOOTSTRAP_RPC, ANON_SPECIFIER, GATEWAY_URL } from "../../../packages/core/src/config.js";

export interface AnonSession {
  read: (method: string, params: unknown[]) => Promise<unknown>;
  close: () => void;
  ready: Promise<void>;
}

let singleton: AnonSession | null = null;

export function startAnon(onBootstrap: () => void): AnonSession {
  if (singleton) return singleton;
  onBootstrap();
  const worker = new AnonRpcWorker({
    address: ANON_SPECIFIER,
    preExisting: {
      rpcProvider: {
        request: async ({ method, params }) => {
          const response = await fetch(ANON_BOOTSTRAP_RPC, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params: params ?? [] }),
          });
          const body = (await response.json()) as { result?: unknown; error?: { message?: string } };
          if (body.error) throw new Error(body.error.message ?? "bootstrap failed");
          return body.result;
        },
      },
    },
  });
  singleton = {
    ready: worker.ready,
    close: () => worker.close(),
    read: async (method, params) => {
      const response = await worker.fetch(GATEWAY_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      });
      const body = (await response.json()) as { result?: unknown; error?: { message?: string } };
      if (body.error) throw new Error("anon read failed");
      return body.result;
    },
  };
  return singleton;
}
