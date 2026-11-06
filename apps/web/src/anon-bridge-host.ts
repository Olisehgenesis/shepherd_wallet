import { ANON_BRIDGE_PORT } from "../../../packages/core/src/config.js";
import type { AnonSession } from "./anon";

const BASE = `http://127.0.0.1:${ANON_BRIDGE_PORT}`;

/**
 * Keeps the open console registered with the localhost Anon bridge and
 * fulfils MCP/agent eth_* reads through the browser harness.
 */
export function startAnonBridgeHost(session: AnonSession): () => void {
  let stopped = false;
  let loop: Promise<void> | null = null;

  async function hello() {
    await fetch(`${BASE}/hello`, { method: "POST" });
  }

  async function run() {
    while (!stopped) {
      try {
        await hello();
        const response = await fetch(`${BASE}/jobs?wait=20000`);
        if (!response.ok) {
          await sleep(1500);
          continue;
        }
        const body = (await response.json()) as {
          job: null | { id: string; method: string; params: unknown[] };
        };
        if (stopped) return;
        if (!body.job) continue;
        try {
          const result = await session.read(body.job.method, body.job.params);
          await fetch(`${BASE}/jobs/${body.job.id}/result`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ result }),
          });
        } catch (error) {
          await fetch(`${BASE}/jobs/${body.job.id}/result`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              error: error instanceof Error ? error.message : "harness read failed",
            }),
          });
        }
      } catch {
        if (stopped) return;
        await sleep(2000);
      }
    }
  }

  loop = run();
  return () => {
    stopped = true;
    void loop;
  };
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
