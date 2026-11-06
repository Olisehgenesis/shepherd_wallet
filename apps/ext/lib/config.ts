export const CHAIN_ID = 1337;
export const CHAIN_ID_HEX = "0x539" as const;
export const CHAIN_NAME = "Alt mempool devnet";
export const ETHREX_URL = "https://altmempool.forshtat.com";
export const GATEWAY_URL = "https://altmempool.forshtat.com/rpc";
export const EXPLORER_URL = "https://explorer.altmempool.wtf/";
export const NATIVE_CURRENCY = { name: "Ether", symbol: "ETH", decimals: 18 } as const;

export const SHEPHERD_RDNS = "wallet.shepherd.eth";
export const SHEPHERD_UUID = "shepherd-wallet-extension";
export const MSG_SOURCE = "shepherd-wallet";

/** Tiny orange mark for EIP-6963 announce (no network fetch). */
export const SHEPHERD_ICON_DATA_URL =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#f54e00"/><path d="M18 40V24l14-8 14 8v16l-14 8-14-8z" fill="none" stroke="#fff" stroke-width="3" stroke-linejoin="round"/><circle cx="32" cy="32" r="5" fill="#fff"/></svg>`,
  );
