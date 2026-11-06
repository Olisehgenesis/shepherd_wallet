import assert from "node:assert/strict";
import { expiryPhrase, modelHome, trimEth, type HomeSnapshot } from "./home-state.ts";

const base: HomeSnapshot = {
  hasOwner: true,
  hasExtension: false,
  deployed: true,
  backedUp: true,
  sessionActive: true,
  pendingCoSigns: 0,
};

const preparedNoWallet = modelHome({
  ...base,
  hasExtension: false,
  backedUp: true,
  sessionActive: false,
});

assert.equal(preparedNoWallet.connectWalletHeadline, false);
assert.equal(preparedNoWallet.showFirstRun, false);
assert.equal(preparedNoWallet.showBalance, true);
assert.equal(preparedNoWallet.next, "grant");
assert.equal(preparedNoWallet.connectWalletHeadline, false);

const withExtension = modelHome({ ...base, hasExtension: true, sessionActive: false, backedUp: false });
const withoutExtension = modelHome({ ...base, hasExtension: false, sessionActive: false, backedUp: false });
assert.deepEqual(withExtension, withoutExtension);
assert.equal(withExtension.next, "backup");
assert.equal(withExtension.showBalance, true);
assert.ok(withExtension.needsYou.includes("backup"));

const notDeployed = modelHome({ ...base, deployed: false, hasExtension: false, sessionActive: false });
assert.equal(notDeployed.next, "prepare");
assert.ok(notDeployed.needsYou.includes("prepare"));
assert.equal(notDeployed.connectWalletHeadline, false);

const firstRun = modelHome({ ...base, hasOwner: false, deployed: false, backedUp: false, sessionActive: false, hasExtension: false });
assert.equal(firstRun.showFirstRun, true);
assert.equal(firstRun.showBalance, false);
assert.equal(firstRun.connectWalletHeadline, false);

const extensionButNoOwner = modelHome({
  hasOwner: false,
  hasExtension: true,
  deployed: false,
  backedUp: false,
  sessionActive: false,
  pendingCoSigns: 0,
});
assert.equal(extensionButNoOwner.showFirstRun, true);

const cosign = modelHome({ ...base, pendingCoSigns: 2 });
assert.ok(cosign.needsYou.includes("cosign"));
assert.equal(cosign.next, null);

assert.equal(trimEth("0.040000"), "0.04");
assert.equal(trimEth("1.0000"), "1");
assert.equal(trimEth("0"), "0");

const tomorrow = new Date();
tomorrow.setHours(12, 0, 0, 0);
tomorrow.setDate(tomorrow.getDate() + 1);
assert.equal(expiryPhrase(Math.floor(tomorrow.getTime() / 1000), Date.now()), "Expires tomorrow");
assert.equal(expiryPhrase(Math.floor(Date.now() / 1000) - 10), "Expired");

console.log("home-state ok");
