import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { NavLink, Link, useLocation, useNavigate } from "react-router-dom";
import { formatEther } from "viem";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ALLOW, HIGH } from "../../../packages/core/src/abi.js";
import { CHAIN_ID, CHAIN_NAME } from "../../../packages/core/src/config.js";
import { PING, SWEEP } from "../../../packages/core/src/mirror.js";
import { ConfirmSheet, ReviewSheet } from "./confirm";
import type { PendingApproval, RuleMode } from "./persistence";
import {
  approvalCopy,
  customReview,
  intentReview,
  REVEAL_HIDDEN_NOTE,
  REVEAL_VISIBLE_NOTE,
  revokeAgentCopy,
  revokeSessionCopy,
  TTL_NOTE,
  type ReviewCopy,
  type SendKind,
} from "./reviewCopy";
import { useStore } from "./store";
import { Empty, Loader, Mark, shortAddress } from "./ui";
import { WalletModal } from "./WalletModal";

const nav = [
  ["/console", "Overview"],
  ["/console/session", "Session"],
  ["/console/policy", "Policy"],
  ["/console/agents", "Agents"],
  ["/console/intents", "Intents"],
  ["/console/approvals", "Approvals"],
  ["/console/reads", "Reads"],
  ["/console/mempool", "Mempool"],
  ["/console/activity", "Activity"],
] as const;

const WalletUi = createContext<{ openWallet: () => void } | null>(null);
const SafetyUi = createContext<{ openApproval: (id: string) => void } | null>(null);

function useSafetyUi() {
  const value = useContext(SafetyUi);
  if (!value) throw new Error("Safety UI is missing");
  return value;
}

function useWalletUi() {
  const value = useContext(WalletUi);
  if (!value) throw new Error("Wallet UI is missing");
  return value;
}

function tone(ok: boolean | undefined, wait = false): "ok" | "bad" | "wait" | "info" {
  if (wait) return "wait";
  if (ok === undefined) return "wait";
  return ok ? "ok" : "bad";
}

function formatCap(wei: string | undefined) {
  if (!wei || wei === "0") return "0 ETH";
  try {
    return `${formatEther(BigInt(wei))} ETH`;
  } catch {
    return wei;
  }
}

function approvalCallLabel(row: PendingApproval, rules: { target: string; selector: string; label?: string }[]) {
  const rule = rules.find(
    (item) => item.selector.toLowerCase() === row.selector.toLowerCase() && item.target.toLowerCase() === row.target.toLowerCase(),
  );
  if (rule?.label) return rule.label;
  if (row.selector.toLowerCase() === SWEEP.toLowerCase()) return "vault.sweep()";
  if (row.selector.toLowerCase() === PING.toLowerCase()) return "vault.ping()";
  return row.selector;
}

function formatExpiry(sec: number | string | undefined) {
  const value = typeof sec === "string" ? Number(sec) : sec;
  if (!value) return "—";
  return new Date(value * 1000).toLocaleString();
}

export function ConsoleShell({ children }: { children: React.ReactNode }) {
  const store = useStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [walletOpen, setWalletOpen] = useState(false);
  const [approvalId, setApprovalId] = useState<string | null>(null);
  const seenApprovals = useRef<Set<string> | null>(null);
  const openWallet = useCallback(() => setWalletOpen(true), []);
  const openApproval = useCallback((id: string) => setApprovalId(id), []);
  const closeWallet = useCallback(() => {
    setWalletOpen(false);
    if (location.pathname === "/console/wallet") navigate("/console", { replace: true });
  }, [location.pathname, navigate]);

  useEffect(() => {
    if (location.pathname === "/console/wallet") setWalletOpen(true);
  }, [location.pathname]);

  useEffect(() => {
    const pending = store.approvals.filter((row) => row.status === "pending");
    if (seenApprovals.current === null) {
      seenApprovals.current = new Set(pending.map((row) => row.id));
      return;
    }
    const fresh = pending.find((row) => !seenApprovals.current?.has(row.id));
    for (const row of pending) seenApprovals.current.add(row.id);
    if (fresh) setApprovalId(fresh.id);
  }, [store.approvals]);

  useEffect(() => {
    if (!approvalId || store.busy) return;
    const still = store.approvals.some((row) => row.id === approvalId && row.status === "pending");
    if (!still) setApprovalId(null);
  }, [approvalId, store.approvals, store.busy]);

  useEffect(() => {
    if (!store.toast) return;
    const id = window.setTimeout(() => store.clearToast(), 4200);
    return () => window.clearTimeout(id);
  }, [store.toast, store.clearToast]);

  const pendingApproval = store.approvals.find((row) => row.id === approvalId && row.status === "pending") ?? null;
  const approvalSheet = pendingApproval
    ? approvalCopy({
        agentId: pendingApproval.agentId,
        callLabel: approvalCallLabel(pendingApproval, store.policyRules),
        valueLabel: formatCap(pendingApproval.valueWei),
      })
    : null;

  return (
    <WalletUi.Provider value={{ openWallet }}>
      <SafetyUi.Provider value={{ openApproval }}>
      <div className="shell">
        <aside className="side">
          <Link className="brand side-brand" to="/">
            <Mark />
            Shepherd
          </Link>
          <p className="side-kicker">CONSOLE</p>
          <nav aria-label="Console">
            {nav.map(([to, label]) => (
              <NavLink key={to} to={to} end={to === "/console"}>
                {label}
                {to === "/console/approvals" && store.pendingApprovalCount > 0 ? ` (${store.pendingApprovalCount})` : ""}
              </NavLink>
            ))}
            <button className="side-wallet" type="button" onClick={openWallet}>
              Wallet
            </button>
          </nav>
          <div className="side-foot">
            <Separator />
            <Link to="/docs">How to use</Link>
            <Link to="/mcp">MCP docs</Link>
            <Link to="/">Back to site</Link>
          </div>
        </aside>
        <div className="main">
          <header className="top">
            <div className="chips">
              <Badge variant="ok">
                {CHAIN_NAME} · {CHAIN_ID}
              </Badge>
              <Badge variant={tone(store.ethrex?.ok, !store.ethrex)}>
                {store.ethrex?.ok
                  ? `ethrex live · #${store.ethrex.block}`
                  : store.ethrex
                    ? `ethrex stalled · ${store.ethrex.ageSec}s`
                    : "ethrex…"}
              </Badge>
              <Badge variant={store.anonState === "ready" ? "ok" : store.anonState === "failed" ? "bad" : "wait"}>
                {store.anonState === "ready" ? "Anon-RPC harness" : store.anonState === "failed" ? "Harness failed" : "Harness starting"}
              </Badge>
              <Badge variant="info">{store.anonShare}% anon reads</Badge>
              {store.pendingApprovalCount > 0 && (
                <Badge variant="wait">
                  <Link to="/console/approvals">{store.pendingApprovalCount} pending</Link>
                </Badge>
              )}
              {store.wallet && (
                <Badge variant={store.walletOnDevnet ? "ok" : "bad"}>
                  {store.walletOnDevnet ? "Wallet on 1337" : `Wallet on ${store.wallet.chainId}`}
                </Badge>
              )}
            </div>
            <div className="row">
              {store.wallet && !store.walletOnDevnet && (
                <Button size="sm" disabled={store.busy} onClick={() => void store.switchWalletToDevnet()}>
                  Switch to {CHAIN_ID}
                </Button>
              )}
              <button
                className={store.deployed || store.wallet ? "wallet-chip connected" : "btn"}
                type="button"
                onClick={openWallet}
              >
                {store.wallet
                  ? `${store.wallet.name} · ${shortAddress(store.wallet.address)}`
                  : store.deployed
                    ? `Account · ${shortAddress(store.deployed.account)}`
                    : "Connect wallet"}
              </button>
            </div>
          </header>
          {store.toast && (
            <div className="callout toast" role="status">
              {store.toast}
              <Button size="sm" variant="ghost" onClick={() => store.clearToast()}>
                Dismiss
              </Button>
            </div>
          )}
          {store.wallet && !store.walletOnDevnet && (
            <div className="callout bad" role="status">
              Browser wallet is not on {CHAIN_NAME}. Shepherd submits frames on chain {CHAIN_ID}.{" "}
              <Button size="sm" disabled={store.busy} onClick={() => void store.switchWalletToDevnet()}>
                Switch network
              </Button>
            </div>
          )}
          {store.ethrex && !store.ethrex.ok && (
            <div className="callout bad" role="status">
              Public ethrex is not mining (block #{store.ethrex.block}, age {store.ethrex.ageSec}s). Prepare, fund, and deploys cannot finish until new blocks appear. Ask @forshtat at the stall or retry later —{" "}
              <a href="https://explorer.altmempool.wtf/" target="_blank" rel="noreferrer">
                explorer
              </a>
              .
            </div>
          )}
          {store.status && <Loader label={store.status} />}
          {store.error && (
            <div className="callout bad" role="alert">
              {store.error}
            </div>
          )}
          {children}
          <Card>
            <CardHeader>
              <CardTitle>OPS LOG</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table>
                <thead>
                  <tr>
                    <th>Method</th>
                    <th>Route</th>
                    <th>Verdict</th>
                    <th>Link</th>
                  </tr>
                </thead>
                <tbody>
                  {store.logs.length === 0 && (
                    <tr>
                      <td colSpan={4}>No calls yet. The first one is the harness reading the chain id.</td>
                    </tr>
                  )}
                  {store.logs.map((row) => (
                    <tr key={row.id}>
                      <td>{row.method}</td>
                      <td>{row.route}</td>
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
        </div>
      </div>
      <WalletModal open={walletOpen} onClose={closeWallet} />
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
        }}
        onBackdrop={() => {
          if (!store.busy) setApprovalId(null);
        }}
        onConfirm={() => {
          if (!pendingApproval) return;
          void store.approvePending(pendingApproval.id);
        }}
      />
      </SafetyUi.Provider>
    </WalletUi.Provider>
  );
}

export function Overview() {
  const store = useStore();
  const { openWallet } = useWalletUi();
  const next = !store.wallet
    ? { kind: "wallet" as const, label: "Connect a wallet", title: "Start by connecting a wallet", body: "Shepherd needs a human on the other side of the session. Any injected wallet works. WalletConnect works when a project id is set." }
    : !store.deployed
      ? { kind: "action" as const, label: "Prepare the account", title: "The account is not on the devnet yet", body: "Prepare funds the frame signer from the shared genesis key, deploys the three contracts, and writes the vault rules. The loader stays until the receipts land." }
      : !store.live?.active
        ? { kind: "link" as const, href: "/console/session", label: "Issue a session", title: "The account is deployed", body: "Grant a session key before the agent can ping. Set the value cap and TTL on the Session page." }
        : !store.live.staked
          ? { kind: "link" as const, href: "/console/mempool", label: "Stake the account", title: "The session is active", body: "The agent path reads the policy contract. Stake the account, then send the ping on the alt mempool." }
          : { kind: "link" as const, href: "/console/intents", label: "Send an in-policy ping", title: "Ready for a ping", body: "The account is staked and the session is active. Edit policy or spawn child agents when you need more than the demo vault calls." };

  return (
    <>
      <header className="page-head">
        <h1>Overview</h1>
        <p>Four steps. The console only offers the one you have not finished.</p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>{next.title.toUpperCase()}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <p className="lede" style={{ margin: 0 }}>
            {next.body}
          </p>
          {store.live && (
            <p className="lede" style={{ margin: 0 }}>
              Balance {store.live.balance} ETH, read {store.live.balanceRoute}. Session {store.live.active ? "active" : "inactive"}. Stake{" "}
              {store.live.staked ? "present" : "absent"}. Cap {formatCap(store.live.valueCapWei)}. Policy rules {store.policyRules.length}. Agents{" "}
              {store.agents.length}.
            </p>
          )}
          <div className="row">
            {next.kind === "wallet" ? (
              <Button onClick={openWallet}>{next.label}</Button>
            ) : next.kind === "link" ? (
              <Button asChild>
                <Link to={next.href}>{next.label}</Link>
              </Button>
            ) : (
              <Button disabled={store.busy} onClick={() => void store.prepare()}>
                {next.label}
              </Button>
            )}
            {store.deployed && (
              <Button variant="ghost" disabled={store.busy} onClick={() => void store.refresh()}>
                Refresh
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>TRUST</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2">
          <p className="lede" style={{ margin: 0 }}>
            The worker sees request bodies. The reference specifier uses ordinary fetch, so this harness does not unlink your IP. It does keep the worker off your keys, cookies, and DOM.
          </p>
          <Link to="/trust">Read the trust page</Link>
        </CardContent>
      </Card>
    </>
  );
}

export function WalletPage() {
  return (
    <Empty
      title="Wallet opens as a popup"
      body="Use the wallet button in the top bar for balance, send, receive, signers, and owner key export/import. Closing the dialog brings you back to Overview."
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
        body="Prepare the account on Overview. A session is granted to that account, not to a placeholder."
        action={
          <Button asChild>
            <Link to="/console">Go to Overview</Link>
          </Button>
        }
      />
    );
  }
  return (
    <>
      <header className="page-head">
        <h1>Session</h1>
        <p>Issue a key for the agent. The value cap is enforced per call. {TTL_NOTE}</p>
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
            <Link to="/console/policy">
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
            </div>
          )}
          {secret && (
            <>
              <p className="warn">{REVEAL_VISIBLE_NOTE}</p>
              <input readOnly value={secret} aria-label="Session key" />
            </>
          )}
          {store.keyRevealed && !secret && <p className="lede" style={{ margin: 0 }}>{REVEAL_HIDDEN_NOTE}</p>}
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
            <Link to="/console">Go to Overview</Link>
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
  const [revokeId, setRevokeId] = useState<string | null>(null);

  const parents = useMemo(() => ["root", ...store.agents.map((agent) => agent.id)], [store.agents]);

  if (!store.deployed) {
    return (
      <Empty
        title="No account for agents"
        body="Prepare and issue a root session first. Child agents are clipped to the parent cap and expiry."
        action={
          <Button asChild>
            <Link to="/console/session">Open Session</Link>
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
            <Link to="/console/session">Issue session</Link>
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
              <span>TTL seconds — not enforced on-chain</span>
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
            {TTL_NOTE} CLI/MCP docs stay at <Link to="/mcp">/mcp</Link>. This page is the live owner view.
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
                      {store.revealedAgentIds.includes(agent.id) ? (
                        <span className="lede">Key revealed</span>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            const key = store.revealAgentKey(agent.id);
                            if (key) setRevealed({ id: agent.id, key });
                          }}
                        >
                          Reveal key once
                        </Button>
                      )}
                      <Button size="sm" variant="danger" disabled={store.busy} onClick={() => setRevokeId(agent.id)}>
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
            <p className="warn">{REVEAL_VISIBLE_NOTE}</p>
            <input readOnly value={revealed.key} aria-label="Child session key" />
          </CardContent>
        </Card>
      )}
      <ConfirmSheet
        open={Boolean(revokeId)}
        kicker="Stops the agent"
        kickerTone="risk"
        title={revokeId ? revokeAgentCopy(revokeId).title : ""}
        body={revokeId ? revokeAgentCopy(revokeId).body : ""}
        rows={revokeId ? revokeAgentCopy(revokeId).rows : []}
        secondaryLabel="Back"
        confirmLabel="Revoke"
        confirmTone="danger"
        busy={store.busy}
        error={store.error}
        onSecondary={() => {
          if (!store.busy) setRevokeId(null);
        }}
        onBackdrop={() => {
          if (!store.busy) setRevokeId(null);
        }}
        onConfirm={() => {
          if (!revokeId) return;
          void store.revokeAgent(revokeId).then((ok) => {
            if (ok) {
              setRevealed((current) => (current?.id === revokeId ? null : current));
              setRevokeId(null);
            }
          });
        }}
      />
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
  const [checking, setChecking] = useState(false);
  const [review, setReview] = useState<(ReviewCopy & { run: () => Promise<void> }) | null>(null);

  function openSend(kind: SendKind) {
    const copy = intentReview(kind);
    setReview({ ...copy, run: () => store.runIntent(kind) });
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
            <Link to="/console/session">Issue a session</Link>
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
  const { openApproval } = useSafetyUi();
  const pending = store.approvals.filter((row) => row.status === "pending");
  const done = store.approvals.filter((row) => row.status !== "pending");
  const opened = useRef(false);

  useEffect(() => {
    if (opened.current || !pending[0]) return;
    opened.current = true;
    openApproval(pending[0].id);
  }, [pending, openApproval]);

  if (!store.deployed) {
    return (
      <Empty
        title="No account"
        body="Approvals appear when an agent proposes a high-risk call that needs your co-sign."
        action={
          <Button asChild>
            <Link to="/console">Go to Overview</Link>
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
                    <Button size="sm" disabled={store.busy} onClick={() => openApproval(row.id)}>
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
            <Link to="/console">Go to Overview</Link>
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
            <Link to="/console">Go to Overview</Link>
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
  const [review, setReview] = useState<(ReviewCopy & { run: () => Promise<void> }) | null>(null);
  if (!store.deployed) {
    return (
      <Empty
        title="No account to stake"
        body="Prepare the account on Overview. Stake is an owner-path frame, and the ping is an agent-path frame."
        action={
          <Button asChild>
            <Link to="/console">Go to Overview</Link>
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
                <Button
                  variant="ghost"
                  disabled={store.busy}
                  onClick={() => {
                    const copy = intentReview("canonical");
                    setReview({ ...copy, run: () => store.runIntent("canonical") });
                  }}
                >
                  Review canonical send
                </Button>
                <Button
                  variant="ghost"
                  disabled={store.busy}
                  onClick={() => {
                    const copy = intentReview("alt");
                    setReview({ ...copy, run: () => store.runIntent("alt") });
                  }}
                >
                  Review alt send
                </Button>
              </>
            )}
          </div>
          {!store.live?.active && <p className="lede" style={{ margin: 0 }}>Stake can run now. The ping waits for an active session.</p>}
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
