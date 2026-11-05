# Shepherd

A Safe-for-agents wallet for the alt mempool. A human keeps the owner key. The agent gets a separate session key. The account’s EIP-8141 `VERIFY` frame allowlists the target and the selector, caps value, and demands a second signature for high-risk calls. The allowlist lives in another contract, so the canonical mempool rejects the validation read and a staked alt-mempool entity is admitted.

Prize fit: **Best use of the Frame Transaction Alternative Mempool** (one Ethereum Foundation prize). Anon-RPC is wired for real and documented under CROPS. It is not a second prize submission.

## CROPS

- **Censorship resistance.** The agent path `staticcall`s `ShepherdPolicy` during `VERIFY`. Canonical rules return `StorageReadNonSender`. The unstaked alt mempool rejects the same read. After `addStake` on the devnet registry, the alt mempool admits it. That is the product, not a private relay.
- **Open source.** MIT. No tracker, no analytics script, no font CDN. Build and demo steps are in this file.
- **Privacy.** Browser chain reads go through `@anon-rpc/browser-harness` by default. The worker cannot touch keys, cookies, or the DOM. It **can** see every request body, and the reference specifier (`0x4fd77be300f31c5fe6ab266d35d27750a3478d27`) fulfils calls with ordinary `fetch`, so it does not unlink your IP. The one mainnet bootstrap read is not anonymized. Submissions stay on the clear gateway because the mempool has to see them. The ops log stores method, route, and verdict. It does not store addresses, payloads, or keys. There is no Node harness; the CLI’s reads are clear and labeled as such.
- **Security.** The agent never holds the owner key. `VERIFY` reverts before `APPROVE` on a bad target, a value above the session cap, a revoked session, or a high-risk call without a second protocol signature (owner secp256k1 or a registered P256 key). `TIMESTAMP` is not used in validation (`OP-011`). The expiry frame’s data is hidden from other `VERIFY` frames, so a wall-clock check inside the account is impossible. **Revoke** is the kill switch. An attached expiry frame is enforced only when that contract has code, and only by its target, not by a timestamp the account can see.

## What this does not claim

- Not a fully private RPC.
- Not safe against a malicious Anon-RPC worker (it can censor or lie about reads).
- Not a production multisig. Owner-path transactions (empty `VERIFY` data) can call anything. That path is the human.
- Hegota opcode helpers are the devnet shim (`@forshtat/hegota-support`), not audited mainnet code.
- Injected wallets are discovered with EIP-6963, so the dashboard is not MetaMask-only. They cannot sign an EIP-8141 digest, so frame signatures use a key generated in the tab. WalletConnect needs a project id from a new account and is not wired.

## Layout

- `contracts/` — `ShepherdAccount`, `ShepherdPolicy`, `ShepherdVault`, rule tests
- `packages/core/` — frame codec, policy mirror, devnet client
- `apps/web/` — ops dashboard
- `apps/agent/` — `propose` → mirror → sign-within-policy
- `RESEARCH.md` — sources and the decision record
- `DEMO.md` — two-minute recording script

## Setup

Node 20.12+, Foundry, and a network path to the public devnet. No API keys.

```bash
npm install --registry https://registry.npmjs.org
npm run build:contracts
npm run test:contracts
npm run demo
npm run dev
```

`npm run demo` writes throwaway devnet keys to `.shepherd-state.json` (gitignored). It asks the public faucet once, deploys, grants a session, shows the canonical rejection, the unstaked alt rejection, stakes 0.012 ETH, admits an in-policy ping, rejects a drain, waits on a high-risk sweep, then admits that sweep with the owner as co-signer. The admitted line includes an explorer URL.

`npm run agent -- propose` is the small agent loop. It reads only the session key from that state file and submits an in-policy ping when the mirror says allow.

The dashboard (http://localhost:5173) repeats those steps with buttons. Chain reads on the Reads page use the harness. If the harness fails, reads stay blocked. There is no silent clear-RPC fallback.

## Demo map

| Step | What you should see |
| --- | --- |
| In-policy ping, after stake | `admitted` and an explorer link |
| Injected value transfer | `TargetDenied` |
| High-risk `sweep` | `NeedsCosign`, then `admitted` after the owner co-signs |
| Reads | anon share of `eth_*` reads near 100% |
| Canonical vs alt | `canonical-storage-read`, then `unstaked-storage-read`, then `admitted` after stake |

## Trade-offs

- External policy storage is what makes the alt mempool necessary. It also means the agent path cannot run until the account has staked, because an unstaked entity may not read that slot. Staking uses the owner path, which does not touch the policy.
- Verify gas is set to 90,000 execution for the agent path so one secp256k1 signature (2,800) stays under the 100,000 unstaked budget. A P256 co-sign costs 6,700 more. If the devnet’s staked budget is only 100,000 and a trace blows the cap, lower the execution limit or drop the expiry frame.
- Keyed nonces, a gas tank, and a Node Anon-RPC harness are not in this build. One session key is enough to show revoke, the cap, and the co-sign.
- High-risk detection is a flag in the policy contract, not a model score.

## Devnet

Gateway `https://altmempoolgateway.forshtat.com/rpc`, chain id 1337, explorer `https://explorer.altmempool.wtf/`, staking registry `0xd51c04d7a0b01124e84de152f4e56d9eecb22d2f`. The network is throwaway and may reset. Fund contracts with creation value or `fund()`; a plain transfer hits `fallback` and reverts.
