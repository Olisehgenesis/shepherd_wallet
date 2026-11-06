import { Link } from "react-router-dom";
import { OrbitalPrivacy } from "@/components/OrbitalPrivacy";
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
  "Redacted ops logs — method, route, and verdict only",
] as const;

const privacyDoesNot = [
  "Not a fully private RPC — the worker sees request bodies",
  "Reference worker uses ordinary fetch and does not unlink IP",
  "Frame submissions go clear to the mempool",
  "Node CLI and MCP do not currently use Anon-RPC",
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
        <div className="wrap hero-grid">
          <div className="hero-copy">
            <p className="hero-brand">Shepherd</p>
            <p className="hero-eyebrow">Privacy infrastructure for agent calls</p>
            <h1 className="hero-title">Privacy calls for you and your agent.</h1>
            <p className="hero-deck">
              Let your agents make on-chain calls with policy-controlled execution and privacy-aware browser reads.
            </p>
            <div className="hero-actions">
              <Button asChild size="lg">
                <Link to={paths.wallet}>Connect Wallet</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/console">Explore the Console</Link>
              </Button>
            </div>
            <p className="hero-aside">
              Built around the public alt mempool and EIP-8141. You keep the owner key. The agent gets a scoped session.
            </p>
          </div>
          <OrbitalPrivacy className="hero-visual" />
        </div>
      </section>

      <section className="capability-band" aria-labelledby="capabilities-title">
        <div className="wrap">
          <div className="section-intro">
            <h2 id="capabilities-title" className="section-title">
              Three promises. No fake scores.
            </h2>
            <p className="section-sub">
              Shepherd helps protect browser reads, enforce call policies, and verify execution without exposing more
              information than necessary.
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
              Honest about what is private — and what is not.
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
              A real console — not a static mockup.
            </h2>
            <p className="section-sub">
              Connect a wallet, prepare the account, grant a session, and watch canonical rejection versus alt admission.
              Ops entries store method, route, and verdict only.
            </p>
            <div className="hero-actions">
              <Button asChild>
                <Link to="/console">Explore the Console</Link>
              </Button>
              <Button asChild variant="ghost">
                <Link to="/docs">Documentation</Link>
              </Button>
            </div>
          </div>
          <div className="console-panel" aria-hidden="true">
            <div className="console-panel-bar">
              <span>shepherd · console</span>
              <span>devnet 1337</span>
            </div>
            <div className="console-panel-body">
              <div className="console-nav">
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
              <p className="console-panel-note">Illustrative outcomes from the demo path — open the console for live state.</p>
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
            <Button asChild size="lg" variant="outline" className="close-primary">
              <Link to={paths.wallet}>Connect Wallet</Link>
            </Button>
            <Button asChild size="lg" variant="ghost" className="close-secondary">
              <Link to="/console">Explore the Console</Link>
            </Button>
          </div>
        </div>
      </section>
    </Site>
  );
}

export function How() {
  return (
    <Site>
      <article className="wrap prose">
        <p className="mono-label">How it works</p>
        <h1>How Shepherd decides</h1>
        <p>
          A frame transaction carries a VERIFY frame and a call. Shepherd’s account approves the call only when the
          signer, the target, the selector, and the value all fit the session.
        </p>
        <ol className="steps">
          <li>
            <b>1</b>
            <div>
              <h3>You are the owner path</h3>
              <p>
                Empty VERIFY data means the frame signer is the owner. That path does not read the policy, so it can
                deploy, stake, grant, and revoke while the account is unstaked.
              </p>
            </div>
          </li>
          <li>
            <b>2</b>
            <div>
              <h3>The agent is the other path</h3>
              <p>
                VERIFY data 0x01 means the signer must be an active session. The account then reads ShepherdPolicy. That
                external read is why the canonical mempool says no.
              </p>
            </div>
          </li>
          <li>
            <b>3</b>
            <div>
              <h3>High-risk waits</h3>
              <p>
                Sweep is allowlisted as high-risk. It needs a second signature from the owner or a registered P256
                co-signer. The healthy agent refuses to sign that one by itself.
              </p>
            </div>
          </li>
          <li>
            <b>4</b>
            <div>
              <h3>Revoke is the kill switch</h3>
              <p>
                The account does not read a timestamp. An expiry frame is attached only when that verifier has code, and
                the account checks the target, not the hidden timestamp. Revoke is what stops the session.
              </p>
            </div>
          </li>
        </ol>
        <p>
          <Link className="btn" to="/docs">
            How to use it
          </Link>
        </p>
      </article>
    </Site>
  );
}

export function Docs() {
  return (
    <Site>
      <article className="wrap prose">
        <p className="mono-label">Documentation</p>
        <h1>How to use Shepherd</h1>
        <p>
          You need a browser wallet, or a WalletConnect project id, and a network path to the public devnet. No API key
          is required for the injected path.
        </p>
        <h2>In the console</h2>
        <ol>
          <li>
            Open the console and use <Link to={paths.wallet}>Connect wallet</Link>. Any EIP-6963 wallet can appear.
            WalletConnect needs <code>VITE_WALLETCONNECT_PROJECT_ID</code>. Export/import the frame signer from You →
            Backup.
          </li>
          <li>
            Open <Link to={paths.home}>Home</Link> and choose Prepare the account. Shepherd funds the frame signer from
            the shared genesis key, then the three contracts deploy. This can take a minute. The loader stays up until
            the receipt lands.
          </li>
          <li>
            Open <Link to={paths.session}>Agents → Session</Link>, set value cap and TTL, then issue a session key.
            Reveal it only if another process on this machine needs it.
          </li>
          <li>
            Open <Link to={paths.policy}>Policy</Link> inside an agent to add allow / high-risk rules. Open{" "}
            <Link to={paths.agents}>Agents</Link> to spawn or revoke child sessions.
          </li>
          <li>
            Open <Link to={paths.mempool}>You → Demo → Mempool</Link>, stake 0.012 ETH, then send the ping to the alt
            mempool. The canonical send should be rejected for the storage read.
          </li>
          <li>
            Open <Link to={paths.intents}>You → Demo → Intents</Link> for a custom call or the demo buttons. High-risk
            opens the <Link to={paths.approvals}>co-sign queue</Link>. History is on{" "}
            <Link to={paths.activity}>Activity</Link>.
          </li>
          <li>
            Open <Link to={paths.reads}>You → Demo → Reads</Link>. Balance and code go through the harness. If the
            harness fails, that page does not fall back to a clear provider.
          </li>
        </ol>
        <h2>What you should see</h2>
        <table>
          <thead>
            <tr>
              <th>Action</th>
              <th>Verdict</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>In-policy ping, after stake</td>
              <td>admitted, with an explorer link in the log reason when the chain returns one</td>
            </tr>
            <tr>
              <td>Value to an unknown target</td>
              <td>TargetDenied</td>
            </tr>
            <tr>
              <td>Sweep before you co-sign</td>
              <td>NeedsCosign</td>
            </tr>
            <tr>
              <td>Sweep after co-sign</td>
              <td>admitted</td>
            </tr>
            <tr>
              <td>Same ping on the canonical mempool</td>
              <td>canonical-storage-read</td>
            </tr>
          </tbody>
        </table>
        <h2>From the terminal</h2>
        <pre>{`npm install --registry https://registry.npmjs.org
npm run test:contracts
npm run demo
npm run dev
npm run mcp`}</pre>
        <p>
          <code>npm run demo</code> writes throwaway keys to <code>.shepherd-state.json</code>. That file stays off git.
          The MCP server reads it and will not return the owner key. See <Link to="/mcp">MCP</Link>.
        </p>
      </article>
    </Site>
  );
}

export function Trust() {
  return (
    <Site>
      <article className="wrap prose">
        <p className="mono-label">Privacy</p>
        <h1>What Shepherd claims</h1>
        <h2>Censorship resistance</h2>
        <p>
          The agent path reads another contract during VERIFY. Canonical rules reject that read. A staked account on the
          alt mempool can be admitted. There is no private relay in front of this.
        </p>
        <h2>Open source</h2>
        <p>MIT. No tracker, no analytics script, no font CDN. The pages in this app are the docs.</p>
        <h2>Privacy</h2>
        <p>
          Browser chain reads go through the Anon-RPC harness. The worker cannot touch keys, cookies, or the DOM. It can
          see every request body. The reference worker fulfils calls with ordinary fetch, so it does not unlink your IP.
          Frame submissions stay on the clear gateway because the mempool has to see them. Node CLI and MCP do not
          currently use Anon-RPC. The ops log stores method, route, and verdict.
        </p>
        <h2>Security</h2>
        <p>
          The agent never holds the owner key. VERIFY reverts before approve on a bad target, a value above the cap, a
          revoked session, or a high-risk call without a second signature. Revoke is the kill switch.
        </p>
        <h2>Not claimed</h2>
        <ul>
          <li>Not a fully private RPC.</li>
          <li>Not safe against a malicious worker. It can censor or lie about reads.</li>
          <li>Not a production multisig. The owner path can call anything. That path is you.</li>
          <li>A browser wallet cannot sign the frame digest. The frame signer is generated in this tab.</li>
        </ul>
      </article>
    </Site>
  );
}

export function McpPage() {
  return (
    <Site>
      <article className="wrap prose">
        <div className="asset-row">
          <img className="asset-agent" src="/agent.png?v=3d" alt="" width={160} height={160} decoding="async" />
          <div>
            <p className="mono-label">MCP</p>
            <h1>Agents can spawn agents</h1>
            <p>
              <code>npm run mcp</code> speaks MCP over stdio. Cursor loads it from <code>.cursor/mcp.json</code>. The
              server uses the owner key inside the process. No tool returns that key. MCP does not currently use
              Anon-RPC.
            </p>
            <p>
              For a live owner UI (list / spawn / revoke children in the browser), open{" "}
              <Link to={paths.agents}>Console → Agents</Link>.
            </p>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Tool</th>
              <th>What it does</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>shepherd_posture</td>
              <td>Says whether the root session is active and whether the account is staked.</td>
            </tr>
            <tr>
              <td>shepherd_list_agents</td>
              <td>Lists children. No keys.</td>
            </tr>
            <tr>
              <td>shepherd_spawn_agent</td>
              <td>
                Grants a child under root or under another agent. The cap and the expiry cannot exceed the parent. Depth
                stops at 3. Eight children per parent.
              </td>
            </tr>
            <tr>
              <td>shepherd_revoke_agent</td>
              <td>Revokes one spawned session.</td>
            </tr>
            <tr>
              <td>shepherd_propose_intent</td>
              <td>Signs an in-policy ping only when the mirror says allow.</td>
            </tr>
          </tbody>
        </table>
        <p>
          Run <code>npm run demo</code> once so the state file has an account, then start the MCP server. Spawn from
          parent id <code>root</code>.
        </p>
      </article>
    </Site>
  );
}
