import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ANON_BRIDGE_PORT } from "../../../../packages/core/src/config.js";
import { paths } from "./destinations";

const tools = [
  { name: "shepherd_anon_status", body: "Says whether this console is serving Anon-RPC reads to MCP." },
  { name: "shepherd_posture", body: "Says whether the root session is active and whether the account is staked." },
  { name: "shepherd_list_agents", body: "Lists children. No keys." },
  {
    name: "shepherd_spawn_agent",
    body: "Grants a child under root or another agent. Cap and expiry cannot exceed the parent. Depth stops at 3.",
  },
  { name: "shepherd_revoke_agent", body: "Revokes one spawned session." },
  { name: "shepherd_propose_intent", body: "Signs an in-policy ping only when the mirror says allow." },
] as const;

type BridgeStatus = {
  ok?: boolean;
  browserConnected?: boolean;
  pending?: number;
};

export function McpConsole() {
  const [bridge, setBridge] = useState<BridgeStatus | null>(null);

  useEffect(() => {
    let cancel = false;
    async function tick() {
      try {
        const response = await fetch(`http://127.0.0.1:${ANON_BRIDGE_PORT}/health`, {
          signal: AbortSignal.timeout(1500),
        });
        if (!response.ok) throw new Error("bad health");
        const body = (await response.json()) as BridgeStatus;
        if (!cancel) setBridge(body);
      } catch {
        if (!cancel) setBridge(null);
      }
    }
    void tick();
    const id = window.setInterval(() => void tick(), 2500);
    return () => {
      cancel = true;
      window.clearInterval(id);
    };
  }, []);

  const bridged = Boolean(bridge?.browserConnected);

  return (
    <section className="mcp-console">
      <header className="page-head">
        <h1>MCP</h1>
        <p>
          Local stdio server for Cursor and other agents. Keep this console open so agent eth_* reads go through
          Anon-RPC. Frame submissions stay clear to the mempool. No tool returns the owner key.
        </p>
      </header>

      <div className={`mcp-bridge ${bridged ? "is-on" : "is-off"}`} role="status">
        <p className="mono-label">Anon bridge · 127.0.0.1:{ANON_BRIDGE_PORT}</p>
        <p className="mcp-bridge-status">
          {bridge == null
            ? "Bridge offline — run npm run dev (starts the bridge) and stay on /console."
            : bridged
              ? "Harness attached. MCP eth_* reads are served through Anon-RPC."
              : "Bridge up, waiting for this tab’s harness. Stay on any /console route."}
        </p>
        <p className="lede">
          Pending jobs: {bridge?.pending ?? 0}. Writes (frames) never use this bridge.
        </p>
      </div>

      <div className="mcp-panel">
        <p className="mono-label">Start</p>
        <pre className="mcp-pre">{`npm run demo
npm run dev    # leave /console open
npm run mcp`}</pre>
        <p className="lede">
          Cursor loads the server from <code>.cursor/mcp.json</code>. Call <code>shepherd_anon_status</code> first.
          Spawn under parent id <code>root</code>. Owner UI: <Link to={paths.agents}>Agents</Link>.
        </p>
      </div>

      <table>
        <thead>
          <tr>
            <th>Tool</th>
            <th>What it does</th>
          </tr>
        </thead>
        <tbody>
          {tools.map((tool) => (
            <tr key={tool.name}>
              <td>
                <code>{tool.name}</code>
              </td>
              <td>{tool.body}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
