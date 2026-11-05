/** Devnet facts from the workshop config and docs.altmempool.wtf (5 Nov 2026). */
export const CHAIN_ID = 1337;
export const GATEWAY_URL = "https://altmempoolgateway.forshtat.com/rpc";
export const EXPLORER_URL = "https://explorer.altmempool.wtf/";
export const STAKING_REGISTRY = "0xd51c04d7a0b01124e84de152f4e56d9eecb22d2f" as const;
export const EXPIRY_VERIFIER = "0x81413f0cF12e9b6a49B1D0439E081c577D57FfFf" as const;
export const ENTRY_POINT = "0x00000000000000000000000000000000000000aa" as const;

/** Reference worker specifier on mainnet. Ordinary fetch, not an anonymizing network. */
export const ANON_SPECIFIER = "0x4fd77be300f31c5fe6ab266d35d27750a3478d27" as const;
export const ANON_BOOTSTRAP_RPC = "https://ethereum.publicnode.com";

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
