import { useEffect, useState, type ReactNode } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  Clock3,
  Copy,
  ExternalLink,
  KeyRound,
  RefreshCw,
  Shield,
  Wallet as WalletIcon,
} from "lucide-react";
import { formatEther, isAddress, type Address } from "viem";
import { CHAIN_ID, CHAIN_NAME, EXPLORER_URL } from "../../../packages/core/src/config.js";
import { useStore } from "./store";
import { ReviewSheet } from "./confirm";
import { sendReview } from "./reviewCopy";
import { Mark, Modal, shortAddress } from "./ui";
import { explorerAddress, walletProjectId } from "./wallet";
import type { WalletSurface } from "./wallet-ui";

export type WalletModalView = WalletSurface;
type View = WalletSurface;

export function WalletModal({
  open,
  onClose,
  initialView = null,
}: {
  open: boolean;
  onClose: () => void;
  initialView?: View | null;
}) {
  const store = useStore();
  const [view, setView] = useState<View>("home");
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [deposit, setDeposit] = useState("0.01");
  const [copied, setCopied] = useState("");
  const [importKey, setImportKey] = useState("");
  const [exportShown, setExportShown] = useState(false);
  const [reviewSend, setReviewSend] = useState(false);
  const projectId = walletProjectId();

  useEffect(() => {
    if (!open) return;
    setView(initialView ?? (store.wallet || store.ownerAddress || store.deployed ? "home" : "connect"));
    setReviewSend(false);
    void store.refreshWallet();
  }, [open, initialView]); // eslint-disable-line react-hooks/exhaustive-deps

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
  const displayAddress = store.wallet?.address ?? account ?? store.ownerAddress ?? "";
  const balanceEth = store.wallet
    ? (store.portfolio?.browserEth ?? "…")
    : (store.portfolio?.accountEth ?? store.portfolio?.ownerEth ?? "0");
  const contextLabel = store.wallet
    ? `${store.wallet.name} · browser`
    : account
      ? "Shepherd account"
      : "Frame signer";

  const title =
    view === "send"
      ? "Send"
      : view === "receive"
        ? "Receive"
        : view === "signers"
          ? "Signers"
          : view === "backup"
            ? "Back up owner key"
            : view === "connect"
              ? store.ownerAddress
                ? "Connect a browser wallet"
                : "Start"
              : "Wallet";

  const showBack = view !== "home" && view !== "connect";

  return (
    <>
      <Modal
        title={title}
        onClose={onClose}
        wide
        back={showBack ? () => setView("home") : undefined}
        icon={
          view === "home" ? (
            <span className="wallet-title-icon" aria-hidden="true">
              <WalletIcon size={16} />
            </span>
          ) : undefined
        }
      >
        {view === "connect" && (
          <div className="wallet-stack">
            <p className="wallet-lede">
              {store.wallets.length === 0
                ? "No browser extension detected. Create an owner key in this tab, then back it up before any grant."
                : "Browser wallets handle identity and deposits. The owner key in this tab signs EIP-8141 frame calls."}
            </p>
            {!store.ownerAddress && (
              <button
                className="wallet-cta"
                type="button"
                disabled={store.busy}
                onClick={() => {
                  store.ensureOwner();
                  setView("backup");
                }}
              >
                <strong>Create owner key</strong>
                <span>Recommended — stays in this browser until you back it up</span>
              </button>
            )}
            <div className="wallet-provider-list">
              {store.wallets.length === 0 && (
                <p className="wallet-empty">No browser extension detected in this environment.</p>
              )}
              {store.wallets.map((wallet) => (
                <button
                  key={wallet.uuid}
                  className="wallet-provider"
                  type="button"
                  disabled={store.busy}
                  onClick={() => void pick(wallet.uuid, wallet.name)}
                >
                  <span className="wallet-provider-icon">
                    {wallet.icon ? (
                      <img src={wallet.icon} alt="" width={28} height={28} />
                    ) : (
                      <WalletIcon size={16} />
                    )}
                  </span>
                  <span className="wallet-provider-copy">
                    <strong>{wallet.name}</strong>
                    <span>Identity and deposits</span>
                  </span>
                  <Chevron />
                </button>
              ))}
              {projectId ? (
                <button className="wallet-provider" type="button" disabled={store.busy} onClick={() => void pickWc()}>
                  <span className="wallet-provider-icon">
                    <WalletIcon size={16} />
                  </span>
                  <span className="wallet-provider-copy">
                    <strong>WalletConnect</strong>
                    <span>QR code</span>
                  </span>
                  <Chevron />
                </button>
              ) : (
                <div className="wallet-info-banner" role="note">
                  WalletConnect needs <code>VITE_WALLETCONNECT_PROJECT_ID</code>.
                </div>
              )}
            </div>
            <p className="wallet-fine">Keys live in this tab until Backup. Closing the tab without Backup deletes them.</p>
          </div>
        )}

        {view === "home" && (
          <div className="wallet-stack">
            <div className="wallet-hero">
              <p className="wallet-context">
                <span className="wallet-live-dot" aria-hidden="true" />
                {contextLabel}
                <span className="wallet-context-sep">·</span>
                {CHAIN_NAME}
              </p>
              <p className="wallet-balance">{balanceEth} ETH</p>
              <button
                className="wallet-address"
                type="button"
                onClick={() => void copy("address", displayAddress)}
                disabled={!displayAddress}
              >
                {displayAddress ? shortAddress(displayAddress) : "No address yet"}
                <Copy size={14} aria-hidden="true" />
                <span className="sr-only">{copied === "address" ? "Copied" : "Copy"}</span>
              </button>
              {copied === "address" && <p className="wallet-copied">Copied</p>}
            </div>

            {store.wallet && !store.walletOnDevnet && (
              <div className="wallet-alert bad" role="status">
                Browser wallet is on chain {store.wallet.chainId}.{" "}
                <button className="btn" type="button" disabled={store.busy} onClick={() => void store.switchWalletToDevnet()}>
                  Switch to {CHAIN_ID}
                </button>
              </div>
            )}

            <div className="wallet-actions">
              <button
                className="wallet-action primary"
                type="button"
                disabled={!account || store.busy}
                onClick={() => setView("send")}
              >
                <ArrowUpRight size={18} aria-hidden="true" />
                Send
              </button>
              <button className="wallet-action" type="button" disabled={store.busy} onClick={() => setView("receive")}>
                <ArrowDownLeft size={18} aria-hidden="true" />
                Receive
              </button>
              <button className="wallet-action" type="button" onClick={() => setView("signers")}>
                <KeyRound size={18} aria-hidden="true" />
                Signers
              </button>
              <button className="wallet-action" type="button" onClick={() => setView("backup")}>
                <Shield size={18} aria-hidden="true" />
                Backup
              </button>
            </div>

            <div className="wallet-status-grid">
              <StatusCard
                label="Browser"
                value={store.wallet ? shortAddress(store.wallet.address) : "Not connected"}
                icon={<WalletIcon size={14} />}
                onCopy={store.wallet ? () => void copy("browser", store.wallet!.address) : undefined}
                copied={copied === "browser"}
              />
              <StatusCard
                label="Frame signer"
                value={store.ownerAddress ? shortAddress(store.ownerAddress) : "—"}
                icon={<KeyRound size={14} />}
                onCopy={store.ownerAddress ? () => void copy("owner-home", store.ownerAddress!) : undefined}
                copied={copied === "owner-home"}
              />
              <StatusCard
                label="Account"
                value={account ? shortAddress(account) : "Not prepared"}
                icon={<Shield size={14} />}
                onCopy={account ? () => void copy("account", account) : undefined}
                copied={copied === "account"}
              />
              <StatusCard
                label="Session"
                value={store.live?.active ? "Active" : "Inactive"}
                icon={<Clock3 size={14} />}
              />
              <StatusCard
                label="Stake"
                value={store.live?.staked ? "Present" : "Absent"}
                icon={<Check size={14} />}
              />
            </div>

            {!store.deployed && (
              <button className="btn wallet-prepare" type="button" disabled={store.busy} onClick={() => void store.prepare()}>
                Prepare account
              </button>
            )}

            <div className="wallet-footer-links">
              <button className="wallet-text-btn" type="button" disabled={store.busy} onClick={() => void store.refreshWallet()}>
                <RefreshCw size={14} aria-hidden="true" />
                Refresh
              </button>
              {store.wallet ? (
                <button
                  className="wallet-text-btn"
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
                <button className="wallet-text-btn" type="button" onClick={() => setView("connect")}>
                  <WalletIcon size={14} aria-hidden="true" />
                  Connect browser
                </button>
              )}
            </div>

            {store.lastTxUrl && (
              <p className="wallet-fine">
                Last tx:{" "}
                <a href={store.lastTxUrl} target="_blank" rel="noreferrer">
                  Explorer
                </a>
              </p>
            )}
          </div>
        )}

        {view === "send" && account && (
          <div className="wallet-stack">
            <p className="wallet-lede">Send ETH from the Shepherd account. The owner frame signer approves the transfer.</p>
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
            <p className="wallet-fine">Available {store.portfolio?.accountEth ?? "0"} ETH</p>
            <button
              className="btn"
              type="button"
              disabled={store.busy || !isAddress(to) || !amount}
              onClick={() => setReviewSend(true)}
            >
              Review
            </button>
          </div>
        )}

        {view === "receive" && (
          <div className="wallet-stack">
            <div className="wallet-warn" role="status">
              <strong>Use fund(), not a plain transfer.</strong>
              <span>A plain transfer hits the VERIFY fallback and reverts.</span>
            </div>

            {account ? (
              <div className="receive-panel">
                <p className="wallet-section-label">Shepherd account address</p>
                <code className="receive-address">{account}</code>
                <div className="receive-actions">
                  <button className="btn" type="button" onClick={() => void copy("recv", account)}>
                    <Copy size={14} aria-hidden="true" />
                    {copied === "recv" ? "Copied" : "Copy address"}
                  </button>
                  <a className="btn-ghost receive-explorer" href={explorerAddress(account)} target="_blank" rel="noreferrer">
                    <ExternalLink size={14} aria-hidden="true" />
                    View on explorer
                  </a>
                </div>
              </div>
            ) : (
              <p className="wallet-lede">Prepare the account first. Until then you can fund the frame signer below.</p>
            )}

            <div className="wallet-info-banner" role="note">
              To add funds, use <code>fund()</code> or top up from your browser wallet / frame signer.
            </div>

            <div className="wallet-section">
              <h3>Get funds</h3>
              <p className="wallet-fine">
                Docs: there is no faucet. Shepherd funds you once from the published genesis key. Shared key → nonce
                collisions possible. Never use that key on a real network.
              </p>
              <div className="receive-actions">
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

            <div className="wallet-section">
              <h3>Top up account</h3>
              <label className="field">
                <span>Amount (ETH)</span>
                <input value={deposit} onChange={(event) => setDeposit(event.target.value)} inputMode="decimal" />
              </label>
              <div className="receive-actions">
                {account && store.wallet && (
                  <button
                    className="btn"
                    type="button"
                    disabled={store.busy || !deposit || !store.walletOnDevnet}
                    onClick={() => void store.depositFromBrowser(deposit)}
                  >
                    Top up from browser wallet
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
                <p className="wallet-fine">
                  Frame signer {store.portfolio.ownerEth} ETH
                  {store.portfolio.browserEth != null ? ` · Browser ${store.portfolio.browserEth} ETH` : ""}
                </p>
              )}
            </div>
          </div>
        )}

        {view === "signers" && (
          <div className="wallet-stack">
            <p className="wallet-lede">
              Three keys, three jobs. Your browser wallet address is not the Shepherd owner — injected wallets cannot
              sign EIP-8141 frame digests.
            </p>

            <SignerCard
              title="Browser wallet"
              purpose="Deposits and identity"
              address={store.wallet?.address}
              status={store.wallet ? "Active" : "Not connected"}
              icon={
                store.wallet ? (
                  <WalletIcon size={18} />
                ) : (
                  <WalletIcon size={18} />
                )
              }
              onCopy={store.wallet ? () => void copy("sig-browser", store.wallet!.address) : undefined}
              copied={copied === "sig-browser"}
            />
            <SignerCard
              title="Frame signer"
              purpose="Signs EIP-8141 digests in this tab"
              address={store.ownerAddress}
              status={store.ownerAddress ? "Owner" : "Missing"}
              icon={<KeyRound size={18} />}
              onCopy={store.ownerAddress ? () => void copy("sig-owner", store.ownerAddress!) : undefined}
              copied={copied === "sig-owner"}
            />
            <SignerCard
              title="Shepherd account"
              purpose="On-chain contract after Prepare"
              address={account}
              status={account ? "Ready" : "Not prepared"}
              icon={<Mark size={22} />}
              onCopy={account ? () => void copy("sig-account", account) : undefined}
              copied={copied === "sig-account"}
            />
            <SignerCard
              title="Session"
              purpose={`Agent path${store.live?.valueCapWei ? ` · cap ${formatEther(BigInt(store.live.valueCapWei))} ETH` : ""}`}
              address={store.sessionAddress}
              status={store.live?.active ? "Active" : "Inactive"}
              icon={<Clock3 size={18} />}
              onCopy={store.sessionAddress ? () => void copy("sig-session", store.sessionAddress!) : undefined}
              copied={copied === "sig-session"}
            />
            <SignerCard
              title="P256 co-signer"
              purpose="Second signature for high-risk"
              address={store.p256Address}
              status={store.p256Address ? "Registered" : "None"}
              icon={<Shield size={18} />}
              onCopy={store.p256Address ? () => void copy("sig-p256", store.p256Address!) : undefined}
              copied={copied === "sig-p256"}
            />

            <div className="receive-actions">
              {!store.ownerAddress && (
                <button className="btn" type="button" onClick={() => store.ensureOwner()}>
                  Create owner key
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
          </div>
        )}

        {view === "backup" && (
          <div className="wallet-stack">
            <div className="wallet-warn" role="status">
              <strong>Keys live in this tab until Backup.</strong>
              <span>
                Closing the tab without Backup deletes them. Browser wallets cannot sign frame calls. Never paste a
                mainnet key into an unsafe environment.
              </span>
            </div>
            {store.ownerBackedUp && (
              <div className="wallet-info-banner ok" role="status">
                This owner key is marked backed up in this tab. You can grant an agent.
              </div>
            )}

            <div className="wallet-section">
              <h3>Export</h3>
              <button
                className="btn wallet-dark-btn"
                type="button"
                onClick={() => {
                  const key = store.exportOwnerKey();
                  if (!key) {
                    store.ensureOwner();
                    return;
                  }
                  setExportShown(true);
                  void copy("export", key)
                    .then(() => store.markOwnerBackedUp())
                    .catch(() => setCopied(""));
                }}
              >
                {copied === "export" ? "Copied private key" : "Copy owner key"}
              </button>
              {exportShown && (
                <div className="receive-actions">
                  {!store.ownerBackedUp && (
                    <button className="btn-ghost" type="button" onClick={() => store.markOwnerBackedUp()}>
                      I have saved this key
                    </button>
                  )}
                  <button className="btn-ghost" type="button" onClick={() => setExportShown(false)}>
                    Hide
                  </button>
                </div>
              )}
              {exportShown && store.exportOwnerKey() && (
                <input readOnly value={store.exportOwnerKey() ?? ""} aria-label="Owner private key" />
              )}
            </div>

            <div className="wallet-or" aria-hidden="true">
              <span>OR</span>
            </div>

            <div className="wallet-section">
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
          </div>
        )}
      </Modal>
      <ReviewSheet
        copy={reviewSend && isAddress(to) ? sendReview(to as Address, amount) : null}
        busy={store.busy}
        error={store.error}
        onBack={() => {
          if (!store.busy) setReviewSend(false);
        }}
        onConfirm={() => {
          void store.sendEth(to as Address, amount).then((ok) => {
            if (ok) {
              setReviewSend(false);
              setAmount("");
              setView("home");
            }
          });
        }}
      />
    </>
  );
}

function StatusCard({
  label,
  value,
  icon,
  onCopy,
  copied,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  onCopy?: () => void;
  copied?: boolean;
}) {
  return (
    <div className="wallet-status-card">
      <div className="wallet-status-top">
        <span className="wallet-status-label">
          {icon}
          {label}
        </span>
        {onCopy && (
          <button className="wallet-icon-btn tiny" type="button" onClick={onCopy} aria-label={`Copy ${label}`}>
            {copied ? <Check size={12} /> : <Copy size={12} />}
          </button>
        )}
      </div>
      <strong>{value}</strong>
    </div>
  );
}

function SignerCard({
  title,
  purpose,
  address,
  status,
  icon,
  onCopy,
  copied,
}: {
  title: string;
  purpose: string;
  address?: string | null;
  status: string;
  icon: ReactNode;
  onCopy?: () => void;
  copied?: boolean;
}) {
  return (
    <article className="signer-card">
      <div className="signer-card-icon">{icon}</div>
      <div className="signer-card-body">
        <div className="signer-card-head">
          <strong>{title}</strong>
          <span className={`signer-pill${status === "Active" || status === "Owner" || status === "Ready" || status === "Registered" ? " ok" : ""}`}>
            {status}
          </span>
        </div>
        <p>{purpose}</p>
        <code>{address ? shortAddress(address) : "—"}</code>
      </div>
      {onCopy && address && (
        <button className="wallet-icon-btn" type="button" onClick={onCopy} aria-label={`Copy ${title}`}>
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
      )}
    </article>
  );
}

function Chevron() {
  return (
    <svg className="wallet-chevron" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
