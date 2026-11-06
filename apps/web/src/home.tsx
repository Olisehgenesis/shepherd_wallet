import { formatEther } from "viem";
import { Link, useNavigate } from "react-router-dom";
import { CHAIN_ID } from "../../../packages/core/src/config.js";
import { openApprovalsSheet, openSendReview, requestRevoke } from "./extensions";
import { expiryPhrase, modelHome, trimEth } from "./home-state";
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

  function review(id?: string) {
    if (!openApprovalsSheet(id)) navigate("/console/approvals");
  }

  async function grant() {
    if (!store.deployed) return;
    if (!store.ownerBackedUp) {
      openWallet("backup");
      return;
    }
    if (!store.live?.active) {
      await store.issue({ valueCapEth: "0.001", ttlSeconds: 86_400 });
      return;
    }
    navigate("/console/session");
  }

  function send() {
    if (!store.deployed) return;
    if (!openSendReview()) openWallet("send");
  }

  return (
    <section className="home" data-home-step={model.next ?? "ready"} data-balance={store.deployed ? "visible" : "pending"}>
      <header className="home-top">
        <div>
          <div className="home-pill">Alt mempool · {CHAIN_ID}</div>
          <h1>Home</h1>
          <p>You are the owner. Agents act only inside policy.</p>
        </div>
        <button className="home-btn" type="button" onClick={() => openWallet("home")}>
          {store.deployed
            ? `Account ${shortAddress(store.deployed.account)}`
            : store.ownerAddress
              ? `Owner ${shortAddress(store.ownerAddress)}`
              : "Account"}
        </button>
      </header>

      <div className="home-grid">
        <article className="home-card">
          <h2>Balance</h2>
          <p className="home-balance">{eth == null ? (store.deployed ? "…" : "0 ETH") : `${eth} ETH`}</p>
          <p className="home-note">
            {store.deployed
              ? "Shepherd account · not a browser-extension balance"
              : "Shepherd account is not on chain 1337 yet."}
          </p>
          <div className="home-actions">
            {model.next === "prepare" && (
              <button className="home-btn primary" type="button" disabled={store.busy} onClick={() => void store.prepare()}>
                Prepare the account
              </button>
            )}
            <button className="home-btn" type="button" disabled={!store.deployed || store.busy} onClick={send}>
              Send
            </button>
            <button className="home-btn" type="button" disabled={!store.deployed || store.busy} onClick={() => openWallet("receive")}>
              Receive
            </button>
            <button
              className={model.next === "prepare" ? "home-btn" : "home-btn primary"}
              type="button"
              disabled={!store.deployed || store.busy}
              onClick={() => void grant()}
            >
              Grant an agent
            </button>
          </div>
        </article>

        <article className="home-card home-need">
          <h2>Needs you</h2>
          {model.needsYou.length === 0 ? (
            <p>Nothing needs you right now.</p>
          ) : (
            <ul className="home-needs">
              {model.needsYou.includes("prepare") && (
                <li>
                  <p>
                    <strong>Prepare the account</strong> on Alt mempool (chain {CHAIN_ID}). This funds the owner key and deploys
                    the policy, vault, and account.
                  </p>
                  <button className="home-btn primary" type="button" disabled={store.busy} onClick={() => void store.prepare()}>
                    Prepare the account
                  </button>
                </li>
              )}
              {model.needsYou.includes("backup") && (
                <li>
                  <p>
                    <strong>Backup the owner key</strong> before the first grant. Closing this tab deletes it.
                  </p>
                  <button className="home-btn primary" type="button" onClick={() => openWallet("backup")}>
                    Back up now
                  </button>
                </li>
              )}
              {model.needsYou.includes("cosign") && (
                <li>
                  <p>
                    <strong>
                      {store.pendingApprovalCount} high-risk call{store.pendingApprovalCount === 1 ? "" : "s"}
                    </strong>{" "}
                    waiting for co-sign.
                  </p>
                  <button className="home-btn primary" type="button" onClick={() => review(pending[0]?.id)}>
                    Review
                  </button>
                </li>
              )}
            </ul>
          )}
        </article>

        <article className="home-card home-span">
          <h2>Your agents</h2>
          {store.sessionAddress ? (
            <div className="home-row">
              <div className="home-agent">
                <span className={store.live?.active ? "home-dot" : "home-dot idle"} />
                <div>
                  <strong>Root session</strong>
                  <div className="home-muted">
                    {store.live?.active
                      ? `Cap ${formatCap(store.live.valueCapWei)} · ${expiryPhrase(store.live.expiry)}`
                      : "Inactive"}
                  </div>
                </div>
              </div>
              {store.live?.active ? (
                <button
                  className="home-btn danger"
                  type="button"
                  disabled={store.busy}
                  onClick={() => requestRevoke(() => store.revokeSession())}
                >
                  Revoke
                </button>
              ) : (
                <span className="home-muted">—</span>
              )}
            </div>
          ) : (
            <div className="home-row">
              <div className="home-agent">
                <span className="home-dot idle" />
                <div>
                  <strong>No agent yet</strong>
                  <div className="home-muted">
                    {model.next === "prepare"
                      ? "Prepare the account, then grant"
                      : model.next === "backup"
                        ? "Back up the owner key, then grant"
                        : "Grant an agent to start"}
                  </div>
                </div>
              </div>
              <span className="home-muted">—</span>
            </div>
          )}
          {store.agents.length === 0 ? (
            <div className="home-row">
              <div className="home-agent">
                <span className="home-dot idle" />
                <div>
                  <strong>No child agents</strong>
                  <div className="home-muted">Spawn from Agents</div>
                </div>
              </div>
              <span className="home-muted">—</span>
            </div>
          ) : (
            <div className="home-row">
              <div className="home-agent">
                <span className="home-dot idle" />
                <div>
                  <strong>
                    {store.agents.length} child agent{store.agents.length === 1 ? "" : "s"}
                  </strong>
                  <div className="home-muted">Spawn and revoke from Agents</div>
                </div>
              </div>
              <Link className="home-link" to="/console/agents">
                Agents
              </Link>
            </div>
          )}
        </article>

        <article className="home-card home-span">
          <h2>Waiting for co-sign</h2>
          {pending.length === 0 ? (
            <p className="home-muted">Nothing waiting. High-risk calls (like sweep) will appear here.</p>
          ) : (
            pending.map((row) => (
              <div className="home-row" key={row.id}>
                <div className="home-agent">
                  <span className="home-dot wait" />
                  <div>
                    <strong>{row.preview}</strong>
                    <div className="home-muted">
                      {row.agentId} · {shortAddress(row.target)}
                    </div>
                  </div>
                </div>
                <button className="home-btn" type="button" onClick={() => review(row.id)}>
                  Review
                </button>
              </div>
            ))
          )}
        </article>
      </div>
    </section>
  );
}
