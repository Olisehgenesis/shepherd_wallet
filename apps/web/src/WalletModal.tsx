import { useEffect, useState } from "react";
import { formatEther, isAddress, type Address } from "viem";
import { CHAIN_ID, CHAIN_NAME, ETHREX_URL, EXPLORER_URL, GATEWAY_URL } from "../../../packages/core/src/config.js";
import { useStore } from "./store";
import { Modal, shortAddress } from "./ui";
import { explorerAddress, walletProjectId } from "./wallet";

type View = "home" | "send" | "receive" | "signers" | "connect" | "backup";

export function WalletModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const store = useStore();
  const [view, setView] = useState<View>("home");
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [deposit, setDeposit] = useState("0.01");
  const [copied, setCopied] = useState("");
  const [importKey, setImportKey] = useState("");
  const [exportShown, setExportShown] = useState(false);
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
          : view === "backup"
            ? "Frame signer backup"
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
            ethrex {ETHREX_URL.replace("https://", "")} · sidecar {GATEWAY_URL.replace("https://", "")}
          </p>
          <div className="modal-section">
            <h3>Browser wallets</h3>
            <p className="lede">
              Choosing a wallet opens its account picker. Shepherd&apos;s frame signer (owner key in this tab) is separate —
              MetaMask is for deposits and identity, not frame digests.
            </p>
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
                  <span>Connect / switch account</span>
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
              {store.wallet ? `${store.wallet.name} (browser)` : account ? "Shepherd account" : "Frame signer"} · {CHAIN_NAME}
            </p>
            <p className="wallet-balance">
              {store.wallet
                ? `${store.portfolio?.browserEth ?? "…"} ETH`
                : `${store.portfolio?.accountEth ?? store.portfolio?.ownerEth ?? "0"} ETH`}
            </p>
            <button
              className="wallet-address"
              type="button"
              onClick={() =>
                void copy(
                  "address",
                  store.wallet?.address ?? account ?? store.ownerAddress ?? "",
                )
              }
              disabled={!store.wallet && !account && !store.ownerAddress}
            >
              {store.wallet
                ? shortAddress(store.wallet.address)
                : account
                  ? shortAddress(account)
                  : store.ownerAddress
                    ? shortAddress(store.ownerAddress)
                    : "No address yet"}
              <span>{copied === "address" ? "Copied" : "Copy"}</span>
            </button>
          </div>
          {store.wallet && (account || store.ownerAddress) && (
            <div className="callout" role="status">
              MetaMask is <code>{shortAddress(store.wallet.address)}</code> — deposits and identity only. The address that
              owns the Shepherd account is the <strong>frame signer</strong> in this tab
              {store.ownerAddress ? (
                <>
                  : <code>{shortAddress(store.ownerAddress)}</code>
                </>
              ) : null}
              {account ? (
                <>
                  . Contract: <code>{shortAddress(account)}</code>
                </>
              ) : null}
              . Open Signers for the full map.
            </div>
          )}
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
            <button className="btn-ghost" type="button" onClick={() => setView("backup")}>
              Backup
            </button>
          </div>

          <div className="wallet-stats">
            <div>
              <span>Browser</span>
              <strong>{store.wallet ? shortAddress(store.wallet.address) : "Not connected"}</strong>
            </div>
            <div>
              <span>Frame signer</span>
              <strong>{store.ownerAddress ? shortAddress(store.ownerAddress) : "—"}</strong>
            </div>
            <div>
              <span>Account</span>
              <strong>{account ? shortAddress(account) : "Not prepared"}</strong>
            </div>
            <div>
              <span>Session</span>
              <strong>{store.live?.active ? "Active" : "Inactive"}</strong>
            </div>
            <div>
              <span>Stake</span>
              <strong>{store.live?.staked ? "Present" : "Absent"}</strong>
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
              <button
                className="btn-ghost"
                type="button"
                onClick={() => {
                  store.disconnect();
                  setExportShown(false);
                  setImportKey("");
                  setView("connect");
                }}
              >
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
            <p>Prepare the account first. Until then you can fund the frame signer below.</p>
          )}

          <div className="modal-section">
            <h3>Get funds</h3>
            <p className="lede">
              Docs: there is no faucet. Shepherd funds you once from the published genesis key (same as workshop <code>step_1_check</code>). Shared key → nonce collisions possible. Never use that key on a real network.
            </p>
            <div className="row">
              <button className="btn" type="button" disabled={store.busy} onClick={() => void store.faucetOwner()}>
                Fund frame signer
              </button>
              {store.wallet && (
                <button
                  className="btn-ghost"
                  type="button"
                  disabled={store.busy || !store.walletOnDevnet}
                  onClick={() => void store.faucetBrowser()}
                >
                  Fund browser wallet
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
          <p>Three keys, three jobs. Your MetaMask address is not the Shepherd owner — MetaMask cannot sign EIP-8141 frame digests.</p>
          <ul className="signer-list">
            <li>
              <div>
                <strong>Browser wallet</strong>
                <span>You · deposits and identity · this is MetaMask</span>
              </div>
              <code>{store.wallet ? store.wallet.address : "—"}</code>
            </li>
            <li>
              <div>
                <strong>Frame signer (owner)</strong>
                <span>Signs EIP-8141 digests in this tab · not MetaMask</span>
              </div>
              <code>{store.ownerAddress ?? "—"}</code>
            </li>
            <li>
              <div>
                <strong>Shepherd account</strong>
                <span>On-chain contract after Prepare</span>
              </div>
              <code>{account ?? "—"}</code>
            </li>
            <li>
              <div>
                <strong>Session</strong>
                <span>
                  Agent path · {store.live?.active ? "active" : "inactive"}
                  {store.live?.valueCapWei ? ` · cap ${formatEther(BigInt(store.live.valueCapWei))} ETH` : ""}
                  {store.sessionConnected ? " · connected" : ""}
                </span>
              </div>
              <code>{store.sessionAddress ?? "—"}</code>
            </li>
            <li>
              <div>
                <strong>P256 co-signer</strong>
                <span>Second signature for high-risk</span>
              </div>
              <code>{store.p256Address ?? "—"}</code>
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
            <button className="btn-ghost" type="button" onClick={() => setView("backup")}>
              Export / import owner
            </button>
            {account && (
              <a className="btn-ghost" href={`${EXPLORER_URL}?address=${account}`} target="_blank" rel="noreferrer">
                Account on explorer
              </a>
            )}
          </div>
        </>
      )}

      {view === "backup" && (
        <>
          <p className="warn">
            The browser wallet cannot sign EIP-8141 digests. The frame signer lives in this tab&apos;s sessionStorage. Export it
            before clearing site data. Never paste a mainnet key here.
          </p>
          <div className="modal-section">
            <h3>Export</h3>
            <div className="row">
              <button
                className="btn"
                type="button"
                onClick={() => {
                  const key = store.exportOwnerKey();
                  if (!key) {
                    store.ensureOwner();
                    return;
                  }
                  setExportShown(true);
                  void copy("export", key);
                }}
              >
                {copied === "export" ? "Copied private key" : "Copy frame signer key"}
              </button>
              {exportShown && (
                <button className="btn-ghost" type="button" onClick={() => setExportShown(false)}>
                  Hide
                </button>
              )}
            </div>
            {exportShown && store.exportOwnerKey() && (
              <input readOnly value={store.exportOwnerKey() ?? ""} aria-label="Owner private key" />
            )}
          </div>
          <div className="modal-section">
            <h3>Import</h3>
            <label className="field">
              <span>Private key (0x…)</span>
              <input
                value={importKey}
                onChange={(event) => setImportKey(event.target.value.trim())}
                placeholder="0x…"
                spellCheck={false}
                autoComplete="off"
              />
            </label>
            <button
              className="btn"
              type="button"
              disabled={!importKey}
              onClick={() => {
                try {
                  store.importOwnerKey(importKey);
                  setImportKey("");
                  setView("signers");
                } catch (reason) {
                  window.alert(reason instanceof Error ? reason.message : "Import failed");
                }
              }}
            >
              Import into this tab
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
