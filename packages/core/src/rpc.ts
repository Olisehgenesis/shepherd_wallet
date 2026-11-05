import { GATEWAY_URL } from "./config.js";
import { redact, verdictFromMessage } from "./redact.js";

export class ChainError extends Error {
  verdict: string;
  constructor(message: string) {
    super(redact(message));
    this.verdict = verdictFromMessage(message);
  }
}

export async function rpc(method: string, params: unknown[], url = GATEWAY_URL): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "network unreachable";
    throw new ChainError(message);
  }
  const body = (await response.json()) as { result?: unknown; error?: { code?: number; message?: string } };
  if (body.error) throw new ChainError(body.error.message ?? `rpc ${body.error.code ?? "error"}`);
  return body.result;
}

export async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
