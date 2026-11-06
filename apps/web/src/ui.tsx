import { useEffect, type ReactNode } from "react";

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
      <div className={wide ? "modal modal-wide pixel-panel" : "modal pixel-panel"} role="dialog" aria-modal="true" aria-labelledby="modal-title">
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
      <img className="empty-art" src="/agent.png" alt="" width={96} height={96} decoding="async" />
      <h2>{title}</h2>
      <p>{body}</p>
      {action}
    </section>
  );
}

export function shortAddress(value: string) {
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}
