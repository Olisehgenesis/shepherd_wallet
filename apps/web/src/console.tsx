import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { formatEther } from "viem";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ALLOW, HIGH } from "../../../packages/core/src/abi.js";
import { useStore } from "./store";
import type { RuleMode } from "./persistence";
import { Home } from "./home";
import { paths } from "./shell/destinations";
import { Empty, shortAddress } from "./ui";

function formatCap(wei: string | undefined) {
  if (!wei || wei === "0") return "0 ETH";
  try {
    return `${formatEther(BigInt(wei))} ETH`;
  } catch {
    return wei;
  }
}

function formatExpiry(sec: number | string | undefined) {
  const value = typeof sec === "string" ? Number(sec) : sec;
  if (!value) return "—";
  return new Date(value * 1000).toLocaleString();
}

export function Overview() {
  return <Home />;
}

export function WalletPage() {
  return (
    <Empty
      title="Wallet opens as a popup"
      body="Use the account button for balance, send, receive, signers, and owner key export/import. Closing the dialog leaves you on You."
    />
  );
}

export function SessionPage() {
  const store = useStore();
  const [shown, setShown] = useState(false);
  const [secret, setSecret] = useState("");
  const [capEth, setCapEth] = useState("0.001");
  const [ttl, setTtl] = useState("86400");
  if (!store.deployed) {
    return (
      <Empty
        title="No account yet"
        body="Prepare the account on Home. A session is granted to that account, not to a placeholder."
        action={
          <Button asChild>
            <Link to="/console">Go to Home</Link>
          </Button>
        }
      />
    );
  }
  return (
    <>
      <header className="page-head">
        <h1>Session</h1>
        <p>Issue a key for the agent. Set the per-call value cap and TTL at grant time. Revoke clears it on-chain.</p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>LIMITS</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <p className="lede" style={{ margin: 0 }}>
            Status {store.live?.active ? "active" : "inactive"} · Connected {store.sessionConnected ? "yes (key handed off or used)" : "no"} · Cap{" "}
            {formatCap(store.live?.valueCapWei)} · Expiry {formatExpiry(store.live?.expiry)} · Spent this session (local){" "}
            {formatCap(store.live?.spentWei)}
          </p>
          <p className="lede" style={{ margin: 0 }}>
            Cap is per call on-chain, not a cumulative budget. Spent is tracked locally from admitted agent values in this tab.{" "}
            <Link to={paths.policy}>
              Policy: {store.policyRules.length} rule{store.policyRules.length === 1 ? "" : "s"}
            </Link>
          </p>
          <div className="row" style={{ alignItems: "end" }}>
            <label className="field">
              <span>Value cap (ETH)</span>
              <input value={capEth} onChange={(event) => setCapEth(event.target.value)} inputMode="decimal" />
            </label>
            <label className="field">
              <span>TTL (seconds)</span>
              <input value={ttl} onChange={(event) => setTtl(event.target.value)} inputMode="numeric" />
            </label>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{store.live?.active ? "SESSION ACTIVE" : "NO ACTIVE SESSION"}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="row">
            <Button
              disabled={store.busy}
              onClick={() =>
                void store.issue({
                  valueCapEth: capEth,
                  ttlSeconds: Number(ttl) || 86_400,
                })
              }
            >
              {store.sessionReady ? "Grant again" : "Issue session key"}
            </Button>
            {store.sessionReady && (
              <Button variant="danger" disabled={store.busy} onClick={() => void store.revokeSession()}>
                Revoke
              </Button>
            )}
            {store.sessionReady && (
              <Button
                variant="ghost"
                onClick={() => {
                  const value = store.revealSession();
                  if (!value) return;
                  setSecret(value);
                  setShown(true);
                }}
              >
                Reveal session key once
              </Button>
            )}
          </div>
          {shown && secret && (
            <>
              <p className="warn">Shown for a separate agent process. Close the tab when you are done.</p>
              <input readOnly value={secret} aria-label="Session key" />
            </>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>P256 CO-SIGNER</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <p className="lede" style={{ margin: 0 }}>
            {store.p256Address
              ? `Registered locally as ${shortAddress(store.p256Address)}. This is a P256 key, not a WebAuthn passkey ceremony.`
              : "No P256 co-signer yet. High-risk can also be co-signed by the frame signer."}
          </p>
          <Button variant="ghost" disabled={store.busy} onClick={() => void store.registerCosigner()}>
            Register P256 co-signer
          </Button>
        </CardContent>
      </Card>
    </>
  );
}

export function PolicyPage() {
  const store = useStore();
  const [target, setTarget] = useState("");
  const [selector, setSelector] = useState("ping()");
  const [mode, setMode] = useState<RuleMode>(ALLOW);
  const [label, setLabel] = useState("");

  useEffect(() => {
    if (store.deployed?.vault && !target) setTarget(store.deployed.vault);
  }, [store.deployed?.vault, target]);

  if (!store.deployed) {
    return (
      <Empty
        title="No policy yet"
        body="Prepare the account first. Rules are written to ShepherdPolicy on-chain."
        action={
          <Button asChild>
            <Link to="/console">Go to Home</Link>
          </Button>
        }
      />
    );
  }

  return (
    <>
      <header className="page-head">
        <h1>Policy</h1>
        <p>Allowlist lives outside the account. Mode 1 allows, mode 2 needs co-sign, mode 0 removes. Save writes on-chain.</p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>ON-CHAIN RULES</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table>
            <thead>
              <tr>
                <th>Label</th>
                <th>Target</th>
                <th>Selector</th>
                <th>Mode</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {store.policyRules.length === 0 && (
                <tr>
                  <td colSpan={5}>No rules tracked yet. Prepare seeds vault.ping / vault.sweep.</td>
                </tr>
              )}
              {store.policyRules.map((row) => (
                <tr key={`${row.target}-${row.selector}`}>
                  <td>{row.label || "—"}</td>
                  <td>
                    <code>{shortAddress(row.target)}</code>
                  </td>
                  <td>
                    <code>{row.selector}</code>
                  </td>
                  <td>{row.mode === HIGH ? "high-risk" : row.mode === ALLOW ? "allow" : "deny"}</td>
                  <td>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={store.busy}
                      onClick={() => void store.removePolicyRule(row.target, row.selector)}
                    >
                      Remove
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>ADD OR UPDATE RULE</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <label className="field">
            <span>Target</span>
            <input value={target} onChange={(event) => setTarget(event.target.value.trim())} placeholder="0x…" spellCheck={false} />
          </label>
          <label className="field">
            <span>Selector or signature</span>
            <input
              value={selector}
              onChange={(event) => setSelector(event.target.value)}
              placeholder="ping() or 0x…4 bytes"
              spellCheck={false}
            />
          </label>
          <label className="field">
            <span>Label (optional)</span>
            <input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="vault.ping()" />
          </label>
          <label className="field">
            <span>Mode</span>
            <select value={mode} onChange={(event) => setMode(Number(event.target.value) as RuleMode)}>
              <option value={ALLOW}>Allow (1)</option>
              <option value={HIGH}>High-risk / needs cosign (2)</option>
              <option value={0}>Deny / remove (0)</option>
            </select>
          </label>
          <div className="row">
            <Button
              disabled={store.busy}
              onClick={() =>
                void store.savePolicyRule({
                  target,
                  selectorOrSig: selector,
                  mode,
                  label: label || undefined,
                })
              }
            >
              Save on-chain
            </Button>
            <Button variant="ghost" disabled={store.busy} onClick={() => void store.refreshPolicyRules()}>
              Refresh from chain
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

export function AgentsPage() {
  const store = useStore();
  const [parentId, setParentId] = useState("root");
  const [capEth, setCapEth] = useState("");
  const [ttl, setTtl] = useState("3600");
  const [revealed, setRevealed] = useState<{ id: string; key: string } | null>(null);

  const parents = useMemo(() => ["root", ...store.agents.map((agent) => agent.id)], [store.agents]);

  if (!store.deployed) {
    return (
      <Empty
        title="No account for agents"
        body="Prepare and issue a root session first. Child agents are clipped to the parent cap and expiry."
        action={
          <Button asChild>
            <Link to={paths.session}>Open Session</Link>
          </Button>
        }
      />
    );
  }

  if (!store.live?.active) {
    return (
      <Empty
        title="Root session inactive"
        body="Spawn hangs a child under the root session (or another child). Issue a session first."
        action={
          <Button asChild>
            <Link to={paths.session}>Issue session</Link>
          </Button>
        }
      />
    );
  }

  return (
    <>
      <header className="page-head">
        <h1>Agents</h1>
        <p>
          Depth stops at {store.maxDepth}. Each parent can have {store.maxChildren} children. Same rules as MCP — live in this console.
        </p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>SPAWN</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="row" style={{ alignItems: "end" }}>
            <label className="field">
              <span>Parent</span>
              <select value={parentId} onChange={(event) => setParentId(event.target.value)}>
                {parents.map((id) => (
                  <option key={id} value={id}>
                    {id}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Cap ETH (optional)</span>
              <input value={capEth} onChange={(event) => setCapEth(event.target.value)} placeholder="inherit parent" inputMode="decimal" />
            </label>
            <label className="field">
              <span>TTL seconds</span>
              <input value={ttl} onChange={(event) => setTtl(event.target.value)} inputMode="numeric" />
            </label>
            <Button
              disabled={store.busy}
              onClick={() =>
                void store.spawnAgent({
                  parentId,
                  valueCapEth: capEth,
                  ttlSeconds: Number(ttl) || 3600,
                })
              }
            >
              Spawn child
            </Button>
          </div>
          <p className="lede" style={{ margin: 0 }}>
            CLI/MCP docs stay at <Link to="/mcp">/mcp</Link>. This page is the live owner view.
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>TREE</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table>
            <thead>
              <tr>
                <th>Id</th>
                <th>Parent</th>
                <th>Depth</th>
                <th>Address</th>
                <th>Cap</th>
                <th>Expiry</th>
                <th />
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>root</td>
                <td>—</td>
                <td>0</td>
                <td>
                  <code>{store.sessionAddress ? shortAddress(store.sessionAddress) : "—"}</code>
                </td>
                <td>{formatCap(store.live.valueCapWei)}</td>
                <td>{formatExpiry(store.live.expiry)}</td>
                <td />
              </tr>
              {store.agents.length === 0 && (
                <tr>
                  <td colSpan={7}>No children yet.</td>
                </tr>
              )}
              {store.agents.map((agent) => (
                <tr key={agent.id}>
                  <td>{agent.id}</td>
                  <td>{agent.parentId}</td>
                  <td>{agent.depth}</td>
                  <td>
                    <code>{shortAddress(agent.address)}</code>
                  </td>
                  <td>{formatCap(agent.valueCap)}</td>
                  <td>{formatExpiry(agent.expiry)}</td>
                  <td>
                    <div className="row">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          const key = store.revealAgentKey(agent.id);
                          if (key) setRevealed({ id: agent.id, key });
                        }}
                      >
                        Reveal key
                      </Button>
                      <Button size="sm" variant="danger" disabled={store.busy} onClick={() => void store.revokeAgent(agent.id)}>
                        Revoke
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
      {revealed && (
        <Card>
          <CardHeader>
            <CardTitle>KEY FOR {revealed.id.toUpperCase()}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            <p className="warn">Copy into the child process. Not written to the ops log.</p>
            <input readOnly value={revealed.key} aria-label="Child session key" />
            <Button variant="ghost" onClick={() => setRevealed(null)}>
              Hide
            </Button>
          </CardContent>
        </Card>
      )}
    </>
  );
}

export function IntentsPage() {
  const store = useStore();
  const [target, setTarget] = useState("");
  const [selector, setSelector] = useState("ping()");
  const [valueEth, setValueEth] = useState("0");
  const [calldata, setCalldata] = useState("0x");
  const [preview, setPreview] = useState<string>("");

  useEffect(() => {
    if (store.deployed?.vault && !target) setTarget(store.deployed.vault);
  }, [store.deployed?.vault, target]);

  if (!store.live?.active) {
    return (
      <Empty
        title="No active session"
        body="Intents are signed by the session key. Issue one first. The chain still re-checks the call."
        action={
          <Button asChild>
            <Link to={paths.session}>Issue a session</Link>
          </Button>
        }
      />
    );
  }
  return (
    <>
      <header className="page-head">
        <h1>Intents</h1>
        <p>Custom calls are the product path. Demo buttons stay for the prize walkthrough.</p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>CUSTOM CALL</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <label className="field">
            <span>Target</span>
            <input value={target} onChange={(event) => setTarget(event.target.value.trim())} spellCheck={false} />
          </label>
          <label className="field">
            <span>Selector or signature</span>
            <input value={selector} onChange={(event) => setSelector(event.target.value)} spellCheck={false} />
          </label>
          <label className="field">
            <span>Value (ETH)</span>
            <input value={valueEth} onChange={(event) => setValueEth(event.target.value)} inputMode="decimal" />
          </label>
          <label className="field">
            <span>Calldata (hex, optional beyond selector)</span>
            <input value={calldata} onChange={(event) => setCalldata(event.target.value)} spellCheck={false} />
          </label>
          {preview && <p className="lede" style={{ margin: 0 }}>Mirror: {preview}</p>}
          <div className="row">
            <Button
              variant="ghost"
              disabled={store.busy}
              onClick={() =>
                void store
                  .previewCustomCall({ target, selectorOrSig: selector, valueEth, calldata })
                  .then((result) => setPreview(result.verdict))
                  .catch((reason) => setPreview(reason instanceof Error ? reason.message : "preview failed"))
              }
            >
              Preview mirror
            </Button>
            <Button
              disabled={store.busy}
              onClick={() =>
                void store.submitCustomCall({
                  target,
                  selectorOrSig: selector,
                  valueEth,
                  calldata,
                  queueIfNeedsCosign: true,
                })
              }
            >
              Submit (queue if high-risk)
            </Button>
            <Button
              variant="ghost"
              disabled={store.busy}
              onClick={() =>
                void store.submitCustomCall({
                  target,
                  selectorOrSig: selector,
                  valueEth,
                  calldata,
                  queueIfNeedsCosign: false,
                })
              }
            >
              Submit with owner co-sign now
            </Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>DEMO</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="row">
            <Button disabled={store.busy} onClick={() => void store.runIntent("ping")}>
              In-policy ping
            </Button>
            <Button variant="ghost" disabled={store.busy} onClick={() => void store.runIntent("drain")}>
              Submit injected drain
            </Button>
            <Button variant="ghost" disabled={store.busy} onClick={() => void store.runIntent("sweep")}>
              High-risk, wait
            </Button>
            <Button disabled={store.busy} onClick={() => void store.runIntent("sweep-cosign")}>
              Co-sign and send
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

export function ApprovalsPage() {
  const store = useStore();
  const pending = store.approvals.filter((row) => row.status === "pending");
  const done = store.approvals.filter((row) => row.status !== "pending");

  if (!store.deployed) {
    return (
      <Empty
        title="No account"
        body="Approvals appear when an agent proposes a high-risk call that needs your co-sign."
        action={
          <Button asChild>
            <Link to="/console">Go to Home</Link>
          </Button>
        }
      />
    );
  }

  return (
    <>
      <header className="page-head">
        <h1>Approvals</h1>
        <p>Inbox for NeedsCosign. Approve signs with the owner frame signer. Reject stops here — nothing is submitted.</p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>PENDING ({pending.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table>
            <thead>
              <tr>
                <th>When</th>
                <th>Agent</th>
                <th>Target</th>
                <th>Selector</th>
                <th>Value</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {pending.length === 0 && (
                <tr>
                  <td colSpan={6}>Empty. Use Intents → High-risk wait, or a custom high-risk rule.</td>
                </tr>
              )}
              {pending.map((row) => (
                <tr key={row.id}>
                  <td>{new Date(row.createdAt).toLocaleTimeString()}</td>
                  <td>{row.agentId}</td>
                  <td>
                    <code>{shortAddress(row.target)}</code>
                  </td>
                  <td>
                    <code>{row.selector}</code>
                  </td>
                  <td>{formatCap(row.valueWei)}</td>
                  <td>
                    <div className="row">
                      <Button size="sm" disabled={store.busy} onClick={() => void store.approvePending(row.id)}>
                        Approve
                      </Button>
                      <Button size="sm" variant="danger" disabled={store.busy} onClick={() => store.rejectPending(row.id)}>
                        Reject
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
      {done.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>HANDLED</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table>
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Agent</th>
                  <th>Selector</th>
                  <th>Link</th>
                </tr>
              </thead>
              <tbody>
                {done.map((row) => (
                  <tr key={row.id}>
                    <td>{row.status}</td>
                    <td>{row.agentId}</td>
                    <td>
                      <code>{row.selector}</code>
                    </td>
                    <td>
                      {row.explorerUrl ? (
                        <a href={row.explorerUrl} target="_blank" rel="noreferrer">
                          Explorer
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </>
  );
}

export function ActivityPage() {
  const store = useStore();
  if (!store.deployed) {
    return (
      <Empty
        title="No activity yet"
        body="Admits, denies, grants, and approvals land here for this account in this browser."
        action={
          <Button asChild>
            <Link to="/console">Go to Home</Link>
          </Button>
        }
      />
    );
  }
  return (
    <>
      <header className="page-head">
        <h1>Activity</h1>
        <p>Local audit trail for this tab. Ops log stays redacted; this page keeps method, agent, verdict, and explorer links.</p>
      </header>
      <Card>
        <CardContent className="p-0">
          <table>
            <thead>
              <tr>
                <th>When</th>
                <th>Method</th>
                <th>Agent</th>
                <th>Verdict</th>
                <th>Link</th>
              </tr>
            </thead>
            <tbody>
              {store.activity.length === 0 && (
                <tr>
                  <td colSpan={5}>Nothing recorded yet.</td>
                </tr>
              )}
              {store.activity.map((row) => (
                <tr key={row.id}>
                  <td>{new Date(row.at).toLocaleString()}</td>
                  <td>{row.method}</td>
                  <td>{row.agentId}</td>
                  <td>{row.verdict}</td>
                  <td>
                    {row.explorerUrl ? (
                      <a href={row.explorerUrl} target="_blank" rel="noreferrer">
                        Explorer
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </>
  );
}

export function ReadsPage() {
  const store = useStore();
  if (store.anonState === "failed") {
    return <Empty title="The harness did not start" body="Reads stay on this page. There is no silent fallback to a clear provider. Reload the console and try again." />;
  }
  if (!store.deployed) {
    return (
      <Empty
        title="Nothing to read yet"
        body="Prepare the account first. This page then asks the harness for balance and code."
        action={
          <Button asChild>
            <Link to="/console">Go to Home</Link>
          </Button>
        }
      />
    );
  }
  return (
    <>
      <header className="page-head">
        <h1>Reads</h1>
        <p>Balance and code go through the sandboxed worker. The log keeps the method and the route.</p>
      </header>
      <Card>
        <CardContent>
          <Button disabled={store.busy || store.anonState !== "ready"} onClick={() => void store.readAnon()}>
            Read through Anon-RPC
          </Button>
        </CardContent>
      </Card>
    </>
  );
}

export function MempoolPage() {
  const store = useStore();
  if (!store.deployed) {
    return (
      <Empty
        title="No account to stake"
        body="Prepare the account on Home. Stake is an owner-path frame, and the ping is an agent-path frame."
        action={
          <Button asChild>
            <Link to="/console">Go to Home</Link>
          </Button>
        }
      />
    );
  }
  return (
    <>
      <header className="page-head">
        <h1>Mempool</h1>
        <p>One policy read. Canonical rejects it. Alt rejects it while the account is unstaked, then can admit it after stake.</p>
      </header>
      <Card>
        <CardContent className="grid gap-3">
          <div className="row">
            <Button disabled={store.busy} onClick={() => void store.stakeAccount()}>
              Stake account
            </Button>
            {store.live?.active && (
              <>
                <Button variant="ghost" disabled={store.busy} onClick={() => void store.runIntent("canonical")}>
                  Send to canonical
                </Button>
                <Button variant="ghost" disabled={store.busy} onClick={() => void store.runIntent("alt")}>
                  Send to alt
                </Button>
              </>
            )}
          </div>
          {!store.live?.active && <p className="lede" style={{ margin: 0 }}>Stake can run now. The ping waits for an active session.</p>}
        </CardContent>
      </Card>
    </>
  );
}
