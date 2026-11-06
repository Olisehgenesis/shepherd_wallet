import { useEffect, type ReactNode } from "react";

/** Brand mark from extension-assets pipeline (`icon.svg` → `npm run icons`). */
export function Mark({ size = 28 }: { size?: number }) {
  return (
    <img
      className="mark"
      src="/icon-64.png"
      width={size}
      height={size}
      alt=""
      decoding="async"
    />
  );
}

export function Modal({
  title,
  onClose,
  children,
  wide = false,
  icon,
  back,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
  icon?: ReactNode;
  back?: () => void;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return (
    <div className="modal-root" role="presentation">
      <button className="modal-backdrop" type="button" aria-label="Close dialog" onClick={onClose} />
      <div
        className={wide ? "modal modal-wide wallet-modal pixel-panel" : "modal pixel-panel"}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <header className="modal-head">
          <div className="modal-head-title">
            {back && (
              <button className="wallet-icon-btn" type="button" onClick={back} aria-label="Back">
                <BackIcon />
              </button>
            )}
            {icon}
            <h2 id="modal-title">{title}</h2>
          </div>
          <button className="wallet-icon-btn modal-close" type="button" onClick={onClose} aria-label="Close">
            <CloseIcon />
          </button>
        </header>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

function BackIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M10 3 5 8l5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function Loader({ label }: { label: string }) {
  return (
    <p className="loader" role="status">
      <span className="spin" aria-hidden="true" />
      {label}
    </p>
  );
}

export function Empty({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <section className="card empty">
      <div className="empty-art-wrap">
        <img className="empty-art" src="/agent.png?v=3d" alt="" width={112} height={112} decoding="async" />
      </div>
      <h2>{title}</h2>
      <p>{body}</p>
      {action}
    </section>
  );
}

export function shortAddress(value: string) {
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}
