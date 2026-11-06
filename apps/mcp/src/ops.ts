import fs from "node:fs";

const opsPath = new URL("../../../.shepherd-ops.jsonl", import.meta.url);

/** Redacted ops line. No addresses, payloads, or keys. */
export function appendOps(method: string, route: "alt" | "canonical" | "local" | "clear", verdict: string) {
  const line = JSON.stringify({
    at: new Date().toISOString(),
    method,
    route,
    verdict,
  });
  fs.appendFileSync(opsPath, `${line}\n`);
}
