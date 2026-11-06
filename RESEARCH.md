# Shepherd research checklist and architecture decision record

Checked before product code. Primary sources win over blogs. Dates are as read on 5 Nov 2026.

## Checklist

- [x] **EIP-8141** — [eips.ethereum.org/EIPS/eip-8141](https://eips.ethereum.org/EIPS/eip-8141)
- [x] **Alt mempool docs + workshop** — [docs.altmempool.wtf](https://docs.altmempool.wtf/), [forshtat/mempool-workshop](https://github.com/forshtat/mempool-workshop)
- [x] **Public vs alt limits** — ERC-8421 draft (ethereum/ERCs PR 2028) and the workshop’s implemented profile
- [x] **Anon-RPC** — [ethereum.github.io/anon-rpc](https://ethereum.github.io/anon-rpc/) and `@anon-rpc/browser-harness@0.4.0`
- [x] **Injection threat model** — mapped below
- [x] **Prior art** — Coinbase Agentic, Privy, MetaMask ERC-7715-style agent wallet, ZeroDev session keys, Zodiac Roles
- [x] **Mumbai deadline** — Saturday 7 Nov 2026, 09:00 IST, Hacker Dashboard. One EF prize slot. Lead with alt mempool; Anon-RPC is the second qualification inside that same EF prize (a partner with multiple tracks counts as one prize).
- [x] **Design research** — PostHog product tokens, not brand marks
- [x] **This ADR** — decisions below, written before contracts and UI

## What the protocol actually does

A frame transaction (type `0x06`) is a list of frames plus a signature list. Modes: `DEFAULT` 0, `VERIFY` 1, `SENDER` 2. `VERIFY` is static except `APPROVE` (`0xaa`). Failure to `APPROVE`, or a reverting `VERIFY` frame, makes the transaction invalid. `SENDER` frames run with `tx.sender` as the caller.

`VERIFY` frame `data` is elided from the signature hash and from other frames: `FRAMEDATALOAD` returns zero, `FRAMEDATACOPY` copies nothing, `FRAMEPARAM` data-length returns 0. A `VERIFY` frame can still read **non-VERIFY** frames (`FRAMEPARAM`, `FRAMEDATALOAD`). That is how the account sees the call the agent is about to make.

Signature schemes: `ARBITRARY` 0, `SECP256K1` 1 (`v || r || s`, 65 bytes, `v` is 0 or 1), `P256` 2 (`r || s || qx || qy`, signer must be `keccak256(qx || qy)[12:]`). Protocol checks these **before** frames run. Raw secp256k1 and P256 bytes are not visible to EVM; code sees the resolved signer via `SIGPARAM`.

Expiry is a `VERIFY` frame aimed at `EXPIRY_VERIFIER` (`0x81413f0cF12e9b6a49B1D0439E081c577D57FfFf`) with an 8-byte big-endian timestamp and flags `0`. `TIMESTAMP` is banned in validation except inside that canonical runtime. Because the expiry frame is itself `VERIFY`, **our account cannot read the timestamp** (data elision). We can only see that frame 0’s target is the expiry verifier.

Opcodes are not in stock solc. The workshop’s `@forshtat/hegota-support@0.0.1` exposes them as `staticcall` / `delegatecall` helpers (`HegotaSupport`, devnet `ERC8421_WORKSHOP`). Constructor deploys one helper per opcode (7 on this devnet), so a new account’s nonce starts at 8. Helpers are not audited production code; they are the devnet’s compiler shim.

## Mempool limits (do not conflate the two documents)

| Limit | Canonical EIP-8141 | ERC-8421 draft | Workshop sidecar (what the devnet runs) |
| --- | --- | --- | --- |
| Verify execution gas | 100,000 total | 100,000 unstaked / 1,000,000 staked per entity | 100,000 unstaked, plus a separate staked budget. Landing-page 250k/2.5M figures are explicitly TBD and disagree with the draft |
| Storage during validation | Sender’s own storage only. External read → `StorageReadNonSender` | Sender storage always (`STORAGE-010`). Associated slots in other contracts if the sender exists (`STORAGE-021`). Staked entity may read any non-entity storage (`STORAGE-032`) | Same shape: unstaked external read rejected; staked read admitted (workshop steps 6–8) |
| Environment opcodes | Banned in the prefix, except the canonical expiry runtime | Same (`OP-011` family) | `TIMESTAMP`, `NUMBER`, `BALANCE` banned for everyone. A contract’s own `BALANCE` needs stake |
| Writes in the prefix | Not in the four recognized shapes | `deploy` and `pre_verify` only | Same idea |
| Keyed nonces | Linear nonce | EIP-8250: 4 pending per `(sender, key)`, 64 pending per unstaked sender | Workshop step 12: keyed nonces do not bump the account nonce. Per-sender cap differs from the draft (see docs “Spec and implementation differences”) |
| Stake | n/a | ~USD 1000, 1 day unstake delay, registry per chain | Devnet `NaiveStakingRegistry` `0xd51c04d7a0b01124e84de152f4e56d9eecb22d2f`, min stake 0.01 ETH, workshop uses 0.012 ETH and 86400s. `addStake(uint32)` payable; `getDepositInfo(address)` |

Devnet (throwaway, chain id **1337**): docs list ethrex `https://altmempool.forshtat.com` and sidecar `https://altmempool.forshtat.com/rpc` ([Public devnet](https://docs.altmempool.wtf/guides/devnet/)). Workshop config still points at `https://altmempoolgateway.forshtat.com/rpc`. Explorer `https://explorer.altmempool.wtf/`. **No faucet** per docs — fund from the published genesis key in `mempool-workshop-sidecar/deploy/devnet/genesis.values.env` (`0x5544…6816f9`). Workshop `step_1_check` still calls `skandha_explorer_faucet` when present. Plain transfers to brand-new accounts need ≥204.6k gas (250k comfortable). Fund Shepherd contracts via creation `value` or `fund()`; plain transfer hits `fallback` and fails. CORS is permissive.

`eth_sendFrameTransaction` is the alt mempool. `eth_sendRawTransaction` of the `0x06` payload is forwarded to ethrex and judged by the **canonical** rules. That split is the demo.

Profile string for the codec: `ethrex-eip8141-tracer`.

## Anon-RPC trust model (honest)

`@anon-rpc/browser-harness` loads a worker whose `keccak256` must equal `workerHash()` on a specifier contract, inside a null-origin sandboxed iframe. The worker cannot touch wallet keys, DOM, cookies, or host storage.

It **does** see every request body routed through it, including anything we foolishly put there, and it produces the responses the app trusts. A malicious worker can observe, censor, or lie. The reference specifier used in the wallet guide (`0x4fd77be300f31c5fe6ab266d35d27750a3478d27` on mainnet) is the **minimal reference worker**: it fulfils calls with ordinary `fetch`. That demonstrates sandboxing and hash pinning, **not** IP unlinkability. KPS pins a peer by certificate hash; it does not hide the body from the worker.

The bootstrap `eth_call` that reads the specifier is not anonymized. Node has no official harness (browser-only today). Shepherd will not claim a fully private RPC.

## Injection threat model

| Threat | What goes wrong | What stops it |
| --- | --- | --- |
| Prompt or memory injection | Agent builds calldata to an attacker target or a huge `value` | `VERIFY` reads the `SENDER` frame’s target, selector, and value and reverts before `APPROVE`. The tx is invalid. The LLM is not in the trust path |
| Confused deputy | Agent is a legitimate signer but is asked to call outside the allowlist | Allowlist is storage in `ShepherdPolicy`, not a prompt. Signer address ≠ permission |
| Stolen agent key | Attacker holds the session key | Value cap, allowlist, high-risk co-sign, owner `revokeSession`. The key is not the owner key |
| Gas grief | Fat `VERIFY` to clog the mempool | Prefix gas is capped (100k unstaked). We set a tight execution limit. External reads are the staked entity’s reputation problem, which is the point of ERC-8421 |
| Dashboard leak | Logs become a second exfiltration channel | UI logs store method, route, verdict code. No addresses, payloads, or keys |
| Fake privacy | User thinks the RPC operator is blind | UI states that the worker sees bodies and that the reference worker does not unlink IP |

## Prior art and the gap

| System | Enforcement | Gap Shepherd is for |
| --- | --- | --- |
| Coinbase Agentic Wallets | Spending limits in a TEE / Coinbase stack | Not on-chain. Not frame transactions. Custodial-infra shaped |
| Privy agentic wallets | Off-chain policies; agent or user holds a signer | A compromised policy engine or host can sign anything the key can sign |
| MetaMask agent wallet / ERC-7715 style permissions | Wallet-side session caveats, Guard Mode 2FA | Enforcement is in the wallet client, and the product is MetaMask-specific. Public mempool still can’t run a rich `VERIFY` |
| ZeroDev Kernel session keys | ERC-4337 validation on an EntryPoint | Needs a bundler. Validation is not an EIP-8141 `VERIFY` frame. External storage hits ERC-7562 the same way, but there is no frame-tx alt mempool story |
| Zodiac Roles | On-chain role module on a Safe | Closest cousin. Still a module call into a Safe, not protocol `APPROVE`. No anon RPC, no alt-mempool stake distinction |

Shepherd’s difference: the human owner key never enters the agent; the only signature the agent can produce is a scoped secp256k1 session; the account’s `VERIFY` frame is what admits the tx; the allowlist lives in another contract so the **canonical** mempool rejects it and the **staked alt** mempool accepts it.

## Design research (layout only)

Sources: PostHog handbook `contents/handbook/brand/visual-identity.md` and `frontend/src/styles/base.scss` (PostHog/posthog, commit `723d2a3f`). No logos, wordmarks, hedgehogs, or RoundHog/Squeak assets are copied.

Tokens we lock (derived, not a theme clone):

- Page olive-grey `--color-posthog-3000-50` → `hsl(75 14% 95%)` (`#f4f5f0`)
- Raised card white `#ffffff`; secondary fill `hsl(70 16% 93%)`
- Text near-black olive `#1d1f1c`; muted `hsl(67 8% 40%)`
- Brand action orange `hsl(19 100% 48%)` (`#f54e00`), handbook primary. Used only for brand actions
- Danger is a **different** red: handbook and product `--danger: #db3707`. Never use the brand orange as an error
- Radius 8px on cards (Lemon surfaces), 6px on controls
- Font: system `ui-sans-serif` stack. PostHog’s product face is licensed; we do not embed it or call a font CDN
- Density: 220px sidebar, 13–14px table type, chips for status, one primary button per card

## ADR (one page)

**Context.** ETHGlobal Mumbai EF prize, deadline 7 Nov 2026 09:00 IST. We can submit one EF prize. The demo must show a frame tx the canonical mempool refuses and the alt mempool admits, plus Anon-RPC reads with an honest trust story.

**Decision.**

1. `ShepherdAccount` is an EIP-8141 account (`HegotaSupport`, profile `ERC8421_WORKSHOP`). `fallback` is the `VERIFY` frame.
2. **Owner path** (`VERIFY` data empty): protocol secp256k1 signer must be `owner`. No external `SLOAD`. Used to stake, grant, and revoke. Fits the unstaked canonical budget.
3. **Agent path** (`VERIFY` data `0x01`): signer must be an active session. The account `staticcall`s `ShepherdPolicy`, which `SLOAD`s a slot keyed by `keccak256(abi.encode(target, selector))` — not associated with the sender. That is legal for a **staked** alt-mempool entity (`STORAGE-032`) and illegal for the canonical mempool (`StorageReadNonSender`). Rules: `0` deny, `1` allow, `2` high-risk.
4. High-risk requires a second protocol signature whose resolved signer is the owner or a registered P256 address (`keccak256(qx||qy)[12:]`). Value above the session cap is a hard deny, not a co-sign prompt.
5. No `TIMESTAMP` in our `VERIFY` code (`OP-011`). Session `expiry` is stored and shown in the UI, and agent txs attach an expiry frame when that contract has code. The account checks the frame’s **target**, not the hidden timestamp. **Revoke** is the kill switch that actually works inside `VERIFY`.
6. The agent binary holds only the session key. It proposes, mirrors the policy locally, asks the devnet to simulate, and signs only on `allow`. The chain still re-checks.
7. Browser reads go through the Anon-RPC harness by default. Submissions stay on the clear gateway: the mempool must see the tx, and we do not pretend otherwise. The meter is `anon / (anon + clear)` with the reference-worker caveat on screen.
8. Wallets: EIP-6963 for discovery (not `window.ethereum` only) plus an in-browser owner key and a P256 co-signer, because injected wallets cannot sign the raw frame hash. WalletConnect is off unless `VITE_WC_PROJECT_ID` is set. No new accounts, no paid infra.
9. Prize placement: **Best use of the Frame Transaction Alternative Mempool**. Anon-RPC is wired for real and documented under CROPS so the same EF submission qualifies, without spending a second partner slot on a weaker fit.
10. Out of scope until the demo path mines: daily gas tank, keyed-nonce fan-out, MCP server, Node harness.

**Consequences.** A fresh account cannot run the agent path until it has staked, because the agent path is the storage read. Stake uses the owner path. If the devnet’s staked verify budget is only 100k, the agent `VERIFY` execution limit must stay under that budget after signature gas (2,800 per secp256k1, 6,700 for P256). We start at 80,000 execution gas and tune against `eth_sendFrameTransaction` errors.
