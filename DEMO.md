# Demo recording notes (~2 minutes)

Record the browser on the alt-mempool devnet (chain 1337) after `npm run demo` has printed an admitted explorer URL, or click the same steps live. Do not show `.shepherd-state.json` or the session-key reveal field.

1. **In policy.** Intents → “In-policy ping”. Ops log: `admitted:included`, route clear (the mempool has to see the transaction). Open the explorer link from the CLI output, or the receipt the script printed.
2. **Injection.** Intents → “Submit injected drain”. Log verdict `rejected:TargetDenied`. No address, no calldata.
3. **Co-sign.** Intents → “High-risk, wait” (`waiting:NeedsCosign`), then “Co-sign and send” (`admitted:included`).
4. **Reads.** Reads → “Read through Anon-RPC”. The chip moves to about 100% of `eth_*` reads. Leave the trust callout in frame: the worker sees bodies; the reference worker does not unlink IP.
5. **Mempool contrast.** Mempool → “Send to canonical” (`canonical-storage-read`), “Send to alt, unstaked” (`unstaked-storage-read`), “Stake account”, “Send to alt after stake” (`admitted:included`).

Say this out loud: the agent key is not the owner key, and the denial happens in `VERIFY` before `APPROVE`, not in the prompt.

If the expiry verifier has no code on the devnet, transactions omit the expiry frame. Revoke is the kill switch. Say that if a judge asks about expiry.
