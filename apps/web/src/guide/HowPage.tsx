import { Link } from "react-router-dom";
import {
  MdAccountTree,
  MdBlock,
  MdCompareArrows,
  MdHome,
  MdKey,
  MdPolicy,
  MdScience,
  MdSecurity,
  MdVerifiedUser,
} from "react-icons/md";
import { paths } from "../shell/destinations";
import { GuideShell } from "./GuideShell";
import { Simulator } from "./Simulator";

const tabs = [
  { id: "meet", label: "Meet Shepherd", Icon: MdHome },
  { id: "roles", label: "Owner vs agent", Icon: MdCompareArrows },
  { id: "sessions", label: "Sessions", Icon: MdKey },
  { id: "verify", label: "Verification", Icon: MdAccountTree },
  { id: "sim", label: "Try a call", Icon: MdScience },
  { id: "paths", label: "Two paths", Icon: MdPolicy },
  { id: "risk", label: "High-risk", Icon: MdSecurity },
  { id: "privacy", label: "Privacy", Icon: MdVerifiedUser },
  { id: "revoke", label: "Revocation", Icon: MdBlock },
] as const;

export function HowPage() {
  return (
    <GuideShell title="How it works" subtitle="Product guide" tabs={tabs} crossLinks>
      {(tab) => {
        if (tab === "meet") {
          return (
            <section className="guide-panel">
              <p className="guide-eyebrow">Meet Shepherd</p>
              <h1 className="guide-h1">A frame-transaction account for agents.</h1>
              <p className="guide-lead">
                The human keeps the owner key. The agent gets a separate, scoped session key.
              </p>
              <p className="guide-lead">
                The agent’s spend only clears when an EIP-8141 VERIFY frame says the target, selector, and value are in
                policy. That policy lives in another contract, so the canonical mempool rejects the validation read
                (StorageReadNonSender) and a staked alt-mempool entity is what admits it (ERC-8421).
              </p>
              <figure className="guide-art">
                <img src="/how/how-hero-flock.jpg" alt="Shepherd with anonymized agent sheep" />
              </figure>
              <div className="guide-btn-row">
                <Link className="guide-btn guide-btn-primary" to={paths.mempool} style={{ width: "auto" }}>
                  Canonical vs alt-mempool
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
            <section className="guide-panel">
              <p className="guide-eyebrow">Roles</p>
              <h1 className="guide-h1">Permission is not ownership.</h1>
              <p className="guide-lead">
                The owner controls the account. Agents never receive the owner key. They only get a session that policy
                can stop.
              </p>
              <div className="guide-split">
                <article className="guide-card">
                  <img src="/how/how-owner-key.jpg" alt="Owner holding the master key" />
                  <h3>Owner</h3>
                  <ul>
                    <li>Holds the frame-signer owner key</li>
                    <li>Deploys, stakes, grants, revokes</li>
                    <li>Sets ShepherdPolicy rules</li>
                    <li>Co-signs high-risk calls</li>
                  </ul>
                </article>
                <article className="guide-card agent">
                  <img src="/how/how-grant-session.jpg" alt="Agent receiving a scoped session" />
                  <h3>Agent</h3>
                  <ul>
                    <li>Holds only a session key</li>
                    <li>Signs agent-path frames</li>
                    <li>Cannot bypass policy</li>
                    <li>May spawn children with tighter caps</li>
                  </ul>
                </article>
              </div>
            </section>
          );
        }

        if (tab === "sessions") {
          return (
            <section className="guide-panel">
              <p className="guide-eyebrow">Sessions</p>
              <h1 className="guide-h1">Grant a scoped session. Revoke ends it.</h1>
              <p className="guide-lead">
                Issuing a session creates an on-chain allowance: value cap, active flag, and permission rules. TTL can be
                stored for UI, but revoke is the kill switch that VERIFY can enforce.
              </p>
              <figure className="guide-art">
                <img src="/how/how-grant-session.jpg" alt="Shepherd granting a limited session" />
              </figure>
              <div className="guide-mech">
                <article>
                  <h3>Value cap</h3>
                  <p>Agent transfers above the session cap are denied hard, not co-signed.</p>
                </article>
                <article>
                  <h3>Allowlist</h3>
                  <p>Target + selector rules: allow, deny, or high-risk.</p>
                </article>
                <article>
                  <h3>Children</h3>
                  <p>MCP spawn clips cap and expiry to the parent. Depth stops at 3.</p>
                </article>
              </div>
            </section>
          );
        }

        if (tab === "verify") {
          return (
            <section className="guide-panel">
              <p className="guide-eyebrow">Verification</p>
              <h1 className="guide-h1">Every agent call meets VERIFY first.</h1>
              <p className="guide-lead">
                A frame transaction carries a VERIFY frame and a call. ShepherdAccount approves only when the signer and
                the call fit the session.
              </p>
              <figure className="guide-art">
                <img src="/how/how-verify.jpg" alt="VERIFY checkpoint illustration" />
              </figure>
              <details className="guide-advanced">
                <summary>Technical detail</summary>
                <p>
                  Agent path uses VERIFY data 0x01, then staticcalls ShepherdPolicy. That external storage read is why
                  the canonical mempool rejects and a staked alt mempool entity can admit.
                </p>
              </details>
            </section>
          );
        }

        if (tab === "sim") {
          return (
            <section className="guide-panel">
              <p className="guide-eyebrow">Interactive</p>
              <h1 className="guide-h1">Try a call through the pipeline.</h1>
              <p className="guide-lead">
                Pick a demo intent. Watch request → VERIFY → policy → result. This mirrors the console Intents demo.
              </p>
              <Simulator />
            </section>
          );
        }

        if (tab === "paths") {
          return (
            <section className="guide-panel">
              <p className="guide-eyebrow">Execution paths</p>
              <h1 className="guide-h1">Two paths. One owner in control.</h1>
              <div className="guide-path-grid">
                <article className="guide-path guide-path-owner">
                  <h3>Owner path</h3>
                  <p>Empty VERIFY data. Signer must be the owner.</p>
                  <ul>
                    <li>Does not read ShepherdPolicy</li>
                    <li>Deploy, stake, grant, revoke</li>
                    <li>Works while unstaked</li>
                  </ul>
                </article>
                <article className="guide-path guide-path-agent">
                  <h3>Agent path</h3>
                  <p>
                    VERIFY data <code className="guide-code">0x01</code>. Signer must be an active session.
                  </p>
                  <ul>
                    <li>Reads ShepherdPolicy</li>
                    <li>Needs stake for alt admission</li>
                    <li>Canonical rejects the storage read</li>
                  </ul>
                </article>
              </div>
            </section>
          );
        }

        if (tab === "risk") {
          return (
            <section className="guide-panel">
              <p className="guide-eyebrow">High-risk</p>
              <h1 className="guide-h1">Some actions need another signature.</h1>
              <p className="guide-lead">
                Sweep is allowlisted as high-risk. It needs a second signature from the owner or a registered P256
                co-signer. Everyday allowed calls do not wait for you.
              </p>
              <div className="guide-stickers">
                <figure className="guide-art">
                  <img src="/how/how-high-risk.jpg" alt="High-risk boundary" />
                </figure>
                <figure className="guide-art">
                  <img src="/how/asset-cosign.jpg" alt="Co-signature" />
                </figure>
              </div>
              <ol className="guide-timeline">
                <li data-kind="ok">
                  <span className="guide-timeline-n">1</span>
                  <div>
                    <strong>Allowed call</strong>
                    <p>Passes VERIFY without a second signature.</p>
                  </div>
                </li>
                <li data-kind="wait">
                  <span className="guide-timeline-n">2</span>
                  <div>
                    <strong>High-risk call</strong>
                    <p>Policy mode high. NeedsCosign without co-sign.</p>
                  </div>
                </li>
                <li data-kind="ok">
                  <span className="guide-timeline-n">3</span>
                  <div>
                    <strong>Co-signed</strong>
                    <p>Owner secp256k1 or registered P256 unlocks APPROVE.</p>
                  </div>
                </li>
              </ol>
            </section>
          );
        }

        if (tab === "privacy") {
          return (
            <section className="guide-panel">
              <p className="guide-eyebrow">Privacy</p>
              <h1 className="guide-h1">Privacy is an execution property.</h1>
              <figure className="guide-art">
                <img src="/how/asset-privacy-shield.jpg" alt="Privacy shield" />
              </figure>
              <div className="guide-mech">
                <article>
                  <h3>Private reads</h3>
                  <p>Browser eth_* reads use the Anon-RPC harness. The worker can still see request bodies.</p>
                </article>
                <article>
                  <h3>Policy calls</h3>
                  <p>VERIFY enforces target, selector, and value against ShepherdPolicy.</p>
                </article>
                <article>
                  <h3>Verifiable exec</h3>
                  <p>Canonical rejects the policy storage read. Staked alt can admit.</p>
                </article>
              </div>
              <p className="guide-note">
                Frame submissions stay clear to the mempool. See{" "}
                <Link to="/trust">Privacy</Link> for what is not claimed.
              </p>
            </section>
          );
        }

        return (
          <section className="guide-panel">
            <p className="guide-eyebrow">Revocation</p>
            <h1 className="guide-h1">You can stop the session.</h1>
            <p className="guide-lead">
              Revoke clears the session on-chain. The account checks the expiry frame target when present, not a hidden
              timestamp inside other VERIFY frames.
            </p>
            <figure className="guide-art">
              <img src="/how/how-revoke.jpg" alt="Revocation kill switch" />
            </figure>
            <div className="guide-btn-row">
              <Link className="guide-btn guide-btn-primary" to={paths.session} style={{ width: "auto" }}>
                Manage sessions
              </Link>
              <Link className="guide-btn guide-btn-ghost" to={paths.wallet}>
                Connect Wallet
              </Link>
            </div>
          </section>
        );
      }}
    </GuideShell>
  );
}
