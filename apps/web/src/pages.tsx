import { useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Site } from "./site";

const products = [
  ["/console/wallet", "Wallet", "Connect-wallet popup"],
  ["/console/session", "Session", "A key that is not the owner"],
  ["/console/intents", "Intents", "Ping, drain, or wait"],
  ["/console/reads", "Reads", "Anon-RPC by default"],
  ["/console/mempool", "Mempool", "Canonical rejects, alt can admit"],
  ["/mcp", "MCP", "An agent spawns a child"],
  ["/docs", "Docs", "The path from zero to a ping"],
  ["/trust", "Trust", "What this does not claim"],
] as const;

const tabs = [
  {
    id: "policy",
    label: "Policy",
    title: "The account allowlists a target and a selector",
    body: "Ping on the vault is allowed. Sweep is high-risk and waits for you. Any other target, including a value transfer, is denied before the frame is approved.",
    rows: [
      ["vault.ping()", "Allow"],
      ["vault.sweep()", "High-risk"],
      ["Value to an unknown target", "Deny"],
    ],
  },
  {
    id: "session",
    label: "Session",
    title: "The agent holds a different key",
    body: "You connect a wallet. Shepherd keeps a frame-signing key in this tab because browser wallets cannot sign an EIP-8141 digest. The session key is a third key. Revoke clears it on-chain.",
    rows: [
      ["Connected wallet", "You"],
      ["Frame signer", "Stays in this tab"],
      ["Session key", "The agent"],
    ],
  },
  {
    id: "mempool",
    label: "Mempool",
    title: "The same storage read, two answers",
    body: "The agent path reads the policy contract during VERIFY. The canonical mempool rejects that read. The alt mempool rejects it until the account is staked, then it can admit the frame.",
    rows: [
      ["Canonical", "Storage read rejected"],
      ["Alt, unstaked", "Storage read rejected"],
      ["Alt, after stake", "Can be admitted"],
    ],
  },
  {
    id: "reads",
    label: "Reads",
    title: "Chain reads go through the harness",
    body: "The console counts eth_* reads. The worker sees request bodies. The reference worker does not unlink your IP. Submissions stay on the clear gateway because the mempool has to see them.",
    rows: [
      ["eth_chainId", "Anon"],
      ["Bootstrap worker hash", "Clear, on purpose"],
      ["eth_sendFrameTransaction", "Clear"],
    ],
  },
] as const;

const stats = [
  { label: "Owner key", value: "YOURS", tone: "ok" as const },
  { label: "Session", value: "SCOPED", tone: "info" as const },
  { label: "VERIFY", value: "LIVE", tone: "wait" as const },
  { label: "Canonical", value: "REJECT", tone: "bad" as const },
];

export function Landing() {
  const [tab, setTab] = useState<(typeof tabs)[number]["id"]>("policy");
  const current = tabs.find((item) => item.id === tab) ?? tabs[0];
  return (
    <Site>
      <div className="wrap">
        <section className="rpg-stage" aria-label="Shepherd home">
          <div className="grid gap-3">
            <Card>
              <CardHeader>
                <CardTitle className="pixel-heart">SELECT</CardTitle>
              </CardHeader>
              <CardContent className="rpg-menu font-pixel text-[10px] leading-relaxed">
                <Link to="/console">♥ CONSOLE</Link>
                <Link to="/how">  HOW</Link>
                <Link to="/docs">  DOCS</Link>
                <Link to="/mcp">  MCP</Link>
                <Link to="/trust">  TRUST</Link>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="text-[13px] text-[var(--muted)]">
                <span className="blink">*</span> SHEPHERD — the agent never holds the key that can empty the wallet.
              </CardContent>
            </Card>
          </div>

          <div>
            <p className="rpg-kicker">POLICY-DRIVEN. OWNER-FIRST.</p>
            <h1 className="rpg-title">SHEPHERD</h1>
            <p className="rpg-sub">A SCOPED SESSION THE VERIFY FRAME CAN REFUSE</p>
            <figure className="rpg-hero">
              <img
                src="/hero.png"
                alt="Shepherd illustration: the owner holds the key while a scoped agent stays limited."
                width={720}
                height={960}
                decoding="async"
              />
              <div className="rpg-hero-copy">
                <h1>The agent never holds the key that can empty the wallet.</h1>
                <p className="lede" style={{ margin: "0 0 12px" }}>
                  You keep the owner key. Canonical rejects the policy read; a staked alt mempool can admit it.
                </p>
                <div className="row">
                  <Link className="btn" to="/console">
                    START PROJECT
                  </Link>
                  <Link className="btn-ghost" to="/docs">
                    READ DOCS
                  </Link>
                </div>
              </div>
            </figure>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>STATS</CardTitle>
            </CardHeader>
            <CardContent>
              {stats.map((stat) => (
                <div className="rpg-stat" key={stat.label}>
                  <span aria-hidden="true">◆</span>
                  <span>{stat.label}</span>
                  <Badge variant={stat.tone}>{stat.value}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        <section className="rpg-dialogue" aria-label="Dialogue">
          <Card>
            <CardContent className="font-pixel text-[10px] leading-relaxed">
              <p style={{ margin: "0 0 10px" }}>
                <span className="blink">*</span> YOU&apos;VE FOUND A CREATIVE PARTNER FOR SCOPED AGENTS.
              </p>
              <p style={{ margin: 0 }}>
                <span className="blink">*</span> LET&apos;S BUILD AN ADMITTED PING ON THE ALT MEMPOOL.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <p className="rpg-kicker" style={{ marginBottom: 10 }}>
                PREPARE
              </p>
              <ul style={{ margin: "0 0 12px", paddingLeft: 18, color: "var(--muted)" }}>
                <li>Connect any injected wallet, or WalletConnect</li>
                <li>The account deploys on the public alt-mempool devnet</li>
                <li>The session key is not your seed</li>
              </ul>
              <div className="row">
                <Link className="btn" to="/console/wallet">
                  Connect wallet
                </Link>
                <Link className="btn-ghost" to="/how">
                  See the path
                </Link>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="demo pixel-panel" aria-label="What the console decides" style={{ marginTop: 18, background: "var(--surface)" }}>
          <div className="tabs" role="tablist">
            {tabs.map((item) => (
              <button key={item.id} type="button" role="tab" aria-selected={tab === item.id} onClick={() => setTab(item.id)}>
                {item.label}
              </button>
            ))}
          </div>
          <div className="demo-body" role="tabpanel">
            <div>
              <h2 className="font-pixel text-[12px] leading-relaxed">{current.title}</h2>
              <p>{current.body}</p>
            </div>
            <table>
              <tbody>
                {current.rows.map(([name, verdict]) => (
                  <tr key={name}>
                    <td>{name}</td>
                    <td>{verdict}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section style={{ marginTop: 28 }}>
          <h2 className="font-pixel text-[12px] leading-relaxed">Where each part lives</h2>
          <div className="cloud">
            {products.map(([to, label, hint]) => (
              <Link key={to} to={to}>
                <strong>{label}</strong>
                <span>{hint}</span>
              </Link>
            ))}
          </div>
        </section>

        <section style={{ marginTop: 28 }}>
          <h2 className="font-pixel text-[12px] leading-relaxed">From a wallet to an admitted ping</h2>
          <ol className="steps">
            <li>
              <b>1</b>
              <div>
                <h3>Connect</h3>
                <p>Pick an injected wallet or WalletConnect from the connect-wallet popup. Shepherd records the account. It does not ask that wallet to sign a frame hash.</p>
                <Link to="/console/wallet">Open connect wallet</Link>
              </div>
            </li>
            <li>
              <b>2</b>
              <div>
                <h3>Prepare</h3>
                <p>The shared genesis key funds a frame signer in this tab. Shepherd deploys the policy, the vault, and the account, then allowlists ping and marks sweep as high-risk.</p>
                <Link to="/console">Open Overview</Link>
              </div>
            </li>
            <li>
              <b>3</b>
              <div>
                <h3>Grant</h3>
                <p>Issue a session key. It can be revoked. A child agent spawned over MCP cannot outspend or outlive this session.</p>
                <Link to="/console/session">Open Session</Link>
              </div>
            </li>
            <li>
              <b>4</b>
              <div>
                <h3>Submit</h3>
                <p>Stake the account, then send an in-policy ping on the alt mempool. A drain is signed and rejected by VERIFY. Sweep waits until you co-sign.</p>
                <Link to="/console/mempool">Open Mempool</Link>
              </div>
            </li>
          </ol>
        </section>

        <section className="close pixel-panel" style={{ background: "var(--surface)" }}>
          <div>
            <h2 className="font-pixel text-[12px] leading-relaxed">Use it on the devnet</h2>
            <p>Four steps. The first admitted ping is the point of the console.</p>
            <div className="partner-row" style={{ justifyContent: "flex-start", marginTop: 12 }}>
              <span>EIP-8141</span>
              <span>ALT MEMPOOL</span>
              <span>ANON-RPC</span>
              <span>MCP</span>
              <span>DEVNET 1337</span>
            </div>
          </div>
          <Link className="btn btn-lg" to="/console">
            Open the console
          </Link>
        </section>
      </div>
    </Site>
  );
}

export function How() {
  return (
    <Site>
      <article className="wrap prose">
        <h1>How Shepherd decides</h1>
        <p>A frame transaction carries a VERIFY frame and a call. Shepherd’s account approves the call only when the signer, the target, the selector, and the value all fit the session.</p>
        <ol className="steps">
          <li>
            <b>1</b>
            <div>
              <h3>You are the owner path</h3>
              <p>Empty VERIFY data means the frame signer is the owner. That path does not read the policy, so it can deploy, stake, grant, and revoke while the account is unstaked.</p>
            </div>
          </li>
          <li>
            <b>2</b>
            <div>
              <h3>The agent is the other path</h3>
              <p>VERIFY data 0x01 means the signer must be an active session. The account then reads ShepherdPolicy. That external read is why the canonical mempool says no.</p>
            </div>
          </li>
          <li>
            <b>3</b>
            <div>
              <h3>High-risk waits</h3>
              <p>Sweep is allowlisted as high-risk. It needs a second signature from the owner or a registered P256 co-signer. The healthy agent refuses to sign that one by itself.</p>
            </div>
          </li>
          <li>
            <b>4</b>
            <div>
              <h3>Revoke is the kill switch</h3>
              <p>The account does not read a timestamp. An expiry frame is attached only when that verifier has code, and the account checks the target, not the hidden timestamp. Revoke is what stops the session.</p>
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
        <h1>How to use Shepherd</h1>
        <p>You need a browser wallet, or a WalletConnect project id, and a network path to the public devnet. No API key is required for the injected path.</p>
        <h2>In the console</h2>
        <ol>
          <li>
            Open the console and use <Link to="/console/wallet">Connect wallet</Link>. Any EIP-6963 wallet can appear. WalletConnect needs <code>VITE_WALLETCONNECT_PROJECT_ID</code>.
          </li>
          <li>
            Open <Link to="/console">Overview</Link> and choose Prepare the account. Shepherd funds the frame signer from the shared genesis key, then the three contracts deploy. This can take a minute. The loader stays up until the receipt lands.
          </li>
          <li>
            Open <Link to="/console/session">Session</Link> and issue a session key. Reveal it only if another process on this machine needs it. It is not written to the ops log.
          </li>
          <li>
            Open <Link to="/console/mempool">Mempool</Link>, stake 0.012 ETH, then send the ping to the alt mempool. The canonical send should be rejected for the storage read.
          </li>
          <li>
            Open <Link to="/console/intents">Intents</Link>. Ping signs. The drain is submitted so the chain can reject it. Sweep waits, then co-sign sends it.
          </li>
          <li>
            Open <Link to="/console/reads">Reads</Link>. Balance and code go through the harness. If the harness fails, that page does not fall back to a clear provider.
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
          <code>npm run demo</code> writes throwaway keys to <code>.shepherd-state.json</code>. That file stays off git. The MCP server reads it and will not return the owner key. See <Link to="/mcp">MCP</Link>.
        </p>
      </article>
    </Site>
  );
}

export function Trust() {
  return (
    <Site>
      <article className="wrap prose">
        <h1>What Shepherd claims</h1>
        <h2>Censorship resistance</h2>
        <p>The agent path reads another contract during VERIFY. Canonical rules reject that read. A staked account on the alt mempool can be admitted. There is no private relay in front of this.</p>
        <h2>Open source</h2>
        <p>MIT. No tracker, no analytics script, no font CDN. The pages in this app are the docs.</p>
        <h2>Privacy</h2>
        <p>Browser chain reads go through the Anon-RPC harness. The worker cannot touch keys, cookies, or the DOM. It can see every request body. The reference worker fulfils calls with ordinary fetch, so it does not unlink your IP. The ops log stores method, route, and verdict.</p>
        <h2>Security</h2>
        <p>The agent never holds the owner key. VERIFY reverts before approve on a bad target, a value above the cap, a revoked session, or a high-risk call without a second signature. Revoke is the kill switch.</p>
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
          <img className="asset-agent" src="/agent.png" alt="" width={160} height={160} decoding="async" />
          <div>
            <h1>Agents can spawn agents</h1>
            <p>
              <code>npm run mcp</code> speaks MCP over stdio. Cursor loads it from <code>.cursor/mcp.json</code>. The server uses the owner key inside the process. No tool returns that key.
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
              <td>Grants a child under root or under another agent. The cap and the expiry cannot exceed the parent. Depth stops at 3. Eight children per parent.</td>
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
        <p>Run <code>npm run demo</code> once so the state file has an account, then start the MCP server. Spawn from parent id <code>root</code>.</p>
      </article>
    </Site>
  );
}
