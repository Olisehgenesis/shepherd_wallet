# Shepherd — agent brief

Read this before proposing changes, spawning sessions, or demoing the product. Prefer this file + `README.md` over inventing architecture.

## One-sentence product

Shepherd is a **Safe-for-agents wallet** on the public **alt mempool** (EIP-8141): a human keeps the **owner key**; an agent gets a separate **scoped session key** that can only pass `VERIFY` when target, selector, and value fit policy.

## Mental model

```
Human (owner key / browser wallet)
  └─ owns ShepherdAccount
       ├─ VERIFY empty data  → owner path (can deploy, stake, grant, revoke)
       └─ VERIFY 0x01 (+ session sig) → agent path
            └─ staticcall ShepherdPolicy (external storage)
                 ├─ canonical mempool → StorageReadNonSender (reject)
                 ├─ alt, unstaked     → reject
                 └─ alt, after stake  → can admit
```

**Anon-RPC** covers **browser `eth_*` reads** in the web console, and **MCP eth_* reads** when that console is open: a localhost bridge (`127.0.0.1:17814`) relays agent reads into the harness. Frame submissions always go clear to the mempool. The Node CLI demo path stays clear unless you opt into the bridge.

## Keys (never confuse these)

| Key | Who holds it | What it can do |
| --- | --- | --- |
| Owner / frame-signer EOA | Human (tab `sessionStorage` or `.shepherd-state.json`) | Owner-path frames: deploy, fund, grant, revoke, stake, co-sign |
| Browser wallet | Human (MetaMask / WC) | Identity + optional deposits; **cannot** sign EIP-8141 digests |
| Session key | Agent | Sign agent-path frames only if policy allows |
| Child session | Spawned agent (MCP) | Same, with cap/expiry ≤ parent; depth ≤ 3 |

No tool may return the owner key. Revoke is the kill switch (not wall-clock expiry alone — expiry frame data is elided from other VERIFY frames).

## Repo layout

| Path | Role |
| --- | --- |
| `contracts/` | `ShepherdAccount`, `ShepherdPolicy`, `ShepherdVault` |
| `packages/core/` | Frame codec, mirror, chain client, ops (`grant`, `stake`, `agentAct`) |
| `apps/web/` | Vite + React console + marketing site |
| `apps/ext/` | Shepherd Wallet browser extension (WXT) |
| `apps/agent/` | CLI: `demo`, `propose` |
| `apps/mcp/` | Local MCP: spawn / revoke / propose |
| `.shepherd-state.json` | Throwaway keys + deployed addresses (gitignored) |

## Devnet

- Chain id **1337**
- ethrex: `https://altmempool.forshtat.com`
- sidecar (alt): `https://altmempool.forshtat.com/rpc`
- Explorer: `https://explorer.altmempool.wtf/`
- Staking registry: `0xd51c04d7a0b01124e84de152f4e56d9eecb22d2f`
- Throwaway network — **may reset**. If stored contracts have no code, redeploy (demo CLI does this; console clears stale deploy).

**Funds:** docs say no public faucet. Shepherd funds once from the published shared genesis key (nonce collisions possible — retry). Never use that key on a real network. Plain ETH transfers to `ShepherdAccount` revert; use creation `value` or `fund()`.

## How signing works

1. **Owner frame** — VERIFY with empty data + SENDER call. Submitted on **ethrex** (`eth_sendRawTransaction` of type `0x06`). Used for grant / stake / revoke / owner sends.
2. **Agent frame** — VERIFY with `0x01` (or `0x02` if expiry attached) + session secp256k1 (+ optional co-sign) + SENDER call. Submitted on **alt** via `eth_sendFrameTransaction`.
3. **Local mirror** (`packages/core` mirror) checks session active, value cap, and policy rule **before** signing when the healthy agent path is used.

Policy modes in this build: allow (`ping`), high-risk (`sweep` needs co-sign), deny (everything else, including value to unknown targets).

## Web console flow

1. Connect wallet (optional identity) → Fund frame signer from shared genesis → **Prepare** (deploy policy/vault/account, set rules).
2. **Session** → issue / revoke / reveal once / register P256 co-signer.
3. **Mempool** → stake → send canonical (expect reject) → send alt (expect admit after stake).
4. **Intents** → ping / drain / sweep / co-sign.
5. **Reads** → Anon-RPC harness for balances/code when ready.

Ops log stores **method, route, verdict only** — no addresses, payloads, or keys.

## MCP tools (for Cursor / agents)

Prereq: `npm run demo` once so `.shepherd-state.json` has an account + root session. Then `npm run mcp`.

| Tool | Purpose |
| --- | --- |
| `shepherd_anon_status` | Is the console harness serving Anon reads to MCP? |
| `shepherd_posture` | Root session active? Account staked? (reads via Anon bridge when connected) |
| `shepherd_list_agents` | Spawned children (no owner key) |
| `shepherd_spawn_agent` | New session under `root` or a parent id; returns child `sessionKey` once |
| `shepherd_revoke_agent` | Revoke one child and descendants |
| `shepherd_propose_intent` | `ping` sign+submit if mirror allows; `drain` refuse; `sweep` NeedsCosign without co-signing |

Prereq for private MCP reads: `npm run dev` with `/console` open. Spawn rules: depth ≤ 3, eight children per parent, valueCap/expiry clipped to parent.

## Commands

```bash
npm install --registry https://registry.npmjs.org
npm run build:contracts
npm run test:contracts
npm run demo          # full path: fund → deploy/reuse → grant → canonical/alt/stake → ping/drain/sweep
npm run dev           # web at http://localhost:5173
npm run mcp           # stdio MCP
npm run agent -- propose
npm run test:scope
```

Healthy `npm run demo` ends with roughly:

- `canonical-storage` → `canonical-storage-read`
- `alt-unstaked` → `unstaked-storage-read` (if not yet staked)
- `stake` → `admitted`
- `in-policy` → `admitted`
- `injected` → `TargetDenied`
- `high-risk-wait` → `NeedsCosign`
- `high-risk-cosign` → `admitted`

## What Shepherd does **not** claim

- Not a fully private RPC (worker sees bodies; reference worker uses ordinary `fetch`).
- Not safe against a malicious Anon-RPC worker.
- Not a production multisig — owner path can call anything.
- Browser wallets cannot sign frame digests — frame signer is generated in-tab / in state file.
- Hegota opcode helpers are the workshop shim, not audited mainnet code.

## Guidance for coding agents

- Preserve the owner/session split and the ops-log redaction rules.
- Prefer `packages/core` for chain/frame logic; keep UI thin.
- After a public reset, expect empty `eth_getCode` on old addresses — redeploy, don’t decode `"0x"` as ABI success.
- Owner frames → ethrex; agent demo contrast → alt vs canonical as above.
- Do not add trackers, font CDNs that phone home, or log secrets.
- Demo script notes: `DEMO.md`. Decision record: `RESEARCH.md`.
