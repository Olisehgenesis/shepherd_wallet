/**
 * Public alt-mempool workshop / hackathon devnet.
 * Source: https://docs.altmempool.wtf/guides/devnet/
 */
export const CHAIN_ID = 1337;
export const CHAIN_ID_HEX = "0x539" as const;
export const CHAIN_NAME = "Alt mempool devnet";
export const NATIVE_CURRENCY = { name: "Ether", symbol: "ETH", decimals: 18 } as const;

/** ethrex execution client — legacy / 1559 txs and standard eth_* reads. */
export const ETHREX_URL = "https://altmempool.forshtat.com";
/** Sidecar Alternative Mempool — eth_sendFrameTransaction (+ proxied reads). */
export const GATEWAY_URL = "https://altmempool.forshtat.com/rpc";
export const EXPLORER_URL = "https://explorer.altmempool.wtf/";

/**
 * Throwaway genesis account published in
 * forshtat/mempool-workshop-sidecar `deploy/devnet/genesis.values.env`.
 * Docs: there is no faucet — fund from this shared key once, then never reuse it on a real network.
 */
export const SHARED_FUNDER_KEY =
  "0x06f911c1ecb2053bb443ba0a0e28d630c583c3c0c2f334a9ecdc8c7c6ad4ea15" as const;
export const SHARED_FUNDER = "0x5544596212F91984C986A919C8026DF0576816f9" as const;
/** Comfortable transfer to a brand-new account under Amsterdam+ (docs: ≥204_600; 250k ok). */
export const FUND_TRANSFER_GAS = 250_000n;
/** How much ETH the shared funder sends to a fresh key. */
export const FUND_AMOUNT_WEI = 1_000_000_000_000_000_000n; // 1 ETH

export const STAKING_REGISTRY = "0xd51c04d7a0b01124e84de152f4e56d9eecb22d2f" as const;
export const EXPIRY_VERIFIER = "0x81413f0cF12e9b6a49B1D0439E081c577D57FfFf" as const;
export const ENTRY_POINT = "0x00000000000000000000000000000000000000aa" as const;

/** Reference worker specifier on mainnet. Ordinary fetch, not an anonymizing network. */
export const ANON_SPECIFIER = "0x4fd77be300f31c5fe6ab266d35d27750a3478d27" as const;
export const ANON_BOOTSTRAP_RPC = "https://ethereum.publicnode.com";
/** Loopback bridge: MCP eth_* reads → open console harness. Submissions stay clear. */
export const ANON_BRIDGE_PORT = 17814;

export const LEGACY_GAS_PRICE = 2_000_000n;
export const LEGACY_GAS = 8_000_000n;
export const MAX_FEE = 2_000_000_000n;
export const STAKE_WEI = 12_000_000_000_000_000n;
export const UNSTAKE_DELAY = 86_400;
export const ACCOUNT_FUND_WEI = 40_000_000_000_000_000n;
export const SESSION_VALUE_CAP = 1_000_000_000_000_000n;

export const VERIFY_OWNER_GAS = 70_000n;
export const VERIFY_AGENT_GAS = 90_000n;
export const SENDER_GAS = 120_000n;
export const SENDER_STATE = 200_000n;
/** Owner calls land on the account itself. 120k execution was consumed in full and wrote no state. */
export const OWNER_CALL_GAS = 700_000n;
export const OWNER_CALL_STATE = 400_000n;
