import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { paths } from "./shell/destinations";
import { Site } from "./site";

const capabilities = [
  {
    label: "External policy",
    title: "VERIFY reads ShepherdPolicy",
    body: "The agent path staticcalls an external allowlist for target, selector, and value. That storage read is why canonical rejects.",
    href: paths.mempool,
  },
  {
    label: "Alt-mempool admit",
    title: "Stake, then the same frame clears",
    body: "Unstaked alt rejects the same read. After addStake, the alt mempool can admit. Owner path can stake while unstaked.",
    href: paths.mempool,
  },
  {
    label: "Scoped sessions",
    title: "Allow, deny, or require co-sign",
    body: "Agents hold a session key, not the owner key. High-risk calls wait for a second protocol signature.",
    href: paths.intents,
  },
] as const;

const steps = [
  {
    n: "01",
    title: "Connect and prepare",
    body: "Connect a wallet for identity. Shepherd funds a frame signer in this tab, then deploys the policy, vault, and account on the public alt-mempool devnet.",
    href: paths.wallet,
    link: "Connect Wallet",
  },
  {
    n: "02",
    title: "Grant a scoped session",
    body: "Issue a session key that is not the owner. Revoke clears it on-chain. Child agents spawned over MCP cannot outspend or outlive the parent.",
    href: paths.session,
    link: "Open Session",
  },
  {
    n: "03",
    title: "Submit under policy",
    body: "Stake the account, then send an in-policy call on the alt mempool. A drain is rejected by VERIFY. Sweep waits until you co-sign.",
    href: paths.mempool,
    link: "Open Mempool",
  },
] as const;

const productDoes = [
  "EIP-8141 VERIFY allowlists target, selector, and value",
  "External ShepherdPolicy so canonical rejects the storage read",
  "Staked alt-mempool admission after addStake",
  "Scoped session keys; revoke is the kill switch",
  "High-risk calls need owner or registered P256 co-sign",
] as const;

const productDoesNot = [
  "Not a smarter trading agent — it is a leash for an agent",
  "Not a fully private RPC (Anon-RPC details live on /trust)",
  "Not safe against a malicious Anon-RPC worker",
  "Not a production multisig; empty VERIFY can call anything",
  "ShepherdVault.sweep is a high-risk demo selector, not a fund move",
] as const;

const previewRows = [
  ["vault.ping()", "canonical", "canonical-storage-read"],
  ["vault.ping()", "alt unstaked", "unstaked-storage-read"],
  ["vault.ping()", "alt staked", "admitted"],
  ["vault.sweep()", "alt", "NeedsCosign"],
] as const;

export function Landing() {
  return (
    <Site>
      <section className="hero-editorial" aria-label="Shepherd home">
        <div className="wrap hero-split">
          <div className="hero-copy">
            <p className="hero-brand">Shepherd</p>
            <h1 className="hero-title">A frame-transaction account for agents.</h1>
            <p className="hero-deck">
              The human keeps the owner key. The agent gets a separate, scoped session key. Spend only clears when an
              EIP-8141 VERIFY frame says the target, selector, and value are in policy — in another contract, so the
              canonical mempool rejects and a staked alt-mempool admits.
            </p>
            <div className="hero-actions">
              <Button asChild size="lg">
                <Link to={paths.mempool}>Open mempool demo</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/how">How a frame is decided</Link>
              </Button>
            </div>
          </div>
          <figure className="hero-figure">
            <img
              src="/hero.jpg"
              alt="Ethereum shepherd with anonymized sheep on a farm"
              width={1024}
              height={682}
              decoding="async"
              fetchPriority="high"
            />
          </figure>
        </div>
      </section>

      <section className="capability-band" aria-labelledby="capabilities-title">
        <div className="wrap">
          <div className="section-intro">
            <h2 id="capabilities-title" className="section-title">
              Frame-native. External policy. Alt admit.
            </h2>
            <p className="section-sub">
              This is an EIP-8141 agent account on ERC-8421 alt-mempool rules — not a private-RPC demo. Anon-RPC is
              supporting infrastructure; the prize path is stake-to-admit.
            </p>
          </div>
          <div className="capability-list">
            {capabilities.map((item) => (
              <Link key={item.label} to={item.href} className="capability-item">
                <span className="capability-label">{item.label}</span>
                <strong>{item.title}</strong>
                <p>{item.body}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="how-section" id="how" aria-labelledby="how-title">
        <div className="wrap how-grid">
          <div className="how-lead">
            <p className="mono-label">How Shepherd works</p>
            <h2 id="how-title" className="section-title">
              From owner key to alt admission.
            </h2>
            <p className="section-sub">
              Prepare, grant a session, stake, then watch canonical reject → unstaked reject → admitted on the public
              alt-mempool devnet.
            </p>
            <Button asChild variant="outline">
              <Link to="/how">Read the full path</Link>
            </Button>
          </div>
          <ol className="how-steps">
            {steps.map((step) => (
              <li key={step.n}>
                <span className="how-n">{step.n}</span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                  <Link to={step.href}>{step.link}</Link>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="privacy-section" id="privacy" aria-labelledby="privacy-title">
        <div className="wrap">
          <div className="section-intro">
            <p className="mono-label">Product boundary</p>
            <h2 id="privacy-title" className="section-title">
              A leash for an agent. Not a private-RPC headline.
            </h2>
            <p className="section-sub">
              Prize fit is Best use of the Frame Transaction Alternative Mempool. Anon-RPC and CROPS live on the trust
              and reads pages.
            </p>
          </div>
          <div className="privacy-split">
            <div className="privacy-panel">
              <h3>What Shepherd does</h3>
              <ul>
                {productDoes.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="privacy-panel privacy-panel-limit">
              <h3>What it does not claim</h3>
              <ul>
                {productDoesNot.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <Link to="/trust" className="privacy-more">
                Full trust model
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="console-preview" aria-labelledby="console-title">
        <div className="wrap console-grid">
          <div className="console-copy">
            <p className="mono-label">Interactive console</p>
            <h2 id="console-title" className="section-title">
              Canonical vs alt-mempool first.
            </h2>
            <p className="section-sub">
              Judges should open the mempool page: same VERIFY storage read, three verdicts in order. Then intents for
              ping, drain, and co-signed sweep.
            </p>
            <div className="hero-actions">
              <Button asChild>
                <Link to={paths.mempool}>Open mempool</Link>
              </Button>
              <Button asChild variant="ghost">
                <Link to="/docs">Read the docs</Link>
              </Button>
            </div>
          </div>
          <div className="console-panel" aria-hidden="true">
            <div className="console-panel-bar">
              <span>shepherd · console</span>
              <span>devnet 1337</span>
            </div>
            <div className="console-panel-body">
              <div className="console-panel-tabs">
                <span className="is-active">Home</span>
                <span>Agents</span>
                <span>Activity</span>
                <span>You</span>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Call</th>
                    <th>Route</th>
                    <th>Verdict</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map(([call, route, verdict]) => (
                    <tr key={call}>
                      <td>
                        <code>{call}</code>
                      </td>
                      <td>{route}</td>
                      <td>
                        <span className={`verdict verdict-${verdict.toLowerCase().replace(/\s/g, "-")}`}>{verdict}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="console-panel-note">Illustrative outcomes from the demo path. Open the console for live state.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="close-cta" aria-label="Get started">
        <div className="wrap close-inner">
          <div>
            <p className="mono-label mono-label-on-dark">Shepherd</p>
            <h2 className="section-title">A frame-transaction account for agents.</h2>
            <p>Start at /how, then /console/mempool on the public alt-mempool devnet (chain 1337).</p>
          </div>
          <div className="hero-actions">
            <Button asChild size="lg" className="close-primary">
              <Link to={paths.mempool}>Open mempool</Link>
            </Button>
            <Button asChild size="lg" variant="ghost" className="close-secondary">
              <Link to="/how">How it works</Link>
            </Button>
          </div>
        </div>
      </section>
    </Site>
  );
}

export { HowPage as How } from "./guide/HowPage";
export { DocsPage as Docs } from "./guide/DocsPage";
export { TrustPage as Trust } from "./guide/TrustPage";
export { McpGuidePage as McpPage } from "./guide/McpGuidePage";
