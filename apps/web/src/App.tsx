import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import {
  ActivityPage,
  AgentsPage,
  IntentsPage,
  MempoolPage,
  Overview,
  PolicyPage,
  ReadsPage,
  SessionPage,
} from "./console";
import { Docs, How, Landing, McpPage, Trust } from "./pages";
import { AgentPlaceholder, AgentSection } from "./shell/AgentSection";
import { AppShell } from "./shell/AppShell";
import { legacyRedirects, paths } from "./shell/destinations";
import { DemoHub, YouLayout, YouPage } from "./shell/YouPage";
import { StoreProvider } from "./store";

export function App() {
  return (
    <BrowserRouter>
      <StoreProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/how" element={<How />} />
          <Route path="/docs" element={<Docs />} />
          <Route path="/trust" element={<Trust />} />
          <Route path="/mcp" element={<McpPage />} />
          <Route path="/console" element={<AppShell />}>
            <Route index element={<Overview />} />
            <Route path="wallet" element={<YouPage />} />
            <Route path="agents" element={<AgentSection />}>
              <Route index element={<AgentsPage />} />
              <Route path="session" element={<SessionPage />} />
              <Route path="policy" element={<Navigate to={paths.agentPolicy("root")} replace />} />
              <Route path=":agentId/permissions" element={<PolicyPage />} />
              <Route path=":agentId/policy" element={<PolicyPage />} />
              <Route path=":agentId" element={<AgentPlaceholder />} />
            </Route>
            <Route path="activity" element={<ActivityPage />} />
            <Route path="you" element={<YouLayout />}>
              <Route index element={<YouPage />} />
              <Route path="demo" element={<DemoHub />} />
              <Route path="demo/mempool" element={<MempoolPage />} />
              <Route path="demo/reads" element={<ReadsPage />} />
              <Route path="demo/intents" element={<IntentsPage />} />
            </Route>
          </Route>
          {legacyRedirects.map((item) => (
            <Route key={item.from} path={item.from} element={<Navigate to={item.to} replace />} />
          ))}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </StoreProvider>
    </BrowserRouter>
  );
}
