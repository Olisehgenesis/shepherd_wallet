import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  MdBugReport,
  MdChecklist,
  MdCode,
  MdLink,
  MdPlayArrow,
  MdSearch,
  MdSettings,
  MdTerminal,
  MdVpnKey,
} from "react-icons/md";
import { paths } from "../shell/destinations";
import { CopyBlock } from "./CopyBlock";
import { GuideShell } from "./GuideShell";

const tabs = [
  { id: "start", label: "Getting started", Icon: MdPlayArrow },
  { id: "install", label: "Install & setup", Icon: MdSettings },
  { id: "wallet", label: "Wallet connect", Icon: MdVpnKey },
  { id: "prepare", label: "Prepare account", Icon: MdChecklist },
  { id: "sessions", label: "Sessions", Icon: MdLink },
  { id: "demos", label: "Demos", Icon: MdTerminal },
  { id: "cli", label: "Terminal", Icon: MdCode },
  { id: "troubleshoot", label: "Troubleshooting", Icon: MdBugReport },
] as const;

const SEARCH_INDEX: { id: (typeof tabs)[number]["id"]; terms: string; title: string }[] = [
  { id: "start", terms: "begin intro overview", title: "Getting started" },
  { id: "install", terms: "npm install node foundry forge registry", title: "Install & setup" },
  { id: "wallet", terms: "metamask eip-6963 walletconnect project id connect", title: "Wallet connect" },
  { id: "prepare", terms: "deploy fund prepare genesis stake account", title: "Prepare account" },
  { id: "sessions", terms: "grant revoke session permissions spawn mcp child", title: "Sessions" },
  { id: "demos", terms: "mempool ping drain sweep intents reads anon", title: "Demos" },
  { id: "cli", terms: "demo mcp agent terminal commands", title: "Terminal" },
  { id: "troubleshoot", terms: "error reset faucet nonce harness bridge", title: "Troubleshooting" },
];

export function DocsPage() {
  const [query, setQuery] = useState("");
  const hits = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return SEARCH_INDEX.filter((row) => `${row.title} ${row.terms}`.toLowerCase().includes(q));
  }, [query]);

  return (
    <GuideShell title="Documentation" subtitle="Developer docs" tabs={tabs} crossLinks>
      {(tab, setTab) => (
        <>
          <div className="guide-search">
            <MdSearch size={18} aria-hidden />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search docs…"
              aria-label="Search documentation"
            />
          </div>
          {hits.length > 0 && (
            <ul className="guide-search-hits">
              {hits.map((hit) => (
                <li key={hit.id}>
                  <button type="button" onClick={() => setTab(hit.id)}>
                    {hit.title}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {tab === "start" && (
            <section className="guide-panel">
              <p className="guide-eyebrow">Getting started</p>
              <h1 className="guide-h1">How to use Shepherd</h1>
              <p className="guide-lead">
                You need a browser wallet (or WalletConnect project id) and a network path to the public alt-mempool
                devnet. No API key is required for the injected path.
              </p>
              <figure className="guide-art">
                <img src="/how/asset-docs-dev.jpg" alt="Developer workbench with Shepherd" />
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
          )}
          {tab === "install" && (
            <section className="guide-panel">
              <p className="guide-eyebrow">Setup</p>
              <h1 className="guide-h1">Install and build</h1>
              <p className="guide-lead">Node 20.12+, Foundry, and a path to the public devnet.</p>
              <CopyBlock
                label="setup"
                code={`npm install --registry https://registry.npmjs.org
npm run build:contracts
npm run test:contracts
npm run demo
npm run dev`}
              />
              <p className="guide-note">
                Devnet chain id <code className="guide-code">1337</code>. Ethrex{" "}
                <code className="guide-code">https://altmempool.forshtat.com</code>. Explorer{" "}
                <code className="guide-code">https://explorer.altmempool.wtf/</code>.
              </p>
            </section>
          )}
          {tab === "wallet" && (
            <section className="guide-panel">
              <p className="guide-eyebrow">Wallet</p>
              <h1 className="guide-h1">Connect and back up</h1>
              <ol className="guide-list">
                <li>
                  Open <Link to={paths.wallet}>Wallet</Link>. Any EIP-6963 wallet can appear.
                </li>
                <li>
                  WalletConnect needs <code className="guide-code">VITE_WALLETCONNECT_PROJECT_ID</code>.
                </li>
                <li>Export or import the frame signer from Wallet → Back up owner key.</li>
                <li>Injected wallets cannot sign EIP-8141 digests. The frame signer lives in this tab.</li>
              </ol>
            </section>
          )}
          {tab === "prepare" && (
            <section className="guide-panel">
              <p className="guide-eyebrow">Account</p>
              <h1 className="guide-h1">Prepare the account</h1>
              <ol className="guide-list">
                <li>
                  On <Link to={paths.home}>Home</Link>, choose Prepare the account.
                </li>
                <li>Shepherd funds the frame signer from the shared genesis key, then deploys policy, vault, and account.</li>
                <li>Plain ETH transfers to ShepherdAccount revert. Use creation value or fund().</li>
                <li>After a devnet reset, Prepare again. Stored contracts may have no code.</li>
              </ol>
            </section>
          )}
          {tab === "sessions" && (
            <section className="guide-panel">
              <p className="guide-eyebrow">Agents</p>
              <h1 className="guide-h1">Sessions and permissions</h1>
              <ol className="guide-list">
                <li>
                  Open <Link to={paths.session}>Agents → Session</Link>, set value cap and TTL, then issue a session key.
                </li>
                <li>TTL is stored and shown. This account does not enforce wall-clock expiry inside VERIFY. Revoke stops the session.</li>
                <li>
                  On <Link to={paths.agents}>Agents</Link>, edit permissions: allow, needs co-sign, or deny.
                </li>
                <li>Reveal the key once if another process needs it. No tool returns the owner key.</li>
              </ol>
            </section>
          )}
          {tab === "demos" && (
            <section className="guide-panel">
              <p className="guide-eyebrow">Demos</p>
              <h1 className="guide-h1">What you should see</h1>
              <ol className="guide-list">
                <li>
                  <Link to={paths.mempool}>Canonical vs alt-mempool</Link>: three verdicts in order —
                  canonical-storage-read → unstaked-storage-read → admitted after stake.
                </li>
                <li>
                  <Link to={paths.intents}>Intents</Link>: ping admits, drain TargetDenied, sweep NeedsCosign then admits after co-sign.
                </li>
                <li>
                  <Link to={paths.reads}>Reads</Link>: Anon-RPC for browser eth_* (supporting). If the harness fails, the page does not fall back clear.
                </li>
              </ol>
              <table className="guide-table">
                <thead>
                  <tr>
                    <th>Step</th>
                    <th>What happens</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>In-policy ping, after stake</td>
                    <td>admitted + explorer link</td>
                  </tr>
                  <tr>
                    <td>Injected value transfer</td>
                    <td>TargetDenied</td>
                  </tr>
                  <tr>
                    <td>High-risk sweep</td>
                    <td>NeedsCosign, then admitted after owner co-signs</td>
                  </tr>
                  <tr>
                    <td>Canonical vs alt</td>
                    <td>canonical-storage-read → unstaked-storage-read → admitted</td>
                  </tr>
                </tbody>
              </table>
            </section>
          )}
          {tab === "cli" && (
            <section className="guide-panel">
              <p className="guide-eyebrow">CLI</p>
              <h1 className="guide-h1">Terminal workflow</h1>
              <CopyBlock
                label="demo + mcp"
                code={`npm run demo
npm run dev
npm run mcp
npm run agent -- propose`}
              />
              <p className="guide-note">
                <code className="guide-code">npm run demo</code> writes throwaway keys to{" "}
                <code className="guide-code">.shepherd-state.json</code> (gitignored). Keep /console open for Anon MCP
                reads.
              </p>
            </section>
          )}
          {tab === "troubleshoot" && (
            <section className="guide-panel">
              <p className="guide-eyebrow">Troubleshooting</p>
              <h1 className="guide-h1">Common blockers</h1>
              <div className="guide-mech">
                <article>
                  <h3>Devnet reset</h3>
                  <p>Contracts have no code. Run Prepare again or npm run demo.</p>
                </article>
                <article>
                  <h3>Shared funder busy</h3>
                  <p>Genesis key nonce collisions. Retry funding after a few seconds.</p>
                </article>
                <article>
                  <h3>Anon bridge offline</h3>
                  <p>MCP eth_* needs npm run dev with /console open. Submissions stay clear.</p>
                </article>
              </div>
            </section>
          )}
        </>
      )}
    </GuideShell>
  );
}
