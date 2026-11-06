import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import {
  formatEther,
  isAddress,
  isHex,
  parseEther,
  toFunctionSelector,
  type Address,
  type Hex,
} from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import {
  agentAct,
  ALLOW,
  assertChainLive,
  balance,
  buildTree,
  CHAIN_ID,
  DEFAULT_TTL_SECONDS,
  delegate,
  deployStack,
  ensureFunds,
  expiryIfLive,
  EXPLORER_URL,
  fundFromFaucet,
  grantSession,
  hasCode,
  HIGH,
  highRiskCall,
  inPolicyCall,
  injectedCall,
  latestBlock,
  MAX_CHILDREN,
  MAX_DEPTH,
  mirror,
  PING,
  posture,
  readRule,
  readSession,
  registerP256,
  revoke,
  revokeCascadeOrder,
  sendFromAccount,
  SESSION_VALUE_CAP,
  setRule,
  stake,
  SWEEP,
  topUpAccount,
  waitReceipt,
  p256Identity,
  type MirrorVerdict,
  type Outcome,
} from "../../../packages/core/src/index.js";
import { startAnon, type AnonSession } from "./anon";
import {
  addSpentWei,
  appendActivity,
  clearSpentWei,
  clearOwnerBackedUp,
  loadActivity,
  loadAgents,
  loadApprovals,
  loadOwnerBackedUp,
  loadRules,
  loadSessionConnected,
  loadSpentWei,
  markOwnerBackedUpStorage,
  markSessionConnected,
  saveAgents,
  saveApprovals,
  upsertRule,
  type ActivityRow,
  type AgentRecord,
  type PendingApproval,
  type PolicyRuleRow,
  type RuleMode,
} from "./persistence";
import {
  CHAIN_NAME,
  clearLastProvider,
  connectInjected,
  connectWalletConnect,
  fundFromBrowser,
  providerFor,
  readBrowserBalance,
  readBrowserChainId,
  rememberWallet,
  switchToDevnet,
  watchWalletAccounts,
  watchWalletChain,
  type ConnectedWallet,
  type WalletChoice,
} from "./wallet";

interface Deployed {
  policy: Address;
  vault: Address;
  account: Address;
}

interface LogRow {
  id: number;
  method: string;
  route: "anon" | "clear";
  verdict: string;
  explorerUrl?: string;
}

type IntentKind = "ping" | "drain" | "sweep" | "sweep-cosign" | "canonical" | "alt";

interface Live {
  active: boolean;
  staked: boolean;
  balance: string;
  balanceRoute: "anon" | "clear";
  expiry: number;
  valueCapWei: string;
  spentWei: string;
}

interface Portfolio {
  accountEth: string;
  ownerEth: string;
  browserEth: string | null;
}

interface SessionLimitsInput {
  valueCapEth: string;
  ttlSeconds: number;
}

interface CustomCallInput {
  target: string;
  selectorOrSig: string;
  valueEth: string;
  calldata: string;
  queueIfNeedsCosign?: boolean;
}

interface SpawnInput {
  parentId: string;
  valueCapEth: string;
  ttlSeconds: number;
}

const OWNER = "shepherd.owner";
const SESSION = "shepherd.session";
const P256 = "shepherd.p256";
const DEPLOY = "shepherd.deploy";
const WALLET = "shepherd.wallet";

function loadHex(key: string): Hex | null {
  const value = sessionStorage.getItem(key);
  return value && value.startsWith("0x") && value.length === 66 ? (value as Hex) : null;
}

function normalizeSelector(input: string): Hex {
  const trimmed = input.trim();
  if (/^0x[0-9a-fA-F]{8}$/.test(trimmed)) return trimmed.toLowerCase() as Hex;
  if (trimmed.includes("(") && trimmed.endsWith(")")) return toFunctionSelector(trimmed);
  throw new Error("Selector must be 0x + 8 hex chars, or a signature like transfer(address,uint256).");
}

function normalizeCalldata(selector: Hex, raw: string): Hex {
  const trimmed = raw.trim();
  if (!trimmed || trimmed === "0x") return selector;
  if (!isHex(trimmed) || trimmed.length % 2 !== 0) throw new Error("Calldata must be hex.");
  if (trimmed.toLowerCase().startsWith(selector.toLowerCase())) return trimmed as Hex;
  return `${selector}${trimmed.slice(2)}` as Hex;
}

function modeLabel(mode: RuleMode) {
  if (mode === ALLOW) return "allow";
  if (mode === HIGH) return "high-risk";
  return "deny";
}

interface Store {
  wallets: WalletChoice[];
  wallet: ConnectedWallet | null;
  deployed: Deployed | null;
  sessionReady: boolean;
  p256Ready: boolean;
  p256Address: string | null;
  ownerAddress: string | null;
  sessionAddress: string | null;
  live: Live | null;
  portfolio: Portfolio | null;
  lastTxUrl: string | null;
  logs: LogRow[];
  busy: boolean;
  status: string;
  error: string;
  toast: string;
  anonState: "idle" | "starting" | "ready" | "failed";
  chainLabel: string;
  walletOnDevnet: boolean;
  ethrex: { ok: boolean; block: string; ageSec: number } | null;
  anonShare: number;
  policyRules: PolicyRuleRow[];
  agents: AgentRecord[];
  agentTree: ReturnType<typeof buildTree<AgentRecord>>;
  approvals: PendingApproval[];
  pendingApprovalCount: number;
  activity: ActivityRow[];
  sessionConnected: boolean;
  ownerBackedUp: boolean;
  maxDepth: number;
  maxChildren: number;
  connect: (uuid: string, name: string) => Promise<boolean>;
  connectWc: () => Promise<boolean>;
  disconnect: () => void;
  switchWalletToDevnet: () => Promise<boolean>;
  ensureOwner: () => string;
  prepare: () => Promise<void>;
  issue: (limits?: SessionLimitsInput) => Promise<void>;
  revokeSession: () => Promise<void>;
  registerCosigner: () => Promise<void>;
  revealSession: () => string | null;
  runIntent: (kind: IntentKind) => Promise<void>;
  previewCustomCall: (input: CustomCallInput) => Promise<{ selector: Hex; data: Hex; value: bigint; verdict: MirrorVerdict }>;
  submitCustomCall: (input: CustomCallInput) => Promise<void>;
  stakeAccount: () => Promise<void>;
  readAnon: () => Promise<void>;
  refresh: () => Promise<void>;
  refreshWallet: () => Promise<void>;
  sendEth: (to: Address, amountEth: string) => Promise<boolean>;
  topUpFromOwner: (amountEth: string) => Promise<boolean>;
  depositFromBrowser: (amountEth: string) => Promise<boolean>;
  faucetOwner: () => Promise<boolean>;
  faucetBrowser: () => Promise<boolean>;
  savePolicyRule: (input: { target: string; selectorOrSig: string; mode: RuleMode; label?: string }) => Promise<void>;
  removePolicyRule: (target: Address, selector: Hex) => Promise<void>;
  refreshPolicyRules: () => Promise<void>;
  spawnAgent: (input: SpawnInput) => Promise<string | null>;
  revokeAgent: (agentId: string) => Promise<void>;
  refreshAgents: () => Promise<void>;
  revealAgentKey: (agentId: string) => string | null;
  enqueueApproval: (input: Omit<PendingApproval, "id" | "createdAt" | "status">) => void;
  approvePending: (id: string) => Promise<void>;
  rejectPending: (id: string) => void;
  clearToast: () => void;
  exportOwnerKey: () => string | null;
  importOwnerKey: (hex: string) => void;
  markOwnerBackedUp: () => void;
  markAgentConnected: () => void;
}

const Ctx = createContext<Store | null>(null);

export function useStore() {
  const value = useContext(Ctx);
  if (!value) throw new Error("Shepherd store is missing");
  return value;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [wallets, setWallets] = useState<WalletChoice[]>([]);
  const [wallet, setWallet] = useState<ConnectedWallet | null>(() => {
    const raw = sessionStorage.getItem(WALLET);
    return raw ? (JSON.parse(raw) as ConnectedWallet) : null;
  });
  const [ownerKey, setOwnerKey] = useState<Hex | null>(() => loadHex(OWNER));
  const [sessionKey, setSessionKey] = useState<Hex | null>(() => loadHex(SESSION));
  const [p256Key, setP256Key] = useState<Hex | null>(() => loadHex(P256));
  const [deployed, setDeployed] = useState<Deployed | null>(() => {
    const raw = sessionStorage.getItem(DEPLOY);
    return raw ? (JSON.parse(raw) as Deployed) : null;
  });
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [anon, setAnon] = useState<AnonSession | null>(null);
  const [anonState, setAnonState] = useState<Store["anonState"]>("idle");
  const [chainLabel, setChainLabel] = useState(CHAIN_NAME);
  const [walletChainId, setWalletChainId] = useState<number | null>(null);
  const [ethrex, setEthrex] = useState<Store["ethrex"]>(null);
  const [live, setLive] = useState<Live | null>(null);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [lastTxUrl, setLastTxUrl] = useState<string | null>(null);
  const [policyRules, setPolicyRules] = useState<PolicyRuleRow[]>(() => loadRules(null));
  const [agents, setAgents] = useState<AgentRecord[]>([]);
  const [approvals, setApprovals] = useState<PendingApproval[]>([]);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const working = useRef(false);
  const [sessionConnected, setSessionConnected] = useState(() => loadSessionConnected());
  const [ownerBackedUp, setOwnerBackedUp] = useState(() => loadOwnerBackedUp());

  const ownerAddress = ownerKey ? privateKeyToAccount(ownerKey).address : null;
  const sessionAddress = sessionKey ? privateKeyToAccount(sessionKey).address : null;
  const pendingApprovalCount = approvals.filter((row) => row.status === "pending").length;
  const agentTree = useMemo(() => buildTree(agents), [agents]);

  function push(method: string, route: LogRow["route"], verdict: string, explorerUrl?: string) {
    setLogs((rows) => [{ id: rows.length + 1, method, route, verdict, explorerUrl }, ...rows].slice(0, 40));
  }

  function recordActivity(method: string, agentId: string, outcome: Outcome, valueWei?: string) {
    if (!deployed) return;
    const list = appendActivity(deployed.account, {
      method,
      agentId,
      verdict: `${outcome.verdict}:${outcome.reason}`,
      explorerUrl: outcome.explorerUrl,
      valueWei,
    });
    setActivity(list);
  }

  function notify(message: string) {
    setToast(message);
  }

  useEffect(() => {
    if (!deployed) {
      setPolicyRules([]);
      setAgents([]);
      setApprovals([]);
      setActivity([]);
      return;
    }
    setPolicyRules(loadRules(deployed.policy));
    setAgents(loadAgents(deployed.account));
    setApprovals(loadApprovals(deployed.account));
    setActivity(loadActivity(deployed.account));
  }, [deployed?.account, deployed?.policy]);

  useEffect(() => {
    const onAnnounce = (event: Event) => {
      const detail = (event as CustomEvent<{ info: WalletChoice; provider: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> } }>).detail;
      if (!detail?.info) return;
      rememberWallet(detail);
      setWallets((current) => (current.some((item) => item.uuid === detail.info.uuid) ? current : [...current, detail.info]));
    };
    window.addEventListener("eip6963:announceProvider", onAnnounce);
    window.dispatchEvent(new Event("eip6963:requestProvider"));
    return () => window.removeEventListener("eip6963:announceProvider", onAnnounce);
  }, []);

  useEffect(() => {
    if (!deployed) return;
    let cancel = false;
    void (async () => {
      try {
        const ok =
          (await hasCode(deployed.account)) && (await hasCode(deployed.policy)) && (await hasCode(deployed.vault));
        if (cancel || ok) return;
        sessionStorage.removeItem(DEPLOY);
        setDeployed(null);
        setLive(null);
        setError("Stored contracts have no code — the public devnet was reset. Run Prepare again.");
      } catch {
        /* keep stored deploy; next call will surface the error */
      }
    })();
    return () => {
      cancel = true;
    };
  }, [deployed?.account, deployed?.policy, deployed?.vault]);

  useEffect(() => {
    if (!location.pathname.startsWith("/console")) return;
    const session = startAnon(() => push("specifier.workerHash", "clear", "bootstrap"));
    let cancel = false;
    setAnonState((state) => (state === "ready" ? state : "starting"));
    session.ready
      .then(async () => {
        if (cancel) return;
        setAnon(session);
        setAnonState("ready");
        const id = await session.read("eth_chainId", []);
        push("eth_chainId", "anon", "ok");
        setChainLabel(`chain ${Number(id)}`);
      })
      .catch(() => {
        if (!cancel) setAnonState("failed");
      });
    return () => {
      cancel = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const anonShare = useMemo(() => {
    const reads = logs.filter((row) => row.method.startsWith("eth_"));
    if (reads.length === 0) return 0;
    return Math.round((reads.filter((row) => row.route === "anon").length / reads.length) * 100);
  }, [logs]);

  async function work(label: string, task: () => Promise<void>): Promise<boolean> {
    if (working.current) return false;
    working.current = true;
    setBusy(true);
    setError("");
    setStatus(label);
    try {
      await task();
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "That step failed.");
      return false;
    } finally {
      working.current = false;
      setBusy(false);
      setStatus("");
    }
  }

  async function refreshWallet() {
    const owner = ownerKey ? privateKeyToAccount(ownerKey).address : null;
    const accountEth = deployed ? formatEther(await balance(deployed.account)) : "0";
    const ownerEth = owner ? formatEther(await balance(owner)) : "0";
    const browserWei = wallet ? await readBrowserBalance(wallet) : null;
    setPortfolio({
      accountEth,
      ownerEth,
      browserEth: browserWei == null ? null : formatEther(browserWei),
    });
    if (deployed) {
      const sessionAddr = sessionKey ? privateKeyToAccount(sessionKey).address : null;
      if (sessionAddr) {
        const sessionRow = await readSession(deployed.account, sessionAddr);
        const stakeRow = await posture(deployed.account, sessionAddr);
        setLive({
          active: sessionRow.active,
          staked: stakeRow.staked,
          balance: accountEth,
          balanceRoute: "clear",
          expiry: Number(sessionRow.expiry),
          valueCapWei: sessionRow.valueCap.toString(),
          spentWei: loadSpentWei(sessionAddr).toString(),
        });
      } else {
        const stakeOnly = await posture(deployed.account, deployed.account);
        setLive({
          active: false,
          staked: stakeOnly.staked,
          balance: accountEth,
          balanceRoute: "clear",
          expiry: 0,
          valueCapWei: "0",
          spentWei: "0",
        });
      }
    }
  }

  async function refresh() {
    if (!deployed) {
      await refreshWallet();
      return;
    }
    let balanceRoute: Live["balanceRoute"] = "clear";
    let wei: bigint;
    try {
      if (!anon) throw new Error("harness");
      wei = BigInt((await anon.read("eth_getBalance", [deployed.account, "latest"])) as string);
      balanceRoute = "anon";
      push("eth_getBalance", "anon", "ok");
    } catch {
      wei = await balance(deployed.account);
      push("eth_getBalance", "clear", "ok");
    }
    const sessionAddr = sessionKey ? privateKeyToAccount(sessionKey).address : null;
    const accountEth = formatEther(wei);
    if (sessionAddr) {
      const sessionRow = await readSession(deployed.account, sessionAddr);
      const stakeRow = await posture(deployed.account, sessionAddr);
      push("posture", "clear", sessionRow.active ? "active" : "inactive");
      setLive({
        active: sessionRow.active,
        staked: stakeRow.staked,
        balance: accountEth,
        balanceRoute,
        expiry: Number(sessionRow.expiry),
        valueCapWei: sessionRow.valueCap.toString(),
        spentWei: loadSpentWei(sessionAddr).toString(),
      });
    } else {
      const stakeRow = await posture(deployed.account, deployed.account);
      setLive({
        active: false,
        staked: stakeRow.staked,
        balance: accountEth,
        balanceRoute,
        expiry: 0,
        valueCapWei: "0",
        spentWei: "0",
      });
    }
    await refreshWallet();
    await refreshPolicyRules();
    await refreshAgents();
  }

  useEffect(() => {
    if (!location.pathname.startsWith("/console")) return;
    void refresh().catch(() => setError("Could not read the account."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, deployed?.account, anonState, ownerKey, wallet?.address]);

  useEffect(() => {
    if (!location.pathname.startsWith("/console")) return;
    let cancel = false;
    const tick = async () => {
      try {
        const { number, ageSec } = await latestBlock();
        if (!cancel) setEthrex({ ok: ageSec <= 120, block: number.toString(), ageSec });
      } catch {
        if (!cancel) setEthrex({ ok: false, block: "?", ageSec: -1 });
      }
    };
    void tick();
    const id = window.setInterval(() => void tick(), 15_000);
    return () => {
      cancel = true;
      window.clearInterval(id);
    };
  }, [location.pathname]);

  useEffect(() => {
    if (!wallet) {
      setWalletChainId(null);
      return;
    }
    void readBrowserChainId(wallet).then((id) => {
      if (id != null) setWalletChainId(id);
    });
    const stopChain = watchWalletChain(wallet, (id) => {
      setWalletChainId(id);
      setWallet((current) => {
        if (!current) return current;
        const next = { ...current, chainId: id };
        sessionStorage.setItem(WALLET, JSON.stringify(next));
        return next;
      });
    });
    const stopAccounts = watchWalletAccounts(wallet, (address) => {
      if (!address) {
        disconnect();
        return;
      }
      setWallet((current) => {
        if (!current) return current;
        const next = { ...current, address };
        sessionStorage.setItem(WALLET, JSON.stringify(next));
        return next;
      });
      void refreshWallet();
    });
    return () => {
      stopChain();
      stopAccounts();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet?.address, wallet?.uuid]);

  function persistNewOwner(key: Hex) {
    sessionStorage.setItem(OWNER, key);
    setOwnerKey(key);
    clearOwnerBackedUp();
    setOwnerBackedUp(false);
  }

  function ensureOwner() {
    if (ownerKey) return privateKeyToAccount(ownerKey).address;
    const key = generatePrivateKey();
    persistNewOwner(key);
    return privateKeyToAccount(key).address;
  }

  function markOwnerBackedUp() {
    if (!ownerKey) return;
    const already = ownerBackedUp;
    markOwnerBackedUpStorage();
    setOwnerBackedUp(true);
    setError("");
    if (!already) notify("Owner key backed up. You can grant an agent.");
  }

  function requireBackup(): boolean {
    if (ownerBackedUp) return true;
    setError("Back up the owner key before the first grant. Closing this tab deletes it.");
    notify("Back up the owner key before the first grant.");
    return false;
  }

  async function connect(uuid: string, name: string) {
    return work(`Switching ${name} to ${CHAIN_NAME}`, async () => {
      const next = await connectInjected(uuid, name);
      sessionStorage.setItem(WALLET, JSON.stringify(next));
      setWallet(next);
      setWalletChainId(next.chainId);
      ensureOwner();
      push("wallet_switchEthereumChain", "clear", `chain:${next.chainId}`);
    });
  }

  async function connectWc() {
    return work(`Switching WalletConnect to ${CHAIN_NAME}`, async () => {
      const next = await connectWalletConnect();
      sessionStorage.setItem(WALLET, JSON.stringify(next));
      setWallet(next);
      setWalletChainId(next.chainId);
      ensureOwner();
      push("wallet_switchEthereumChain", "clear", `chain:${next.chainId}`);
    });
  }

  function disconnect() {
    sessionStorage.removeItem(WALLET);
    clearLastProvider();
    setWallet(null);
    setWalletChainId(null);
  }

  async function switchWalletToDevnet() {
    if (!wallet) return false;
    return work(`Switching to ${CHAIN_NAME}`, async () => {
      const provider = providerFor(wallet);
      if (!provider) throw new Error("Reconnect the browser wallet, then switch again.");
      const chainId = await switchToDevnet(provider);
      const next = { ...wallet, chainId };
      sessionStorage.setItem(WALLET, JSON.stringify(next));
      setWallet(next);
      setWalletChainId(chainId);
      push("wallet_switchEthereumChain", "clear", `chain:${chainId}`);
      await refreshWallet();
    });
  }

  async function prepare() {
    await work("Preparing the account", async () => {
      setStatus("Checking ethrex is mining");
      await assertChainLive();
      const key = ownerKey ?? generatePrivateKey();
      if (!ownerKey) persistNewOwner(key);
      const owner = privateKeyToAccount(key).address;
      setStatus("Funding frame signer from shared genesis key");
      await ensureFunds(owner);
      setStatus("Deploying the policy, the vault, and the account");
      const next = await deployStack(key);
      setStatus("Writing the vault rules");
      await setRule(key, next.policy, next.vault, PING, ALLOW);
      await setRule(key, next.policy, next.vault, SWEEP, HIGH);
      upsertRule(next.policy, { target: next.vault, selector: PING, mode: ALLOW, label: "vault.ping()" });
      upsertRule(next.policy, { target: next.vault, selector: SWEEP, mode: HIGH, label: "vault.sweep()" });
      sessionStorage.setItem(DEPLOY, JSON.stringify(next));
      setDeployed(next);
      setPolicyRules(loadRules(next.policy));
      push("deploy", "clear", "ready");
      await refreshWallet();
    });
  }

  async function issue(limits?: SessionLimitsInput) {
    if (!deployed || !ownerKey) return;
    if (!requireBackup()) return;
    await work("Granting the session", async () => {
      const key = sessionKey ?? generatePrivateKey();
      sessionStorage.setItem(SESSION, key);
      setSessionKey(key);
      const ttl = limits?.ttlSeconds && limits.ttlSeconds > 0 ? limits.ttlSeconds : 86_400;
      const expiry = BigInt(Math.floor(Date.now() / 1000) + ttl);
      let valueCap = SESSION_VALUE_CAP;
      if (limits?.valueCapEth?.trim()) {
        valueCap = parseEther(limits.valueCapEth);
        if (valueCap <= 0n) throw new Error("Value cap must be greater than zero.");
      }
      const address = privateKeyToAccount(key).address;
      clearSpentWei(address);
      const outcome = await grantSession(deployed.account, ownerKey, address, expiry, valueCap);
      push("grantSession", "clear", `${outcome.verdict}:${outcome.reason}`, outcome.explorerUrl);
      if (outcome.explorerUrl) setLastTxUrl(outcome.explorerUrl);
      recordActivity("grantSession", "root", outcome);
      if (outcome.verdict !== "admitted") throw new Error(`Grant ${outcome.verdict}: ${outcome.reason}`);
      markSessionConnected(false);
      setSessionConnected(false);
      await refresh();
    });
  }

  async function revokeSession() {
    if (!deployed || !ownerKey || !sessionKey) return;
    await work("Revoking the session", async () => {
      const outcome = await revoke(deployed.account, ownerKey, privateKeyToAccount(sessionKey).address);
      push("revokeSession", "clear", `${outcome.verdict}:${outcome.reason}`, outcome.explorerUrl);
      if (outcome.explorerUrl) setLastTxUrl(outcome.explorerUrl);
      recordActivity("revokeSession", "root", outcome);
      markSessionConnected(false);
      setSessionConnected(false);
      await refresh();
    });
  }

  async function registerCosigner() {
    if (!deployed || !ownerKey) return;
    await work("Registering the P256 co-signer", async () => {
      const key = p256Key ?? generatePrivateKey();
      sessionStorage.setItem(P256, key);
      setP256Key(key);
      const outcome = await registerP256(deployed.account, ownerKey, key);
      push("setP256Cosigner", "clear", `${outcome.verdict}:${outcome.reason}`, outcome.explorerUrl);
      if (outcome.explorerUrl) setLastTxUrl(outcome.explorerUrl);
    });
  }

  function revealSession() {
    if (!sessionKey) return null;
    markSessionConnected(true);
    setSessionConnected(true);
    notify("Session key revealed for a local agent process.");
    return sessionKey;
  }

  function markAgentConnected() {
    markSessionConnected(true);
    setSessionConnected(true);
  }

  async function runIntent(kind: IntentKind) {
    if (!deployed || !sessionKey) return;
    await work("Submitting", async () => {
      const call =
        kind === "drain" ? injectedCall() : kind.startsWith("sweep") ? highRiskCall(deployed.vault) : inPolicyCall(deployed.vault);
      const expiry = await expiryIfLive(BigInt(Math.floor(Date.now() / 1000)));
      const cosign = kind === "sweep-cosign" && ownerKey ? { scheme: "secp256k1" as const, key: ownerKey } : undefined;
      const route = kind === "canonical" ? "canonical" : "alt";
      const sign = kind !== "sweep";
      const outcome: Outcome = await agentAct(
        { account: deployed.account, policy: deployed.policy, sessionKey, call, expiry, cosign },
        { route, sign },
      );
      push(kind, "clear", `${outcome.verdict}:${outcome.reason}`, outcome.explorerUrl);
      if (outcome.explorerUrl) setLastTxUrl(outcome.explorerUrl);
      recordActivity(kind, "root", outcome, call.value?.toString());
      markSessionConnected(true);
      setSessionConnected(true);
      if (kind === "sweep" && outcome.verdict === "waiting") {
        enqueueApproval({
          agentId: "root",
          target: call.to,
          selector: SWEEP,
          data: call.data ?? SWEEP,
          valueWei: (call.value ?? 0n).toString(),
          preview: "NeedsCosign",
        });
      }
      if (outcome.verdict === "admitted" && (call.value ?? 0n) > 0n && sessionAddress) {
        const spent = addSpentWei(sessionAddress, call.value ?? 0n);
        setLive((current) => (current ? { ...current, spentWei: spent.toString() } : current));
      }
    });
  }

  async function previewCustomCall(input: CustomCallInput) {
    if (!deployed || !sessionKey) throw new Error("Issue a session first.");
    if (!isAddress(input.target)) throw new Error("Target must be a valid address.");
    const selector = normalizeSelector(input.selectorOrSig);
    const data = normalizeCalldata(selector, input.calldata || "0x");
    const value = input.valueEth.trim() ? parseEther(input.valueEth) : 0n;
    if (value < 0n) throw new Error("Value cannot be negative.");
    const session = await readSession(deployed.account, privateKeyToAccount(sessionKey).address);
    const rule = await readRule(deployed.policy, input.target as Address, selector);
    const verdict = mirror({ active: session.active, value, cap: session.valueCap, rule });
    return { selector, data, value, verdict };
  }

  async function submitCustomCall(input: CustomCallInput) {
    if (!deployed || !sessionKey) return;
    await work("Submitting custom call", async () => {
      const preview = await previewCustomCall(input);
      if (preview.verdict === "NeedsCosign" && input.queueIfNeedsCosign !== false) {
        enqueueApproval({
          agentId: "root",
          target: input.target as Address,
          selector: preview.selector,
          data: preview.data,
          valueWei: preview.value.toString(),
          preview: preview.verdict,
        });
        push("custom", "clear", "waiting:NeedsCosign");
        recordActivity("custom", "root", { verdict: "waiting", reason: "NeedsCosign", route: "local" }, preview.value.toString());
        return;
      }
      if (preview.verdict !== "allow" && preview.verdict !== "NeedsCosign") {
        push("custom", "clear", `rejected:${preview.verdict}`);
        recordActivity("custom", "root", { verdict: "rejected", reason: preview.verdict, route: "local" }, preview.value.toString());
        throw new Error(`Mirror rejected: ${preview.verdict}`);
      }
      const expiry = await expiryIfLive(BigInt(Math.floor(Date.now() / 1000)));
      const cosign =
        preview.verdict === "NeedsCosign" && ownerKey ? { scheme: "secp256k1" as const, key: ownerKey } : undefined;
      const outcome = await agentAct(
        {
          account: deployed.account,
          policy: deployed.policy,
          sessionKey,
          call: { to: input.target as Address, data: preview.data, value: preview.value },
          expiry,
          cosign,
        },
        { route: "alt", sign: true },
      );
      push("custom", "clear", `${outcome.verdict}:${outcome.reason}`, outcome.explorerUrl);
      if (outcome.explorerUrl) setLastTxUrl(outcome.explorerUrl);
      recordActivity("custom", "root", outcome, preview.value.toString());
      markSessionConnected(true);
      setSessionConnected(true);
      if (outcome.verdict === "admitted" && preview.value > 0n && sessionAddress) {
        const spent = addSpentWei(sessionAddress, preview.value);
        setLive((current) => (current ? { ...current, spentWei: spent.toString() } : current));
      }
      if (outcome.verdict !== "admitted") throw new Error(`Custom call ${outcome.verdict}: ${outcome.reason}`);
    });
  }

  async function stakeAccount() {
    if (!deployed || !ownerKey) return;
    await work("Staking the account", async () => {
      const outcome = await stake(deployed.account, ownerKey);
      push("addStake", "clear", `${outcome.verdict}:${outcome.reason}`, outcome.explorerUrl);
      if (outcome.verdict !== "admitted") throw new Error(`Stake ${outcome.verdict}: ${outcome.reason}`);
      if (outcome.explorerUrl) setLastTxUrl(outcome.explorerUrl);
      recordActivity("addStake", "owner", outcome);
      await refresh();
    });
  }

  async function readAnon() {
    if (!anon || !deployed) return;
    await work("Reading through Anon-RPC", async () => {
      await anon.read("eth_getBalance", [deployed.account, "latest"]);
      push("eth_getBalance", "anon", "ok");
      await anon.read("eth_getCode", [deployed.account, "latest"]);
      push("eth_getCode", "anon", "ok");
    });
  }

  async function sendEth(to: Address, amountEth: string) {
    if (!deployed || !ownerKey) return false;
    return work("Sending ETH", async () => {
      const value = parseEther(amountEth);
      if (value <= 0n) throw new Error("Enter an amount greater than zero.");
      const outcome = await sendFromAccount(deployed.account, ownerKey, to, value);
      push("send", "clear", `${outcome.verdict}:${outcome.reason}`, outcome.explorerUrl);
      if (outcome.explorerUrl) setLastTxUrl(outcome.explorerUrl);
      if (outcome.verdict !== "admitted") throw new Error(`Send ${outcome.verdict}: ${outcome.reason}`);
      await refreshWallet();
    });
  }

  async function topUpFromOwner(amountEth: string) {
    if (!deployed || !ownerKey) return false;
    return work("Topping up the account", async () => {
      const value = parseEther(amountEth);
      if (value <= 0n) throw new Error("Enter an amount greater than zero.");
      const outcome = await topUpAccount(deployed.account, ownerKey, value);
      push("fund", "clear", `${outcome.verdict}:${outcome.reason}`, outcome.explorerUrl);
      if (outcome.explorerUrl) setLastTxUrl(outcome.explorerUrl);
      if (outcome.verdict !== "admitted") throw new Error(`Top up ${outcome.verdict}: ${outcome.reason}`);
      await refreshWallet();
    });
  }

  async function depositFromBrowser(amountEth: string) {
    if (!deployed || !wallet) return false;
    return work("Waiting for the browser wallet", async () => {
      const value = parseEther(amountEth);
      if (value <= 0n) throw new Error("Enter an amount greater than zero.");
      const hash = await fundFromBrowser(wallet, deployed.account, value);
      push("fundFromBrowser", "clear", "submitted", `${EXPLORER_URL}?tx=${hash}`);
      const receipt = await waitReceipt(hash);
      if (receipt.status !== "0x1") throw new Error("Deposit reverted. Shepherd only accepts fund(), not plain transfers.");
      setLastTxUrl(`${EXPLORER_URL}?tx=${hash}`);
      await refreshWallet();
    });
  }

  async function faucetOwner() {
    return work("Funding frame signer from shared genesis", async () => {
      const key = ownerKey ?? generatePrivateKey();
      if (!ownerKey) persistNewOwner(key);
      const owner = privateKeyToAccount(key).address;
      const result = await ensureFunds(owner);
      push("fundFromShared", "clear", result);
      await refreshWallet();
    });
  }

  async function faucetBrowser() {
    if (!wallet) return false;
    return work("Funding browser wallet from shared genesis", async () => {
      await fundFromFaucet(wallet.address);
      push("fundFromShared", "clear", "browser");
      await refreshWallet();
    });
  }

  async function refreshPolicyRules() {
    if (!deployed) {
      setPolicyRules([]);
      return;
    }
    const local = loadRules(deployed.policy);
    const refreshed: PolicyRuleRow[] = [];
    for (const row of local) {
      try {
        const mode = (await readRule(deployed.policy, row.target, row.selector)) as RuleMode;
        if (mode === 0) continue;
        refreshed.push({ ...row, mode });
      } catch {
        refreshed.push(row);
      }
    }
    setPolicyRules(refreshed);
  }

  async function savePolicyRule(input: { target: string; selectorOrSig: string; mode: RuleMode; label?: string }) {
    if (!deployed || !ownerKey) return;
    await work("Writing policy rule", async () => {
      if (!isAddress(input.target)) throw new Error("Target must be a valid address.");
      if (input.mode !== 0 && input.mode !== ALLOW && input.mode !== HIGH) throw new Error("Mode must be deny, allow, or high-risk.");
      const selector = normalizeSelector(input.selectorOrSig);
      await setRule(ownerKey, deployed.policy, input.target as Address, selector, input.mode);
      const rows = upsertRule(deployed.policy, {
        target: input.target as Address,
        selector,
        mode: input.mode,
        label: input.label || `${modeLabel(input.mode)} ${selector}`,
      });
      setPolicyRules(rows.filter((row) => row.mode !== 0));
      push("setRule", "clear", modeLabel(input.mode));
      notify(`Policy rule ${modeLabel(input.mode)} saved on-chain.`);
    });
  }

  async function removePolicyRule(target: Address, selector: Hex) {
    await savePolicyRule({ target, selectorOrSig: selector, mode: 0, label: "removed" });
  }

  async function refreshAgents() {
    if (!deployed) {
      setAgents([]);
      return;
    }
    const local = loadAgents(deployed.account);
    setAgents(local);
  }

  async function spawnAgent(input: SpawnInput) {
    if (!deployed || !ownerKey || !sessionKey) return null;
    if (!requireBackup()) return null;
    let created: string | null = null;
    await work("Spawning child agent", async () => {
      const parentId = input.parentId || "root";
      const local = loadAgents(deployed.account);
      const parent =
        parentId === "root"
          ? {
              id: "root",
              depth: 0,
              address: privateKeyToAccount(sessionKey).address,
            }
          : local.find((agent) => agent.id === parentId);
      if (!parent) throw new Error(`No parent agent ${parentId}.`);
      const parentLive = await readSession(deployed.account, parent.address);
      if (!parentLive.active) throw new Error("Parent session is not active. Grant or spawn from a live parent.");
      const childCount = local.filter((agent) => agent.parentId === parent.id).length;
      const requestedCap = input.valueCapEth.trim() ? parseEther(input.valueCapEth) : null;
      const bounds = delegate({
        parentExpiry: parentLive.expiry,
        parentCap: parentLive.valueCap,
        now: BigInt(Math.floor(Date.now() / 1000)),
        ttlSeconds: input.ttlSeconds > 0 ? input.ttlSeconds : DEFAULT_TTL_SECONDS,
        requestedCap,
        depth: parent.depth,
        childCount,
      });
      if ("error" in bounds) throw new Error(bounds.error);
      const childKey = generatePrivateKey();
      const address = privateKeyToAccount(childKey).address;
      const outcome = await grantSession(deployed.account, ownerKey, address, bounds.expiry, bounds.valueCap);
      push("spawnAgent", "clear", `${outcome.verdict}:${outcome.reason}`, outcome.explorerUrl);
      if (outcome.explorerUrl) setLastTxUrl(outcome.explorerUrl);
      recordActivity("spawnAgent", parent.id, outcome, bounds.valueCap.toString());
      if (outcome.verdict !== "admitted") throw new Error(`Spawn ${outcome.verdict}: ${outcome.reason}`);
      const record: AgentRecord = {
        id: `agent_${crypto.getRandomValues(new Uint8Array(4)).reduce((s, b) => s + b.toString(16).padStart(2, "0"), "")}`,
        parentId: parent.id,
        depth: parent.depth + 1,
        address,
        sessionKey: childKey,
        valueCap: bounds.valueCap.toString(),
        expiry: bounds.expiry.toString(),
      };
      const next = [...local, record];
      saveAgents(deployed.account, next);
      setAgents(next);
      created = record.id;
      notify(`Spawned ${record.id}. Reveal its key once from the Agents page.`);
    });
    return created;
  }

  async function revokeAgent(agentId: string) {
    if (!deployed || !ownerKey) return;
    await work("Revoking agent", async () => {
      const local = loadAgents(deployed.account);
      const agent = local.find((row) => row.id === agentId);
      if (!agent) throw new Error(`No agent ${agentId}.`);
      const cascade = revokeCascadeOrder(local, agentId);
      for (const row of cascade) {
        const outcome = await revoke(deployed.account, ownerKey, row.address);
        push("revokeAgent", "clear", `${outcome.verdict}:${outcome.reason}`, outcome.explorerUrl);
        if (outcome.explorerUrl) setLastTxUrl(outcome.explorerUrl);
        recordActivity("revokeAgent", row.id, outcome);
      }
      const removed = new Set(cascade.map((row) => row.id));
      const next = local.filter((row) => !removed.has(row.id));
      saveAgents(deployed.account, next);
      setAgents(next);
      notify(`Revoked ${cascade.length} agent session(s).`);
    });
  }

  function revealAgentKey(agentId: string) {
    const agent = agents.find((row) => row.id === agentId);
    if (!agent) return null;
    notify(`Child key for ${agentId} shown once in this tab.`);
    return agent.sessionKey;
  }

  function enqueueApproval(input: Omit<PendingApproval, "id" | "createdAt" | "status">) {
    if (!deployed) return;
    const row: PendingApproval = {
      ...input,
      id: `appr_${Date.now().toString(36)}`,
      createdAt: Date.now(),
      status: "pending",
    };
    const next = [row, ...loadApprovals(deployed.account)];
    saveApprovals(deployed.account, next);
    setApprovals(next);
    notify("High-risk call waiting for co-sign.");
  }

  async function approvePending(id: string) {
    if (!deployed || !sessionKey || !ownerKey) return;
    await work("Co-signing approval", async () => {
      const current = loadApprovals(deployed.account);
      const row = current.find((item) => item.id === id && item.status === "pending");
      if (!row) throw new Error("That approval is gone or already handled.");
      const expiry = await expiryIfLive(BigInt(Math.floor(Date.now() / 1000)));
      const outcome = await agentAct(
        {
          account: deployed.account,
          policy: deployed.policy,
          sessionKey,
          call: { to: row.target, data: row.data, value: BigInt(row.valueWei) },
          expiry,
          cosign: { scheme: "secp256k1", key: ownerKey },
        },
        { route: "alt", sign: true },
      );
      push("approve", "clear", `${outcome.verdict}:${outcome.reason}`, outcome.explorerUrl);
      if (outcome.explorerUrl) setLastTxUrl(outcome.explorerUrl);
      recordActivity("approve", row.agentId, outcome, row.valueWei);
      const next = current.map((item) =>
        item.id === id ? { ...item, status: outcome.verdict === "admitted" ? ("approved" as const) : item.status, explorerUrl: outcome.explorerUrl } : item,
      );
      if (outcome.verdict !== "admitted") {
        saveApprovals(deployed.account, next);
        setApprovals(next);
        throw new Error(`Approve ${outcome.verdict}: ${outcome.reason}`);
      }
      saveApprovals(deployed.account, next);
      setApprovals(next);
      if (BigInt(row.valueWei) > 0n && sessionAddress) {
        const spent = addSpentWei(sessionAddress, BigInt(row.valueWei));
        setLive((currentLive) => (currentLive ? { ...currentLive, spentWei: spent.toString() } : currentLive));
      }
      notify("Approved and admitted.");
    });
  }

  function rejectPending(id: string) {
    if (!deployed) return;
    const next = loadApprovals(deployed.account).map((item) => (item.id === id ? { ...item, status: "rejected" as const } : item));
    saveApprovals(deployed.account, next);
    setApprovals(next);
    push("reject", "clear", "rejected:owner");
    notify("Approval rejected locally. Nothing was submitted.");
  }

  function exportOwnerKey() {
    return ownerKey;
  }

  function importOwnerKey(hex: string) {
    const trimmed = hex.trim() as Hex;
    if (!trimmed.startsWith("0x") || trimmed.length !== 66) throw new Error("Owner key must be a 32-byte hex private key.");
    sessionStorage.setItem(OWNER, trimmed);
    setOwnerKey(trimmed);
    markOwnerBackedUpStorage();
    setOwnerBackedUp(true);
    notify("Frame signer imported into this tab.");
  }

  const value: Store = {
    wallets,
    wallet,
    deployed,
    sessionReady: Boolean(sessionKey),
    p256Ready: Boolean(p256Key),
    p256Address: p256Key ? p256Identity(p256Key).address : null,
    ownerAddress,
    sessionAddress,
    live,
    portfolio,
    lastTxUrl,
    logs,
    busy,
    status,
    error,
    toast,
    anonState: location.pathname.startsWith("/console") ? anonState : "idle",
    chainLabel,
    walletOnDevnet: walletChainId === CHAIN_ID || wallet?.chainId === CHAIN_ID,
    ethrex,
    anonShare,
    policyRules,
    agents,
    agentTree,
    approvals,
    pendingApprovalCount,
    activity,
    sessionConnected,
    ownerBackedUp,
    maxDepth: MAX_DEPTH,
    maxChildren: MAX_CHILDREN,
    connect,
    connectWc,
    disconnect,
    switchWalletToDevnet,
    ensureOwner,
    prepare,
    issue,
    revokeSession,
    registerCosigner,
    revealSession,
    runIntent,
    previewCustomCall,
    submitCustomCall,
    stakeAccount,
    readAnon,
    refresh,
    refreshWallet,
    sendEth,
    topUpFromOwner,
    depositFromBrowser,
    faucetOwner,
    faucetBrowser,
    savePolicyRule,
    removePolicyRule,
    refreshPolicyRules,
    spawnAgent,
    revokeAgent,
    refreshAgents,
    revealAgentKey,
    enqueueApproval,
    approvePending,
    rejectPending,
    clearToast: () => setToast(""),
    exportOwnerKey,
    importOwnerKey,
    markOwnerBackedUp,
    markAgentConnected,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
