import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import {
  ActivityPage,
  AgentsPage,
  ApprovalsPage,
  ConsoleGate,
  IntentsPage,
  MempoolPage,
  Overview,
  PolicyPage,
  ReadsPage,
  SessionPage,
  WalletPage,
} from "./console";
import { Docs, How, Landing, McpPage, Trust } from "./pages";
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
          <Route path="/console" element={<ConsoleGate><Overview /></ConsoleGate>} />
          <Route path="/console/wallet" element={<ConsoleGate><WalletPage /></ConsoleGate>} />
          <Route path="/console/session" element={<ConsoleGate><SessionPage /></ConsoleGate>} />
          <Route path="/console/policy" element={<ConsoleGate><PolicyPage /></ConsoleGate>} />
          <Route path="/console/agents" element={<ConsoleGate><AgentsPage /></ConsoleGate>} />
          <Route path="/console/intents" element={<ConsoleGate><IntentsPage /></ConsoleGate>} />
          <Route path="/console/approvals" element={<ConsoleGate><ApprovalsPage /></ConsoleGate>} />
          <Route path="/console/reads" element={<ConsoleGate><ReadsPage /></ConsoleGate>} />
          <Route path="/console/mempool" element={<ConsoleGate><MempoolPage /></ConsoleGate>} />
          <Route path="/console/activity" element={<ConsoleGate><ActivityPage /></ConsoleGate>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </StoreProvider>
    </BrowserRouter>
  );
}
