import { useCallback, useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { MdAccountTree, MdExtension, MdMenu, MdWallet } from "react-icons/md";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CHAIN_ID, CHAIN_NAME } from "../../../../packages/core/src/config.js";
import { registerApprovalsOpener } from "../extensions";
import { FirstRun } from "../onboarding";
import { useStore } from "../store";
import { Loader, Mark, shortAddress } from "../ui";
import type { WalletModalView } from "../WalletModal";
import { WalletUiProvider } from "../wallet-ui";
import { ApprovalsQueue } from "./ApprovalsQueue";
import { agentsMenu, paths } from "./destinations";
import { ShellProvider } from "./ShellContext";

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

  const agentsActive = location.pathname.startsWith("/console/agents");
  const walletActive = location.pathname === paths.wallet || location.pathname.startsWith("/console/you");
  const closeMenu = () => setMenuOpen(false);
  const walletLabel = store.deployed
    ? shortAddress(store.deployed.account)
    : store.wallet
      ? shortAddress(store.wallet.address)
      : store.ownerAddress
        ? shortAddress(store.ownerAddress)
        : "Wallet";

  return (
    <ShellProvider value={{ openWallet, openApprovals }}>
      <WalletUiProvider value={{ openWallet }}>
        <div className="shell">
          <header className="nav-bar console-top">
            <div className="wrap nav">
              <Link className="brand" to={paths.home}>
                <Mark />
                Shepherd
              </Link>

              <nav className="nav-pill console-nav-pill" aria-label="Primary">
                <NavDropdown label="Agents" active={agentsActive} items={agentsMenu} menuLabel="Agents" />

                <NavLink
                  to={paths.mcp}
                  end
                  className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
                >
                  <MdExtension className="nav-link-icon" size={16} aria-hidden />
                  <span>MCP</span>
                </NavLink>

                <NavLink to={paths.wallet} end className={() => `nav-link${walletActive ? " active" : ""}`}>
                  <MdWallet className="nav-link-icon" size={16} aria-hidden />
                  <span>Wallet</span>
                </NavLink>
              </nav>

              <div className="nav-end">
                <span className="console-nav-net" title={`${CHAIN_NAME} · ${CHAIN_ID}`}>
                  <span className="console-nav-net-dot" aria-hidden="true" />
                  {CHAIN_ID}
                </span>
                {store.pendingApprovalCount > 0 && (
                  <button className="queue-chip" type="button" onClick={openApprovals}>
                    {store.pendingApprovalCount} waiting
                  </button>
                )}
                <Button asChild size="sm" className="nav-cta">
                  <Link to={paths.wallet}>{walletLabel}</Link>
                </Button>

                <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="sm" className="nav-mobile-trigger" aria-label="Open menu">
                      <MdMenu className="size-4" />
                      Menu
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right">
                    <SheetHeader>
                      <SheetTitle>Shepherd</SheetTitle>
                      <SheetDescription>Console</SheetDescription>
                    </SheetHeader>
                    <Separator />
                    <nav className="nav-sheet" aria-label="Mobile console">
                      <p className="nav-sheet-label">Agents</p>
                      {agentsMenu.map((item) => (
                        <Link
                          key={item.to}
                          to={item.to}
                          onClick={() => {
                            closeMenu();
                            navigate(item.to);
                          }}
                        >
                          {item.label}
                        </Link>
                      ))}
                      <Separator className="my-2" />
                      <Link to={paths.mcp} onClick={closeMenu}>
                        MCP
                      </Link>
                      <Link to={paths.wallet} onClick={closeMenu}>
                        Wallet
                      </Link>
                      {store.pendingApprovalCount > 0 && (
                        <button
                          type="button"
                          className="nav-sheet-btn"
                          onClick={() => {
                            closeMenu();
                            openApprovals();
                          }}
                        >
                          {store.pendingApprovalCount} waiting for co-sign
                        </button>
                      )}
                      <Button asChild className="mt-3 w-full nav-cta">
                        <Link to="/" onClick={closeMenu}>
                          Site home
                        </Link>
                      </Button>
                    </nav>
                  </SheetContent>
                </Sheet>
              </div>
            </div>
          </header>

          <div className="main">
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
        <ApprovalsQueue />
      </WalletUiProvider>
    </ShellProvider>
  );
}

function MenuItemLabel({ label, description }: { label: string; description: string }) {
  return (
    <span className="console-nav-item">
      <span className="console-nav-item-label">{label}</span>
      <span className="console-nav-item-desc">{description}</span>
    </span>
  );
}

function NavDropdown({
  label,
  active,
  items,
  menuLabel,
}: {
  label: string;
  active: boolean;
  items: readonly { to: string; label: string; description: string }[];
  menuLabel: string;
}) {
  const navigate = useNavigate();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className={`nav-link console-nav-trigger${active ? " active" : ""}`}>
          <MdAccountTree className="nav-link-icon" size={16} aria-hidden />
          <span>{label}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="console-nav-menu">
        <DropdownMenuLabel>{menuLabel}</DropdownMenuLabel>
        {items.map((item) => (
          <DropdownMenuItem key={item.to} onSelect={() => navigate(item.to)}>
            <MenuItemLabel label={item.label} description={item.description} />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
