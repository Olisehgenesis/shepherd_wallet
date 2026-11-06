import { useEffect, type ReactNode } from "react";

export function Mark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="12" fill="#e7eadf" />
      <path d="M32 8 L56 54 H45 L32 26 L19 54 H8 Z" fill="#1d1f1c" />
      <path d="M32 30 L44 54 H20 Z" fill="#F54E00" />
    </svg>
  );
}

export function Modal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
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
      <div className={wide ? "modal modal-wide" : "modal"} role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <header className="modal-head">
          <h2 id="modal-title">{title}</h2>
          <button className="btn-ghost modal-close" type="button" onClick={onClose}>
            Close
          </button>
        </header>
        <div className="modal-body">{children}</div>
      </div>
    </div>
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
      <Mark size={56} />
      <h2>{title}</h2>
      <p>{body}</p>
      {action}
    </section>
  );
}

export function shortAddress(value: string) {
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}
