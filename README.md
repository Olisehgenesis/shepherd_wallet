# Shepherd

A frame-transaction account for agents.

The human keeps the owner key. The agent gets a separate, scoped session key.

The agent’s spend only clears when an EIP-8141 `VERIFY` frame says the target,
selector, and value are in policy. That policy lives in another contract, so
the canonical mempool rejects the validation read (`StorageReadNonSender`) and
a staked alt-mempool entity is what admits it (ERC-8421).

Prize: **Best use of the Frame Transaction Alternative Mempool**
(Ethereum Foundation). Anon-RPC is wired for agent reads and documented under
CROPS. It is not a second prize submission.

## What judges should see

| Step | What happens |
| --- | --- |
| In-policy `ping`, after stake | `admitted` + explorer link |
| Injected value transfer | `TargetDenied` |
| High-risk `sweep` | `NeedsCosign`, then `admitted` after the owner co-signs |
| Canonical vs alt | `canonical-storage-read` → `unstaked-storage-read` → `admitted` after stake |

`npm run demo` walks that path on the public alt-mempool devnet (chain 1337).

## How a frame is decided

1. Agent path `VERIFY` data is `0x01` (or `0x02` with the expiry verifier as frame 0).
2. The account resolves the session signer, then reads `ShepherdPolicy` via `staticcall`.
3. Canonical rules reject that external slot. Unstaked alt-mempool rejects it too.
4. After `addStake`, the alt mempool admits the same frame.
5. `ShepherdRules` then checks: session active, target+selector allowed, value ≤ cap, high-risk needs a second protocol signature (owner or registered P256).
6. Only then `approve(EXECUTION_AND_PAYMENT)`.

Owner path (empty `VERIFY` data) does not read the policy, so the human can
stake and manage keys while unstaked. Revoke is the kill switch. `TIMESTAMP`
is not used in validation (OP-011).

## Contracts

- `ShepherdAccount` — EIP-8141 account; `fallback` is the `VERIFY` frame
- `ShepherdPolicy` — external allowlist (0 deny / 1 allow / 2 high-risk)
- `ShepherdRules` — opcode-free verdicts
- `ShepherdVault` — demo target (`ping` allowlisted, `sweep` high-risk)

## Layout

- `contracts/` — account, policy, rules, vault, Foundry tests
- `packages/core/` — frame codec, policy mirror, devnet client
- `apps/web/` — ops console (`/console/mempool` is the canonical-vs-alt page)
- `apps/agent/` — `propose` → mirror → sign-within-policy
- `apps/mcp/` — spawn child sessions (clipped to the parent; no owner key)
- `DEMO.md` — two-minute recording script
- `RESEARCH.md` — sources and decision record

## Setup

Node 20.12+, Foundry, path to the public devnet. No API keys.

```bash
npm install --registry https://registry.npmjs.org
npm run build:contracts
npm run test:contracts
npm run demo
npm run dev
```

App: http://localhost:5173 — start at `/how` and `/console/mempool`.

## CROPS (supporting, not the headline)

- **Censorship resistance** — the product is the stake-to-admit path above.
- **Open source** — MIT. No tracker, no analytics, no font CDN.
- **Privacy** — browser chain reads go through `@anon-rpc/browser-harness` by default. This is not a fully private RPC: the worker can see request bodies and does not unlink your IP; submissions stay on the clear gateway; CLI reads are clear and labeled.
- **Security** — the agent never holds the owner key. Bad target, over-cap value, revoked session, or unsigned high-risk call reverts before APPROVE.

## What this does not claim

- Not a smarter trading/grocery agent. It is a leash for an agent.
- Not a fully private RPC.
- Not safe against a malicious Anon-RPC worker.
- Not a production multisig. The owner path (empty VERIFY) can call anything.
- `ShepherdVault.sweep` does not move funds; it is a high-risk demo selector.
- Hegota helpers are the devnet shim, not audited mainnet code.

## Devnet

| | |
| --- | --- |
| ethrex (execution) | `https://altmempool.forshtat.com` |
| sidecar (mempool) | `https://altmempool.forshtat.com/rpc` |
| Chain id | **1337** |
| Explorer | `https://explorer.altmempool.wtf/` |
| Staking registry | `0xd51c04d7a0b01124e84de152f4e56d9eecb22d2f` |

Throwaway network. May reset. Fund contracts with creation value or `fund()`; a plain transfer to `ShepherdAccount` hits `fallback` and reverts.

**Getting funds.** There is **no faucet**. One genesis account is funded on purpose. Shepherd’s “Fund …” buttons and `npm run demo` transfer 1 ETH from that shared key over ethrex. Everyone shares the key, so nonce collisions can happen — retry. Never use it on a real network.
