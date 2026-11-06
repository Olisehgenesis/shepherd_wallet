/**
 * Local Anon-RPC bridge (approach A).
 *
 * Node agents (MCP) cannot run the browser harness. The open Shepherd console
 * holds the harness; this localhost bridge relays eth_* reads to that tab.
 * Frame submissions stay clear — the mempool must see them.
 *
 * Bind: 127.0.0.1 only. No auth beyond loopback (hackathon posture).
 */
import http from "node:http";
import { ANON_BRIDGE_PORT } from "./config.js";

export const ANON_BRIDGE_HOST = "127.0.0.1";
export const ANON_READ_METHODS = new Set([
  "eth_call",
  "eth_chainId",
  "eth_getBalance",
  "eth_getCode",
  "eth_getTransactionCount",
  "eth_gasPrice",
  "eth_getBlockByNumber",
]);

type Job = {
  id: string;
  method: string;
  params: unknown[];
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

type BridgeState = {
  server: http.Server | null;
  jobs: Map<string, Job>;
  queue: string[];
  waiters: Array<() => void>;
  browserSeenAt: number;
  startedByUs: boolean;
};

const state: BridgeState = {
  server: null,
  jobs: new Map(),
  queue: [],
  waiters: [],
  browserSeenAt: 0,
  startedByUs: false,
};

const BROWSER_TTL_MS = 15_000;
const JOB_TTL_MS = 30_000;

function browserConnected() {
  return Date.now() - state.browserSeenAt < BROWSER_TTL_MS;
}

function touchBrowser() {
  state.browserSeenAt = Date.now();
}

function wakeWaiters() {
  const waiters = state.waiters.splice(0);
  for (const wake of waiters) wake();
}

function json(res: http.ServerResponse, status: number, body: unknown) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type",
  });
  res.end(payload);
}

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function statusBody() {
  return {
    ok: true,
    browserConnected: browserConnected(),
    pending: state.queue.length,
    port: ANON_BRIDGE_PORT,
  };
}

async function handle(req: http.IncomingMessage, res: http.ServerResponse) {
  const url = new URL(req.url ?? "/", `http://${ANON_BRIDGE_HOST}:${ANON_BRIDGE_PORT}`);
  if (req.method === "OPTIONS") {
    json(res, 204, {});
    return;
  }

  if (req.method === "GET" && url.pathname === "/health") {
    json(res, 200, statusBody());
    return;
  }

  if (req.method === "POST" && url.pathname === "/hello") {
    touchBrowser();
    json(res, 200, { ok: true });
    return;
  }

  if (req.method === "GET" && url.pathname === "/jobs") {
    touchBrowser();
    const waitMs = Math.min(25_000, Math.max(0, Number(url.searchParams.get("wait") ?? "20000")));
    const started = Date.now();
    while (state.queue.length === 0 && Date.now() - started < waitMs) {
      await new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, waitMs - (Date.now() - started));
        state.waiters.push(() => {
          clearTimeout(timer);
          resolve();
        });
      });
      touchBrowser();
    }
    const id = state.queue.shift();
    if (!id) {
      json(res, 200, { job: null });
      return;
    }
    const job = state.jobs.get(id);
    if (!job) {
      json(res, 200, { job: null });
      return;
    }
    json(res, 200, { job: { id: job.id, method: job.method, params: job.params } });
    return;
  }

  if (req.method === "POST" && url.pathname.startsWith("/jobs/") && url.pathname.endsWith("/result")) {
    touchBrowser();
    const id = url.pathname.slice("/jobs/".length, -"/result".length);
    const raw = await readBody(req);
    let body: { result?: unknown; error?: string };
    try {
      body = JSON.parse(raw) as { result?: unknown; error?: string };
    } catch {
      json(res, 400, { error: "invalid json" });
      return;
    }
    const job = state.jobs.get(id);
    if (!job) {
      json(res, 404, { error: "unknown job" });
      return;
    }
    clearTimeout(job.timer);
    state.jobs.delete(id);
    if (body.error) job.reject(new Error(body.error));
    else job.resolve(body.result);
    json(res, 200, { ok: true });
    return;
  }

  if (req.method === "POST" && url.pathname === "/rpc") {
    const raw = await readBody(req);
    let body: { method?: string; params?: unknown[] };
    try {
      body = JSON.parse(raw) as { method?: string; params?: unknown[] };
    } catch {
      json(res, 400, { error: "invalid json" });
      return;
    }
    if (!body.method || typeof body.method !== "string") {
      json(res, 400, { error: "method required" });
      return;
    }
    if (!browserConnected()) {
      json(res, 503, {
        error: "Open the Shepherd console (npm run dev) so Anon-RPC can serve agent reads.",
      });
      return;
    }
    try {
      const result = await enqueueJob(body.method, Array.isArray(body.params) ? body.params : []);
      json(res, 200, { result });
    } catch (error) {
      json(res, 504, { error: error instanceof Error ? error.message : "anon bridge timeout" });
    }
    return;
  }

  json(res, 404, { error: "not found" });
}

function enqueueJob(method: string, params: unknown[]): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const id = `job_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    const timer = setTimeout(() => {
      state.jobs.delete(id);
      const idx = state.queue.indexOf(id);
      if (idx >= 0) state.queue.splice(idx, 1);
      reject(new Error("Anon bridge timed out waiting for the console harness."));
    }, JOB_TTL_MS);
    state.jobs.set(id, { id, method, params, resolve, reject, timer });
    state.queue.push(id);
    wakeWaiters();
  });
}

export function anonBridgeUrl(port = ANON_BRIDGE_PORT) {
  return `http://${ANON_BRIDGE_HOST}:${port}`;
}

export async function anonBridgeStatus(base = anonBridgeUrl()): Promise<{
  ok: boolean;
  browserConnected: boolean;
  pending: number;
  port: number;
} | null> {
  try {
    const response = await fetch(`${base}/health`, { signal: AbortSignal.timeout(1500) });
    if (!response.ok) return null;
    return (await response.json()) as { ok: boolean; browserConnected: boolean; pending: number; port: number };
  } catch {
    return null;
  }
}

/** Start the bridge if nothing is listening. Idempotent across Vite + MCP. */
export async function ensureAnonBridge(port = ANON_BRIDGE_PORT): Promise<{ url: string; started: boolean }> {
  const existing = await anonBridgeStatus(anonBridgeUrl(port));
  if (existing?.ok) return { url: anonBridgeUrl(port), started: false };
  if (state.server) return { url: anonBridgeUrl(port), started: true };

  await new Promise<void>((resolve, reject) => {
    const server = http.createServer((req, res) => {
      void handle(req, res).catch((error) => {
        json(res, 500, { error: error instanceof Error ? error.message : "bridge error" });
      });
    });
    server.on("error", (error: NodeJS.ErrnoException) => {
      if (error.code === "EADDRINUSE") {
        state.server = null;
        resolve();
        return;
      }
      reject(error);
    });
    server.listen(port, ANON_BRIDGE_HOST, () => {
      state.server = server;
      state.startedByUs = true;
      resolve();
    });
  });

  return { url: anonBridgeUrl(port), started: state.startedByUs };
}

export async function rpcViaAnonBridge(
  method: string,
  params: unknown[],
  base = anonBridgeUrl(),
): Promise<unknown> {
  const response = await fetch(`${base}/rpc`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ method, params }),
    signal: AbortSignal.timeout(JOB_TTL_MS + 2000),
  });
  const body = (await response.json()) as { result?: unknown; error?: string };
  if (!response.ok) throw new Error(body.error ?? `anon bridge HTTP ${response.status}`);
  return body.result;
}

export function isAnonReadMethod(method: string) {
  return ANON_READ_METHODS.has(method);
}
