import { useCallback, useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CHAIN_ID, CHAIN_NAME } from "../../../../packages/core/src/config.js";
import { registerApprovalsOpener } from "../extensions";
import { FirstRun } from "../onboarding";
import { useStore } from "../store";
import { Loader, Mark, shortAddress } from "../ui";
import { WalletModal, type WalletModalView } from "../WalletModal";
import { WalletUiProvider } from "../wallet-ui";
import { ApprovalsQueue } from "./ApprovalsQueue";
import { paths, primaryNav } from "./destinations";
import { ShellProvider } from "./ShellContext";

export function AppShell() {
  const store = useStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [walletOpen, setWalletOpen] = useState(location.pathname === paths.wallet);
  const [walletView, setWalletView] = useState<WalletModalView | undefined>(undefined);

  const openWallet = useCallback((view?: WalletModalView) => {
    setWalletView(view);
    setWalletOpen(true);
  }, []);

  const closeWallet = useCallback(() => {
    setWalletOpen(false);
    setWalletView(undefined);
    if (location.pathname === paths.wallet) navigate(paths.you, { replace: true });
  }, [location.pathname, navigate]);

  const openApprovals = useCallback(() => {
    const params = new URLSearchParams(location.search);
    params.set("queue", "approvals");
    navigate({ pathname: location.pathname, search: `?${params.toString()}` });
  }, [location.pathname, location.search, navigate]);

  useEffect(() => {
    if (location.pathname === paths.wallet) setWalletOpen(true);
  }, [location.pathname]);

  useEffect(() => {
    if (!store.toast) return;
    const id = window.setTimeout(() => store.clearToast(), 4200);
    return () => window.clearTimeout(id);
  }, [store.toast, store.clearToast]);

  useEffect(() => registerApprovalsOpener(() => openApprovals()), [openApprovals]);

  if (!store.ownerAddress) return <FirstRun />;

  const accountLabel = store.deployed
    ? `Account ${shortAddress(store.deployed.account)}`
    : store.wallet
      ? `${store.wallet.name} · ${shortAddress(store.wallet.address)}`
      : store.ownerAddress
        ? `Owner · ${shortAddress(store.ownerAddress)}`
        : "Create owner key";

  return (
    <ShellProvider value={{ openWallet, openApprovals }}>
      <WalletUiProvider value={{ openWallet }}>
        <div className="shell">
          <aside className="side">
            <Link className="brand side-brand" to={paths.home}>
              <Mark />
              Shepherd
            </Link>
            <nav aria-label="Primary">
              <PrimaryLinks pathname={location.pathname} />
            </nav>
            <p className="side-note">Demo tools (Mempool, Reads) live under You → Demo.</p>
          </aside>
          <div className="main">
            <header className="shell-top">
              <Badge variant="ok">Alt mempool · {CHAIN_ID}</Badge>
              <div className="row">
                {store.pendingApprovalCount > 0 && (
                  <button className="queue-chip" type="button" onClick={openApprovals}>
                    {store.pendingApprovalCount} waiting
                  </button>
                )}
                <button className="wallet-chip" type="button" onClick={() => openWallet()}>
                  {accountLabel}
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
                Public ethrex is not mining (block #{store.ethrex.block}, age {store.ethrex.ageSec}s). Prepare, fund, and
                deploys cannot finish until new blocks appear. Ask @forshtat at the stall or retry later —{" "}
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
            <Outlet />
            {location.pathname !== paths.home && (
              <details className="ops-log">
                <summary>
                  Ops log <span>{store.logs.length}</span>
                </summary>
                <p className="ops-log-note">
                  Full history is on <Link to={paths.activity}>Activity</Link>.
                </p>
              </details>
            )}
          </div>
          <nav className="mobile-tabs" aria-label="Primary">
            <PrimaryLinks pathname={location.pathname} />
          </nav>
        </div>
        <WalletModal open={walletOpen} onClose={closeWallet} initialView={walletView} />
        <ApprovalsQueue />
      </WalletUiProvider>
    </ShellProvider>
  );
}

function PrimaryLinks({ pathname }: { pathname: string }) {
  return (
    <>
      {primaryNav.map((item) => {
        const walletYou = item.id === "you" && pathname === paths.wallet;
        return (
          <NavLink
            key={item.id}
            to={item.to}
            end={item.end}
            className={({ isActive }) => (isActive || walletYou ? "is-active" : undefined)}
            {...(walletYou ? { "aria-current": "page" as const } : {})}
          >
            {item.label}
          </NavLink>
        );
      })}
    </>
  );
}
