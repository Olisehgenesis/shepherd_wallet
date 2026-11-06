import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Mark } from "./ui";

const links = [
  ["/how", "How it works"],
  ["/trust", "Privacy"],
  ["/docs", "Documentation"],
  ["/console", "Console"],
] as const;

const consoleLinks = [
  ["/console", "Overview"],
  ["/console/wallet", "Connect wallet"],
  ["/console/session", "Session"],
  ["/console/policy", "Policy"],
  ["/console/agents", "Agents"],
  ["/console/intents", "Intents"],
  ["/console/approvals", "Approvals"],
  ["/console/reads", "Reads"],
  ["/console/mempool", "Mempool"],
  ["/console/activity", "Activity"],
] as const;

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      {links.map(([to, label]) => (
        <NavLink key={to} to={to} className="nav-link" onClick={onNavigate}>
          {label}
        </NavLink>
      ))}
    </>
  );
}

export function Site({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <div className="site">
      <a className="skip" href="#content">
        Skip to content
      </a>
      <header className="nav-bar">
        <div className="wrap nav">
          <Link to="/" className="brand" onClick={close}>
            <Mark />
            Shepherd
          </Link>

          <nav className="nav-desktop" aria-label="Site">
            <NavItems />
            <Button asChild size="sm" className="ml-2">
              <Link to="/console/wallet">Connect Wallet</Link>
            </Button>
          </nav>

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="nav-mobile-trigger" aria-label="Open menu">
                <Menu className="size-4" />
                Menu
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle>Shepherd</SheetTitle>
                <SheetDescription>Privacy infrastructure for agent calls.</SheetDescription>
              </SheetHeader>
              <Separator />
              <nav className="nav-sheet" aria-label="Mobile">
                <NavItems onNavigate={close} />
                <Separator className="my-2" />
                <p className="nav-sheet-label">Console</p>
                {consoleLinks.map(([to, label]) => (
                  <Link key={to} to={to} onClick={close}>
                    {label}
                  </Link>
                ))}
                <Button asChild className="mt-3 w-full">
                  <Link to="/console/wallet" onClick={close}>
                    Connect Wallet
                  </Link>
                </Button>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </header>
      <main id="content">{children}</main>
      <footer className="foot">
        <div className="wrap foot-grid">
          <div className="foot-brand">
            <Link to="/" className="brand">
              <Mark size={22} />
              Shepherd
            </Link>
            <p>Privacy infrastructure for agent calls. Devnet only.</p>
          </div>
          <nav aria-label="Footer">
            {links.map(([to, label]) => (
              <Link key={to} to={to}>
                {label}
              </Link>
            ))}
            <Link to="/mcp">MCP</Link>
            <Link to="/console/wallet">Connect Wallet</Link>
          </nav>
          <p className="foot-note">
            No tracker. Anon-RPC covers browser <code>eth_*</code> reads — the worker can still see request bodies.
          </p>
        </div>
      </footer>
    </div>
  );
}
