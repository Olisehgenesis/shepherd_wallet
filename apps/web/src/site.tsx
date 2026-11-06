import { useState, type ComponentType } from "react";
import { Link, NavLink } from "react-router-dom";
import { MdDescription, MdMenu, MdShield, MdTerminal, MdAccountTree } from "react-icons/md";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { paths, primaryNav } from "./shell/destinations";
import { Mark } from "./ui";

const links: readonly { to: string; label: string; Icon: ComponentType<{ className?: string; size?: number }> }[] = [
  { to: "/how", label: "How it works", Icon: MdAccountTree },
  { to: "/trust", label: "Privacy", Icon: MdShield },
  { to: "/docs", label: "Documentation", Icon: MdDescription },
  { to: paths.home, label: "Console", Icon: MdTerminal },
];

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      {links.map(({ to, label, Icon }) => (
        <NavLink key={to} to={to} className="nav-link" onClick={onNavigate}>
          <Icon className="nav-link-icon" size={16} aria-hidden />
          <span>{label}</span>
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

          <nav className="nav-pill" aria-label="Site">
            <NavItems />
          </nav>

          <div className="nav-end">
            <Button asChild size="sm" className="nav-cta">
              <Link to={paths.wallet}>Connect Wallet</Link>
            </Button>

            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="nav-mobile-trigger" aria-label="Open menu">
                  <MdMenu className="size-4" />
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
                  {primaryNav.map((item) => (
                    <Link key={item.id} to={item.to} onClick={close}>
                      {item.label}
                    </Link>
                  ))}
                  <Button asChild className="mt-3 w-full nav-cta">
                    <Link to={paths.wallet} onClick={close}>
                      Connect Wallet
                    </Link>
                  </Button>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
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
            {links.map(({ to, label }) => (
              <Link key={to} to={to}>
                {label}
              </Link>
            ))}
            <Link to="/mcp">MCP</Link>
            <Link to={paths.wallet}>Connect Wallet</Link>
          </nav>
          <p className="foot-note">
            No tracker. Anon-RPC covers browser <code>eth_*</code> reads. The worker can still see request bodies.
          </p>
        </div>
      </footer>
    </div>
  );
}
