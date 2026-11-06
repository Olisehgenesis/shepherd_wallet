import { useCallback, useEffect, useState, type ComponentType } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  MdDescription,
  MdExtension,
  MdGroups,
  MdHome,
  MdMenu,
  MdScience,
  MdSettings,
  MdWallet,
} from "react-icons/md";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { CHAIN_ID, CHAIN_NAME } from "../../../../packages/core/src/config.js";
import { registerApprovalsOpener } from "../extensions";
import { FirstRun } from "../onboarding";
import { useStore } from "../store";
import { Loader, Mark, shortAddress } from "../ui";
import type { WalletModalView } from "../WalletModal";
import { WalletUiProvider } from "../wallet-ui";
import { ApprovalsQueue } from "./ApprovalsQueue";
import { paths } from "./destinations";
import { ShellProvider } from "./ShellContext";

const sideNav: readonly {
  to: string;
  label: string;
  end?: boolean;
  Icon: ComponentType<{ className?: string; size?: number }>;
  match?: (pathname: string) => boolean;
}[] = [
  { to: paths.home, label: "Home", end: true, Icon: MdHome },
  {
    to: paths.agents,
    label: "Agents",
    Icon: MdGroups,
    match: (pathname) => pathname.startsWith("/console/agents"),
  },
  {
    to: paths.wallet,
    label: "Wallet",
    Icon: MdWallet,
    match: (pathname) => pathname === paths.wallet || pathname.startsWith("/console/you"),
  },
  {
    to: paths.mempool,
    label: "Demo",
    Icon: MdScience,
    match: (pathname) => pathname.startsWith("/console/you/demo"),
  },
  { to: paths.mcp, label: "MCP", end: true, Icon: MdExtension },
  { to: paths.you, label: "Settings", end: true, Icon: MdSettings },
];

export function AppShell() {
  const store = useStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const openWallet = useCallback(
    (view?: WalletModalView) => {
      const search = view && view !== "home" ? `?view=${view}` : "";
      navigate(`${paths.wallet}${search}`);
    },
    [navigate],
  );

  const openApprovals = useCallback(() => {
    const params = new URLSearchParams(location.search);
    params.set("queue", "approvals");
    navigate({ pathname: location.pathname, search: `?${params.toString()}` });
  }, [location.pathname, location.search, navigate]);

  useEffect(() => {
    if (!store.toast) return;
    const id = window.setTimeout(() => store.clearToast(), 4200);
    return () => window.clearTimeout(id);
  }, [store.toast, store.clearToast]);

  useEffect(() => registerApprovalsOpener(() => openApprovals()), [openApprovals]);

  if (!store.ownerAddress) return <FirstRun />;

  const closeMenu = () => setMenuOpen(false);
  const displayAddress = store.deployed?.account ?? store.wallet?.address ?? store.ownerAddress;
  const connected = Boolean(store.ownerAddress);

  function logout() {
    store.logout();
    navigate(paths.wallet);
  }

  function SideNav({ onNavigate }: { onNavigate?: () => void }) {
    return (
      <nav className="dash-side-nav" aria-label="Console">
        {sideNav.map(({ to, label, end, Icon, match }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => {
              const active = match ? match(location.pathname) : isActive;
              return `dash-side-link${active ? " is-active" : ""}`;
            }}
            onClick={onNavigate}
          >
            <Icon className="dash-side-icon" size={18} aria-hidden />
            <span>{label}</span>
          </NavLink>
        ))}
        <Link className="dash-side-link" to="/docs" onClick={onNavigate}>
          <MdDescription className="dash-side-icon" size={18} aria-hidden />
          <span>Docs</span>
          <span className="dash-side-ext" aria-hidden="true">
            ↗
          </span>
        </Link>
      </nav>
    );
  }

  return (
    <ShellProvider value={{ openWallet, openApprovals }}>
      <WalletUiProvider value={{ openWallet }}>
        <div className="dash">
          <aside className="dash-side" aria-label="Shepherd">
            <Link className="dash-brand" to={paths.home}>
              <Mark size={32} />
              <span>Shepherd</span>
            </Link>

            <SideNav />

            <div className="dash-side-foot">
              <div className="dash-help">
                <strong>Need help?</strong>
                <p>How a frame is decided, trust limits, and the mempool demo.</p>
                <Link className="dash-help-btn" to="/how">
                  Get help →
                </Link>
              </div>
            </div>
          </aside>

          <div className="dash-main">
            <header className="dash-top">
              <div className="dash-top-left">
                <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="sm" className="dash-mobile-trigger" aria-label="Open menu">
                      <MdMenu className="size-4" />
                      Menu
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="dash-sheet">
                    <SheetHeader>
                      <SheetTitle>Shepherd</SheetTitle>
                      <SheetDescription>Console</SheetDescription>
                    </SheetHeader>
                    <Separator />
                    <SideNav onNavigate={closeMenu} />
                    <div className="dash-help" style={{ marginTop: 16 }}>
                      <strong>Need help?</strong>
                      <p>How a frame is decided and trust limits.</p>
                      <Link className="dash-help-btn" to="/how" onClick={closeMenu}>
                        Get help →
                      </Link>
                    </div>
                  </SheetContent>
                </Sheet>
                <span className="dash-net" title={`${CHAIN_NAME} · ${CHAIN_ID}`}>
                  Chain {CHAIN_ID}
                </span>
              </div>

              <div className="dash-top-right">
                {store.pendingApprovalCount > 0 && (
                  <button className="queue-chip" type="button" onClick={openApprovals}>
                    {store.pendingApprovalCount} waiting
                  </button>
                )}
                <span className={`dash-status${connected ? " is-on" : ""}`}>
                  <span className="dash-status-dot" aria-hidden="true" />
                  {connected ? "Connected" : "Offline"}
                </span>
                {displayAddress && (
                  <Link className="dash-address" to={paths.wallet} title={displayAddress}>
                    {shortAddress(displayAddress)}
                  </Link>
                )}
                <button className="dash-logout" type="button" onClick={logout}>
                  Log out
                </button>
              </div>
            </header>

            <div className="dash-content">
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
              {location.pathname !== paths.home &&
                location.pathname !== paths.mcp &&
                location.pathname !== paths.wallet && (
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
          </div>
        </div>
        <ApprovalsQueue />
      </WalletUiProvider>
    </ShellProvider>
  );
}
