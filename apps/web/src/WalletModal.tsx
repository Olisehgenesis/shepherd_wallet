import { useEffect, useState } from "react";
import { isAddress, type Address } from "viem";
import { CHAIN_ID, CHAIN_NAME, EXPLORER_URL, GATEWAY_URL } from "../../../packages/core/src/config.js";
import { useStore } from "./store";
import { Modal, shortAddress } from "./ui";
import { explorerAddress, walletProjectId } from "./wallet";

type View = "home" | "send" | "receive" | "signers" | "connect";

export function WalletModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const store = useStore();
  const [view, setView] = useState<View>("home");
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [deposit, setDeposit] = useState("0.01");
  const [copied, setCopied] = useState("");
  const projectId = walletProjectId();

  useEffect(() => {
    if (!open) return;
    setView(store.wallet || store.ownerAddress || store.deployed ? "home" : "connect");
    void store.refreshWallet();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null;

  async function copy(label: string, value: string) {
    await navigator.clipboard.writeText(value);
    setCopied(label);
    window.setTimeout(() => setCopied(""), 1600);
  }

  async function pick(uuid: string, name: string) {
    if (await store.connect(uuid, name)) {
      setView("home");
      await store.refreshWallet();
    }
  }

  async function pickWc() {
    if (await store.connectWc()) {
      setView("home");
      await store.refreshWallet();
    }
  }

  const account = store.deployed?.account;
  const title =
    view === "send"
      ? "Send"
      : view === "receive"
        ? "Receive"
        : view === "signers"
          ? "Signers"
          : view === "connect"
            ? "Connect wallet"
            : "Wallet";

  return (
    <Modal title={title} onClose={onClose} wide>
      {view !== "home" && view !== "connect" && (
        <button className="btn-ghost wallet-back" type="button" onClick={() => setView("home")}>
          ← Back
        </button>
      )}

      {view === "connect" && (
        <>
          <p>
            Connect a browser wallet. Shepherd will add and switch it to <strong>{CHAIN_NAME}</strong> (chain {CHAIN_ID}). Frame hashes still use the owner signer in this tab.
          </p>
          <p className="lede">
            RPC {GATEWAY_URL.replace("https://", "")}
          </p>
          <div className="modal-section">
            <h3>Browser wallets</h3>
            <div className="wallet-list">
              {store.wallets.length === 0 && (
                <p>No EIP-6963 wallet announced yet. Open MetaMask or another extension, then try again.</p>
              )}
              {store.wallets.map((wallet) => (
                <button
                  key={wallet.uuid}
                  className="wallet-option"
                  type="button"
                  disabled={store.busy}
                  onClick={() => void pick(wallet.uuid, wallet.name)}
                >
                  {wallet.name}
                  <span>Connect</span>
                </button>
              ))}
            </div>
          </div>
          <div className="modal-section">
            <h3>WalletConnect</h3>
            {projectId ? (
              <button className="wallet-option" type="button" disabled={store.busy} onClick={() => void pickWc()}>
                WalletConnect
                <span>QR code</span>
              </button>
            ) : (
              <p>Set VITE_WALLETCONNECT_PROJECT_ID to enable WalletConnect.</p>
            )}
          </div>
          <div className="modal-section">
            <h3>Or continue without a browser wallet</h3>
            <button
              className="btn"
              type="button"
              disabled={store.busy}
              onClick={() => {
                store.ensureOwner();
                setView("home");
              }}
            >
              Create frame signer
            </button>
          </div>
        </>
      )}

      {view === "home" && (
        <>
          <div className="wallet-hero">
            <p className="wallet-label">
              {account ? "Shepherd account" : "Frame signer"} · {CHAIN_NAME}
            </p>
            <p className="wallet-balance">{store.portfolio?.accountEth ?? store.portfolio?.ownerEth ?? "0"} ETH</p>
            <button
              className="wallet-address"
              type="button"
              onClick={() => void copy("address", account ?? store.ownerAddress ?? "")}
              disabled={!account && !store.ownerAddress}
            >
              {account ? shortAddress(account) : store.ownerAddress ? shortAddress(store.ownerAddress) : "No address yet"}
              <span>{copied === "address" ? "Copied" : "Copy"}</span>
            </button>
          </div>
          {store.wallet && !store.walletOnDevnet && (
            <div className="callout bad" role="status">
              Browser wallet is on chain {store.wallet.chainId}.{" "}
              <button className="btn" type="button" disabled={store.busy} onClick={() => void store.switchWalletToDevnet()}>
                Switch to {CHAIN_ID}
              </button>
            </div>
          )}

          <div className="wallet-actions">
            <button className="btn" type="button" disabled={!account || store.busy} onClick={() => setView("send")}>
              Send
            </button>
            <button className="btn-ghost" type="button" disabled={store.busy} onClick={() => setView("receive")}>
              Receive
            </button>
            <button className="btn-ghost" type="button" onClick={() => setView("signers")}>
              Signers
            </button>
          </div>

          <div className="wallet-stats">
            <div>
              <span>Session</span>
              <strong>{store.live?.active ? "Active" : "Inactive"}</strong>
            </div>
            <div>
              <span>Stake</span>
              <strong>{store.live?.staked ? "Present" : "Absent"}</strong>
            </div>
            <div>
              <span>Browser</span>
              <strong>{store.wallet ? shortAddress(store.wallet.address) : "Not connected"}</strong>
            </div>
          </div>

          <div className="row">
            {!store.deployed && (
              <button className="btn" type="button" disabled={store.busy} onClick={() => void store.prepare()}>
                Prepare account
              </button>
            )}
            <button className="btn-ghost" type="button" disabled={store.busy} onClick={() => void store.refreshWallet()}>
              Refresh
            </button>
            {store.wallet ? (
              <button className="btn-ghost" type="button" onClick={() => store.disconnect()}>
                Disconnect browser
              </button>
            ) : (
              <button className="btn-ghost" type="button" onClick={() => setView("connect")}>
                Connect browser
              </button>
            )}
          </div>
          {store.lastTxUrl && (
            <p className="lede">
              Last tx:{" "}
              <a href={store.lastTxUrl} target="_blank" rel="noreferrer">
                Explorer
              </a>
            </p>
          )}
        </>
      )}

      {view === "send" && account && (
        <>
          <p>Send ETH from the Shepherd account. The owner frame signer approves the transfer.</p>
          <label className="field">
            <span>To</span>
            <input
              value={to}
              onChange={(event) => setTo(event.target.value.trim())}
              placeholder="0x…"
              autoComplete="off"
              spellCheck={false}
            />
          </label>
          <label className="field">
            <span>Amount (ETH)</span>
            <input
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="0.001"
              inputMode="decimal"
            />
          </label>
          <p className="lede">Available {store.portfolio?.accountEth ?? "0"} ETH</p>
          <div className="row">
            <button
              className="btn"
              type="button"
              disabled={store.busy || !isAddress(to) || !amount}
              onClick={() =>
                void store.sendEth(to as Address, amount).then((ok) => {
                  if (ok) {
                    setAmount("");
                    setView("home");
                  }
                })
              }
            >
              Review and send
            </button>
          </div>
        </>
      )}

      {view === "receive" && (
        <>
          <p>
            Deposit only with <code>fund()</code>. A plain transfer hits the VERIFY fallback and reverts.
          </p>
          {account ? (
            <div className="receive-card">
              <p className="wallet-label">Shepherd account</p>
              <code className="receive-address">{account}</code>
              <div className="row">
                <button className="btn" type="button" onClick={() => void copy("recv", account)}>
                  {copied === "recv" ? "Copied" : "Copy address"}
                </button>
                <a className="btn-ghost" href={explorerAddress(account)} target="_blank" rel="noreferrer">
                  Explorer
                </a>
              </div>
            </div>
          ) : (
            <p>Prepare the account first. Until then you can faucet the frame signer below.</p>
          )}

          <div className="modal-section">
            <h3>Devnet faucet</h3>
            <p className="lede">
              Public method <code>skandha_explorer_faucet</code> on the gateway. Once per address per hour. It is empty sometimes — if so, reuse a funded key or ask the stall.
            </p>
            <div className="row">
              <button className="btn" type="button" disabled={store.busy} onClick={() => void store.faucetOwner()}>
                Faucet frame signer
              </button>
              {store.wallet && (
                <button
                  className="btn-ghost"
                  type="button"
                  disabled={store.busy || !store.walletOnDevnet}
                  onClick={() => void store.faucetBrowser()}
                >
                  Faucet browser wallet
                </button>
              )}
            </div>
          </div>
          <div className="modal-section">
            <h3>Top up account</h3>
            <label className="field">
              <span>Amount (ETH)</span>
              <input value={deposit} onChange={(event) => setDeposit(event.target.value)} inputMode="decimal" />
            </label>
            <div className="row">
              {account && store.wallet && (
                <button
                  className="btn"
                  type="button"
                  disabled={store.busy || !deposit || !store.walletOnDevnet}
                  onClick={() => void store.depositFromBrowser(deposit)}
                >
                  Deposit from browser
                </button>
              )}
              {account && (
                <button
                  className="btn-ghost"
                  type="button"
                  disabled={store.busy || !deposit}
                  onClick={() => void store.topUpFromOwner(deposit)}
                >
                  Top up from frame signer
                </button>
              )}
            </div>
            {store.portfolio && (
              <p className="lede">
                Frame signer {store.portfolio.ownerEth} ETH
                {store.portfolio.browserEth != null ? ` · Browser ${store.portfolio.browserEth} ETH` : ""}
              </p>
            )}
          </div>
        </>
      )}

      {view === "signers" && (
        <>
          <p>Three keys, three jobs. The agent never receives the owner key.</p>
          <ul className="signer-list">
            <li>
              <div>
                <strong>Browser wallet</strong>
                <span>You · deposits and identity</span>
              </div>
              <code>{store.wallet ? shortAddress(store.wallet.address) : "—"}</code>
            </li>
            <li>
              <div>
                <strong>Frame signer (owner)</strong>
                <span>Signs EIP-8141 digests in this tab</span>
              </div>
              <code>{store.ownerAddress ? shortAddress(store.ownerAddress) : "—"}</code>
            </li>
            <li>
              <div>
                <strong>Session</strong>
                <span>Agent path · capped and revocable</span>
              </div>
              <code>
                {store.sessionAddress ? shortAddress(store.sessionAddress) : "—"}
                {store.live?.active ? " · active" : ""}
              </code>
            </li>
            <li>
              <div>
                <strong>P256 co-signer</strong>
                <span>Second signature for high-risk</span>
              </div>
              <code>{store.p256Address ? shortAddress(store.p256Address) : "—"}</code>
            </li>
          </ul>
          <div className="row">
            {!store.ownerAddress && (
              <button className="btn" type="button" onClick={() => store.ensureOwner()}>
                Create frame signer
              </button>
            )}
            {store.ownerAddress && (
              <button className="btn-ghost" type="button" onClick={() => void copy("owner", store.ownerAddress!)}>
                {copied === "owner" ? "Copied owner" : "Copy owner address"}
              </button>
            )}
            {store.sessionAddress && (
              <button className="btn-ghost" type="button" onClick={() => void copy("session", store.sessionAddress!)}>
                {copied === "session" ? "Copied session" : "Copy session address"}
              </button>
            )}
            {account && (
              <a className="btn-ghost" href={`${EXPLORER_URL}?address=${account}`} target="_blank" rel="noreferrer">
                Account on explorer
              </a>
            )}
          </div>
        </>
      )}
    </Modal>
  );
}
