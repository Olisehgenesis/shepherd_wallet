# Shepherd UX audit

Live usability and visual-design audit of the Shepherd console. Overall score **3.5/10**. This directory is documentation only: no product code was changed to produce it, and nothing under `src/` is part of this package.

Interactive write-up: [Shepherd UX audit canvas](https://cursor.com/canvas/store-41e1f0d4-70b1-4bc6-b827-1ab14b5fdacc/28d40f35-549d-45fd-b9fd-7a9e381abab8)

## Start here

- [FINDINGS.md](FINDINGS.md) — full audit: score, journey results, prioritized issues, proposed information architecture (Home / Agents / Activity / You), and visual direction.
- [annotated/](annotated/) — 12 annotated screenshots of the problems called out in the findings.
- [mockups/](mockups/) — HTML redesigns plus desktop and mobile PNGs for onboarding, overview/home, agents, policy, approvals, and send-review. Open the `.html` files in a browser; shared tokens are in `mockups/_tokens.css`.
- [screens/desktop/](screens/desktop/) and [screens/mobile/](screens/mobile/) — captures of the current UI on every route that was walked.
- [journeys/](journeys/) — Playwright walk evidence, including `SETUP2_LOG.json`, `JOURNEY_RESULTS.json`, and `route-capture-log.json`.

Paths inside `FINDINGS.md` that begin with `/workspace/shepherd-ux-audit/` are this directory. The findings also mention a `references/` folder (Linear, Privy, and related notes); that folder was not in the attached package.

## How this was produced

The audit operated the live UI with Playwright Chromium against a local Vite build (`http://localhost:5173`), at desktop 1280×800 and mobile 390×844. Prepare, grant, and revoke ran on public alt-mempool / ethrex (chain 1337) through the in-app frame signer. It is a record of using the product, not a source-code inventory. No Shepherd application source was modified during the audit.

## Redaction

Journey JSON was checked for raw private keys and seed phrases. None were present. Short public addresses and testnet transaction hashes are unchanged.

Three screenshots showed a raw session private key in the “Reveal session key once” field. That value was covered before commit:

- `journeys/s2_09_reveal1.png`
- `journeys/s2_09_reveal2.png`
- `annotated/06_reveal_key_once.png`

The field now reads `[redacted session key]`. The rest of each shot is the original capture.
