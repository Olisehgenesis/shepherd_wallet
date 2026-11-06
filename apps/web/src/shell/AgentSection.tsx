import { NavLink, Outlet, useLocation, useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { paths } from "./destinations";

const sectionLinks = [
  { to: paths.agents, label: "Agents", end: true },
  { to: paths.session, label: "Session", end: true },
  { to: paths.policy, label: "Policy", end: false },
] as const;

/** Layout for agent routes. Policy and grant/revoke stay with the agent, not in primary nav. */
export function AgentSection() {
  const { pathname } = useLocation();
  return (
    <div className="section-stack">
      <nav className="section-nav" aria-label="Agent">
        {sectionLinks.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              isActive || (item.to === paths.policy && pathname.endsWith("/policy")) ? "is-active" : undefined
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}

/**
 * Placeholder for one agent. The agents slice owns the permission UI;
 * this only routes to session grant/revoke and policy.
 */
export function AgentPlaceholder() {
  const { agentId = "" } = useParams();
  const label = decodeURIComponent(agentId);

  return (
    <>
      <header className="page-head">
        <p className="mono-label">Agent</p>
        <h1>{label}</h1>
        <p>Grant, revoke, and policy for this agent. The permission editor lives on Policy.</p>
      </header>
      <div className="row">
        <Button asChild>
          <Link to={paths.session}>Grant or revoke</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to={paths.agentPolicy(agentId)}>Policy</Link>
        </Button>
        <Button asChild variant="ghost">
          <Link to={paths.agents}>All agents</Link>
        </Button>
      </div>
    </>
  );
}
