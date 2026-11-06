import { Link } from "react-router-dom";
import { MdGavel, MdLockOpen, MdSecurity, MdVisibilityOff, MdWarning } from "react-icons/md";
import { paths } from "../shell/destinations";
import { GuideShell } from "./GuideShell";

const tabs = [
  { id: "claims", label: "What we claim", Icon: MdSecurity },
  { id: "privacy", label: "Privacy", Icon: MdVisibilityOff },
  { id: "security", label: "Security", Icon: MdGavel },
  { id: "limits", label: "Not claimed", Icon: MdWarning },
  { id: "open", label: "Open source", Icon: MdLockOpen },
] as const;

export function TrustPage() {
  return (
    <GuideShell title="Privacy" subtitle="Wallet guide" tabs={tabs}>
      {(tab) => {
        if (tab === "claims") {
          return (
            <section className="guide-panel">
              <p className="guide-eyebrow">Privacy</p>
              <h1 className="guide-h1">What Shepherd claims</h1>
              <p className="guide-lead">
                Honest CROPS claims for agent calls: censorship resistance on the alt mempool, open source, privacy for
                browser reads, and security via scoped sessions.
              </p>
              <div className="guide-btn-row">
                <Link className="guide-btn guide-btn-primary" to={paths.wallet} style={{ width: "auto" }}>
                  Connect Wallet
                </Link>
                <Link className="guide-btn guide-btn-ghost" to="/how">
                  How it works
                </Link>
              </div>
            </section>
          );
        }

        if (tab === "privacy") {
          return (
            <section className="guide-panel">
              <p className="guide-eyebrow">Privacy</p>
              <h1 className="guide-h1">What is private</h1>
              <p className="guide-lead">
                Browser chain reads go through the Anon-RPC harness. The worker cannot touch keys, cookies, or the DOM.
                It can see every request body. The reference worker uses ordinary fetch, so it does not unlink your IP.
              </p>
              <ul className="guide-list">
                <li>Frame submissions stay on the clear gateway because the mempool must see them.</li>
                <li>MCP eth_* reads reuse the harness through a localhost bridge while the console is open.</li>
                <li>Ops log stores method, route, and verdict only.</li>
              </ul>
            </section>
          );
        }

        if (tab === "security") {
          return (
            <section className="guide-panel">
              <p className="guide-eyebrow">Security</p>
              <h1 className="guide-h1">Scoped agents</h1>
              <p className="guide-lead">
                The agent never holds the owner key. VERIFY reverts before approve on a bad target, a value above the
                cap, a revoked session, or a high-risk call without a second signature. Revoke is the kill switch.
              </p>
              <p className="guide-note">
                Censorship resistance: the agent path reads another contract during VERIFY. Canonical rules reject that
                read. A staked account on the alt mempool can be admitted.
              </p>
            </section>
          );
        }

        if (tab === "limits") {
          return (
            <section className="guide-panel">
              <p className="guide-eyebrow">Limits</p>
              <h1 className="guide-h1">Not claimed</h1>
              <ul className="guide-list">
                <li>Not a fully private RPC.</li>
                <li>Not safe against a malicious worker. It can censor or lie about reads.</li>
                <li>Not a production multisig. The owner path can call anything. That path is you.</li>
                <li>A browser wallet cannot sign the frame digest. The frame signer is generated in this tab.</li>
              </ul>
            </section>
          );
        }

        return (
          <section className="guide-panel">
            <p className="guide-eyebrow">Open source</p>
            <h1 className="guide-h1">MIT, no trackers</h1>
            <p className="guide-lead">
              MIT licensed. No tracker, no analytics script, no font CDN. The pages in this app are the docs.
            </p>
          </section>
        );
      }}
    </GuideShell>
  );
}
