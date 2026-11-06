import { formatEther } from "viem";
import { Link, useNavigate } from "react-router-dom";
import { CHAIN_ID } from "../../../packages/core/src/config.js";
import { openApprovalsSheet, openSendReview, requestRevoke } from "./extensions";
import { expiryPhrase, modelHome, trimEth } from "./home-state";
import { paths } from "./shell/destinations";
import { useStore } from "./store";
import { shortAddress } from "./ui";
import { useWalletUi } from "./wallet-ui";

function formatCap(wei: string | undefined) {
  if (!wei || wei === "0") return "0 ETH";
  try {
    return `${trimEth(formatEther(BigInt(wei)))} ETH`;
  } catch {
    return wei;
  }
}

export function Home() {
  const store = useStore();
  const { openWallet } = useWalletUi();
  const navigate = useNavigate();
  const model = modelHome({
    hasOwner: Boolean(store.ownerAddress),
    hasExtension: store.wallets.length > 0 || Boolean(store.wallet),
    deployed: Boolean(store.deployed),
    backedUp: store.ownerBackedUp,
    sessionActive: Boolean(store.live?.active),
    pendingCoSigns: store.pendingApprovalCount,
  });
  const pending = store.approvals.filter((row) => row.status === "pending");
  const rawBalance = store.live?.balance ?? store.portfolio?.accountEth;
  const eth = store.deployed && rawBalance != null ? trimEth(rawBalance) : null;
  const balanceLabel = eth == null ? (store.deployed ? "…" : "0") : eth;

  function review(id?: string) {
    if (!openApprovalsSheet(id)) navigate("/console/approvals");
  }

  async function grant() {
    if (!store.deployed) return;
    if (!store.live?.active) {
      await store.issue({ valueCapEth: "0.001", ttlSeconds: 86_400 });
      return;
    }
    navigate(paths.session);
  }

  function send() {
    if (!store.deployed) return;
    if (!openSendReview()) openWallet("send");
  }

  return (
    <section className="dash-home" data-home-step={model.next ?? "ready"} data-balance={store.deployed ? "visible" : "pending"}>
      <header className="dash-home-hero">
        <h1>Welcome back</h1>
        <p>
          {store.deployed
            ? "Your Shepherd account is ready. When a session is active, open Demo for the judge path."
            : "Your frame signer is in this tab. Prepare the account on chain 1337 to deploy policy, vault, and account."}
        </p>
        {store.deployed && store.live?.active && (
          <div className="dash-balance-actions" style={{ marginTop: 4 }}>
            <Link className="dash-btn primary" to={paths.mempool}>
              Open leash demo →
            </Link>
          </div>
        )}
      </header>

      <section className="dash-balance" aria-labelledby="home-balance-title">
        <div className="dash-balance-copy">
          <div className="dash-balance-label">
            <span className="dash-eth-mark" aria-hidden="true">
              ◆
            </span>
            <h2 id="home-balance-title">Balance</h2>
          </div>
          <p className="dash-balance-value" aria-live="polite">
            {balanceLabel} <span>ETH</span>
          </p>
          <p className="dash-balance-note">
            {store.deployed
              ? "Shepherd account · not a browser-extension balance"
              : `Shepherd account is not on chain ${CHAIN_ID} yet.`}
          </p>
          {store.deployed && (
            <div className="dash-balance-actions">
              <button className="dash-btn" type="button" disabled={store.busy} onClick={send}>
                Send
              </button>
              <button className="dash-btn" type="button" disabled={store.busy} onClick={() => openWallet("receive")}>
                Receive
              </button>
              {model.next !== "prepare" && (
                <button className="dash-btn primary" type="button" disabled={store.busy} onClick={() => void grant()}>
                  Grant an agent
                </button>
              )}
            </div>
          )}
        </div>
        <div className="dash-balance-art" aria-hidden="true">
          <span className="dash-balance-diamond" />
        </div>
      </section>

      {model.needsYou.includes("prepare") && (
        <aside className="dash-banner" role="status">
          <div>
            <strong>Prepare your account</strong>
            <p>Fund the frame signer and deploy policy, vault, and account on chain {CHAIN_ID}.</p>
          </div>
          <button className="dash-btn primary" type="button" disabled={store.busy} onClick={() => void store.prepare()}>
            Fund account →
          </button>
        </aside>
      )}

      {model.needsYou.includes("cosign") && (
        <aside className="dash-banner" role="status">
          <div>
            <strong>
              {store.pendingApprovalCount} high-risk call{store.pendingApprovalCount === 1 ? "" : "s"} waiting
            </strong>
            <p>Co-sign to unlock APPROVE on the agent path.</p>
          </div>
          <button className="dash-btn primary" type="button" onClick={() => review(pending[0]?.id)}>
            Review →
          </button>
        </aside>
      )}

      <section className="dash-agents" aria-labelledby="home-agents-title">
        <div className="dash-section-head">
          <h2 id="home-agents-title">Your agents</h2>
          <Link className="dash-section-link" to={paths.agents}>
            Manage all →
          </Link>
        </div>

        <div className="dash-agent-card">
          {store.sessionAddress ? (
            <div className="dash-agent-row">
              <span className={store.live?.active ? "home-dot" : "home-dot idle"} aria-hidden="true" />
              <div className="dash-agent-copy">
                <strong>Root session</strong>
                <p>
                  {store.live?.active
                    ? `Cap ${formatCap(store.live.valueCapWei)} · ${expiryPhrase(store.live.expiry)}`
                    : "Inactive"}
                </p>
              </div>
              {store.live?.active ? (
                <button
                  className="dash-btn danger"
                  type="button"
                  disabled={store.busy}
                  onClick={() =>
                    requestRevoke(() => {
                      void store.revokeSession();
                    })
                  }
                >
                  Revoke
                </button>
              ) : (
                <button className="dash-btn primary" type="button" disabled={store.busy || !store.deployed} onClick={() => void grant()}>
                  Grant
                </button>
              )}
            </div>
          ) : (
            <div className="dash-agent-empty">
              <span className="home-dot idle" aria-hidden="true" />
              <div>
                <strong>No agent yet</strong>
                <p>
                  {model.next === "prepare" ? "Prepare the account, then grant" : "Grant a scoped session to start"}
                </p>
              </div>
            </div>
          )}

          {store.agents.length > 0 && (
            <div className="dash-agent-row">
              <span className="home-dot idle" aria-hidden="true" />
              <div className="dash-agent-copy">
                <strong>
                  {store.agents.length} child agent{store.agents.length === 1 ? "" : "s"}
                </strong>
                <p>Spawn and revoke from Agents</p>
              </div>
              <Link className="dash-section-link" to={paths.agents}>
                Open
              </Link>
            </div>
          )}
        </div>
      </section>

      {pending.length > 0 && (
        <section className="dash-agents" aria-labelledby="home-cosign-title">
          <div className="dash-section-head">
            <h2 id="home-cosign-title">Waiting for co-sign</h2>
          </div>
          <div className="dash-agent-card">
            {pending.map((row) => (
              <div className="dash-agent-row" key={row.id}>
                <span className="home-dot wait" aria-hidden="true" />
                <div className="dash-agent-copy">
                  <strong>{row.preview}</strong>
                  <p>
                    {row.agentId} · {shortAddress(row.target)}
                  </p>
                </div>
                <button className="dash-btn" type="button" onClick={() => review(row.id)}>
                  Review
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </section>
  );
}
