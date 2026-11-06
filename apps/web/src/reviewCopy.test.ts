import assert from "node:assert/strict";
import {
  approvalCopy,
  customReview,
  humanCall,
  intentReview,
  REVEAL_HIDDEN_NOTE,
  REVEAL_VISIBLE_NOTE,
  revokeSessionCopy,
  sendReview,
  TTL_NOTE,
} from "./reviewCopy.js";
import { clearKeyRevealed, forgetAgentRevealed, loadAgentRevealed, loadKeyRevealed, markAgentRevealed, markKeyRevealed } from "./persistence.js";

const memory = new Map<string, string>();
Object.defineProperty(globalThis, "sessionStorage", {
  value: {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => memory.set(key, value),
    removeItem: (key: string) => memory.delete(key),
  },
});

const sweep = humanCall("vault.sweep()");
assert.equal(sweep.title, "Sweep vault");
assert.equal(sweep.call, "vault.sweep()");

const ping = intentReview("ping");
assert.equal(ping.title, "In-policy ping");
assert.equal(ping.confirmLabel, "Send");
assert.deepEqual(
  ping.rows.map((row) => row.value),
  ["Root agent session", "vault.ping()", "0 ETH", "Allow", "Alt mempool"],
);
assert.match(ping.body, /Nothing is submitted until you confirm/);

const drain = intentReview("drain");
assert.equal(drain.title, "Injected drain");
assert.equal(drain.rows.find((row) => row.label === "Policy")?.value, "Deny");
assert.match(drain.body, /Demo/);

const queued = intentReview("sweep");
assert.equal(queued.confirmLabel, "Queue");
assert.equal(queued.rows.find((row) => row.label === "Route")?.value, "Waits for approval");

const custom = customReview({
  selector: "ping()",
  target: "0xabc…1234",
  valueEth: "0",
  verdict: "allow",
  queue: true,
});
assert.equal(custom.confirmLabel, "Send");
assert.equal(custom.title, "Custom call");

const high = customReview({
  selector: "sweep()",
  target: "0xabc…1234",
  valueEth: "0",
  verdict: "NeedsCosign",
  queue: true,
});
assert.equal(high.confirmLabel, "Queue");
assert.equal(high.title, "Custom call");
assert.equal(high.rows.find((row) => row.label === "Policy")?.value, "Needs co-sign");

const approval = approvalCopy({ agentId: "root", callLabel: "vault.sweep()", valueLabel: "0 ETH" });
assert.equal(approval.title, "Sweep vault");
assert.equal(approval.rows.find((row) => row.label === "Agent")?.value, "Root agent");
assert.equal(approval.rows.find((row) => row.label === "Why here")?.value, "Policy mode: needs co-sign");
assert.equal(approval.confirmLabel, "Approve");

const send = sendReview("0x1111111111111111111111111111111111111111", "0.01");
assert.equal(send.confirmLabel, "Send");
assert.equal(send.rows.find((row) => row.label === "Signed by")?.value, "Owner frame signer");
assert.match(send.body, /Nothing is submitted until you confirm/);

const revoke = revokeSessionCopy();
assert.match(revoke.rows.find((row) => row.label === "Stops")?.value ?? "", /VERIFY/);
assert.match(revoke.rows.find((row) => row.label === "Keys wiped")?.value ?? "", /session private key/i);

assert.match(TTL_NOTE, /Not enforced on-chain/);
assert.match(TTL_NOTE, /Revoke is the real stop/);
assert.match(REVEAL_VISIBLE_NOTE, /stays in this tab until you revoke/i);
assert.match(REVEAL_VISIBLE_NOTE, /will not be shown again/i);
assert.match(REVEAL_HIDDEN_NOTE, /Key revealed/);
assert.doesNotMatch(`${TTL_NOTE} ${REVEAL_VISIBLE_NOTE} ${REVEAL_HIDDEN_NOTE} ${ping.body}`, /Connected|prize walkthrough/i);

markKeyRevealed("0xAbC");
assert.equal(loadKeyRevealed(), "0xabc");
clearKeyRevealed();
assert.equal(loadKeyRevealed(), null);
markAgentRevealed("agent_a");
markAgentRevealed("agent_a");
assert.deepEqual(loadAgentRevealed(), ["agent_a"]);
assert.deepEqual(forgetAgentRevealed(["agent_a"]), []);

console.log("review copy ok");
