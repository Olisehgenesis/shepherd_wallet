import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useStore } from "./store";
import { Mark } from "./ui";
import { walletProjectId } from "./wallet";

const STEPS = [
  {
    n: "01",
    title: "Owner key",
    body: "Generate the frame-signer in this tab. Back it up before any grant.",
  },
  {
    n: "02",
    title: "Session",
    body: "Issue a scoped agent key. Policy caps target, selector, and value.",
  },
  {
    n: "03",
    title: "Stake",
    body: "Owner-path stake so the alt mempool can admit policy reads.",
  },
  {
    n: "04",
    title: "Admit",
    body: "In-policy VERIFY clears on alt. Canonical still rejects the storage read.",
  },
] as const;

/**
 * First run, before an owner key exists.
 * When no browser extension is present, Create owner key is the lead — not a footnote under "Or continue".
 */
export function FirstRun() {
  const store = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const projectId = walletProjectId();
  const [connectOpen, setConnectOpen] = useState(false);
  const extensionMissing = store.wallets.length === 0 && !store.wallet;

  function enterHome() {
    if (location.pathname !== "/console") navigate("/console", { replace: true });
  }

  function createOwner() {
    store.ensureOwner();
    enterHome();
  }

  async function connectWallet(uuid: string, name: string) {
    if (await store.connect(uuid, name)) enterHome();
  }

  async function connectWc() {
    if (await store.connectWc()) enterHome();
  }

  return (
    <main className="onboard">
      <div className="onboard-frame">
        <section className="onboard-rail" aria-label="Shepherd introduction">
          <div className="onboard-brand">
            <Mark size={40} />
            <div>
              <strong>Shepherd</strong>
              <span>EIP-8141 · ERC-8421</span>
            </div>
          </div>

          <div className="onboard-intro">
            <p className="onboard-kicker">Frame-native agent account</p>
            <h1>A wallet agents can spend from — only inside your rules.</h1>
            <p className="onboard-lead">
              You keep the owner key. The agent gets a separate, scoped session key. Spend only clears when an EIP-8141
              VERIFY frame says the target, selector, and value are in policy — so the canonical mempool rejects and a
              staked alt-mempool admits.
            </p>
          </div>

          <ol className="onboard-steps" aria-label="Path to first admitted call">
            {STEPS.map((step, index) => {
              const active = index === 0;
              return (
                <li key={step.n} className={active ? "is-active" : "is-upcoming"} aria-current={active ? "step" : undefined}>
                  <div className="onboard-step-marker" aria-hidden="true">
                    <span>{step.n}</span>
                  </div>
                  <div className="onboard-step-copy">
                    <strong>{step.title}</strong>
                    <p>{step.body}</p>
                  </div>
                </li>
              );
            })}
          </ol>

          <figure className="onboard-mascot" aria-hidden="true">
            <img src="/how/asset-onboard-owner.jpg" alt="" />
          </figure>

          <nav className="onboard-links" aria-label="Learn more">
            <Link to="/how">How it works</Link>
            <Link to="/trust">Trust</Link>
            <Link to="/docs">Docs</Link>
            <Link to="/console/you/demo/mempool">Canonical vs alt</Link>
          </nav>
        </section>

        <section className="onboard-panel" aria-labelledby="onboard-panel-title">
          <header className="onboard-panel-head">
            <p className="onboard-panel-step">Step 01 · Owner key</p>
            <h2 id="onboard-panel-title">Create the frame signer</h2>
            <p>
              {extensionMissing
                ? "No browser extension detected in this environment. Generate an owner key in this tab, then back it up before granting a session."
                : "Generate an owner key in this tab. A browser wallet can identify you and send deposits — it cannot sign EIP-8141 frame calls."}
            </p>
          </header>

          <button
            className="onboard-primary"
            type="button"
            disabled={store.busy}
            onClick={createOwner}
            aria-busy={store.busy}
          >
            <span className="onboard-primary-label">
              <strong>Create owner key</strong>
              <span>Recommended · stays in this browser until Backup</span>
            </span>
            <span className="onboard-primary-arrow" aria-hidden="true">
              →
            </span>
          </button>

          <aside className="onboard-warn" role="note">
            <strong>Testnet keys live in this tab.</strong>
            <p>
              Closing the tab clears sessionStorage. Backup is optional on the public alt-mempool devnet — Wallet can
              still export/import if you want to keep the same frame signer.
            </p>
          </aside>

          <div className="onboard-divider">
            <span>Optional</span>
          </div>

          <button
            className="onboard-secondary"
            type="button"
            onClick={() => {
              window.dispatchEvent(new Event("eip6963:requestProvider"));
              setConnectOpen(true);
            }}
          >
            <strong>Connect a browser wallet</strong>
            <span>Identity and deposits only. Cannot sign frame calls.</span>
          </button>

          {connectOpen && (store.wallets.length > 0 || projectId) && (
            <div className="onboard-wallets" role="group" aria-label="Available wallets">
              {store.wallets.map((wallet) => (
                <button
                  key={wallet.uuid}
                  className="onboard-wallet"
                  type="button"
                  disabled={store.busy}
                  onClick={() => void connectWallet(wallet.uuid, wallet.name)}
                >
                  {wallet.icon ? <img src={wallet.icon} alt="" width={28} height={28} /> : <span className="onboard-wallet-fallback" />}
                  <span>
                    <strong>{wallet.name}</strong>
                    <span>Connect for identity and deposits</span>
                  </span>
                </button>
              ))}
              {projectId && (
                <button className="onboard-wallet" type="button" disabled={store.busy} onClick={() => void connectWc()}>
                  <span className="onboard-wallet-fallback" />
                  <span>
                    <strong>WalletConnect</strong>
                    <span>Scan a QR code</span>
                  </span>
                </button>
              )}
            </div>
          )}

          {connectOpen && store.wallets.length === 0 && !projectId && (
            <p className="onboard-empty">No injected wallet detected. Create an owner key to continue.</p>
          )}

          {store.status && (
            <p className="onboard-status" role="status">
              {store.status}
            </p>
          )}
          {store.error && (
            <p className="onboard-error" role="alert">
              {store.error}
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
