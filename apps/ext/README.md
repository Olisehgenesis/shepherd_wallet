# Shepherd Wallet — browser extension (`apps/ext`)

MV3 wallet (WXT + React). **Doors** = any EIP-6963 / injected wallet (MetaMask, Rabby, …) for unlock/onboard. **Shepherd keys** = what dApps get via EIP-1193 + EIP-6963.

## Load in Chrome

```bash
# from repo root
npm run dev:ext
```

1. Open `chrome://extensions` → Developer mode → **Load unpacked**
2. Select `apps/ext/.output/chrome-mv3-dev`
3. Pin **Shepherd Wallet**, open popup
4. Create wallet (optional door on an https tab), then pick Shepherd in any dApp wallet modal

## Layout

| Path | Role |
| --- | --- |
| `entrypoints/popup` | Rabby-style UI, PostHog orange/cream tokens |
| `entrypoints/background` | Vault + provider RPC |
| `entrypoints/content` + `inpage` | Inject EIP-1193 / EIP-6963; door discovery in page world |
| `lib/` | Storage, keys, chain RPC |

## Model

- Door wallets never receive Shepherd private keys.
- dApps talk only to Shepherd (`wallet.shepherd.eth`).
- Chain: alt mempool devnet `1337`.

## Next

1. Wire `@anon-rpc/browser-extension-harness` for private reads.
2. Approval sheet for `eth_sendTransaction` / `personal_sign`.
3. Frame submit path for writes.
