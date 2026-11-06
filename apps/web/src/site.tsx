import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Mark } from "./ui";

const links = [
  ["/how", "How"],
  ["/docs", "Docs"],
  ["/trust", "Trust"],
  ["/mcp", "MCP"],
] as const;

export function Site({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="site">
      <a className="skip" href="#content">
        Skip to content
      </a>
      <header className="nav">
        <Link to="/" className="brand" onClick={() => setOpen(false)}>
          <Mark />
          Shepherd
        </Link>
        <button className="nav-toggle" type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
          {open ? "Close" : "Menu"}
        </button>
        <nav className={open ? "nav-links open" : "nav-links"} aria-label="Site">
          <details className="menu">
            <summary>Console</summary>
            <div>
              <Link to="/console" onClick={() => setOpen(false)}>Overview</Link>
              <Link to="/console/wallet" onClick={() => setOpen(false)}>Wallet</Link>
              <Link to="/console/session" onClick={() => setOpen(false)}>Session</Link>
              <Link to="/console/intents" onClick={() => setOpen(false)}>Intents</Link>
              <Link to="/console/reads" onClick={() => setOpen(false)}>Reads</Link>
              <Link to="/console/mempool" onClick={() => setOpen(false)}>Mempool</Link>
            </div>
          </details>
          {links.map(([to, label]) => (
            <NavLink key={to} to={to} onClick={() => setOpen(false)}>
              {label}
            </NavLink>
          ))}
          <Link className="btn nav-cta" to="/console" onClick={() => setOpen(false)}>
            Open the console
          </Link>
        </nav>
      </header>
      <main id="content">{children}</main>
      <footer className="foot">
        <div className="wrap foot-row">
          <Link to="/" className="brand">
            <Mark size={22} />
            Shepherd
          </Link>
          <nav aria-label="Footer">
            {links.map(([to, label]) => (
              <Link key={to} to={to}>
                {label}
              </Link>
            ))}
            <Link to="/console">Console</Link>
          </nav>
          <p>Devnet only. No tracker. The worker still sees Anon-RPC request bodies.</p>
        </div>
      </footer>
    </div>
  );
}
