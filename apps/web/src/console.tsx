import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { NavLink, Link, useLocation, useNavigate } from "react-router-dom";
import { CHAIN_ID, CHAIN_NAME } from "../../../packages/core/src/config.js";
import { useStore } from "./store";
import { Empty, Loader, Mark, shortAddress } from "./ui";
import { WalletModal } from "./WalletModal";

const nav = [
  ["/console", "Overview"],
  ["/console/session", "Session"],
  ["/console/intents", "Intents"],
  ["/console/reads", "Reads"],
  ["/console/mempool", "Mempool"],
] as const;

const WalletUi = createContext<{ openWallet: () => void } | null>(null);

function useWalletUi() {
  const value = useContext(WalletUi);
  if (!value) throw new Error("Wallet UI is missing");
  return value;
}

export function ConsoleShell({ children }: { children: React.ReactNode }) {
  const store = useStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [walletOpen, setWalletOpen] = useState(false);
  const openWallet = useCallback(() => setWalletOpen(true), []);
  const closeWallet = useCallback(() => {
    setWalletOpen(false);
    if (location.pathname === "/console/wallet") navigate("/console", { replace: true });
  }, [location.pathname, navigate]);

  useEffect(() => {
    if (location.pathname === "/console/wallet") setWalletOpen(true);
  }, [location.pathname]);

  return (
    <WalletUi.Provider value={{ openWallet }}>
      <div className="shell">
        <aside className="side">
          <Link className="brand" to="/">
            <Mark />
            Shepherd
          </Link>
          <nav aria-label="Console">
            {nav.map(([to, label]) => (
              <NavLink key={to} to={to} end={to === "/console"}>
                {label}
              </NavLink>
            ))}
            <button className="side-wallet" type="button" onClick={openWallet}>
              Wallet
            </button>
          </nav>
          <p className="side-note">
            <Link to="/docs">How to use</Link>
          </p>
        </aside>
        <div className="main">
          <header className="top">
            <div className="chips">
              <span className="chip ok">{CHAIN_NAME} · {CHAIN_ID}</span>
              <span className={store.anonState === "ready" ? "chip ok" : store.anonState === "failed" ? "chip bad" : "chip wait"}>
                {store.anonState === "ready" ? "Anon-RPC harness" : store.anonState === "failed" ? "Harness failed" : "Harness starting"}
              </span>
              <span className="chip info">{store.anonShare}% anon reads</span>
              {store.wallet && (
                <span className={store.walletOnDevnet ? "chip ok" : "chip bad"}>
                  {store.walletOnDevnet ? "Wallet on 1337" : `Wallet on ${store.wallet.chainId}`}
                </span>
              )}
            </div>
            <div className="row">
              {store.wallet && !store.walletOnDevnet && (
                <button className="btn" type="button" disabled={store.busy} onClick={() => void store.switchWalletToDevnet()}>
                  Switch to {CHAIN_ID}
                </button>
              )}
              <button
                className={store.deployed || store.wallet ? "wallet-chip connected" : "btn"}
                type="button"
                onClick={openWallet}
              >
                {store.deployed
                  ? `${store.live?.balance ?? store.portfolio?.accountEth ?? "0"} ETH · ${shortAddress(store.deployed.account)}`
                  : store.wallet
                    ? `${store.wallet.name} · ${shortAddress(store.wallet.address)}`
                    : "Connect wallet"}
              </button>
            </div>
          </header>
          {store.wallet && !store.walletOnDevnet && (
            <div className="callout bad" role="status">
              Browser wallet is not on {CHAIN_NAME}. Shepherd submits frames on chain {CHAIN_ID}.{" "}
              <button className="btn" type="button" disabled={store.busy} onClick={() => void store.switchWalletToDevnet()}>
                Switch network
              </button>
            </div>
          )}
          {store.status && <Loader label={store.status} />}
          {store.error && (
            <div className="callout bad" role="alert">
              {store.error}
            </div>
          )}
          {children}
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
                {store.logs.length === 0 && (
                  <tr>
                    <td colSpan={3}>No calls yet. The first one is the harness reading the chain id.</td>
                  </tr>
                )}
                {store.logs.map((row) => (
                  <tr key={row.id}>
                    <td>{row.method}</td>
                    <td>{row.route}</td>
                    <td>{row.verdict}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      </div>
      <WalletModal open={walletOpen} onClose={closeWallet} />
    </WalletUi.Provider>
  );
}

export function Overview() {
  const store = useStore();
  const { openWallet } = useWalletUi();
  const next = !store.wallet
    ? { kind: "wallet" as const, label: "Connect a wallet", title: "Start by connecting a wallet", body: "Shepherd needs a human on the other side of the session. Any injected wallet works. WalletConnect works when a project id is set." }
    : !store.deployed
      ? { kind: "action" as const, label: "Prepare the account", title: "The account is not on the devnet yet", body: "Prepare asks the faucet for the frame signer, deploys the three contracts, and writes the vault rules. The loader stays until the receipts land." }
      : !store.live?.active
        ? { kind: "link" as const, href: "/console/session", label: "Issue a session", title: "The account is deployed", body: "Grant a session key before the agent can ping. The owner path is already able to stake." }
        : !store.live.staked
          ? { kind: "link" as const, href: "/console/mempool", label: "Stake the account", title: "The session is active", body: "The agent path reads the policy contract. Stake the account, then send the ping on the alt mempool." }
          : { kind: "link" as const, href: "/console/intents", label: "Send an in-policy ping", title: "Ready for a ping", body: "The account is staked and the session is active. The ping is the call the policy allows." };

  return (
    <>
      <header className="page-head">
        <h1>Overview</h1>
        <p>Four steps. The console only offers the one you have not finished.</p>
      </header>
      <section className="card">
        <h2>{next.title}</h2>
        <p>{next.body}</p>
        {store.live && (
          <p className="lede">
            Balance {store.live.balance} ETH, read {store.live.balanceRoute}. Session {store.live.active ? "active" : "inactive"}. Stake {store.live.staked ? "present" : "absent"}.
          </p>
        )}
        <div className="row">
          {next.kind === "wallet" ? (
            <button className="btn" type="button" onClick={openWallet}>
              {next.label}
            </button>
          ) : next.kind === "link" ? (
            <Link className="btn" to={next.href}>
              {next.label}
            </Link>
          ) : (
            <button className="btn" type="button" disabled={store.busy} onClick={() => void store.prepare()}>
              {next.label}
            </button>
          )}
          {store.deployed && (
            <button className="btn-ghost" type="button" disabled={store.busy} onClick={() => void store.refresh()}>
              Refresh
            </button>
          )}
        </div>
      </section>
      <section className="card">
        <h2>Trust</h2>
        <p>The worker sees request bodies. The reference specifier uses ordinary fetch, so this harness does not unlink your IP. It does keep the worker off your keys, cookies, and DOM.</p>
        <Link to="/trust">Read the trust page</Link>
      </section>
    </>
  );
}

export function WalletPage() {
  return (
    <Empty
      title="Wallet opens as a popup"
      body="Use the wallet button in the top bar for balance, send, receive, and signers. Closing the dialog brings you back to Overview."
    />
  );
}

export function SessionPage() {
  const store = useStore();
  const [shown, setShown] = useState(false);
  const [secret, setSecret] = useState("");
  if (!store.deployed) {
    return (
      <Empty title="No account yet" body="Prepare the account on Overview. A session is granted to that account, not to a placeholder." action={<Link className="btn" to="/console">Go to Overview</Link>} />
    );
  }
  return (
    <>
      <header className="page-head">
        <h1>Session</h1>
        <p>Issue a key for the agent. Revoke clears it on-chain. The reveal is for a process on this machine, and it is not copied into the log.</p>
      </header>
      <section className="card">
        <h2>{store.live?.active ? "Session active" : "No active session"}</h2>
        <div className="row">
          <button className="btn" type="button" disabled={store.busy} onClick={() => void store.issue()}>
            {store.sessionReady ? "Grant again" : "Issue session key"}
          </button>
          {store.sessionReady && (
            <button className="btn-danger" type="button" disabled={store.busy} onClick={() => void store.revokeSession()}>
              Revoke
            </button>
          )}
          {store.sessionReady && (
            <button
              className="btn-ghost"
              type="button"
              onClick={() => {
                const value = store.revealSession();
                if (!value) return;
                setSecret(value);
                setShown(true);
              }}
            >
              Reveal session key once
            </button>
          )}
        </div>
        {shown && secret && (
          <>
            <p className="warn">Shown for a separate agent process. Close the tab when you are done.</p>
            <input readOnly value={secret} aria-label="Session key" />
          </>
        )}
      </section>
      <section className="card">
        <h2>P256 co-signer</h2>
        <p>{store.p256Address ? `Registered locally as ${shortAddress(store.p256Address)}. This is a P256 key, not a WebAuthn passkey ceremony.` : "No P256 co-signer yet. High-risk can also be co-signed by the frame signer."}</p>
        <button className="btn-ghost" type="button" disabled={store.busy} onClick={() => void store.registerCosigner()}>
          Register P256 co-signer
        </button>
      </section>
    </>
  );
}

export function IntentsPage() {
  const store = useStore();
  if (!store.live?.active) {
    return (
      <Empty title="No active session" body="Intents are signed by the session key. Issue one first. The chain still re-checks the call." action={<Link className="btn" to="/console/session">Issue a session</Link>} />
    );
  }
  return (
    <>
      <header className="page-head">
        <h1>Intents</h1>
        <p>Ping is in policy. The drain is submitted so VERIFY can reject it. Sweep waits until you co-sign.</p>
      </header>
      <section className="card">
        <div className="row">
          <button className="btn" type="button" disabled={store.busy} onClick={() => void store.runIntent("ping")}>
            In-policy ping
          </button>
          <button className="btn-ghost" type="button" disabled={store.busy} onClick={() => void store.runIntent("drain")}>
            Submit injected drain
          </button>
          <button className="btn-ghost" type="button" disabled={store.busy} onClick={() => void store.runIntent("sweep")}>
            High-risk, wait
          </button>
          <button className="btn" type="button" disabled={store.busy} onClick={() => void store.runIntent("sweep-cosign")}>
            Co-sign and send
          </button>
        </div>
      </section>
    </>
  );
}

export function ReadsPage() {
  const store = useStore();
  if (store.anonState === "failed") {
    return <Empty title="The harness did not start" body="Reads stay on this page. There is no silent fallback to a clear provider. Reload the console and try again." />;
  }
  if (!store.deployed) {
    return <Empty title="Nothing to read yet" body="Prepare the account first. This page then asks the harness for balance and code." action={<Link className="btn" to="/console">Go to Overview</Link>} />;
  }
  return (
    <>
      <header className="page-head">
        <h1>Reads</h1>
        <p>Balance and code go through the sandboxed worker. The log keeps the method and the route.</p>
      </header>
      <section className="card">
        <button className="btn" type="button" disabled={store.busy || store.anonState !== "ready"} onClick={() => void store.readAnon()}>
          Read through Anon-RPC
        </button>
      </section>
    </>
  );
}

export function MempoolPage() {
  const store = useStore();
  if (!store.deployed) {
    return <Empty title="No account to stake" body="Prepare the account on Overview. Stake is an owner-path frame, and the ping is an agent-path frame." action={<Link className="btn" to="/console">Go to Overview</Link>} />;
  }
  return (
    <>
      <header className="page-head">
        <h1>Mempool</h1>
        <p>One policy read. Canonical rejects it. Alt rejects it while the account is unstaked, then can admit it after stake.</p>
      </header>
      <section className="card">
        <div className="row">
          <button className="btn" type="button" disabled={store.busy} onClick={() => void store.stakeAccount()}>
            Stake account
          </button>
          {store.live?.active && (
            <>
              <button className="btn-ghost" type="button" disabled={store.busy} onClick={() => void store.runIntent("canonical")}>
                Send to canonical
              </button>
              <button className="btn-ghost" type="button" disabled={store.busy} onClick={() => void store.runIntent("alt")}>
                Send to alt
              </button>
            </>
          )}
        </div>
        {!store.live?.active && <p className="lede">Stake can run now. The ping waits for an active session.</p>}
      </section>
    </>
  );
}
