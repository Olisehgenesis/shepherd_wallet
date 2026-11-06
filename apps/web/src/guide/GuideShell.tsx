import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import { paths } from "../shell/destinations";
import { Site } from "../site";
import "./guide.css";

export type GuideTab = {
  id: string;
  label: string;
  Icon: ComponentType<{ size?: number; className?: string }>;
};

const productNav = [
  { to: "/how", label: "How it works" },
  { to: "/docs", label: "Docs" },
  { to: "/trust", label: "Privacy" },
] as const;

export function GuideShell({
  title,
  subtitle,
  tabs,
  initialTab,
  crossLinks = false,
  children,
}: {
  title: string;
  subtitle: string;
  tabs: readonly GuideTab[];
  initialTab?: string;
  crossLinks?: boolean;
  children: (tab: string, setTab: (id: string) => void) => ReactNode;
}) {
  const [tab, setTab] = useState(initialTab ?? tabs[0]?.id ?? "");

  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (hash && tabs.some((t) => t.id === hash)) setTab(hash);
  }, [tabs]);

  function select(id: string) {
    setTab(id);
    window.history.replaceState(null, "", `#${id}`);
  }

  return (
    <Site>
      <div className="guide">
        {crossLinks && (
          <div className="guide-product-nav wrap">
            {productNav.map((item) => (
              <NavLink key={item.to} to={item.to} className="guide-product-link">
                {item.label}
              </NavLink>
            ))}
          </div>
        )}
        <div className="guide-shell">
          <aside className="guide-side" aria-label={`${title} menu`}>
            <div className="guide-side-head">
              <strong>{title}</strong>
              <span>{subtitle}</span>
            </div>
            {tabs.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                className="guide-tab"
                aria-selected={tab === id}
                onClick={() => select(id)}
              >
                <Icon size={16} aria-hidden />
                {label}
              </button>
            ))}
            <div className="guide-side-cta">
              <Link className="guide-btn guide-btn-primary" to={paths.wallet}>
                Connect Wallet
              </Link>
            </div>
          </aside>

          <div className="guide-main">
            <div className="guide-mobile-tabs" role="tablist" aria-label={`${title} sections`}>
              {tabs.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  type="button"
                  className="guide-tab"
                  aria-selected={tab === id}
                  onClick={() => select(id)}
                >
                  <Icon size={15} aria-hidden />
                  {label}
                </button>
              ))}
            </div>
            {children(tab, select)}
          </div>
        </div>
      </div>
    </Site>
  );
}
