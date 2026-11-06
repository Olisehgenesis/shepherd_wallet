import { useState } from "react";
import { Link } from "react-router-dom";
import {
  MdAccountTree,
  MdBlock,
  MdCompareArrows,
  MdHome,
  MdPolicy,
  MdSecurity,
  MdVerifiedUser,
} from "react-icons/md";
import { paths } from "../shell/destinations";
import { GuideShell } from "./GuideShell";

const tabs = [
  { id: "overview", label: "Overview", Icon: MdHome },
  { id: "roles", label: "Owner & agent", Icon: MdCompareArrows },
  { id: "flow", label: "Transaction flow", Icon: MdAccountTree },
  { id: "paths", label: "Two paths", Icon: MdPolicy },
  { id: "risk", label: "High-risk", Icon: MdSecurity },
  { id: "privacy", label: "Privacy", Icon: MdVerifiedUser },
  { id: "revoke", label: "Kill switch", Icon: MdBlock },
] as const;

const flowSteps = [
  {
    id: "request",
    tone: "orange" as const,
    title: "Agent requests",
    blurb: "An agent wants to run a call.",
    body: "The agent holds only a session key. It proposes a call: who to call, which function, and how much value.",
    chips: ["session key", "intent"],
    art: "/how/how-grant-session.jpg",
    advanced:
      "The agent never receives the owner key. Local mirror checks can refuse to sign before anything hits the chain.",
  },
  {
    id: "check",
    tone: "blue" as const,
    title: "Shepherd checks",
    blurb: "VERIFY inspects the call.",
    body: "The VERIFY frame checks the signer, target, selector, and value against the active session before anything executes.",
    chips: ["signer", "target", "selector", "value"],
    art: "/how/how-verify.jpg",
    advanced:
      "A frame transaction carries VERIFY plus the call. Approval happens only when every checked field fits the session.",
  },
  {
    id: "decide",
    tone: "soft" as const,
    title: "Policy decision",
    blurb: "Allow, reject, or wait.",
    body: "ShepherdPolicy returns allow, deny, or high-risk. Deny stops the call. High-risk waits for a second signature.",
    chips: ["allow", "deny", "needs co-sign"],
    art: "/how/how-high-risk.jpg",
    advanced: "Rules live in ShepherdPolicy storage, not in the prompt. Signer address is not permission.",
  },
  {
    id: "exec",
    tone: "ink" as const,
    title: "Execution",
    blurb: "Only when conditions pass.",
    body: "The account executes only after VERIFY approves. On the agent path, that usually means the staked alt mempool admits the frame.",
    chips: ["alt mempool", "admitted"],
    art: "/how/how-privacy-trio.jpg",
    advanced:
      "Canonical mempool rejects the external policy storage read. After stake, the alt mempool can admit the same frame.",
  },
] as const;

export function HowPage() {
  const [flowId, setFlowId] = useState<(typeof flowSteps)[number]["id"]>("request");
  const active = flowSteps.find((s) => s.id === flowId) ?? flowSteps[0];

  return (
    <GuideShell title="How it works" subtitle="Wallet guide" tabs={tabs}>
      {(tab) => {
        if (tab === "overview") {
          return (
            <section className="guide-panel" aria-labelledby="how-overview-title">
              <p className="guide-eyebrow">How Shepherd works</p>
              <h1 id="how-overview-title" className="guide-h1">
                Your keys. Your rules. Your agents.
              </h1>
              <p className="guide-lead">
                Shepherd lets your agents operate inside boundaries you control. Every action is checked against your
                policy, and sensitive operations can require your approval.
              </p>
              <figure className="guide-art">
                <img src="/how/how-hero-flock.jpg" alt="Shepherd with anonymized sheep agents" width={1024} height={576} />
              </figure>
              <div className="guide-btn-row">
                <Link className="guide-btn guide-btn-primary" to={paths.wallet} style={{ width: "auto" }}>
                  Connect Wallet
                </Link>
                <Link className="guide-btn guide-btn-ghost" to="/console">
                  Open Console
                </Link>
              </div>
            </section>
          );
        }

        if (tab === "roles") {
          return (
            <section className="guide-panel" aria-labelledby="how-roles-title">
              <p className="guide-eyebrow">Roles</p>
              <h1 id="how-roles-title" className="guide-h1">
                Your agent gets permission. Not ownership.
              </h1>
              <p className="guide-lead">
                The owner keeps the master key. Agents get a scoped session that can only pass policy checks.
              </p>
              <div className="guide-split">
                <article className="guide-card">
                  <img src="/how/how-owner-key.jpg" alt="Owner holding the master key" />
                  <h3>Owner</h3>
                  <ul>
                    <li>Controls the wallet</li>
                    <li>Sets permissions</li>
                    <li>Defines spending boundaries</li>
                    <li>Can revoke access</li>
                  </ul>
                </article>
                <article className="guide-card agent">
                  <img src="/how/how-grant-session.jpg" alt="Shepherd granting a scoped session to an agent" />
                  <h3>Agent</h3>
                  <ul>
                    <li>Gets a scoped session</li>
                    <li>Can only perform permitted actions</li>
                    <li>Cannot bypass policy checks</li>
                    <li>Needs extra approval for high-risk calls</li>
                  </ul>
                </article>
              </div>
              <p className="guide-note">Agents never hold the owner key.</p>
            </section>
          );
        }

        if (tab === "flow") {
          return (
            <section className="guide-panel" aria-labelledby="how-flow-title">
              <p className="guide-eyebrow">Transaction flow</p>
              <h1 id="how-flow-title" className="guide-h1">
                How a call gets in.
              </h1>
              <p className="guide-lead">Tap a stage to see what Shepherd checks before money moves.</p>
              <div className="guide-flow" role="tablist" aria-label="Transaction stages">
                {flowSteps.map((step) => (
                  <button
                    key={step.id}
                    type="button"
                    className="guide-flow-step"
                    data-tone={step.tone}
                    aria-selected={flowId === step.id}
                    onClick={() => setFlowId(step.id)}
                  >
                    <strong>{step.title}</strong>
                    <span>{step.blurb}</span>
                  </button>
                ))}
              </div>
              <div className="guide-detail">
                <img src={active.art} alt="" />
                <div className="guide-detail-body">
                  <h2 className="guide-h2">{active.title}</h2>
                  <p>{active.body}</p>
                  <div className="guide-chips">
                    {active.chips.map((chip) => (
                      <span key={chip} className={active.tone === "orange" ? "guide-chip guide-chip-orange" : "guide-chip"}>
                        {chip}
                      </span>
                    ))}
                  </div>
                  <details className="guide-advanced">
                    <summary>Technical detail</summary>
                    <p>{active.advanced}</p>
                  </details>
                </div>
              </div>
            </section>
          );
        }

        if (tab === "paths") {
          return (
            <section className="guide-panel" aria-labelledby="how-paths-title">
              <p className="guide-eyebrow">Execution paths</p>
              <h1 id="how-paths-title" className="guide-h1">
                Two paths. One owner in control.
              </h1>
              <p className="guide-lead">Same account. Different VERIFY rules for you versus your agents.</p>
              <div className="guide-path-grid">
                <article className="guide-path guide-path-owner">
                  <h3>Owner path</h3>
                  <p>Empty VERIFY data means the signer is the owner.</p>
                  <ul>
                    <li>Does not read the agent policy</li>
                    <li>Can deploy, stake, grant, and revoke</li>
                    <li>Works while the account is still unstaked</li>
                  </ul>
                </article>
                <article className="guide-path guide-path-agent">
                  <h3>Agent path</h3>
                  <p>
                    VERIFY data <code className="guide-code">0x01</code> means the signer must be an active session.
                  </p>
                  <ul>
                    <li>Account reads ShepherdPolicy</li>
                    <li>Calls checked against session permissions</li>
                    <li>Needs stake for alt-mempool admission</li>
                  </ul>
                </article>
              </div>
            </section>
          );
        }

        if (tab === "risk") {
          return (
            <section className="guide-panel" aria-labelledby="how-risk-title">
              <p className="guide-eyebrow">High-risk protection</p>
              <h1 id="how-risk-title" className="guide-h1">
                Some actions need another signature.
              </h1>
              <p className="guide-lead">
                High-risk actions such as Sweep are allowlisted as high-risk and require a second signature from the
                owner or a registered P256 co-signer. Everyday allowed calls do not wait for you.
              </p>
              <figure className="guide-art">
                <img src="/how/how-high-risk.jpg" alt="Shepherd stopping an agent at a security boundary" />
              </figure>
              <ol className="guide-timeline">
                <li data-kind="ok">
                  <span className="guide-timeline-n">1</span>
                  <div>
                    <strong>Normal permitted request</strong>
                    <p>In-policy calls pass VERIFY and can execute.</p>
                  </div>
                </li>
                <li data-kind="wait">
                  <span className="guide-timeline-n">2</span>
                  <div>
                    <strong>High-risk request</strong>
                    <p>Marked high-risk in policy. Agent alone is not enough.</p>
                  </div>
                </li>
                <li data-kind="wait">
                  <span className="guide-timeline-n">3</span>
                  <div>
                    <strong>Waiting for co-signature</strong>
                    <p>Owner or registered P256 co-signer must approve.</p>
                  </div>
                </li>
                <li data-kind="ok">
                  <span className="guide-timeline-n">4</span>
                  <div>
                    <strong>Approved or rejected</strong>
                    <p>With co-sign it can admit. Without it, VERIFY stops the call.</p>
                  </div>
                </li>
              </ol>
            </section>
          );
        }

        if (tab === "privacy") {
          return (
            <section className="guide-panel" aria-labelledby="how-privacy-title">
              <p className="guide-eyebrow">Privacy and execution</p>
              <h1 id="how-privacy-title" className="guide-h1">
                Privacy is not a badge. It is an execution property.
              </h1>
              <figure className="guide-art">
                <img src="/how/how-privacy-trio.jpg" alt="Private reads, policy checks, and verifiable execution" />
              </figure>
              <div className="guide-mech">
                <article>
                  <h3>Private reads</h3>
                  <p>
                    Console <code className="guide-code">eth_*</code> reads go through the Anon-RPC harness so agent
                    activity is not a cleartext side channel in the browser.
                  </p>
                </article>
                <article>
                  <h3>Policy-controlled calls</h3>
                  <p>VERIFY checks target, selector, and value against ShepherdPolicy.</p>
                </article>
                <article>
                  <h3>Verifiable execution</h3>
                  <p>
                    The same storage read is rejected on the canonical mempool. After stake, the alt mempool can admit
                    the frame.
                  </p>
                </article>
              </div>
              <p className="guide-note">
                Shepherd does not claim all chain activity is invisible. Frame submissions stay clear to the mempool.
              </p>
              <div className="guide-btn-row">
                <Link className="guide-btn guide-btn-ghost" to="/trust">
                  Open Privacy page
                </Link>
              </div>
            </section>
          );
        }

        return (
          <section className="guide-panel" aria-labelledby="how-revoke-title">
            <p className="guide-eyebrow">Kill switch</p>
            <h1 id="how-revoke-title" className="guide-h1">
              You can stop the session.
            </h1>
            <p className="guide-lead">
              Revocation is what stops the session. The account checks the target, not a hidden timestamp. An expiry
              frame is attached only when the verifier has code.
            </p>
            <figure className="guide-art">
              <img src="/how/how-revoke.jpg" alt="Shepherd closing the gate and stopping agent access" />
            </figure>
            <figure className="guide-art">
              <img src="/how/how-sheep-poses.jpg" alt="Shepherd agent sheep poses" />
            </figure>
            <div className="guide-btn-row">
              <Link className="guide-btn guide-btn-primary" to={paths.wallet} style={{ width: "auto" }}>
                Connect Wallet
              </Link>
              <Link className="guide-btn guide-btn-ghost" to={paths.session}>
                Manage sessions
              </Link>
            </div>
          </section>
        );
      }}
    </GuideShell>
  );
}
