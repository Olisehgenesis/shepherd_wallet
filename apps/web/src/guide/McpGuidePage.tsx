import { Link } from "react-router-dom";
import { MdExtension, MdListAlt, MdRocketLaunch, MdSettings } from "react-icons/md";
import { paths } from "../shell/destinations";
import { GuideShell } from "./GuideShell";

const tabs = [
  { id: "overview", label: "Overview", Icon: MdExtension },
  { id: "tools", label: "Tools", Icon: MdListAlt },
  { id: "setup", label: "Setup", Icon: MdSettings },
  { id: "console", label: "In console", Icon: MdRocketLaunch },
] as const;

const tools = [
  ["shepherd_anon_status", "Says whether this console is serving Anon-RPC reads to MCP."],
  ["shepherd_posture", "Says whether the root session is active and whether the account is staked."],
  ["shepherd_list_agents", "Lists children. No keys."],
  ["shepherd_spawn_agent", "Grants a child under root or another agent. Cap and expiry cannot exceed the parent."],
  ["shepherd_revoke_agent", "Revokes one spawned session."],
  ["shepherd_propose_intent", "Signs an in-policy ping only when the mirror says allow."],
] as const;

export function McpGuidePage() {
  return (
    <GuideShell title="MCP" subtitle="Wallet guide" tabs={tabs}>
      {(tab) => {
        if (tab === "overview") {
          return (
            <section className="guide-panel">
              <p className="guide-eyebrow">MCP</p>
              <h1 className="guide-h1">Agents can spawn agents</h1>
              <p className="guide-lead">
                <code className="guide-code">npm run mcp</code> speaks MCP over stdio. Cursor loads it from{" "}
                <code className="guide-code">.cursor/mcp.json</code>. The server uses the owner key inside the process.
                No tool returns that key.
              </p>
              <p className="guide-note">
                Keep the console open so MCP eth_* reads go through Anon-RPC via the localhost bridge. Frame submissions
                stay clear.
              </p>
              <div className="guide-btn-row">
                <Link className="guide-btn guide-btn-primary" to={paths.mcp} style={{ width: "auto" }}>
                  Open MCP console
                </Link>
                <Link className="guide-btn guide-btn-ghost" to={paths.wallet}>
                  Connect Wallet
                </Link>
              </div>
            </section>
          );
        }

        if (tab === "tools") {
          return (
            <section className="guide-panel">
              <p className="guide-eyebrow">Tools</p>
              <h1 className="guide-h1">What MCP can do</h1>
              <table className="guide-table">
                <thead>
                  <tr>
                    <th>Tool</th>
                    <th>What it does</th>
                  </tr>
                </thead>
                <tbody>
                  {tools.map(([name, body]) => (
                    <tr key={name}>
                      <td>
                        <code className="guide-code">{name}</code>
                      </td>
                      <td>{body}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          );
        }

        if (tab === "setup") {
          return (
            <section className="guide-panel">
              <p className="guide-eyebrow">Setup</p>
              <h1 className="guide-h1">Run it locally</h1>
              <ol className="guide-list">
                <li>
                  Run <code className="guide-code">npm run demo</code> once so the state file has an account.
                </li>
                <li>
                  Keep <code className="guide-code">npm run dev</code> open on /console for Anon reads.
                </li>
                <li>
                  Start <code className="guide-code">npm run mcp</code>.
                </li>
                <li>
                  Spawn from parent id <code className="guide-code">root</code>. Depth stops at 3. Eight children per
                  parent.
                </li>
              </ol>
            </section>
          );
        }

        return (
          <section className="guide-panel">
            <p className="guide-eyebrow">Console</p>
            <h1 className="guide-h1">Related surfaces</h1>
            <ul className="guide-list">
              <li>
                <Link to={paths.mcp}>MCP</Link> in the console
              </li>
              <li>
                <Link to={paths.agents}>Agents</Link> for sessions and children
              </li>
              <li>
                <Link to={paths.wallet}>Wallet</Link> for funding and backup
              </li>
            </ul>
          </section>
        );
      }}
    </GuideShell>
  );
}
