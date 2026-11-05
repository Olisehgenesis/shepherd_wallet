import { useEffect, useMemo, useState } from "react";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import type { Address, Hex } from "viem";
import {
  agentAct,
  ensureFunds,
  expiryIfLive,
  grantSession,
  highRiskCall,
  inPolicyCall,
  injectedCall,
  posture,
  registerP256,
  revoke,
  setup,
  stake,
  p256Identity,
  type Outcome,
} from "../../../packages/core/src/index.js";
import { startAnon, type AnonSession } from "./anon";
import { Landing, Mark } from "./Landing";

type Page = "overview" | "session" | "intents" | "reads" | "mempool";
type Route = "anon" | "clear";
interface LogRow {
  id: number;
  method: string;
  route: Route;
  verdict: string;
}
interface Deployed {
  policy: Address;
  vault: Address;
  account: Address;
}
interface WalletInfo {
  uuid: string;
  name: string;
  rdns: string;
}

const OWNER = "shepherd.owner";
const SESSION = "shepherd.session";
const P256 = "shepherd.p256";
const DEPLOY = "shepherd.deploy";

function loadHex(key: string): Hex | null {
  const value = sessionStorage.getItem(key);
  return value && value.startsWith("0x") ? (value as Hex) : null;
}

function saveHex(key: string, value: Hex) {
  sessionStorage.setItem(key, value);
}

const ENTERED = "shepherd.entered";

export function App() {
  const [entered, setEntered] = useState(() => sessionStorage.getItem(ENTERED) === "1");
  if (!entered) {
    return (
      <Landing
        onEnter={() => {
          sessionStorage.setItem(ENTERED, "1");
          setEntered(true);
        }}
      />
    );
  }
  return (
    <Console
      onLeave={() => {
        sessionStorage.removeItem(ENTERED);
        setEntered(false);
      }}
    />
  );
}

function Console({ onLeave }: { onLeave: () => void }) {
  const [page, setPage] = useState<Page>("overview");
  const [ownerKey, setOwnerKey] = useState<Hex | null>(() => loadHex(OWNER));
  const [sessionKey, setSessionKey] = useState<Hex | null>(() => loadHex(SESSION));
  const [p256Key, setP256Key] = useState<Hex | null>(() => loadHex(P256));
  const [deployed, setDeployed] = useState<Deployed | null>(() => {
    const raw = sessionStorage.getItem(DEPLOY);
    return raw ? (JSON.parse(raw) as Deployed) : null;
  });
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [anon, setAnon] = useState<AnonSession | null>(null);
  const [anonState, setAnonState] = useState<"starting" | "ready" | "failed">("starting");
  const [wallets, setWallets] = useState<WalletInfo[]>([]);
  const [linked, setLinked] = useState<string>("none");
  const [postureText, setPostureText] = useState("not deployed");
  const [reveal, setReveal] = useState(false);
  const [chainLabel, setChainLabel] = useState("devnet");

  function push(method: string, route: Route, verdict: string) {
    setLogs((rows) => [{ id: rows.length + 1, method, route, verdict }, ...rows].slice(0, 40));
  }

  useEffect(() => {
    const session = startAnon(() => push("specifier.workerHash", "clear", "bootstrap"));
    let cancel = false;
    session.ready
      .then(async () => {
        if (cancel) return;
        setAnon(session);
        setAnonState("ready");
        const id = await session.read("eth_chainId", []);
        push("eth_chainId", "anon", "ok");
        setChainLabel(`chain ${Number(id)}`);
      })
      .catch(() => {
        if (!cancel) setAnonState("failed");
      });
    return () => {
      cancel = true;
    };
    // The harness is started once per page load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const found = new Map<string, WalletInfo>();
    const onAnnounce = (event: Event) => {
      const detail = (event as CustomEvent<{ info: WalletInfo; provider: unknown }>).detail;
      if (!detail?.info) return;
      found.set(detail.info.uuid, { uuid: detail.info.uuid, name: detail.info.name, rdns: detail.info.rdns });
      setWallets([...found.values()]);
    };
    window.addEventListener("eip6963:announceProvider", onAnnounce);
    window.dispatchEvent(new Event("eip6963:requestProvider"));
    return () => window.removeEventListener("eip6963:announceProvider", onAnnounce);
  }, []);

  const anonShare = useMemo(() => {
    const reads = logs.filter((row) => row.method.startsWith("eth_"));
    if (reads.length === 0) return 0;
    const anonCount = reads.filter((row) => row.route === "anon").length;
    return Math.round((anonCount / reads.length) * 100);
  }, [logs]);

  async function run(method: string, task: () => Promise<Outcome | void>) {
    setBusy(true);
    try {
      const outcome = await task();
      if (outcome) push(method, "clear", `${outcome.verdict}:${outcome.reason}`);
    } catch {
      push(method, "clear", "rejected");
    } finally {
      setBusy(false);
    }
  }

  function requireOwner(): Hex {
    if (ownerKey) return ownerKey;
    const next = generatePrivateKey();
    saveHex(OWNER, next);
    setOwnerKey(next);
    return next;
  }

  async function deploy() {
    const key = requireOwner();
    await run("deploy", async () => {
      const owner = privateKeyToAccount(key).address;
      await ensureFunds(owner);
      const next = await setup(key);
      sessionStorage.setItem(DEPLOY, JSON.stringify(next));
      setDeployed(next);
      return { verdict: "ready", reason: "deployed", route: "canonical" };
    });
  }

  async function issue() {
    if (!deployed || !ownerKey) return;
    const key = sessionKey ?? generatePrivateKey();
    saveHex(SESSION, key);
    setSessionKey(key);
    const expiry = BigInt(Math.floor(Date.now() / 1000) + 86_400);
    await run("grantSession", () => grantSession(deployed.account, ownerKey, privateKeyToAccount(key).address, expiry));
    await refresh();
  }

  async function refresh() {
    if (!deployed || !sessionKey || !anon) return;
    try {
      const row = await posture(deployed.account, privateKeyToAccount(sessionKey).address);
      push("posture", "clear", row.active ? "active" : "inactive");
      setPostureText(row.active ? (row.staked ? "session active, staked" : "session active, unstaked") : "no active session");
    } catch {
      push("posture", "clear", "rejected");
    }
  }

  async function readBalanceAnon() {
    if (!anon || !deployed) return;
    try {
      await anon.read("eth_getBalance", [deployed.account, "latest"]);
      push("eth_getBalance", "anon", "ok");
      await anon.read("eth_getCode", [deployed.account, "latest"]);
      push("eth_getCode", "anon", "ok");
    } catch {
      push("eth_call", "anon", "rejected");
    }
  }

  const sessionAddress = sessionKey ? privateKeyToAccount(sessionKey).address : null;
  const p256Address = p256Key ? p256Identity(p256Key).address : null;

  return (
    <div className="shell">
      <aside className="side">
        <button className="mark" type="button" onClick={onLeave}>
          <Mark />
          Shepherd
        </button>
        {(
          [
            ["overview", "Overview"],
            ["session", "Session"],
            ["intents", "Intents"],
            ["reads", "Reads"],
            ["mempool", "Mempool"],
          ] as const
        ).map(([id, label]) => (
          <button key={id} className="nav-btn" aria-current={page === id ? "page" : undefined} onClick={() => setPage(id)}>
            {label}
          </button>
        ))}
        <p className="side-note">Alt mempool devnet. Keys stay in this tab. The agent stub never receives the owner key.</p>
      </aside>
      <main className="main">
        <header className="top">
          <div>
            <h1>{title(page)}</h1>
            <p className="lede">{lede(page)}</p>
          </div>
          <div className="chips">
            <span className="chip">{chainLabel}</span>
            <span className={anonState === "ready" ? "chip ok" : anonState === "failed" ? "chip bad" : "chip wait"}>
              {anonState === "ready" ? "Anon-RPC harness" : anonState === "failed" ? "harness failed" : "harness starting"}
            </span>
            <span className="chip info">{anonShare}% anon reads</span>
          </div>
        </header>

        {page === "overview" && (
          <div className="grid">
            <section className="card">
              <h2>Posture</h2>
              <p>{postureText}</p>
              <div className="row">
                <button className="btn" disabled={busy} onClick={() => void deploy()}>
                  {deployed ? "Redeploy account" : "Deploy account"}
                </button>
                <button className="btn-ghost" disabled={busy || !deployed} onClick={() => void refresh()}>
                  Refresh posture
                </button>
              </div>
            </section>
            <section className="card">
              <h2>Anon share</h2>
              <div className="meter" aria-hidden="true">
                <span style={{ width: `${anonShare}%` }} />
              </div>
              <p className="lede">{anonShare}% of chain reads used the harness. The mainnet bootstrap and transaction submissions stay in the clear.</p>
            </section>
            <section className="card" style={{ gridColumn: "1 / -1" }}>
              <h2>Trust</h2>
              <div className="callout">
                <strong>The worker sees request bodies.</strong> The reference specifier fulfils calls with ordinary fetch, so this harness does not unlink your IP. It does keep the worker off your keys, cookies, and DOM. One bootstrap read to mainnet is in the clear, on purpose.
              </div>
            </section>
          </div>
        )}

        {page === "session" && (
          <div className="grid">
            <section className="card">
              <h2>Human key</h2>
              <p>{ownerKey ? "Local owner key is in this tab." : "No owner key yet. Deploying creates one."}</p>
              <h2>Injected wallets</h2>
              {wallets.length === 0 && <p className="lede">No EIP-6963 wallet announced. Any injected wallet can appear here. Shepherd does not look only for MetaMask.</p>}
              {wallets.map((wallet) => (
                <div className="wallet" key={wallet.uuid}>
                  <span>{wallet.name}</span>
                  <button className="btn-ghost" onClick={() => setLinked(wallet.name)}>
                    {linked === wallet.name ? "Linked" : "Link name"}
                  </button>
                </div>
              ))}
              <p className="lede">Linking records the wallet name only. Frame hashes are signed by the local owner key, because injected wallets do not sign EIP-8141 digests.</p>
            </section>
            <section className="card">
              <h2>Agent session</h2>
              <p>{sessionAddress ? "Session key issued. It is not the owner." : "No session yet."}</p>
              <div className="row">
                <button className="btn" disabled={busy || !deployed} onClick={() => void issue()}>
                  Issue session key
                </button>
                <button
                  className="btn-danger"
                  disabled={busy || !deployed || !ownerKey || !sessionAddress}
                  onClick={() => deployed && ownerKey && sessionAddress && void run("revokeSession", () => revoke(deployed.account, ownerKey, sessionAddress))}
                >
                  Revoke
                </button>
              </div>
              <div className="row" style={{ marginTop: 8 }}>
                <button className="btn-ghost" disabled={!sessionKey} onClick={() => setReveal(true)}>
                  Reveal session key once
                </button>
              </div>
              {reveal && sessionKey && <p className="warn">Shown once for a separate agent process. It is not written to the ops log.</p>}
              {reveal && sessionKey && <input readOnly value={sessionKey} aria-label="session key" style={{ width: "100%" }} />}
              <h2>P256 co-signer</h2>
              <p>{p256Address ? "P256 co-signer generated in this tab." : "No P256 co-signer."}</p>
              <button
                className="btn-ghost"
                disabled={busy || !deployed || !ownerKey}
                onClick={() => {
                  const key = p256Key ?? generatePrivateKey();
                  saveHex(P256, key);
                  setP256Key(key);
                  if (deployed && ownerKey) void run("setP256Cosigner", () => registerP256(deployed.account, ownerKey, key));
                }}
              >
                Register P256 co-signer
              </button>
            </section>
          </div>
        )}

        {page === "intents" && (
          <section className="card">
            <h2>Agent loop</h2>
            <p className="lede">Propose, mirror the policy, then sign. The chain re-checks inside VERIFY. Stake the account on the Mempool page first; the agent path reads another contract.</p>
            <div className="row">
              <button className="btn" disabled={busy || !ready(deployed, sessionKey)} onClick={() => void act("ping", false)}>
                In-policy ping
              </button>
              <button className="btn-ghost" disabled={busy || !ready(deployed, sessionKey)} onClick={() => void act("drain", true)}>
                Submit injected drain
              </button>
              <button className="btn-ghost" disabled={busy || !ready(deployed, sessionKey)} onClick={() => void act("sweep", false)}>
                High-risk, wait
              </button>
              <button className="btn" disabled={busy || !ready(deployed, ownerKey, sessionKey)} onClick={() => void act("sweep-cosign", true)}>
                Co-sign and send
              </button>
            </div>
          </section>
        )}

        {page === "reads" && (
          <section className="card">
            <h2>Chain reads</h2>
            <p className="lede">Default path is the Anon-RPC harness. The table records the method and the route, not the payload.</p>
            {anonState === "failed" && (
              <div className="callout">The harness did not become ready. Reads stay blocked. There is no silent fallback to a clear provider.</div>
            )}
            <button className="btn" disabled={anonState !== "ready" || !deployed} onClick={() => void readBalanceAnon()}>
              Read through Anon-RPC
            </button>
          </section>
        )}

        {page === "mempool" && (
          <section className="card">
            <h2>Same storage read, two mempools</h2>
            <p className="lede">The agent VERIFY staticcalls the policy contract. Canonical rules reject that read. The alt mempool rejects it until the account is staked, then admits it.</p>
            <div className="row">
              <button className="btn-ghost" disabled={busy || !ready(deployed, sessionKey)} onClick={() => void act("canonical", true, "canonical")}>
                Send to canonical
              </button>
              <button className="btn-ghost" disabled={busy || !ready(deployed, sessionKey)} onClick={() => void act("alt-unstaked", true, "alt")}>
                Send to alt, unstaked
              </button>
              <button className="btn" disabled={busy || !deployed || !ownerKey} onClick={() => deployed && ownerKey && void run("addStake", () => stake(deployed.account, ownerKey))}>
                Stake account
              </button>
              <button className="btn" disabled={busy || !ready(deployed, sessionKey)} onClick={() => void act("alt-staked", true, "alt")}>
                Send to alt after stake
              </button>
            </div>
          </section>
        )}

        <section className="card">
          <h2>Ops log</h2>
          <table>
            <thead>
              <tr>
                <th>Method</th>
                <th>Route</th>
                <th>Verdict</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 && (
                <tr>
                  <td colSpan={3}>No calls yet.</td>
                </tr>
              )}
              {logs.map((row) => (
                <tr key={row.id}>
                  <td>{row.method}</td>
                  <td>{row.route}</td>
                  <td>{row.verdict}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
    </div>
  );

  async function act(kind: string, forceSign: boolean, route: "alt" | "canonical" = "alt") {
    if (!deployed || !sessionKey) return;
    const call = kind === "drain" ? injectedCall() : kind.startsWith("sweep") ? highRiskCall(deployed.vault) : inPolicyCall(deployed.vault);
    const expiry = await expiryIfLive(BigInt(Math.floor(Date.now() / 1000)));
    const cosign = kind === "sweep-cosign" && ownerKey ? { scheme: "secp256k1" as const, key: ownerKey } : undefined;
    const sign = kind === "sweep" ? false : forceSign || kind === "ping" || kind === "alt-staked" || kind === "canonical" || kind === "alt-unstaked";
    await run(kind, () =>
      agentAct(
        { account: deployed.account, policy: deployed.policy, sessionKey, call, expiry, cosign },
        { route, sign },
      ),
    );
  }
}

function ready(deployed: Deployed | null, ...keys: Array<Hex | null>): boolean {
  return Boolean(deployed && keys.every(Boolean));
}

function title(page: Page): string {
  if (page === "session") return "Session keys";
  if (page === "intents") return "Intents";
  if (page === "reads") return "Reads";
  if (page === "mempool") return "Mempool contrast";
  return "Overview";
}

function lede(page: Page): string {
  if (page === "session") return "The owner key stays here. The agent receives a separate session key, and revoke clears it on-chain.";
  if (page === "intents") return "In-policy calls can be signed by the session. A drain is rejected in VERIFY. High-risk waits for a human signature.";
  if (page === "reads") return "Balance and code are fetched through the sandboxed worker. The log keeps the method, not the account.";
  if (page === "mempool") return "One policy read. Canonical rejects it. Alt rejects it unstaked, then admits it once the account has stake.";
  return "A scoped agent key, checked in the frame VERIFY step, with reads counted through Anon-RPC.";
}
