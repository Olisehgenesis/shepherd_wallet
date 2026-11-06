import { Link } from "react-router-dom";
import {
  MdGavel,
  MdLock,
  MdPolicy,
  MdSecurity,
  MdVisibilityOff,
  MdWarning,
  MdShield,
  MdSwapHoriz,
} from "react-icons/md";
import { paths } from "../shell/destinations";
import { GuideShell } from "./GuideShell";

const tabs = [
  { id: "protects", label: "What it protects", Icon: MdShield },
  { id: "reads", label: "Browser reads", Icon: MdVisibilityOff },
  { id: "permissions", label: "Agent permissions", Icon: MdPolicy },
  { id: "owner", label: "Owner key", Icon: MdLock },
  { id: "risk", label: "High-risk & co-sign", Icon: MdSecurity },
  { id: "revoke", label: "Revocation", Icon: MdGavel },
  { id: "mempool", label: "Canonical vs alt", Icon: MdSwapHoriz },
  { id: "limits", label: "Not guaranteed", Icon: MdWarning },
] as const;

export function TrustPage() {
  return (
    <GuideShell title="Privacy" subtitle="Trust center" tabs={tabs} crossLinks>
      {(tab) => {
        if (tab === "protects") {
          return (
            <section className="guide-panel">
              <p className="guide-eyebrow">Trust center</p>
              <h1 className="guide-h1">What Shepherd protects</h1>
              <p className="guide-lead">
                Shepherd scopes agent spend and softens browser read side channels. It is not an invisible chain. This
                page states claims and limits in the same voice.
              </p>
              <figure className="guide-art">
                <img src="/how/asset-privacy-shield.jpg" alt="Privacy shield mascot" />
              </figure>
              <div className="guide-mech">
                <article>
                  <h3>Owner key isolation</h3>
                  <p>Agents never hold the owner frame-signer. Sessions are separate keys.</p>
                </article>
                <article>
                  <h3>Call policy</h3>
                  <p>VERIFY checks target, selector, and value before APPROVE.</p>
                </article>
                <article>
                  <h3>Read path</h3>
                  <p>Console eth_* reads go through Anon-RPC by default when the harness is up.</p>
                </article>
              </div>
            </section>
          );
        }

        if (tab === "reads") {
          return (
            <section className="guide-panel">
              <p className="guide-eyebrow">Anon-RPC</p>
              <h1 className="guide-h1">How browser reads work</h1>
              <p className="guide-lead">
                The harness loads a worker whose hash is pinned. The worker cannot touch keys, cookies, or the DOM. It
                can see every request body routed through it.
              </p>
              <ul className="guide-list">
                <li>Reference worker fulfils calls with ordinary fetch. It does not unlink your IP.</li>
                <li>Bootstrap specifier read is not anonymized.</li>
                <li>MCP eth_* reads need the open console Anon bridge on 127.0.0.1:17814.</li>
                <li>Ops logs store method, route, and verdict only.</li>
              </ul>
            </section>
          );
        }

        if (tab === "permissions") {
          return (
            <section className="guide-panel">
              <p className="guide-eyebrow">Permissions</p>
              <h1 className="guide-h1">How agent permissions are enforced</h1>
              <div className="guide-stickers">
                <figure className="guide-art">
                  <img src="/how/asset-allow.jpg" alt="Allow" />
                </figure>
                <figure className="guide-art">
                  <img src="/how/asset-deny.jpg" alt="Deny" />
                </figure>
              </div>
              <p className="guide-lead">
                Rules live in ShepherdPolicy storage keyed by target and selector. Modes: deny, allow, high-risk. The
                LLM is not in the trust path.
              </p>
            </section>
          );
        }

        if (tab === "owner") {
          return (
            <section className="guide-panel">
              <p className="guide-eyebrow">Owner key</p>
              <h1 className="guide-h1">Owner key security</h1>
              <figure className="guide-art">
                <img src="/how/how-owner-key.jpg" alt="Owner key" />
              </figure>
              <ul className="guide-list">
                <li>Owner / frame-signer lives in this tab (sessionStorage) or .shepherd-state.json for demos.</li>
                <li>Browser wallets cannot sign EIP-8141 digests. They are for identity and deposits.</li>
                <li>No MCP tool returns the owner key.</li>
                <li>Closing the tab without backup deletes in-browser keys.</li>
              </ul>
            </section>
          );
        }

        if (tab === "risk") {
          return (
            <section className="guide-panel">
              <p className="guide-eyebrow">High-risk</p>
              <h1 className="guide-h1">High-risk operations and co-signing</h1>
              <figure className="guide-art">
                <img src="/how/asset-cosign.jpg" alt="Co-sign" />
              </figure>
              <p className="guide-lead">
                High-risk rules require a second protocol signature: owner secp256k1 or a registered P256 key. Value
                above the session cap is a hard deny, not a co-sign prompt.
              </p>
            </section>
          );
        }

        if (tab === "revoke") {
          return (
            <section className="guide-panel">
              <p className="guide-eyebrow">Kill switch</p>
              <h1 className="guide-h1">Revocation</h1>
              <figure className="guide-art">
                <img src="/how/how-revoke.jpg" alt="Revoke" />
              </figure>
              <p className="guide-lead">
                Revoke is the kill switch. Expiry frame data is elided from other VERIFY frames, so the account checks
                the expiry verifier target when attached, not a readable timestamp.
              </p>
              <div className="guide-btn-row">
                <Link className="guide-btn guide-btn-primary" to={paths.session} style={{ width: "auto" }}>
                  Open sessions
                </Link>
              </div>
            </section>
          );
        }

        if (tab === "mempool") {
          return (
            <section className="guide-panel">
              <p className="guide-eyebrow">Mempool</p>
              <h1 className="guide-h1">Canonical versus alternative</h1>
              <div className="guide-path-grid">
                <article className="guide-path guide-path-owner">
                  <h3>Canonical</h3>
                  <p>External policy storage read → StorageReadNonSender. Rejected.</p>
                </article>
                <article className="guide-path guide-path-agent">
                  <h3>Alt, after stake</h3>
                  <p>Staked entity may read non-sender storage. In-policy frames can be admitted.</p>
                </article>
              </div>
              <p className="guide-note">Unstaked alt also rejects the same external read. Stake uses the owner path.</p>
            </section>
          );
        }

        return (
          <section className="guide-panel">
            <p className="guide-eyebrow">Limits</p>
            <h1 className="guide-h1">What Shepherd does NOT guarantee</h1>
            <ul className="guide-list">
              <li>Not a fully private RPC.</li>
              <li>Not safe against a malicious Anon-RPC worker (censor or lie about reads).</li>
              <li>Not IP unlinkability with the reference worker.</li>
              <li>Frame submissions are visible to the mempool.</li>
              <li>Not a production multisig. Owner path can call anything.</li>
              <li>Hegota opcode helpers are a devnet shim, not audited mainnet code.</li>
            </ul>
            <div className="guide-btn-row">
              <Link className="guide-btn guide-btn-ghost" to="/how">
                How it works
              </Link>
              <Link className="guide-btn guide-btn-primary" to={paths.wallet} style={{ width: "auto" }}>
                Connect Wallet
              </Link>
            </div>
          </section>
        );
      }}
    </GuideShell>
  );
}
