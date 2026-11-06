import { createContext, useContext, type ReactNode } from "react";
import type { WalletModalView } from "../WalletModal";

export type ShellApi = {
  /** Opens the existing wallet modal. `backup` jumps to owner-key export/import. */
  openWallet: (view?: WalletModalView) => void;
  /** Opens the co-sign queue over the current page. Home can call this for "Needs you". */
  openApprovals: () => void;
};

const ShellContext = createContext<ShellApi | null>(null);

export function ShellProvider({ value, children }: { value: ShellApi; children: ReactNode }) {
  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>;
}

export function useShell() {
  const value = useContext(ShellContext);
  if (!value) throw new Error("Shepherd shell is missing");
  return value;
}

/** Existing console pages open the wallet through this. */
export function useWalletUi() {
  const { openWallet } = useShell();
  return { openWallet: () => openWallet() };
}
