/**
 * Home and first-run posture.
 * Browser-wallet presence must never send a prepared account back to
 * "Start by connecting a wallet" — that headline lied after a balance was visible.
 */

export interface HomeSnapshot {
  hasOwner: boolean;
  /** True when an EIP-6963 wallet or WalletConnect session is present. Informational only once an owner key exists. */
  hasExtension: boolean;
  deployed: boolean;
  backedUp: boolean;
  sessionActive: boolean;
  pendingCoSigns: number;
}

export type HomeNeed = "prepare" | "backup" | "cosign";

export interface HomeModel {
  showFirstRun: boolean;
  /** Single unfinished setup step. Null once the account, backup, and a session exist. */
  next: "prepare" | "backup" | "grant" | null;
  needsYou: HomeNeed[];
  showBalance: boolean;
  /** Always false. Kept so a regression that restores the connect headline fails the test. */
  connectWalletHeadline: false;
}

export function modelHome(snapshot: HomeSnapshot): HomeModel {
  const needsYou: HomeNeed[] = [];
  if (snapshot.hasOwner && !snapshot.deployed) needsYou.push("prepare");
  if (snapshot.hasOwner && !snapshot.backedUp) needsYou.push("backup");
  if (snapshot.hasOwner && snapshot.pendingCoSigns > 0) needsYou.push("cosign");

  if (!snapshot.hasOwner) {
    return {
      showFirstRun: true,
      next: null,
      needsYou: [],
      showBalance: false,
      connectWalletHeadline: false,
    };
  }

  // `hasExtension` is intentionally unused: a missing MetaMask is not "start by connecting".
  let next: HomeModel["next"] = null;
  if (!snapshot.deployed) next = "prepare";
  else if (!snapshot.backedUp) next = "backup";
  else if (!snapshot.sessionActive) next = "grant";

  return {
    showFirstRun: false,
    next,
    needsYou,
    showBalance: true,
    connectWalletHeadline: false,
  };
}

export function trimEth(value: string | null | undefined): string {
  if (!value) return "0";
  if (!/^\d+(\.\d+)?$/.test(value)) return value;
  const [whole, frac = ""] = value.split(".");
  const trimmed = frac.replace(/0+$/, "").slice(0, 4);
  return trimmed ? `${whole}.${trimmed}` : whole;
}

/** Short expiry for the agent summary. "Expires tomorrow" matches a ~24h grant. */
export function expiryPhrase(expirySec: number | undefined, now = Date.now()): string {
  if (!expirySec) return "No expiry";
  const when = new Date(expirySec * 1000);
  if (when.getTime() <= now) return "Expired";
  const startToday = new Date(now);
  startToday.setHours(0, 0, 0, 0);
  const startWhen = new Date(when);
  startWhen.setHours(0, 0, 0, 0);
  const days = Math.round((startWhen.getTime() - startToday.getTime()) / 86_400_000);
  if (days <= 0) return "Expires today";
  if (days === 1) return "Expires tomorrow";
  return `Expires ${when.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
}
