import { useCallback, useEffect, useState } from "react";
import { api, shortAddress, type WalletState } from "./api";
import type { DoorWallet } from "../../lib/storage";

type Screen =
  | "loading"
  | "welcome"
  | "import"
  | "doors"
  | "home"
  | "receive"
  | "settings";

type DoorOption = DoorWallet & { uuid: string };

export function App() {
  const [screen, setScreen] = useState<Screen>("loading");
  const [state, setState] = useState<WalletState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [doors, setDoors] = useState<DoorOption[]>([]);
  const [pendingDoor, setPendingDoor] = useState<DoorWallet | null>(null);
  const [importKey, setImportKey] = useState("");
  const [doorFlow, setDoorFlow] = useState<"create" | "import" | "link">("create");
  const [copied, setCopied] = useState(false);

  const refresh = useCallback(async () => {
    const next = await api.getState();
    setState(next);
    setScreen(next.ready ? "home" : "welcome");
  }, []);

  useEffect(() => {
    void refresh().catch((err: Error) => {
      setError(err.message);
      setScreen("welcome");
    });
  }, [refresh]);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function openDoors(flow: "create" | "import" | "link") {
    setDoorFlow(flow);
    setBusy(true);
    setError(null);
    try {
      const found = await api.discoverDoors();
      setDoors(found);
      setScreen("doors");
    } catch (err) {
      setError((err as Error).message);
      setDoors([]);
      setScreen("doors");
    } finally {
      setBusy(false);
    }
  }

  async function pickDoor(door: DoorOption) {
    setBusy(true);
    setError(null);
    try {
      const connected = await api.connectDoor(door.uuid);
      setPendingDoor(connected);
      if (doorFlow === "create") {
        await api.create(connected);
        await refresh();
      } else if (doorFlow === "link") {
        await api.linkDoor(connected);
        await refresh();
      } else {
        setScreen("import");
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function skipDoorAndCreate() {
    await run(() => api.create());
  }

  async function submitImport() {
    const key = importKey.trim() as `0x${string}`;
    if (!key.startsWith("0x") || key.length < 66) {
      setError("Paste a 0x-prefixed private key.");
      return;
    }
    await run(() => api.importKey(key, pendingDoor ?? undefined));
  }

  async function copyAddress() {
    if (!state?.address) return;
    await navigator.clipboard.writeText(state.address);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  if (screen === "loading") {
    return (
      <div className="shell">
        <div className="welcome">
          <img src="/icon.png" alt="" />
          <p className="muted">Opening Shepherd…</p>
        </div>
      </div>
    );
  }

  if (screen === "welcome") {
    return (
      <div className="shell">
        <div className="welcome">
          <img src="/icon.png" alt="Shepherd" />
          <h1>Shepherd Wallet</h1>
          <p>
            Doors unlock Shepherd. Shepherd keys talk to every dApp — scoped spends, Anon-ready reads.
          </p>
          {error ? <p className="error">{error}</p> : null}
          <div className="stack">
            <button className="btn" disabled={busy} onClick={() => void openDoors("create")}>
              Create with a door
            </button>
            <button className="btn secondary" disabled={busy} onClick={() => void skipDoorAndCreate()}>
              Create without a door
            </button>
            <button
              className="btn ghost"
              disabled={busy}
              onClick={() => {
                setPendingDoor(null);
                setScreen("import");
              }}
            >
              Import private key
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (screen === "import") {
    return (
      <div className="shell">
        <div className="panel">
          <button className="back" onClick={() => setScreen(state?.ready ? "home" : "welcome")}>
            ← Back
          </button>
          <h2>Import key</h2>
          <p className="lede">Shepherd stores the owner key in extension storage. Prefer a throwaway key for demos.</p>
          {pendingDoor ? (
            <div className="door-banner">
              <DoorIcon door={pendingDoor} />
              <div>
                <strong>Door linked</strong>
                <span>
                  {pendingDoor.name} · {shortAddress(pendingDoor.address)}
                </span>
              </div>
            </div>
          ) : (
            <button className="btn secondary" disabled={busy} onClick={() => void openDoors("import")}>
              Optionally connect a door first
            </button>
          )}
          <label className="field">
            <span>Private key</span>
            <input
              value={importKey}
              onChange={(e) => setImportKey(e.target.value)}
              placeholder="0x…"
              autoComplete="off"
              spellCheck={false}
            />
          </label>
          {error ? <p className="error">{error}</p> : null}
          <button className="btn" disabled={busy} onClick={() => void submitImport()}>
            Import into Shepherd
          </button>
        </div>
      </div>
    );
  }

  if (screen === "doors") {
    return (
      <div className="shell">
        <div className="panel">
          <button
            className="back"
            onClick={() => setScreen(state?.ready ? "home" : doorFlow === "import" ? "import" : "welcome")}
          >
            ← Back
          </button>
          <h2>{doorFlow === "link" ? "Link a door" : "Choose a door"}</h2>
          <p className="lede">
            Doors are injected wallets on the active tab (MetaMask, Rabby, Phantom…). Open any https dApp first.
          </p>
          {error ? <p className="error">{error}</p> : null}
          <div className="stack">
            {doors.length === 0 ? (
              <div className="warn">
                No doors found on this tab. Open Uniswap or another site with MetaMask/Rabby installed, then refresh.
              </div>
            ) : (
              doors.map((door) => (
                <button key={door.uuid} className="provider" disabled={busy} onClick={() => void pickDoor(door)}>
                  <DoorIcon door={door} />
                  <span>
                    <strong>{door.name}</strong>
                    <em>{door.rdns ?? door.uuid}</em>
                  </span>
                  <span className="muted">Connect</span>
                </button>
              ))
            )}
            <button className="btn secondary" disabled={busy} onClick={() => void openDoors(doorFlow)}>
              Refresh doors
            </button>
            {doorFlow === "create" ? (
              <button className="btn ghost" disabled={busy} onClick={() => void skipDoorAndCreate()}>
                Skip door for now
              </button>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  if (screen === "receive" && state?.address) {
    return (
      <div className="shell">
        <div className="panel">
          <button className="back" onClick={() => setScreen("home")}>
            ← Back
          </button>
          <h2>Receive</h2>
          <p className="lede">Fund this Shepherd address on {state.chainName}.</p>
          <code style={{ wordBreak: "break-all", textAlign: "left" }}>{state.address}</code>
          <button className="btn" onClick={() => void copyAddress()}>
            {copied ? "Copied" : "Copy address"}
          </button>
        </div>
      </div>
    );
  }

  if (screen === "settings" && state?.ready) {
    return (
      <div className="shell">
        <div className="panel">
          <button className="back" onClick={() => setScreen("home")}>
            ← Back
          </button>
          <h2>Settings</h2>
          <div className="card">
            <div className="card-row" style={{ cursor: "default" }}>
              <div className="token-icon" style={{ background: "var(--accent)" }}>
                S
              </div>
              <div className="token-meta">
                <strong>Shepherd account</strong>
                <span>{shortAddress(state.address!)}</span>
              </div>
              <div className="token-right">
                <span>{state.chainName}</span>
              </div>
            </div>
          </div>
          {state.door ? (
            <div className="door-banner">
              <DoorIcon door={state.door} />
              <div>
                <strong>{state.door.name}</strong>
                <span>{shortAddress(state.door.address)}</span>
              </div>
            </div>
          ) : (
            <button className="btn secondary" disabled={busy} onClick={() => void openDoors("link")}>
              Link a door wallet
            </button>
          )}
          <div className="row">
            {state.door ? (
              <button className="btn secondary" disabled={busy} onClick={() => void run(() => api.unlinkDoor())}>
                Unlink door
              </button>
            ) : null}
            <button
              className="btn danger"
              disabled={busy}
              onClick={() => {
                if (window.confirm("Reset Shepherd wallet on this device?")) {
                  void run(() => api.reset());
                }
              }}
            >
              Reset wallet
            </button>
          </div>
          {error ? <p className="error">{error}</p> : null}
        </div>
      </div>
    );
  }

  // Home
  const balance = state?.balanceEth ?? "0";
  const displayBalance = balance === "—" ? "—" : Number(balance).toLocaleString(undefined, { maximumFractionDigits: 4 });

  return (
    <div className="shell">
      <header className="topbar">
        <button className="account-chip" onClick={() => setScreen("settings")} title="Settings">
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 999,
              background: "var(--accent)",
              display: "inline-block",
            }}
          />
          Shepherd
        </button>
        <div className="net-chip">
          <span className="dot" />
          {state?.chainName ?? "Shepherd"}
        </div>
      </header>

      <main className="main">
        <section className="hero">
          <p className="hero-label">Total balance</p>
          <p className="hero-balance">{displayBalance} ETH</p>
          <button className="hero-address" onClick={() => void copyAddress()}>
            {state?.address ? shortAddress(state.address) : "—"}
            <span>{copied ? "✓" : "⎘"}</span>
          </button>
        </section>

        <nav className="actions">
          <button className="action primary" onClick={() => setScreen("receive")}>
            <span className="action-orb">↓</span>
            <span>Receive</span>
          </button>
          <button className="action" disabled title="Send from dApps for now">
            <span className="action-orb">↑</span>
            <span>Send</span>
          </button>
          <button className="action" onClick={() => void openDoors(state?.door ? "link" : "link")}>
            <span className="action-orb">⧉</span>
            <span>Door</span>
          </button>
          <button className="action" onClick={() => setScreen("settings")}>
            <span className="action-orb">⋯</span>
            <span>More</span>
          </button>
        </nav>

        {state?.door ? (
          <div className="door-banner">
            <DoorIcon door={state.door} />
            <div>
              <strong>Door · {state.door.name}</strong>
              <span>{shortAddress(state.door.address)} · unlock only, not spend</span>
            </div>
          </div>
        ) : (
          <div className="warn">No door linked. Link MetaMask/Rabby anytime — Shepherd still signs dApps.</div>
        )}

        <section className="card">
          <button className="card-row" type="button">
            <div className="token-icon">Ξ</div>
            <div className="token-meta">
              <strong>ETH</strong>
              <span>{state?.chainName}</span>
            </div>
            <div className="token-right">
              <strong>{displayBalance}</strong>
              <span>Native</span>
            </div>
          </button>
        </section>

        {error ? <p className="error">{error}</p> : null}
      </main>
    </div>
  );
}

function DoorIcon({ door }: { door: Pick<DoorWallet, "name" | "icon"> }) {
  if (door.icon) {
    return <img src={door.icon} alt="" width={32} height={32} />;
  }
  return <span className="door-fallback ph">{door.name.slice(0, 1).toUpperCase()}</span>;
}
