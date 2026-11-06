import { useCallback, useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CHAIN_ID, CHAIN_NAME } from "../../../../packages/core/src/config.js";
import { registerApprovalsOpener } from "../extensions";
import { FirstRun } from "../onboarding";
import { useStore } from "../store";
import { Loader, Mark, shortAddress } from "../ui";
import { WalletModal, type WalletModalView } from "../WalletModal";
import { WalletUiProvider } from "../wallet-ui";
import { ApprovalsQueue } from "./ApprovalsQueue";
import { agentsMenu, paths } from "./destinations";
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
    if (location.pathname === paths.wallet) navigate(paths.agents, { replace: true });
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

  const agentsActive = location.pathname.startsWith("/console/agents");
  const walletActive = location.pathname === paths.wallet || location.pathname.startsWith("/console/you");

  return (
    <ShellProvider value={{ openWallet, openApprovals }}>
      <WalletUiProvider value={{ openWallet }}>
        <div className="shell">
          <header className="console-nav">
            <div className="console-nav-inner">
              <Link className="brand console-nav-brand" to={paths.home}>
                <Mark />
                Shepherd Wallet
              </Link>

              <nav className="console-nav-desktop" aria-label="Primary">
                <NavDropdown label="Agents" active={agentsActive} items={agentsMenu} menuLabel="Agents" />

                <NavLink
                  to={paths.mcp}
                  end
                  className={({ isActive }) => `console-nav-link${isActive ? " is-active" : ""}`}
                >
                  MCP
                </NavLink>

                <NavLink
                  to={paths.wallet}
                  end
                  className={() => `console-nav-link${walletActive ? " is-active" : ""}`}
                  onClick={(event) => {
                    event.preventDefault();
                    openWallet();
                    if (location.pathname !== paths.wallet) navigate(paths.wallet);
                  }}
                >
                  Wallet
                </NavLink>
              </nav>

              <div className="console-nav-actions">
                <span className="console-nav-net" title={`${CHAIN_NAME} · ${CHAIN_ID}`}>
                  <span className="console-nav-net-dot" aria-hidden="true" />
                  Alt mempool · {CHAIN_ID}
                </span>
                {store.pendingApprovalCount > 0 && (
                  <button className="queue-chip" type="button" onClick={openApprovals}>
                    {store.pendingApprovalCount} waiting
                  </button>
                )}
                <button className="wallet-chip" type="button" onClick={() => openWallet()}>
                  {store.deployed
                    ? shortAddress(store.deployed.account)
                    : store.wallet
                      ? shortAddress(store.wallet.address)
                      : store.ownerAddress
                        ? shortAddress(store.ownerAddress)
                        : "Wallet"}
                </button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="console-nav-mobile-trigger" aria-label="Open menu">
                      <Menu className="size-4" />
                      Menu
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="console-nav-menu w-[min(20rem,calc(100vw-2rem))]">
                    <DropdownMenuLabel>Agents</DropdownMenuLabel>
                    {agentsMenu.map((item) => (
                      <DropdownMenuItem key={item.to} onSelect={() => navigate(item.to)}>
                        <MenuItemLabel label={item.label} description={item.description} />
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => navigate(paths.mcp)}>MCP</DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => {
                        openWallet();
                        navigate(paths.wallet);
                      }}
                    >
                      Wallet
                    </DropdownMenuItem>
                    {store.pendingApprovalCount > 0 && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={openApprovals}>
                          {store.pendingApprovalCount} waiting for co-sign
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
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
            {location.pathname !== paths.home && location.pathname !== paths.mcp && (
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
        <WalletModal open={walletOpen} onClose={closeWallet} initialView={walletView} />
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
        <button type="button" className={`console-nav-link console-nav-trigger${active ? " is-active" : ""}`}>
          {label}
          <ChevronDown className="size-3.5 opacity-70" aria-hidden="true" />
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
