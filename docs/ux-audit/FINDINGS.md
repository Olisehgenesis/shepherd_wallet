# Shepherd Wallet — Usability & Visual Design Audit

**Method:** Operated the live Vite app at `http://localhost:5173` with Playwright Chromium (desktop 1280×800, mobile 390×844). Frame-signer path used (no MetaMask in this environment). Public alt-mempool / ethrex (chain 1337) used for prepare/grant/revoke. **No Shepherd source was modified.**

**Artifacts**
- Screens: `/workspace/shepherd-ux-audit/screens/{desktop,mobile}/`
- Journey shots + logs: `/workspace/shepherd-ux-audit/journeys/` (`SETUP2_LOG.json`, `JOURNEY_RESULTS.json`)
- Annotated problems: `/workspace/shepherd-ux-audit/annotated/`
- Redesign mockups: `/workspace/shepherd-ux-audit/mockups/`
- References: `/workspace/shepherd-ux-audit/references/` (Linear refresh assets, Privy onboarding notes, Stripe/Ramp/Raycast/Phantom/Safe research notes)

---

## 1. Overall usability score: **3.5 / 10**

**Justification (observed):** A motivated developer can create a frame signer, prepare an account (~36s with opaque loading), grant a session, edit policy, spawn from Agents, and revoke. But the product constantly **lies about state** (Overview still says “START BY CONNECTING A WALLET” after Account · 0x… with 0.04 ETH), **misuses words** (“Connected” means key revealed; “Reveal once” works twice), **skips safety** (Revoke has no confirm), and **reads like a prize demo** (Intents subtitle: “Demo buttons stay for the prize walkthrough”). Ten console destinations, sideways mobile nav, and jargon (TTL, P256, Mode 0/1/2, EIP-8141) block a first-time visitor from forming a correct mental model of **you (owner) vs agent (session)**.

A production agent-privacy wallet should feel calm and honest. This feels like a hackathon console with a marketing coat.

---

## 2. Product-experience answers (from using it)

| Question | Answer from use |
|---|---|
| Can a new user understand Shepherd without docs? | **No.** Landing leads with “Privacy infrastructure for agent calls” / EIP-8141. Owner vs agent is clearer on `/how`, not on first paint. |
| Owner vs agent understandable? | **Partially after /how.** Console never names “you” vs “your agent” on Overview; both keys live in one tab. |
| Wallet keys vs session keys distinguished? | **Weak.** Modal shows Frame signer vs Account vs Session tiles, but header still pushes “Connect wallet”. “Connected yes (key handed off or used)” conflates network connect with key reveal. |
| Exact agent permissions clear? | **Only on Policy after prepare.** Modes are `allow` / `high-risk` / numeric 0/1/2. Agents page shows addresses, not a permission summary. |
| Approval process safe & understandable? | **Incomplete in this run.** Approvals empty-state copy is clear (“when an agent proposes a high-risk call”). High-risk demo path not fully completed to a pending sheet; Intents offers “High-risk, wait” and “Co-sign and send” without a review step. |
| Does revoke communicate what happens? | **Poorly.** No confirm. Tiny “Revoking the session” spinner above the title. Limits still showed Status active while revoking; ops log eventually showed `revokeSession admitted:included`. |
| Privacy without misleading promises? | **Trust page is relatively honest.** Landing/console still show “100% anon reads” while Trust admits worker sees bodies and IP is not unlinked — mixed signals. |
| One coherent product? | **No.** Marketing voice, console prize notes, MCP footnotes, and wallet modal feel like three products. |

---

## 3. Journey results (12)

| # | Journey | Result | What was observed |
|---|---|---|---|
| 1 | Discover | **Pass** | `/` loads; hero + promises + fake console table. Friction: jargon, “no fake scores”, Connect before understanding. Shot: `journeys/j01_landing.png`, `screens/desktop/landing__default.png` |
| 2 | Understand | **Partial pass** | `/how` explains owner vs agent VERIFY paths; `/docs` is usable; `/trust` is candid. Still too long for a casual visitor. Shots: `j02_*.png` |
| 3 | Connect / create signer | **Pass** | Wallet modal: no EIP-6963 wallet; WalletConnect needs env; **Create frame signer** works. Shot: `setup_02_wallet_connect_view.png`, `s2_01_created.png` |
| 4 | Prepare account | **Pass (slow/opaque)** | Prepare lives **inside Wallet modal**, not Overview. Loading ~30–40s (“Funding…”). Success → Account `0x19c5…731f`. Shot: `s2_04_prepared.png` |
| 5 | Grant session | **Pass with state bugs** | Issue session key → `grantSession admitted:included`. UI lagged on “NO ACTIVE SESSION” / Status inactive during grant; later showed SESSION ACTIVE. Reveal twice worked. Shots: `s2_08_issued.png`, `s2_09_reveal1/2.png` |
| 6 | Configure permissions | **Pass** | Policy shows vault.ping allow + vault.sweep high-risk; add form + Save on-chain. Mode numbers in copy. Shot: `s2_10_policy.png` |
| 7 | Spawn child | **Pass (UI)** | Spawn child control present; tree shows root. Spawn clicked (`s2_12_spawned.png`). |
| 8 | Allowed tx (ping) | **Partial** | Intents shows In-policy ping + Submit. Demo path exercised; full admission verdict not always captured in follow-up shots. Prize subtitle visible. `s2_13_intents.png`, `s2_14_ping_*` |
| 9 | Prohibited (drain) | **Partial** | “Submit injected drain” control present and clicked. Clear rejected/denied banner not strongly captured in text log. |
| 10 | High-risk approval | **Partial / blocked** | “High-risk, wait” / Approvals empty states observed; pending co-sign sheet not fully walked to Approve. |
| 11 | Revoke | **Pass functionally, fail safely** | Revoke **no confirmation**. Spinner “Revoking…”. Ops: `revokeSession`. `s2_16_*.png` |
| 12 | History + privacy | **Partial** | Activity/Reads/Trust opened. Ops log dominates; activity sparse/session-local. Reads fetch UI unclear on result display. Trust honest. |

---

## 4. Prioritized issues

### Functional bugs (does the wrong thing / lies)

| Sev | Issue | Page / component | Screenshot | Harm | Fix |
|---|---|---|---|---|---|
| **Critical** | Overview still titled **START BY CONNECTING A WALLET** after Account prepared + balance shown | Overview card | `annotated/04_overview_still_connect.png` | User thinks setup failed; ignores Stake/Grant | Drive card from real posture: next unfinished step only |
| **Critical** | **“Reveal session key once”** remains clickable; key stays in tab | Session | `annotated/06_reveal_key_once.png` | False security; key reuse risk | One-shot UI + clear “key is in this tab until revoke/refresh” |
| **Critical** | **“Connected”** means key handed off/used, not a live wallet link | Session status line | `SETUP2_LOG.json` / session shots | User thinks MetaMask is linked | Rename to “Key revealed” / “Session active” |
| **High** | **Revoke has no confirmation** | Session Revoke | `annotated/08_revoke_no_confirm.png` | Accidental kill of agent | Confirm sheet: what stops, what keys wipe |
| **High** | Session UI **conflicts during grant** (Granting… + NO ACTIVE SESSION + grant admitted) | Session | `annotated/05_session_state_conflict.png` | User retries Grant / thinks failure | Single source of truth; disable conflicting CTAs |
| **High** | Intents **“Review and send” pattern absent** — Submit / demo buttons fire | Intents | `annotated/07_intents_prize_copy.png` | No chance to inspect calldata | Real review step then Send (see mockup 06) |
| **Medium** | Prepare success feedback buried in modal status tile; Overview doesn’t advance | Wallet modal / Overview | `s2_04_prepared.png`, `s2_05_overview.png` | Lost users | Toast + Overview next step |
| **Medium** | Receive warns `fund()` vs plain transfer; easy to lose funds | Wallet → Receive | `annotated/11_receive_no_qr.png` | Fund loss | Block plain-transfer UX; show QR to correct deposit path |

### Usability problems (works, but humans fail)

| Sev | Issue | Page | Screenshot | Harm | Fix |
|---|---|---|---|---|---|
| **Critical** | First-run CTA is Connect wallet; actual path is Create frame signer under “OR CONTINUE…” | Wallet modal | `annotated/03_wallet_connect_modal.png` | Abandonment without MetaMask | Lead with Create owner key when no extension |
| **Critical** | **10 console nav items** before first success; mobile = horizontal strip | Console shell | `annotated/02_*.png`, `annotated/10_mobile_nav_overflow.png` | Cognitive overload | 4 destinations: Home, Agents, Activity, You |
| **High** | Prepare only inside Wallet modal; Overview empty-states point to Overview | Session/Policy gates | `j05_session_empty.png` | Circular hunting | Put Prepare on Overview step card |
| **High** | Prize / judge copy in product UI | Intents subtitle | `annotated/07_intents_prize_copy.png` | Unprofessional; confuses demo vs product | Delete; move demos under You → Demo |
| **High** | Policy Mode 0/1/2 and selector hexes as primary language | Policy | `annotated/12_policy_modes.png` | Can’t state permissions in plain words | Allow / Needs co-sign / Deny; advanced drawer for hex |
| **High** | TTL shown as if enforced; revoke is real stop | Session | session shots | False sense of auto-expiry | Label TTL “shown; revoke stops” until enforced |
| **Medium** | Landing “Three promises. No fake scores.” | Landing | `annotated/01_landing_jargon.png` | Nonsense claim | Cut |
| **Medium** | “100% anon reads” badge vs Trust caveats | Console header | console shots | Overclaim | Match Trust wording |
| **Medium** | Agents = address tree, no human name | Agents | `annotated/09_agents_tree.png` | Not “my agents” | Named rows + permission summary |
| **Low** | Ops log on every page dominates attention | All console | many | Noise | Collapse; Activity owns history |

### Visual design problems

| Sev | Issue | Where | Screenshot | Harm | Fix |
|---|---|---|---|---|---|
| **High** | Generic card stack + repeated Ops log = hackathon dashboard | Console | overview/session | Feels unfinished | One primary column; fewer cards |
| **High** | Status density as prose (“Balance 0.04 ETH, read anon. Session inactive…”) | Overview | `s2_05_overview.png` | Unscannable | Metric chips / properties |
| **Medium** | Serif titles + soft sage everywhere; Send looks “selected” in modal | Wallet modal | `setup_03_after_create.png` | Weak hierarchy | Clear selected tab; one accent |
| **Medium** | Empty-state 3D figure reused; two favicon languages historically | Empty states | session empty | Uncanny / inconsistent | Flat icons matching forest/ivory |
| **Medium** | Mobile is shrunk desktop | mobile screens | `annotated/10_*.png` | Unusable thumb path | Bottom nav; sheets for approvals |
| **Low** | Low-contrast sage pills on beige | Header | console | Readability | Darker text on pills |

---

## 5. Page-by-page UX audit (condensed)

- **Landing `/`:** Strong forest brand; weak clarity. Fake console table under “real console” claim. CTA Connect×N.
- **How `/how`:** Best mental model (owner path vs agent VERIFY). Still dense.
- **Docs `/docs`:** Operationally useful; mentions WalletConnect env, Prepare, export.
- **Trust `/trust`:** Most honest privacy page — keep tone, align badges.
- **MCP `/mcp`:** Footer-discoverable only.
- **Overview:** Dishonest empty/next-step card; Trust + Ops compete with setup.
- **Session:** Core agent control; state bugs; dangerous revoke; P256 dead-end affordance.
- **Policy:** Powerful but hex/mode-first.
- **Agents:** Spawn works conceptually; tree not productized.
- **Intents:** Product+prize mixed; demo drain adjacent to ping.
- **Approvals:** Clear empty copy; needs sheet UX when pending.
- **Reads / Mempool / Activity:** Judge/demo surfaces; shouldn’t be default nav.
- **Wallet modal:** True home for prepare/backup/send/receive; better than Overview — which is the IA smell.

---

## 6. Proposed navigation & IA

**Default (owner product)**  
1. **Home** — balance, needs-you (backup, co-sign), agent summary  
2. **Agents** — named agents; permissions live *inside* an agent (Policy tab removed)  
3. **Activity** — admitted / rejected / needs you  
4. **You** — owner key, backup, network, Demo (Mempool, Reads, drain/sweep)

**Remove from primary nav:** Policy, Intents, Approvals (Approvals → Home sheet), Reads, Mempool, Session (merge into Agents), Wallet (header account).

**First run:** Create owner key → **forced Backup** → Prepare account → Grant one agent → done.

---

## 7. Visual direction (redesign)

Keep forest + ivory (distinctive, already shipping) but:

- **Calm density** (Linear principle: chrome recedes; task dominates) — dimmer nav, fewer borders.
- **Work queue on Home** (Ramp) — backup / co-sign / revoke risks first, not Ops log.
- **Plain money & tx review** (Stripe/Phantom) — review sheet before send; tabular caps.
- **Embedded onboarding** (Privy pattern adapted) — short steps, no RPC essay first.
- **Approvals as sheet** (Phantom confirmation) — risk pill, Approve/Decline.
- **Not a clone:** Keep Shepherd crook/shield mark language, warm paper `#f4f0e6`, forest `#1f4d3a`; avoid purple SaaS gradients and generic shadcn chrome.

Mockups (HTML + PNG desktop/mobile):  
`mockups/01-onboarding__*.png`, `02-overview__*.png`, `03-agents__*.png`, `04-policy__*.png`, `05-approvals__*.png`, `06-send-review__*.png`

### What changed in mockups (and why)
1. **Onboarding** — Lead with Create owner key; warn Backup; drop RPC wall. (Privy simplicity; observed MetaMask-absent modal.)
2. **Home** — 4-nav; Needs you; agents with Revoke; no Ops log. (Ramp queue; observed dishonest Overview.)
3. **Agents** — Named card + plain permissions + Revoke. (Observed address tree.)
4. **Policy** — Nested under agent; Allow / Needs co-sign. (Observed Mode 0/1/2.)
5. **Approvals** — Bottom sheet, risk label. (Phantom; observed missing confirm patterns.)
6. **Review then send** — Explicit review. (Observed Submit/demo immediate.)

---

## 8. Image manifest (key)

**Annotated:** `annotated/01_landing_jargon.png` … `12_policy_modes.png`  
**Current desktop routes:** `screens/desktop/*__default.png`  
**Current mobile routes:** `screens/mobile/*__default.png` (+ post-audit)  
**Journey evidence:** `journeys/s2_*.png`, `setup_*.png`, `j0*.png`  
**Mockups:** `mockups/*__desktop.png`, `*__mobile.png`  
**References:** `references/linear-*.png`, `privy-kycflows.html`, research URLs in section 1

---

*Audit date: 2026-11-06 (Asia/Calcutta). Operator: automated Playwright against local Vite; human-judgment critique on captured pixels.*
