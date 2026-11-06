import { ETHREX_URL, GATEWAY_URL } from "./config";

export async function ethRpc(method: string, params: unknown[] = [], url = ETHREX_URL): Promise<unknown> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const body = (await response.json()) as { result?: unknown; error?: { message?: string } };
  if (body.error) throw new Error(body.error.message ?? "rpc error");
  return body.result;
}

export async function gatewayRpc(method: string, params: unknown[] = []): Promise<unknown> {
  return ethRpc(method, params, GATEWAY_URL);
}
