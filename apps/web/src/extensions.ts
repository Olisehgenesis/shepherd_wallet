/**
 * Extension points for surfaces owned by other agents.
 * Home calls these and does not render its own confirm, approvals sheet, or send-review UI.
 */

type RevokeConfirm = (run: () => Promise<void> | void) => void;
type ApprovalsOpener = (id?: string) => void;
type SendReviewOpener = () => void;

let revokeConfirm: RevokeConfirm | null = null;
let approvalsOpener: ApprovalsOpener | null = null;
let sendReviewOpener: SendReviewOpener | null = null;

/** Register the revoke confirmation sheet. Until one is registered, Home runs revoke directly. */
export function registerRevokeConfirm(handler: RevokeConfirm) {
  revokeConfirm = handler;
  return () => {
    if (revokeConfirm === handler) revokeConfirm = null;
  };
}

export function requestRevoke(run: () => Promise<void> | void) {
  if (revokeConfirm) {
    revokeConfirm(run);
    return;
  }
  void run();
}

/** Register the approvals sheet. Home falls back to the Approvals route when this returns false. */
export function registerApprovalsOpener(handler: ApprovalsOpener) {
  approvalsOpener = handler;
  return () => {
    if (approvalsOpener === handler) approvalsOpener = null;
  };
}

export function openApprovalsSheet(id?: string): boolean {
  if (!approvalsOpener) return false;
  approvalsOpener(id);
  return true;
}

/** Register the review-before-send sheet. Home falls back to the wallet Send view when this returns false. */
export function registerSendReview(handler: SendReviewOpener) {
  sendReviewOpener = handler;
  return () => {
    if (sendReviewOpener === handler) sendReviewOpener = null;
  };
}

export function openSendReview(): boolean {
  if (!sendReviewOpener) return false;
  sendReviewOpener();
  return true;
}
