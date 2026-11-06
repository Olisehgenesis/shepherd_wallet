import { useEffect } from "react";
import { createPortal } from "react-dom";
import type { ReviewCopy, ReviewRow } from "./reviewCopy";

export function ConfirmSheet({
  open,
  variant = "sheet",
  kicker,
  kickerTone = "label",
  title,
  body,
  rows,
  secondaryLabel,
  confirmLabel,
  confirmTone = "primary",
  busy = false,
  error,
  onSecondary,
  onBackdrop,
  onConfirm,
}: {
  open: boolean;
  variant?: "sheet" | "review";
  kicker: string;
  kickerTone?: "label" | "risk";
  title: string;
  body: string;
  rows: ReviewRow[];
  secondaryLabel: string;
  confirmLabel: string;
  confirmTone?: "primary" | "danger";
  busy?: boolean;
  error?: string;
  onSecondary: () => void;
  onBackdrop: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onBackdrop();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, busy, onBackdrop]);

  if (!open) return null;

  return createPortal(
    <div className={variant === "review" ? "safety-root review" : "safety-root"} role="presentation">
      <button className="safety-backdrop" type="button" aria-label="Close" disabled={busy} onClick={onBackdrop} />
      <div className="safety-card" role="dialog" aria-modal="true" aria-labelledby="safety-sheet-title">
        {variant === "sheet" && <div className="safety-grab" aria-hidden="true" />}
        {kickerTone === "risk" ? <p className="safety-risk">{kicker}</p> : <p className="safety-kicker">{kicker}</p>}
        <h2 id="safety-sheet-title">{title}</h2>
        <p className="safety-body">{body}</p>
        <dl className="safety-kv">
          {rows.map((row) => (
            <div key={row.label}>
              <dt>{row.label}</dt>
              <dd className={row.mono ? "safety-mono" : undefined}>{row.value}</dd>
            </div>
          ))}
        </dl>
        {error && <p className="safety-error">{error}</p>}
        <div className="safety-actions">
          <button className="safety-btn" type="button" disabled={busy} onClick={onSecondary}>
            {secondaryLabel}
          </button>
          <button
            className={confirmTone === "danger" ? "safety-btn danger" : "safety-btn primary"}
            type="button"
            disabled={busy}
            onClick={onConfirm}
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function ReviewSheet({
  copy,
  busy,
  error,
  onBack,
  onConfirm,
}: {
  copy: ReviewCopy | null;
  busy?: boolean;
  error?: string;
  onBack: () => void;
  onConfirm: () => void;
}) {
  return (
    <ConfirmSheet
      open={Boolean(copy)}
      variant="review"
      kicker="Review"
      title={copy?.title ?? ""}
      body={copy?.body ?? ""}
      rows={copy?.rows ?? []}
      secondaryLabel="Back"
      confirmLabel={copy?.confirmLabel ?? "Send"}
      busy={busy}
      error={error}
      onSecondary={onBack}
      onBackdrop={() => {
        if (!busy) onBack();
      }}
      onConfirm={onConfirm}
    />
  );
}
