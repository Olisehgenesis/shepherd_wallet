import assert from "node:assert/strict";
import { ALLOW, HIGH } from "../../../../packages/core/src/abi.js";
import { plainSignature } from "../selectors.js";
import {
  agentDisplayName,
  formatCapEth,
  permissionBadge,
  permissionChoiceToMode,
  permissionPhrase,
  presentCall,
  summaryCall,
} from "./copy.js";

assert.equal(permissionChoiceToMode("allow"), ALLOW);
assert.equal(permissionChoiceToMode("allow"), 1);
assert.equal(permissionChoiceToMode("cosign"), HIGH);
assert.equal(permissionChoiceToMode("cosign"), 2);
assert.equal(permissionChoiceToMode("deny"), 0);

assert.equal(permissionPhrase(ALLOW), "allow");
assert.equal(permissionPhrase(HIGH), "needs your co-sign");
assert.equal(permissionPhrase(0), "deny");
assert.deepEqual(permissionBadge(HIGH), { label: "Needs your co-sign", tone: "cosign" });

assert.deepEqual(presentCall("vault.ping()", "0x5c36b186"), {
  title: "Ping vault",
  signature: "vault.ping()",
});
assert.deepEqual(presentCall("vault.sweep()", "0x01681a62"), {
  title: "Sweep vault",
  signature: "vault.sweep()",
});
assert.equal(presentCall("allow 0xabcdef01", "0xabcdef01").title, "Custom call");
assert.equal(presentCall("allow 0xabcdef01", "0xabcdef01").signature.includes("0x"), false);
assert.deepEqual(presentCall("Morning ping — vault.ping()", "0x5c36b186"), {
  title: "Morning ping",
  signature: "vault.ping()",
});
assert.equal(summaryCall("vault.ping()", "0x5c36b186"), "vault.ping()");
assert.equal(summaryCall("high-risk 0x01681a62", "0x01681a62").includes("0x"), false);

assert.equal(agentDisplayName({ id: "root" }), "Root agent");
assert.equal(agentDisplayName({ id: "agent_abcd1234", name: "Treasury" }), "Treasury");
assert.equal(agentDisplayName({ id: "agent_abcd1234" }), "Child agent abcd");

assert.equal(plainSignature("vault.ping()"), "ping()");
assert.equal(plainSignature("vault.echo()"), "echo()");
assert.equal(plainSignature("ping()"), "ping()");
assert.equal(plainSignature("transfer(address,uint256)"), "transfer(address,uint256)");
assert.equal(plainSignature("  0x5c36b186"), "0x5c36b186");
assert.equal(formatCapEth("1000000000000000"), "0.001 ETH");
assert.equal(formatCapEth("0"), "0 ETH");

console.log("agents copy ok");
