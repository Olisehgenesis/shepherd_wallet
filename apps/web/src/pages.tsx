import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { paths } from "./shell/destinations";
import { Site } from "./site";

const capabilities = [
  {
    label: "Private reads",
    title: "Anon-RPC for browser RPC reads",
    body: "Console eth_* reads go through the Anon-RPC harness so agent activity is not a cleartext side channel in the browser.",
    href: paths.reads,
  },
  {
    label: "Policy-controlled calls",
    title: "Allow, reject, or require co-signing",
    body: "VERIFY checks target, selector, and value against ShepherdPolicy. High-risk calls wait for a second signature.",
    href: paths.intents,
  },
  {
    label: "Verifiable execution",
    title: "Canonical versus alt admission",
    body: "The same storage read is rejected on the canonical mempool. After stake, the alt mempool can admit the frame.",
    href: paths.mempool,
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

const privacyDoes = [
  "Anon-RPC for browser eth_* reads in the web console",
  "Policy-based verification of agent calls",
  "Canonical versus alt mempool execution paths",
  "Session permissions and co-signing for high-risk actions",
  "Redacted ops logs: method, route, and verdict only",
] as const;

const privacyDoesNot = [
  "Not a fully private RPC: the worker sees request bodies",
  "Reference worker uses ordinary fetch and does not unlink IP",
  "Frame submissions go clear to the mempool",
  "MCP eth_* reads need the open console Anon bridge; frame submissions stay clear",
  "Not safe against a malicious Anon-RPC worker",
] as const;

const previewRows = [
  ["vault.ping()", "alt", "admitted"],
  ["value → unknown", "alt", "TargetDenied"],
  ["vault.sweep()", "alt", "NeedsCosign"],
  ["eth_getBalance", "anon", "harness"],
] as const;

export function Landing() {
  return (
    <Site>
      <section className="hero-editorial" aria-label="Shepherd home">
        <div className="wrap hero-split">
          <div className="hero-copy">
            <p className="hero-brand">Shepherd</p>
            <h1 className="hero-title">Privacy calls for you and your agent.</h1>
            <p className="hero-deck">
              You keep the owner key. Agents get a scoped session: policy-checked spends, Anon-RPC reads, alt-mempool
              admission.
            </p>
            <div className="hero-actions">
              <Button asChild size="lg">
                <Link to={paths.wallet}>Connect Wallet</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/console">Open Console</Link>
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
              Three promises. No fake scores.
            </h2>
            <p className="section-sub">
              Protect browser reads, enforce call policy, and show canonical reject versus alt admit, without inventing
              privacy you do not have.
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
              From a wallet to an admitted call.
            </h2>
            <p className="section-sub">
              Three steps on the public alt-mempool workshop stack. The first admitted ping is the point of the console.
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
            <p className="mono-label">Privacy architecture</p>
            <h2 id="privacy-title" className="section-title">
              Honest about what is private, and what is not.
            </h2>
            <p className="section-sub">
              Shepherd is privacy infrastructure for agent calls, not a fully private RPC service and not a key-custody
              wallet product.
            </p>
          </div>
          <div className="privacy-split">
            <div className="privacy-panel">
              <h3>What Shepherd does</h3>
              <ul>
                {privacyDoes.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="privacy-panel privacy-panel-limit">
              <h3>What it does not claim</h3>
              <ul>
                {privacyDoesNot.map((item) => (
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
              A real console, not a static mockup.
            </h2>
            <p className="section-sub">
              Connect a wallet, prepare the account, grant a session, and watch canonical rejection versus alt admission.
              Ops entries store method, route, and verdict only.
            </p>
            <div className="hero-actions">
              <Button asChild>
                <Link to="/console">Open Console</Link>
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
            <h2 className="section-title">Privacy calls for you and your agent.</h2>
            <p>Open the console on the public alt-mempool devnet. No API key required for injected wallets.</p>
          </div>
          <div className="hero-actions">
            <Button asChild size="lg" className="close-primary">
              <Link to={paths.wallet}>Connect Wallet</Link>
            </Button>
            <Button asChild size="lg" variant="ghost" className="close-secondary">
              <Link to="/console">Open Console</Link>
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
