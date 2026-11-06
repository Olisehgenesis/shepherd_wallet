import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { formatEther, type Address, type Hex } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import {
  agentAct,
  ALLOW,
  balance,
  deployStack,
  ensureFunds,
  expiryIfLive,
  grantSession,
  HIGH,
  highRiskCall,
  inPolicyCall,
  injectedCall,
  PING,
  posture,
  registerP256,
  revoke,
  setRule,
  stake,
  SWEEP,
  p256Identity,
  type Outcome,
} from "../../../packages/core/src/index.js";
import { startAnon, type AnonSession } from "./anon";
import { connectInjected, connectWalletConnect, rememberWallet, type ConnectedWallet, type WalletChoice } from "./wallet";

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
}
type IntentKind = "ping" | "drain" | "sweep" | "sweep-cosign" | "canonical" | "alt";

interface Live {
  active: boolean;
  staked: boolean;
  balance: string;
  balanceRoute: "anon" | "clear";
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

interface Store {
  wallets: WalletChoice[];
  wallet: ConnectedWallet | null;
  deployed: Deployed | null;
  sessionReady: boolean;
  p256Ready: boolean;
  p256Address: string | null;
  live: Live | null;
  logs: LogRow[];
  busy: boolean;
  status: string;
  error: string;
  anonState: "idle" | "starting" | "ready" | "failed";
  chainLabel: string;
  anonShare: number;
  connect: (uuid: string, name: string) => Promise<void>;
  connectWc: () => Promise<void>;
  disconnect: () => void;
  prepare: () => Promise<void>;
  issue: () => Promise<void>;
  revokeSession: () => Promise<void>;
  registerCosigner: () => Promise<void>;
  revealSession: () => string | null;
  runIntent: (kind: IntentKind) => Promise<void>;
  stakeAccount: () => Promise<void>;
  readAnon: () => Promise<void>;
  refresh: () => Promise<void>;
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
  const [anon, setAnon] = useState<AnonSession | null>(null);
  const [anonState, setAnonState] = useState<Store["anonState"]>("idle");
  const [chainLabel, setChainLabel] = useState("devnet");
  const [live, setLive] = useState<Live | null>(null);

  function push(method: string, route: LogRow["route"], verdict: string) {
    setLogs((rows) => [{ id: rows.length + 1, method, route, verdict }, ...rows].slice(0, 40));
  }

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
    // The harness is a singleton. The log line for bootstrap is intentional once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const anonShare = useMemo(() => {
    const reads = logs.filter((row) => row.method.startsWith("eth_"));
    if (reads.length === 0) return 0;
    return Math.round((reads.filter((row) => row.route === "anon").length / reads.length) * 100);
  }, [logs]);

  async function work(label: string, task: () => Promise<void>) {
    setBusy(true);
    setError("");
    setStatus(label);
    try {
      await task();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "That step failed.");
    } finally {
      setBusy(false);
      setStatus("");
    }
  }

  async function refresh() {
    if (!deployed) return;
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
    const sessionAddress = sessionKey ? privateKeyToAccount(sessionKey).address : null;
    const row = sessionAddress ? await posture(deployed.account, sessionAddress) : { active: false, staked: false };
    if (sessionAddress) push("posture", "clear", row.active ? "active" : "inactive");
    setLive({
      active: row.active,
      staked: row.staked,
      balance: formatEther(wei),
      balanceRoute,
    });
  }

  useEffect(() => {
    if (!location.pathname.startsWith("/console") || !deployed) return;
    void refresh().catch(() => setError("Could not read the account."));
    // Refresh when the console opens or the deployment changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, deployed?.account, anonState]);

  async function connect(uuid: string, name: string) {
    await work("Waiting for the wallet", async () => {
      const next = await connectInjected(uuid, name);
      sessionStorage.setItem(WALLET, JSON.stringify(next));
      setWallet(next);
    });
  }

  async function connectWc() {
    await work("Waiting for WalletConnect", async () => {
      const next = await connectWalletConnect();
      sessionStorage.setItem(WALLET, JSON.stringify(next));
      setWallet(next);
    });
  }

  function disconnect() {
    sessionStorage.removeItem(WALLET);
    setWallet(null);
  }

  async function prepare() {
    await work("Preparing the account", async () => {
      const key = ownerKey ?? generatePrivateKey();
      sessionStorage.setItem(OWNER, key);
      setOwnerKey(key);
      const owner = privateKeyToAccount(key).address;
      setStatus("Asking the faucet");
      await ensureFunds(owner);
      setStatus("Deploying the policy, the vault, and the account");
      const next = await deployStack(key);
      setStatus("Writing the vault rules");
      await setRule(key, next.policy, next.vault, PING, ALLOW);
      await setRule(key, next.policy, next.vault, SWEEP, HIGH);
      sessionStorage.setItem(DEPLOY, JSON.stringify(next));
      setDeployed(next);
      push("deploy", "clear", "ready");
    });
  }

  async function issue() {
    if (!deployed || !ownerKey) return;
    await work("Granting the session", async () => {
      const key = sessionKey ?? generatePrivateKey();
      sessionStorage.setItem(SESSION, key);
      setSessionKey(key);
      const expiry = BigInt(Math.floor(Date.now() / 1000) + 86_400);
      const outcome = await grantSession(deployed.account, ownerKey, privateKeyToAccount(key).address, expiry);
      push("grantSession", "clear", `${outcome.verdict}:${outcome.reason}`);
      if (outcome.verdict !== "admitted") throw new Error(`Grant ${outcome.verdict}: ${outcome.reason}`);
      await refresh();
    });
  }

  async function revokeSession() {
    if (!deployed || !ownerKey || !sessionKey) return;
    await work("Revoking the session", async () => {
      const outcome = await revoke(deployed.account, ownerKey, privateKeyToAccount(sessionKey).address);
      push("revokeSession", "clear", `${outcome.verdict}:${outcome.reason}`);
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
      push("setP256Cosigner", "clear", `${outcome.verdict}:${outcome.reason}`);
    });
  }

  function revealSession() {
    return sessionKey;
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
      push(kind, "clear", `${outcome.verdict}:${outcome.reason}`);
    });
  }

  async function stakeAccount() {
    if (!deployed || !ownerKey) return;
    await work("Staking the account", async () => {
      const outcome = await stake(deployed.account, ownerKey);
      push("addStake", "clear", `${outcome.verdict}:${outcome.reason}`);
      if (outcome.verdict !== "admitted") throw new Error(`Stake ${outcome.verdict}: ${outcome.reason}`);
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

  const value: Store = {
    wallets,
    wallet,
    deployed,
    sessionReady: Boolean(sessionKey),
    p256Ready: Boolean(p256Key),
    p256Address: p256Key ? p256Identity(p256Key).address : null,
    live,
    logs,
    busy,
    status,
    error,
    anonState: location.pathname.startsWith("/console") ? anonState : "idle",
    chainLabel,
    anonShare,
    connect,
    connectWc,
    disconnect,
    prepare,
    issue,
    revokeSession,
    registerCosigner,
    revealSession,
    runIntent,
    stakeAccount,
    readAnon,
    refresh,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

