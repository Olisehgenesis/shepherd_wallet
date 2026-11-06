import { useEffect, useId, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { useStore } from "../store";
import { agentDisplayName, permissionBadge, permissionChoiceToMode, permissionLabel, presentCall, type PermissionChoice } from "./copy";
import "./agents.css";

export function PermissionsPage() {
  const store = useStore();
  const params = useParams();
  const agentId = params.agentId || "root";
  const child = agentId === "root" ? null : store.agents.find((agent) => agent.id === agentId);
  const name = agentId === "root" ? "Root agent" : child ? agentDisplayName(child) : null;

  if (!store.deployed) {
    return (
      <div className="agent-screen narrow">
        <p className="agent-crumb">
          <Link to="/console/agents">Agents</Link> / Permissions
        </p>
        <h1>What this agent may do</h1>
        <article className="agent-card">
          <strong className="agent-name">No policy yet</strong>
          <p className="agent-muted" style={{ marginTop: 6 }}>
            Prepare the account first. Rules are written to the policy contract on-chain.
          </p>
          <Link className="agent-btn primary" to="/console" style={{ marginTop: 12 }}>
            Go to Overview
          </Link>
        </article>
      </div>
    );
  }

  if (!name) {
    return (
      <div className="agent-screen narrow">
        <p className="agent-crumb">
          <Link to="/console/agents">Agents</Link> / Permissions
        </p>
        <h1>What this agent may do</h1>
        <article className="agent-card">
          <strong className="agent-name">That agent is not in this tab</strong>
          <p className="agent-muted" style={{ marginTop: 6 }}>
            Spawn it again, or edit the root agent. Permissions are the account allowlist.
          </p>
          <Link className="agent-btn primary" to="/console/agents" style={{ marginTop: 12 }}>
            Back to Agents
          </Link>
        </article>
      </div>
    );
  }

  return <PermissionsEditor name={name} />;
}

function PermissionsEditor({ name }: { name: string }) {
  const store = useStore();
  const formId = useId();
  const [adding, setAdding] = useState(false);
  const [callName, setCallName] = useState("");
  const [signature, setSignature] = useState("");
  const [choice, setChoice] = useState<PermissionChoice>("allow");
  const [target, setTarget] = useState("");
  const [hex, setHex] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!store.deployed?.vault) return;
    setTarget((current) => current || store.deployed!.vault);
  }, [store.deployed?.vault]);

  const rules = store.policyRules.filter((row) => row.mode !== 0);

  async function save(event: FormEvent) {
    event.preventDefault();
    setFormError("");
    if (!adding && !signature.trim() && !hex.trim() && !callName.trim()) {
      setAdding(true);
      return;
    }
    const selectorOrSig = hex.trim() || signature.trim();
    if (!selectorOrSig) {
      setFormError("Name the call, like vault.ping(), or enter a selector under Advanced.");
      setAdding(true);
      return;
    }
    if (!target.trim()) {
      setFormError("Add the target address under Advanced.");
      setAdding(true);
      return;
    }
    const saved = await store.savePolicyRule({
      target: target.trim(),
      selectorOrSig,
      mode: permissionChoiceToMode(choice),
      label: permissionLabel(callName, signature),
    });
    if (!saved) return;
    setCallName("");
    setSignature("");
    setHex("");
    setChoice("allow");
    setAdding(false);
  }

  return (
    <div className="agent-screen narrow">
      <p className="agent-crumb">
        <Link to="/console/agents">Agents</Link> / {name} / Permissions
      </p>
      <h1>What this agent may do</h1>
      <p className="agent-muted" style={{ margin: "8px 0 18px" }}>
        Plain labels. Hex selectors stay under &ldquo;Advanced&rdquo;. Same allowlist for every agent on this account.
      </p>
      <form id={formId} className="agent-card" onSubmit={(event) => void save(event)}>
        {rules.length > 0 && (
          <div className="perm-head" aria-hidden="true">
            <span>Call</span>
            <span>Permission</span>
            <span />
          </div>
        )}
        {rules.length === 0 && (
          <p className="agent-muted">No permissions yet. Add one, then save it on-chain. Calls that are not listed are refused.</p>
        )}
        <ul className="perm-list">
          {rules.map((row) => {
            const call = presentCall(row.label, row.selector);
            const badge = permissionBadge(row.mode);
            return (
              <li key={`${row.target}-${row.selector}`} className="perm-row">
                <div className="perm-call">
                  <strong>{call.title}</strong>
                  <span className={`mode ${badge.tone}`}>{badge.label}</span>
                  {call.signature !== call.title && <div className="agent-sig">{call.signature}</div>}
                </div>
                <button
                  className="agent-btn"
                  type="button"
                  disabled={store.busy}
                  onClick={() => void store.removePolicyRule(row.target, row.selector)}
                >
                  Remove
                </button>
              </li>
            );
          })}
        </ul>

        {adding && (
          <div className="agent-form">
            <label className="agent-field">
              <span>Call name</span>
              <input value={callName} onChange={(event) => setCallName(event.target.value)} placeholder="Ping vault" />
            </label>
            <label className="agent-field">
              <span>Function</span>
              <input
                value={signature}
                onChange={(event) => setSignature(event.target.value)}
                placeholder="vault.ping()"
                spellCheck={false}
              />
            </label>
            <label className="agent-field">
              <span>Permission</span>
              <select value={choice} onChange={(event) => setChoice(event.target.value as PermissionChoice)}>
                <option value="allow">Allow</option>
                <option value="cosign">Needs your co-sign</option>
                <option value="deny">Deny</option>
              </select>
            </label>
            {choice === "deny" && (
              <p className="agent-note" style={{ marginTop: 0 }}>
                Deny removes that call. Anything not allowed is refused.
              </p>
            )}
          </div>
        )}

        {formError && <p className="agent-form-error">{formError}</p>}

        <div className="agent-actions">
          <button className="agent-btn" type="button" onClick={() => setAdding((open) => !open)}>
            {adding ? "Cancel" : "Add permission"}
          </button>
          <button className="agent-btn primary" type="submit" disabled={store.busy}>
            Save on-chain
          </button>
        </div>

        <details className="agent-advanced">
          <summary>Advanced</summary>
          <p>Target addresses and raw selectors. The chain stores these. The list above is the plain-language view.</p>
          {rules.length > 0 && (
            <ul className="agent-hex">
              {rules.map((row) => {
                const call = presentCall(row.label, row.selector);
                return (
                  <li key={`${row.target}-${row.selector}`}>
                    {call.title}: target <code>{row.target}</code> · selector <code>{row.selector}</code>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="agent-form">
            <label className="agent-field">
              <span>Target</span>
              <input
                value={target}
                onChange={(event) => setTarget(event.target.value.trim())}
                placeholder="0x…"
                spellCheck={false}
                autoComplete="off"
              />
            </label>
            <label className="agent-field">
              <span>Selector hex (optional)</span>
              <input
                value={hex}
                onChange={(event) => setHex(event.target.value.trim())}
                placeholder="0x and 8 hex chars"
                spellCheck={false}
                autoComplete="off"
              />
            </label>
            <div>
              <button className="agent-btn" type="button" disabled={store.busy || !store.deployed} onClick={() => void store.refreshPolicyRules()}>
                Refresh from chain
              </button>
            </div>
          </div>
        </details>

        <p className="agent-note">TTL shown on the agent is informational today. Revoke is what actually stops them.</p>
        {!store.live?.active && (
          <p className="agent-note">
            <Link className="agent-link" to="/console/session">
              Grant an agent
            </Link>{" "}
            before these rules can be used.
          </p>
        )}
      </form>
    </div>
  );
}
