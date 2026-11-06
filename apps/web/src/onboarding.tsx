import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useStore } from "./store";
import { Mark } from "./ui";
import { walletProjectId } from "./wallet";

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
      <div className="onboard-shell">
        <header className="onboard-hero">
          <div className="onboard-brand">
            <Mark size={36} />
            <span>Shepherd</span>
          </div>
          <figure className="onboard-sticker" aria-hidden="true">
            <img src="/how/asset-onboard-owner.jpg" alt="" />
          </figure>
          <p className="onboard-eyebrow">Frame-native agent account</p>
          <h1>A frame-transaction account for agents.</h1>
          <p className="onboard-lead">
            The human keeps the owner key. The agent gets a separate, scoped session key. Spend only clears when VERIFY
            says target, selector, and value are in policy.
          </p>
        </header>

        <ol className="onboard-path" aria-label="Path to first admitted call">
          <li className="on" aria-current="step">
            <strong>1</strong>
            <span>Owner key</span>
          </li>
          <li>
            <strong>2</strong>
            <span>Session</span>
          </li>
          <li>
            <strong>3</strong>
            <span>Stake</span>
          </li>
          <li>
            <strong>4</strong>
            <span>Admit</span>
          </li>
        </ol>

        <section className="onboard-card">
          <div className="onboard-card-head">
            <div>
              <h2>Start here</h2>
              <p>
                {extensionMissing
                  ? "No browser extension detected. Create an owner key in this tab, then back it up before any grant."
                  : "Create an owner key in this tab. A browser wallet can identify you and send deposits. It cannot sign frame calls."}
              </p>
            </div>
            <figure className="onboard-sticker onboard-sticker-sm" aria-hidden="true">
              <img src="/how/asset-onboard-session.jpg" alt="" />
            </figure>
          </div>

          <div className="onboard-choices">
            <button className="onboard-choice primary" type="button" disabled={store.busy} onClick={createOwner}>
              <img className="onboard-choice-art" src="/how/how-owner-key.jpg" alt="" aria-hidden="true" />
              <span className="onboard-choice-copy">
                <strong>Create owner key</strong>
                <span>Recommended — stays in this browser until you back it up</span>
              </span>
            </button>
            <button
              className="onboard-choice"
              type="button"
              onClick={() => {
                window.dispatchEvent(new Event("eip6963:requestProvider"));
                setConnectOpen(true);
              }}
            >
              <span className="onboard-choice-badge" aria-hidden="true">
                W
              </span>
              <span className="onboard-choice-copy">
                <strong>Connect a browser wallet</strong>
                <span>Identity and deposits only. Cannot sign EIP-8141 frames.</span>
              </span>
            </button>
          </div>

          {connectOpen && (store.wallets.length > 0 || projectId) && (
            <div className="onboard-wallets">
              {store.wallets.map((wallet) => (
                <button
                  key={wallet.uuid}
                  className="onboard-choice"
                  type="button"
                  disabled={store.busy}
                  onClick={() => void connectWallet(wallet.uuid, wallet.name)}
                >
                  <span className="onboard-choice-copy">
                    <strong>{wallet.name}</strong>
                    <span>Connect for identity and deposits</span>
                  </span>
                </button>
              ))}
              {projectId && (
                <button className="onboard-choice" type="button" disabled={store.busy} onClick={() => void connectWc()}>
                  <span className="onboard-choice-copy">
                    <strong>WalletConnect</strong>
                    <span>QR code</span>
                  </span>
                </button>
              )}
            </div>
          )}

          <p className="onboard-fine">
            Keys live in this tab until Backup. Closing the tab without Backup deletes them. After setup, open{" "}
            <Link to="/console/you/demo/mempool">Canonical vs alt-mempool</Link>.
          </p>
        </section>

        <nav className="onboard-links" aria-label="Learn more">
          <Link to="/how">How a frame is decided</Link>
          <Link to="/trust">Trust center</Link>
          <Link to="/docs">Docs</Link>
        </nav>

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
      </div>
    </main>
  );
}
