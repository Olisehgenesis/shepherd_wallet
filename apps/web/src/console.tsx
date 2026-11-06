import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { formatEther } from "viem";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmSheet, ReviewSheet } from "./confirm";
import { Home } from "./home";
import type { PendingApproval } from "./persistence";
import {
  REVEAL_HIDDEN_NOTE,
  REVEAL_VISIBLE_NOTE,
  TTL_NOTE,
  approvalCopy,
  customReview,
  intentReview,
  revokeSessionCopy,
  type ReviewCopy,
  type SendKind,
} from "./reviewCopy";
import { paths } from "./shell/destinations";
import { WowStage } from "./shell/WowStage";
import { useStore } from "./store";
import { Empty, shortAddress } from "./ui";

function approvalCallLabel(row: PendingApproval, rules: { target: string; selector: string; label?: string }[]) {
  const hit = rules.find((rule) => rule.target.toLowerCase() === row.target.toLowerCase() && rule.selector.toLowerCase() === row.selector.toLowerCase());
  return hit?.label || row.selector;
}

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
  const [secret, setSecret] = useState("");
  const [capEth, setCapEth] = useState("0.001");
  const [ttl, setTtl] = useState("86400");
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const settling = store.sessionPhase !== "idle";
  if (!store.deployed) {
    return (
      <Empty
        title="No account yet"
        body="Prepare the account on Home. A session is granted to that account, not to a placeholder."
        action={
          <Button asChild>
            <Link to={paths.home}>Go to Home</Link>
          </Button>
        }
      />
    );
  }
  return (
    <>
      <header className="page-head">
        <h1>Session</h1>
        <p>
          Grant the agent a scoped session key (not the owner key). Cap is per call. {TTL_NOTE}
        </p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>LIMITS</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <p className="lede" style={{ margin: 0 }}>
            {store.sessionPhase === "granting"
              ? "Granting the session. Status updates when it is included."
              : store.sessionPhase === "revoking"
                ? "Revoking the session. It stops when the revoke is included."
                : `${store.live?.active ? "Session active" : "No active session"} · ${store.keyRevealed ? "Key revealed" : "Key not revealed"} · Cap ${formatCap(store.live?.valueCapWei)} · Expiry ${formatExpiry(store.live?.expiry)} · Spent this session (local) ${formatCap(store.live?.spentWei)}`}
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
              <span>TTL (seconds) — not enforced on-chain</span>
              <input value={ttl} onChange={(event) => setTtl(event.target.value)} inputMode="numeric" disabled={store.busy} />
            </label>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>
            {store.sessionPhase === "granting"
              ? "GRANTING SESSION"
              : store.sessionPhase === "revoking"
                ? "REVOKING SESSION"
                : store.live?.active
                  ? "SESSION ACTIVE"
                  : "NO ACTIVE SESSION"}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {!settling && (
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
              {store.live?.active && store.sessionReady && (
                <Button variant="danger" disabled={store.busy} onClick={() => setConfirmRevoke(true)}>
                  Revoke
                </Button>
              )}
              {store.live?.active && store.sessionReady && !store.keyRevealed && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    const value = store.revealSession();
                    if (value) setSecret(value);
                  }}
                >
                  Reveal session key once
                </Button>
              )}
              {store.live?.active && store.sessionReady && (
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => {
                    const handoff = store.exportAgentHandoff();
                    if (!handoff) return;
                    void navigator.clipboard.writeText(handoff);
                    setSecret("");
                    store.markAgentConnected();
                    window.alert(
                      "Agent handoff JSON copied. Paste into .shepherd-state.json at the repo root, then run:\nnpm run agent -- propose",
                    );
                  }}
                >
                  Copy agent handoff
                </Button>
              )}
            </div>
          )}
          {secret && (
            <>
              <p className="warn">{REVEAL_VISIBLE_NOTE}</p>
              <input readOnly value={secret} aria-label="Session key" />
            </>
          )}
          {store.keyRevealed && !secret && <p className="lede" style={{ margin: 0 }}>{REVEAL_HIDDEN_NOTE}</p>}
          {store.live?.active && (
            <p className="lede" style={{ margin: 0 }}>
              Agent path: copy handoff → write <code>.shepherd-state.json</code> →{" "}
              <code>npm run agent -- propose</code> (mirror allow, then sign-and-submit ping). Or use Demo in this tab —
              same session key signs there.
            </p>
          )}
        </CardContent>
      </Card>
      <ConfirmSheet
        open={confirmRevoke}
        kicker="Stops the agent"
        kickerTone="risk"
        title={revokeSessionCopy().title}
        body={revokeSessionCopy().body}
        rows={revokeSessionCopy().rows}
        secondaryLabel="Back"
        confirmLabel="Revoke"
        confirmTone="danger"
        busy={store.busy || store.sessionPhase === "revoking"}
        error={store.error}
        onSecondary={() => {
          if (!store.busy) setConfirmRevoke(false);
        }}
        onBackdrop={() => {
          if (!store.busy) setConfirmRevoke(false);
        }}
        onConfirm={() => {
          void store.revokeSession().then((ok) => {
            if (ok) setConfirmRevoke(false);
          });
        }}
      />
      <details className="session-advanced">
        <summary>Optional · high-risk co-sign (P256)</summary>
        <p className="lede" style={{ margin: "10px 0 0" }}>
          High-risk calls (e.g. vault.sweep) need a second signature. For demos, the{" "}
          <strong>owner frame-signer</strong> co-signs — you do not need this section. P256 is an alternate protocol
          key (not a passkey / WebAuthn ceremony).
        </p>
        {store.p256Address ? (
          <>
            <p className="lede" style={{ margin: 0 }}>
              On-chain / local P256 id {shortAddress(store.p256Address)}. Already set for this tab.
            </p>
            <Button variant="ghost" disabled={store.busy} onClick={() => void store.registerCosigner()}>
              Re-submit P256 registration
            </Button>
          </>
        ) : (
          <>
            <p className="lede" style={{ margin: 0 }}>
              Skip unless you want a separate P256 co-signer instead of owner secp256k1.
            </p>
            <Button variant="ghost" disabled={store.busy} onClick={() => void store.registerCosigner()}>
              Add optional P256 co-signer
            </Button>
          </>
        )}
      </details>
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
  const [checking, setChecking] = useState(false);
  const [review, setReview] = useState<(ReviewCopy & { run: () => Promise<void> }) | null>(null);

  function openSend(kind: SendKind) {
    const copy = intentReview(kind);
    setReview({
      ...copy,
      run: async () => {
        await store.runIntent(kind);
      },
    });
  }

  async function openCustom(queueIfNeedsCosign: boolean) {
    setChecking(true);
    setPreview("");
    try {
      const result = await store.previewCustomCall({ target, selectorOrSig: selector, valueEth, calldata });
      const copy = customReview({
        selector,
        target: shortAddress(target),
        valueEth,
        verdict: result.verdict,
        queue: queueIfNeedsCosign,
      });
      setReview({
        ...copy,
        run: () =>
          store.submitCustomCall({
            target,
            selectorOrSig: selector,
            valueEth,
            calldata,
            queueIfNeedsCosign,
          }),
      });
    } catch (reason) {
      setPreview(reason instanceof Error ? reason.message : "Could not review that call.");
    } finally {
      setChecking(false);
    }
  }

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
        <p>Review every call before it is sent. Nothing is submitted until you confirm.</p>
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
            <Button disabled={store.busy || checking} onClick={() => void openCustom(true)}>
              Review
            </Button>
            <Button variant="ghost" disabled={store.busy || checking} onClick={() => void openCustom(false)}>
              Review with owner co-sign
            </Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>LABELED DEMOS</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <p className="lede" style={{ margin: 0 }}>
            Demos only. Each one stops on a review step. Drain is meant to be rejected. High-risk sweep waits for your co-sign.
          </p>
          <div className="row">
            <Button disabled={store.busy} onClick={() => openSend("ping")}>
              Review demo: in-policy ping
            </Button>
            <Button variant="ghost" disabled={store.busy} onClick={() => openSend("drain")}>
              Review demo: injected drain
            </Button>
            <Button variant="ghost" disabled={store.busy} onClick={() => openSend("sweep")}>
              Review demo: high-risk sweep
            </Button>
            <Button disabled={store.busy} onClick={() => openSend("sweep-cosign")}>
              Review demo: co-sign sweep
            </Button>
          </div>
        </CardContent>
      </Card>
      <ReviewSheet
        copy={review}
        busy={store.busy}
        error={store.error}
        onBack={() => {
          if (!store.busy) setReview(null);
        }}
        onConfirm={() => {
          if (!review) return;
          void review.run().then(() => setReview(null));
        }}
      />
    </>
  );
}

export function ApprovalsPage() {
  const store = useStore();
  const [approvalId, setApprovalId] = useState<string | null>(null);
  const pending = store.approvals.filter((row) => row.status === "pending");
  const done = store.approvals.filter((row) => row.status !== "pending");
  const opened = useRef(false);
  const pendingApproval = pending.find((row) => row.id === approvalId) ?? pending[0] ?? null;
  const approvalSheet = pendingApproval
    ? approvalCopy({
        agentId: pendingApproval.agentId,
        callLabel: approvalCallLabel(pendingApproval, store.policyRules),
        valueLabel: formatCap(pendingApproval.valueWei),
      })
    : null;

  useEffect(() => {
    if (opened.current || !pending[0]) return;
    opened.current = true;
    setApprovalId(pending[0].id);
  }, [pending]);

  if (!store.deployed) {
    return (
      <Empty
        title="No account"
        body="Approvals appear when an agent proposes a high-risk call that needs your co-sign."
        action={
          <Button asChild>
            <Link to={paths.home}>Go to Home</Link>
          </Button>
        }
      />
    );
  }

  return (
    <>
      <header className="page-head">
        <h1>Approvals</h1>
        <p>Inbox for a high-risk call. Approve signs with the owner frame signer. Decline stops here — nothing is submitted.</p>
      </header>
      {pending.length === 0 ? (
        <Card>
          <CardContent>
            <p className="lede" style={{ margin: 0 }}>
              Approvals appear when an agent proposes a high-risk call that needs your co-sign.
            </p>
          </CardContent>
        </Card>
      ) : (
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
                {pending.map((row) => (
                  <tr key={row.id}>
                    <td>{new Date(row.createdAt).toLocaleTimeString()}</td>
                    <td>{row.agentId === "root" ? "Root agent" : row.agentId}</td>
                    <td>
                      <code>{shortAddress(row.target)}</code>
                    </td>
                    <td>
                      <code>{approvalCallLabel(row, store.policyRules)}</code>
                    </td>
                    <td>{formatCap(row.valueWei)}</td>
                    <td>
                      <Button size="sm" disabled={store.busy} onClick={() => setApprovalId(row.id)}>
                        Review
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
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
      <ConfirmSheet
        open={Boolean(approvalSheet)}
        kicker="Needs your co-sign"
        kickerTone="risk"
        title={approvalSheet?.title ?? ""}
        body={approvalSheet?.body ?? ""}
        rows={approvalSheet?.rows ?? []}
        secondaryLabel="Decline"
        confirmLabel="Approve"
        busy={store.busy}
        error={store.error}
        onSecondary={() => {
          if (!pendingApproval) return;
          store.rejectPending(pendingApproval.id);
          setApprovalId(null);
        }}
        onBackdrop={() => {
          if (!store.busy) setApprovalId(null);
        }}
        onConfirm={() => {
          if (!pendingApproval) return;
          void store.approvePending(pendingApproval.id).then(() => setApprovalId(null));
        }}
      />
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
            <Link to={paths.home}>Go to Home</Link>
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
            <Link to={paths.home}>Go to Home</Link>
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
  return <WowStage />;
}

