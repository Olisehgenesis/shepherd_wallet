import { Link } from "react-router-dom";
import { MdChecklist, MdCode, MdPlayArrow, MdTerminal } from "react-icons/md";
import { paths } from "../shell/destinations";
import { GuideShell } from "./GuideShell";

const tabs = [
  { id: "start", label: "Get started", Icon: MdPlayArrow },
  { id: "console", label: "Console steps", Icon: MdChecklist },
  { id: "results", label: "What you see", Icon: MdTerminal },
  { id: "cli", label: "Terminal", Icon: MdCode },
] as const;

export function DocsPage() {
  return (
    <GuideShell title="Documentation" subtitle="Wallet guide" tabs={tabs}>
      {(tab) => {
        if (tab === "start") {
          return (
            <section className="guide-panel">
              <p className="guide-eyebrow">Documentation</p>
              <h1 className="guide-h1">How to use Shepherd</h1>
              <p className="guide-lead">
                You need a browser wallet, or a WalletConnect project id, and a network path to the public alt-mempool
                devnet. No API key is required for the injected path.
              </p>
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

        if (tab === "console") {
          return (
            <section className="guide-panel">
              <p className="guide-eyebrow">Console</p>
              <h1 className="guide-h1">In the console</h1>
              <ol className="guide-list">
                <li>
                  Open <Link to={paths.wallet}>Connect wallet</Link>. Any EIP-6963 wallet can appear. WalletConnect needs{" "}
                  <code className="guide-code">VITE_WALLETCONNECT_PROJECT_ID</code>.
                </li>
                <li>
                  On <Link to={paths.home}>Home</Link>, prepare the account. Shepherd funds the frame signer, then
                  deploys policy, vault, and account.
                </li>
                <li>
                  On <Link to={paths.session}>Agents → Session</Link>, set the value cap and TTL, then issue a session
                  key. Revoke is what stops the session.
                </li>
                <li>
                  On <Link to={paths.agents}>Agents</Link>, edit permissions and spawn or revoke children.
                </li>
                <li>
                  On <Link to={paths.mempool}>You → Demo → Mempool</Link>, stake 0.012 ETH, then send the ping on alt.
                </li>
                <li>
                  Use <Link to={paths.intents}>Intents</Link> for demo calls. High-risk opens the co-sign queue. History
                  is on <Link to={paths.activity}>Activity</Link>.
                </li>
                <li>
                  On <Link to={paths.reads}>Reads</Link>, balances go through the Anon-RPC harness.
                </li>
              </ol>
            </section>
          );
        }

        if (tab === "results") {
          return (
            <section className="guide-panel">
              <p className="guide-eyebrow">Expected verdicts</p>
              <h1 className="guide-h1">What you should see</h1>
              <table className="guide-table">
                <thead>
                  <tr>
                    <th>Action</th>
                    <th>Verdict</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>In-policy ping, after stake</td>
                    <td>admitted</td>
                  </tr>
                  <tr>
                    <td>Value to an unknown target</td>
                    <td>TargetDenied</td>
                  </tr>
                  <tr>
                    <td>Sweep before co-sign</td>
                    <td>NeedsCosign</td>
                  </tr>
                  <tr>
                    <td>Sweep after co-sign</td>
                    <td>admitted</td>
                  </tr>
                  <tr>
                    <td>Same ping on canonical</td>
                    <td>canonical-storage-read</td>
                  </tr>
                </tbody>
              </table>
            </section>
          );
        }

        return (
          <section className="guide-panel">
            <p className="guide-eyebrow">CLI</p>
            <h1 className="guide-h1">From the terminal</h1>
            <pre className="guide-pre">{`npm install --registry https://registry.npmjs.org
npm run test:contracts
npm run demo
npm run dev
npm run mcp`}</pre>
            <p className="guide-note">
              <code className="guide-code">npm run demo</code> writes throwaway keys to{" "}
              <code className="guide-code">.shepherd-state.json</code>. See <Link to="/mcp">MCP</Link>.
            </p>
          </section>
        );
      }}
    </GuideShell>
  );
}
