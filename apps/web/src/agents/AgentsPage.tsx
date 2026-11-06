import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../store";
import type { AgentRecord } from "../persistence";
import { shortAddress } from "../ui";
import {
  agentDisplayName,
  childStillLive,
  formatCapEth,
  formatExpiryShort,
  permissionPhrase,
  summaryCall,
} from "./copy";
import { confirmAgentRevoke, handoffReveal } from "./safety";
import "./agents.css";

export function AgentsPage() {
  const store = useStore();
  const [spawnOpen, setSpawnOpen] = useState(false);
  const rootActive = Boolean(store.live?.active);
  const checking = Boolean(store.deployed && store.sessionAddress && !store.live && !store.error);
  const children = useMemo(
    () => [...store.agents].sort((a, b) => a.depth - b.depth || agentDisplayName(a).localeCompare(agentDisplayName(b))),
    [store.agents],
  );

  return (
    <div className="agent-screen">
      <header className="agent-head">
        <div>
          <div className="agent-pill">You · owner</div>
          <h1>Agents</h1>
          <p>Each agent is a session key with a cap and an allowlist. Revoke is the kill switch.</p>
        </div>
        {rootActive && (
          <button
            className="agent-btn primary"
            type="button"
            aria-expanded={spawnOpen}
            onClick={() => setSpawnOpen((open) => !open)}
          >
            Spawn child
          </button>
        )}
      </header>

      {!store.deployed ? (
        <article className="agent-card">
          <strong className="agent-name">Prepare an account first</strong>
          <p className="agent-muted" style={{ marginTop: 6 }}>
            Agents are session keys on your account. Prepare on Overview, then grant an agent.
          </p>
          <Link className="agent-btn primary" to="/console" style={{ marginTop: 12 }}>
            Go to Overview
          </Link>
        </article>
      ) : (
        <div className="agent-list">
          {spawnOpen && rootActive && <SpawnForm onDone={() => setSpawnOpen(false)} />}
          {rootActive && <RootAgent />}
          {checking && (
            <article className="agent-card">
              <strong className="agent-name">Checking the session…</strong>
              <p className="agent-muted" style={{ marginTop: 6 }}>
                Reading the root agent from the account.
              </p>
            </article>
          )}
          {!rootActive && !checking && <GrantCard />}
          {children.map((agent) => (
            <ChildAgent key={agent.id} agent={agent} />
          ))}
          {rootActive && children.length === 0 && (
            <article className="agent-card">
              <strong className="agent-name">No children yet</strong>
              <p className="agent-muted" style={{ marginTop: 6 }}>
                Children cannot outspend or outlive the parent. Depth stops at {store.maxDepth}.
              </p>
            </article>
          )}
        </div>
      )}
    </div>
  );
}

function GrantCard() {
  return (
    <article className="agent-card">
      <strong className="agent-name">No agent yet</strong>
      <p className="agent-muted" style={{ marginTop: 6 }}>
        Grant a session key with a per-call cap and a time limit. Revoke is what stops it.
      </p>
      <Link className="agent-btn primary" to="/console/session" style={{ marginTop: 12 }}>
        Grant an agent
      </Link>
    </article>
  );
}

function RootAgent() {
  const store = useStore();
  const rules = store.policyRules.filter((row) => row.mode !== 0);

  async function revoke() {
    const ok = await confirmAgentRevoke({ kind: "root", id: "root", name: "Root agent" });
    if (!ok) return;
    await store.revokeSession();
  }

  return (
    <article className="agent-card agent-row">
      <div>
        <strong className="agent-name">Root agent</strong>
        <div className="agent-meta">
          <span className="agent-pill">Active</span>
          <span className="agent-pill">Cap {formatCapEth(store.live?.valueCapWei)} / call</span>
          <span className="agent-pill">Expires {formatExpiryShort(store.live?.expiry)}</span>
        </div>
        <RuleSummary />
        <details className="agent-details">
          <summary>Addresses & policy editor</summary>
          <p>
            Session {store.sessionAddress ? <span className="agent-mono">{shortAddress(store.sessionAddress)}</span> : "—"} · Policy
            saved on-chain. <Link className="agent-link" to="/console/agents/root/permissions">Edit rules here</Link> — not a separate
            Policy tab.
          </p>
          <p>
            <Link className="agent-link" to="/console/session">
              Grant an agent
            </Link>
            {rules.length === 0 ? " · No permissions saved yet." : ` · ${rules.length} permission${rules.length === 1 ? "" : "s"} on this account.`}
          </p>
        </details>
      </div>
      <button className="agent-btn danger" type="button" disabled={store.busy} onClick={() => void revoke()}>
        Revoke
      </button>
    </article>
  );
}

function ChildAgent({ agent }: { agent: AgentRecord }) {
  const store = useStore();
  const [revealed, setRevealed] = useState<string | null>(null);
  const name = agentDisplayName(agent);
  const parent = agent.parentId === "root" ? "Root agent" : agentDisplayName(store.agents.find((row) => row.id === agent.parentId) ?? { id: agent.parentId });
  const live = childStillLive(agent.expiry);

  async function revoke() {
    const ok = await confirmAgentRevoke({ kind: "child", id: agent.id, name });
    if (!ok) return;
    await store.revokeAgent(agent.id);
  }

  function reveal() {
    const handed = handoffReveal({
      id: agent.id,
      name,
      readKey: () => store.revealAgentKey(agent.id),
    });
    if (handed) return;
    const key = store.revealAgentKey(agent.id);
    if (key) setRevealed(key);
  }

  return (
    <article className="agent-card agent-row">
      <div>
        <strong className="agent-name">{name}</strong>
        <div className="agent-meta">
          <span className={live ? "agent-pill" : "agent-pill warn"}>{live ? "Active" : "Expired"}</span>
          <span className="agent-pill">Cap {formatCapEth(agent.valueCap)} / call</span>
          <span className="agent-pill">Expires {formatExpiryShort(agent.expiry)}</span>
        </div>
        <p className="agent-muted" style={{ marginTop: 8, fontSize: 13 }}>
          Child of {parent}. Depth {agent.depth}. Same allowlist as the account.
        </p>
        <RuleSummary />
        <details className="agent-details">
          <summary>Addresses & policy editor</summary>
          <p>
            Session <span className="agent-mono">{shortAddress(agent.address)}</span> · Parent {parent}.{" "}
            <Link className="agent-link" to={`/console/agents/${agent.id}/permissions`}>
              Edit rules here
            </Link>{" "}
            — not a separate Policy tab.
          </p>
          <div className="agent-key">
            <button className="agent-btn" type="button" onClick={reveal}>
              Reveal key
            </button>
            {revealed && (
              <>
                <p className="agent-form-error">Copy into the child process. Not written to the ops log.</p>
                <input readOnly value={revealed} aria-label={`Session key for ${name}`} />
              </>
            )}
          </div>
        </details>
      </div>
      <button className="agent-btn danger" type="button" disabled={store.busy} onClick={() => void revoke()}>
        Revoke
      </button>
    </article>
  );
}

function RuleSummary() {
  const store = useStore();
  const rules = store.policyRules.filter((row) => row.mode !== 0);
  if (rules.length === 0) {
    return (
      <ul className="agent-rules">
        <li>No calls allowed yet. Open the policy editor to add one.</li>
      </ul>
    );
  }
  const shown = rules.slice(0, 4);
  return (
    <ul className="agent-rules">
      {shown.map((row) => (
        <li key={`${row.target}-${row.selector}`}>
          May call <span className="agent-mono">{summaryCall(row.label, row.selector)}</span> — {permissionPhrase(row.mode)}
        </li>
      ))}
      {rules.length > shown.length && <li>{rules.length - shown.length} more in the policy editor.</li>}
    </ul>
  );
}

function SpawnForm({ onDone }: { onDone: () => void }) {
  const store = useStore();
  const [parentId, setParentId] = useState("root");
  const [name, setName] = useState("");
  const [capEth, setCapEth] = useState("");
  const [ttl, setTtl] = useState("3600");
  const parents = useMemo(() => [{ id: "root", name: "Root agent" }, ...store.agents.map((agent) => ({ id: agent.id, name: agentDisplayName(agent) }))], [store.agents]);

  useEffect(() => {
    if (parentId !== "root" && !store.agents.some((agent) => agent.id === parentId)) setParentId("root");
  }, [parentId, store.agents]);

  return (
    <form
      className="agent-card"
      onSubmit={(event) => {
        event.preventDefault();
        void store
          .spawnAgent({
            parentId,
            name,
            valueCapEth: capEth,
            ttlSeconds: Number(ttl) || 3600,
          })
          .then((id) => {
            if (id) onDone();
          });
      }}
    >
      <strong className="agent-name">Spawn child</strong>
      <p className="agent-muted" style={{ marginTop: 6 }}>
        Each parent can have {store.maxChildren} children. Depth stops at {store.maxDepth}. A blank cap inherits the parent.
      </p>
      <div className="spawn-grid" style={{ marginTop: 12 }}>
        <label className="agent-field">
          <span>Name</span>
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Child agent" maxLength={48} />
        </label>
        <label className="agent-field">
          <span>Parent</span>
          <select value={parentId} onChange={(event) => setParentId(event.target.value)}>
            {parents.map((parent) => (
              <option key={parent.id} value={parent.id}>
                {parent.name}
              </option>
            ))}
          </select>
        </label>
        <label className="agent-field">
          <span>Cap ETH (optional)</span>
          <input value={capEth} onChange={(event) => setCapEth(event.target.value)} placeholder="inherit parent" inputMode="decimal" />
        </label>
        <label className="agent-field">
          <span>TTL seconds</span>
          <input value={ttl} onChange={(event) => setTtl(event.target.value)} inputMode="numeric" />
        </label>
      </div>
      <div className="agent-actions">
        <button className="agent-btn primary" type="submit" disabled={store.busy}>
          Spawn child
        </button>
        <button className="agent-btn" type="button" onClick={onDone}>
          Cancel
        </button>
      </div>
    </form>
  );
}
