import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { formatEther } from "viem";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useStore } from "./store";
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
              Permissions: {store.policyRules.length} rule{store.policyRules.length === 1 ? "" : "s"}
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

export { AgentsPage } from "./agents/AgentsPage";
export { PermissionsPage as PolicyPage } from "./agents/PermissionsPage";
export { registerAgentSafety } from "./agents/safety";


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
