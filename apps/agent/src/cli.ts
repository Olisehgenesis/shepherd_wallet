import fs from "node:fs";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import {
  agentAct,
  chainId,
  CHAIN_ID,
  ensureFunds,
  expiryIfLive,
  grantSession,
  highRiskCall,
  inPolicyCall,
  injectedCall,
  posture,
  readSession,
  setup,
  stake,
  type Outcome,
} from "../../../packages/core/src/index.js";

const statePath = new URL("../../../.shepherd-state.json", import.meta.url);

interface State {
  ownerKey: `0x${string}`;
  sessionKey: `0x${string}`;
  policy?: `0x${string}`;
  vault?: `0x${string}`;
  account?: `0x${string}`;
}

function load(): State {
  if (!fs.existsSync(statePath)) {
    const fresh: State = { ownerKey: generatePrivateKey(), sessionKey: generatePrivateKey() };
    fs.writeFileSync(statePath, JSON.stringify(fresh, null, 2));
    return fresh;
  }
  return JSON.parse(fs.readFileSync(statePath, "utf8")) as State;
}

function save(state: State) {
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
}

function line(step: string, outcome: Outcome) {
  const link = outcome.explorerUrl ? ` ${outcome.explorerUrl}` : "";
  console.log(`${step}\t${outcome.verdict}\t${outcome.reason}\t${outcome.route}${link}`);
}

async function demo() {
  const state = load();
  const owner = privateKeyToAccount(state.ownerKey).address;
  const session = privateKeyToAccount(state.sessionKey).address;
  console.log(`chain expected ${CHAIN_ID}; live ${await chainId()}`);
  console.log(`funding owner (address omitted from this log)`);
  await ensureFunds(owner);
  console.log("deploying policy, vault, account");
  const deployed = await setup(state.ownerKey);
  state.policy = deployed.policy;
  state.vault = deployed.vault;
  state.account = deployed.account;
  save(state);
  const expiry = BigInt(Math.floor(Date.now() / 1000) + 86_400);
  line("grant-session", await grantSession(deployed.account, state.ownerKey, session, expiry));
  const liveExpiry = await expiryIfLive(BigInt(Math.floor(Date.now() / 1000)));
  const base = {
    account: deployed.account,
    policy: deployed.policy,
    sessionKey: state.sessionKey,
    expiry: liveExpiry,
  };
  line("canonical-storage", await agentAct({ ...base, call: inPolicyCall(deployed.vault) }, { route: "canonical", sign: true }));
  line("alt-unstaked", await agentAct({ ...base, call: inPolicyCall(deployed.vault) }, { route: "alt", sign: true }));
  line("stake", await stake(deployed.account, state.ownerKey));
  line("in-policy", await agentAct({ ...base, call: inPolicyCall(deployed.vault) }, { route: "alt", sign: true }));
  line("injected", await agentAct({ ...base, call: injectedCall() }, { route: "alt", sign: true }));
  line("high-risk-wait", await agentAct({ ...base, call: highRiskCall(deployed.vault) }, { route: "alt", sign: false }));
  line(
    "high-risk-cosign",
    await agentAct(
      { ...base, call: highRiskCall(deployed.vault), cosign: { scheme: "secp256k1", key: state.ownerKey } },
      { route: "alt", sign: true },
    ),
  );
  const after = await posture(deployed.account, session);
  const row = await readSession(deployed.account, session);
  console.log(`session active=${after.active} staked=${after.staked} cap=${row.valueCap.toString()}`);
  console.log("owner and session keys are in .shepherd-state.json (gitignored, devnet only)");
}

async function propose() {
  const state = load();
  if (!state.account || !state.policy || !state.vault) throw new Error("run demo setup first");
  const outcome = await agentAct(
    {
      account: state.account,
      policy: state.policy,
      sessionKey: state.sessionKey,
      call: inPolicyCall(state.vault),
    },
    { route: "alt", sign: false },
  );
  line("propose", outcome);
  if (outcome.reason !== "allow") return;
  line("sign-and-submit", await agentAct(
    {
      account: state.account,
      policy: state.policy,
      sessionKey: state.sessionKey,
      call: inPolicyCall(state.vault),
    },
    { route: "alt", sign: true },
  ));
}

const command = process.argv[2] ?? "demo";
const run = command === "propose" ? propose : demo;
run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "failed";
  console.error(message);
  process.exit(1);
});
