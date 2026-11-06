import assert from "node:assert/strict";
import { buildTree, delegate, MAX_CHILDREN, MAX_DEPTH, revokeCascadeOrder } from "./scope.js";

const now = 1_700_000_000n;
const parent = { parentExpiry: now + 10_000n, parentCap: 1_000n, now, ttlSeconds: 3600, requestedCap: null, depth: 0, childCount: 0 };

const same = delegate(parent);
assert.ok(!("error" in same));
if (!("error" in same)) {
  assert.equal(same.valueCap, 1_000n);
  assert.equal(same.expiry, now + 3600n);
}

const tooRich = delegate({ ...parent, requestedCap: 1_001n });
assert.ok("error" in tooRich);

const clipped = delegate({ ...parent, ttlSeconds: 50_000 });
assert.ok(!("error" in clipped));
if (!("error" in clipped)) assert.equal(clipped.expiry, parent.parentExpiry);

const deep = delegate({ ...parent, depth: MAX_DEPTH });
assert.ok("error" in deep);

const crowded = delegate({ ...parent, childCount: MAX_CHILDREN });
assert.ok("error" in crowded);

const dead = delegate({ ...parent, parentExpiry: now });
assert.ok("error" in dead);

const agents = [
  { id: "a", parentId: "root", depth: 1 },
  { id: "b", parentId: "a", depth: 2 },
  { id: "c", parentId: "a", depth: 2 },
  { id: "d", parentId: "root", depth: 1 },
];
const cascade = revokeCascadeOrder(agents, "a").map((row) => row.id);
assert.deepEqual(cascade, ["b", "c", "a"]);

const tree = buildTree(agents);
assert.equal(tree.length, 2);
assert.equal(tree[0]?.children.length, 2);

console.log("scope ok");
