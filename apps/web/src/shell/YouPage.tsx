import { Link, NavLink, Outlet } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CHAIN_ID, CHAIN_NAME } from "../../../../packages/core/src/config.js";
import { useStore } from "../store";
import { shortAddress } from "../ui";
import { paths } from "./destinations";

const demoTools = [
  {
    to: paths.mempool,
    title: "Canonical vs alt-mempool",
    body: "Three verdicts in order: canonical-storage-read → unstaked-storage-read → admitted after stake.",
  },
  {
    to: paths.reads,
    title: "Reads",
    body: "Balance and code through the Anon-RPC harness.",
  },
  {
    to: paths.intents,
    title: "Intents",
    body: "In-policy ping, injected drain, and high-risk sweep.",
  },
] as const;

export function YouLayout() {
  return (
    <div className="section-stack">
      <nav className="section-nav" aria-label="You">
        <NavLink to={paths.you} end>
          You
        </NavLink>
        <NavLink to={paths.demo}>Demo</NavLink>
      </nav>
      <Outlet />
    </div>
  );
}

export function YouPage() {
  const store = useStore();
  const account = store.deployed?.account;

  return (
    <>
      <header className="page-head">
        <h1>You</h1>
        <p>Owner key, backup, and the network for this tab. Demo tools stay off the main navigation.</p>
      </header>
      <div className="you-grid">
        <Card>
          <CardHeader>
            <CardTitle>Owner</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <p className="lede" style={{ margin: 0 }}>
              Frame signer {store.ownerAddress ? shortAddress(store.ownerAddress) : "is not in this tab yet"}. Shepherd
              account {account ? shortAddress(account) : "is not prepared"}.
            </p>
            <div className="row">
              <Button asChild>
                <Link to={paths.wallet}>{store.ownerAddress || store.wallet ? "Open wallet" : "Connect"}</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to={`${paths.wallet}?view=backup`}>Back up owner key</Link>
              </Button>
              {!store.deployed && (
                <Button type="button" disabled={store.busy} onClick={() => void store.prepare()}>
                  Prepare account
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Network</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <p className="lede" style={{ margin: 0 }}>
              {CHAIN_NAME} · chain {CHAIN_ID}. Frames submit on this devnet.
            </p>
            {store.wallet && !store.walletOnDevnet && (
              <div className="row">
                <p className="lede" style={{ margin: 0 }}>
                  Browser wallet is on chain {store.wallet.chainId}.
                </p>
                <Button type="button" disabled={store.busy} onClick={() => void store.switchWalletToDevnet()}>
                  Switch to {CHAIN_ID}
                </Button>
              </div>
            )}
            {store.wallet && store.walletOnDevnet && (
              <p className="lede" style={{ margin: 0 }}>
                Browser wallet is on chain {CHAIN_ID}.
              </p>
            )}
            {!store.wallet && (
              <p className="lede" style={{ margin: 0 }}>
                No browser wallet connected. The owner key in this tab still signs frames.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Demo</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <p className="lede" style={{ margin: 0 }}>
            Canonical vs alt-mempool first, then Reads and Intents.
          </p>
          <Button asChild variant="outline">
            <Link to={paths.demo}>Open demo tools</Link>
          </Button>
        </CardContent>
      </Card>
      <p className="lede">
        <Link to="/docs">Docs</Link>
        {" · "}
        <Link to="/trust">Trust</Link>
        {" · "}
        <Link to="/mcp">MCP</Link>
        {" · "}
        <Link to="/">Site</Link>
      </p>
    </>
  );
}

export function DemoHub() {
  return (
    <>
      <header className="page-head">
        <h1>Demo</h1>
        <p>Workshop tools for this devnet. They are not part of the everyday owner navigation.</p>
      </header>
      <div className="demo-hub">
        {demoTools.map((tool) => (
          <Link key={tool.to} to={tool.to} className="demo-hub-link">
            <strong>{tool.title}</strong>
            <span>{tool.body}</span>
          </Link>
        ))}
      </div>
    </>
  );
}
