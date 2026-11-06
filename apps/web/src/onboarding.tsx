import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useStore } from "./store";
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
        <div className="onboard-mark" aria-hidden="true">
          S
        </div>
        <h1>A wallet your agents can use — only inside your rules.</h1>
        <p className="onboard-lead">You keep the owner key. An agent gets a scoped session. Revoke stops them.</p>
        <div className="onboard-steps" role="img" aria-label="Step 1 of 4, create the owner key">
          <span className="on" />
          <span />
          <span />
          <span />
        </div>
        <section className="onboard-card">
          <h2>Start</h2>
          <p>
            {extensionMissing
              ? "No browser extension detected in this environment. Create an owner key in this tab, then back it up before any grant."
              : "Create an owner key in this tab. A browser extension can identify you and send deposits. It cannot sign frame calls. Back the key up before any grant."}
          </p>
          <div className="onboard-choices">
            <button className="onboard-choice primary" type="button" disabled={store.busy} onClick={createOwner}>
              <strong>Create owner key</strong>
              <span>Recommended here — stays in this browser until you back it up</span>
            </button>
            <button
              className="onboard-choice"
              type="button"
              onClick={() => {
                window.dispatchEvent(new Event("eip6963:requestProvider"));
                setConnectOpen(true);
              }}
            >
              <strong>Connect a browser wallet</strong>
              <span>For identity and deposits. It cannot sign frame calls.</span>
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
                  <strong>{wallet.name}</strong>
                  <span>Connect for identity and deposits</span>
                </button>
              ))}
              {projectId && (
                <button className="onboard-choice" type="button" disabled={store.busy} onClick={() => void connectWc()}>
                  <strong>WalletConnect</strong>
                  <span>QR code</span>
                </button>
              )}
            </div>
          )}
          <p className="onboard-fine">Keys live in this tab until Backup. Closing the tab without Backup deletes them.</p>
        </section>
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
