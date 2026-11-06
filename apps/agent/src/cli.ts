import fs from "node:fs";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import {
  agentAct,
  chainId,
  CHAIN_ID,
  ensureFunds,
  expiryIfLive,
  grantSession,
  hasCode,
  highRiskCall,
  inPolicyCall,
  injectedCall,
  posture,
  readSession,
  readStake,
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

function friendly(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/funder|nonce|shared/i.test(message)) {
    return `${message} — shared genesis key is busy; retry in a few seconds or reuse .shepherd-state.json.`;
  }
  if (/already|stake/i.test(message)) return message;
  return message;
}

async function demo() {
  const state = load();
  const owner = privateKeyToAccount(state.ownerKey).address;
  const session = privateKeyToAccount(state.sessionKey).address;
  console.log(`chain expected ${CHAIN_ID}; live ${await chainId()}`);
  console.log("funding owner from shared genesis key (address omitted)");
  const funded = await ensureFunds(owner);
  console.log(`fund-from-shared\t${funded}`);
  let deployed: { policy: `0x${string}`; vault: `0x${string}`; account: `0x${string}` };
  const canReuse =
    Boolean(state.account && state.policy && state.vault) &&
    (await hasCode(state.account!)) &&
    (await hasCode(state.policy!)) &&
    (await hasCode(state.vault!));
  if (canReuse) {
    console.log("reusing deployed account from .shepherd-state.json");
    deployed = { account: state.account!, policy: state.policy!, vault: state.vault! };
  } else {
    if (state.account || state.policy || state.vault) {
      console.log("stored contracts have no code (devnet reset) — redeploying");
    } else {
      console.log("deploying policy, vault, account");
    }
    deployed = await setup(state.ownerKey);
    state.policy = deployed.policy;
    state.vault = deployed.vault;
    state.account = deployed.account;
    save(state);
  }
  const liveSession = await readSession(deployed.account, session);
  if (!liveSession.active) {
    const expiry = BigInt(Math.floor(Date.now() / 1000) + 86_400);
    line("grant-session", await grantSession(deployed.account, state.ownerKey, session, expiry));
  } else {
    console.log("grant-session\tskipped\talready-active\tlocal");
  }
  const liveExpiry = await expiryIfLive(BigInt(Math.floor(Date.now() / 1000)));
  if (!liveExpiry) {
    console.log("expiry-frame\tskipped\tverifier-has-no-code\tlocal");
    console.log("note\trevoke is the kill switch; an attached expiry frame is omitted when the verifier has no code");
  }
  const base = {
    account: deployed.account,
    policy: deployed.policy,
    sessionKey: state.sessionKey,
    expiry: liveExpiry,
  };
  line("canonical-storage", await agentAct({ ...base, call: inPolicyCall(deployed.vault) }, { route: "canonical", sign: true }));
  const stakeRow = await readStake(deployed.account);
  if (!stakeRow.staked) {
    line("alt-unstaked", await agentAct({ ...base, call: inPolicyCall(deployed.vault) }, { route: "alt", sign: true }));
    line("stake", await stake(deployed.account, state.ownerKey));
  } else {
    console.log("alt-unstaked\tskipped\talready-staked\tlocal");
    console.log("stake\tskipped\talready-staked\tlocal");
  }
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
  console.log("next: npm run checklist   or   npm run mcp");
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
  line(
    "sign-and-submit",
    await agentAct(
      {
        account: state.account,
        policy: state.policy,
        sessionKey: state.sessionKey,
        call: inPolicyCall(state.vault),
      },
      { route: "alt", sign: true },
    ),
  );
}

async function checklist() {
  console.log(`Shepherd demo checklist (~2 min)
1. npm run demo          — expect in-policy admitted + explorer URL
2. npm run dev           — open /console (or the Vercel URL)
3. Intents → In-policy ping     → admitted
4. Intents → Submit injected drain → rejected:TargetDenied
5. Intents → High-risk, wait → waiting:NeedsCosign
6. Intents → Co-sign and send → admitted
7. Reads → Read through Anon-RPC → anon share near 100%
8. Mempool → canonical reject, then alt after stake
9. Agents → spawn a child, propose ping, cascade revoke
10. Say out loud: agent key ≠ owner key; denial is in VERIFY before APPROVE

Do not show .shepherd-state.json or the session-key reveal on camera.
If expiry verifier has no code, revoke is the kill switch.
MCP: npm run mcp  (see AGENTS.md)
`);
}

const command = process.argv[2] ?? "demo";
const run = command === "propose" ? propose : command === "checklist" ? checklist : demo;
run().catch((error: unknown) => {
  console.error(friendly(error));
  process.exit(1);
});
