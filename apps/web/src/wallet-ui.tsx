import { createContext, useContext } from "react";

export type WalletSurface = "home" | "send" | "receive" | "signers" | "connect" | "backup";

const WalletUi = createContext<{ openWallet: (view?: WalletSurface) => void } | null>(null);

export const WalletUiProvider = WalletUi.Provider;

export function useWalletUi() {
  const value = useContext(WalletUi);
  if (!value) throw new Error("Wallet UI is missing");
  return value;
}
