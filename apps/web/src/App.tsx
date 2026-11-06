import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ConsoleShell, IntentsPage, MempoolPage, Overview, ReadsPage, SessionPage, WalletPage } from "./console";
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
          <Route path="/console" element={<ConsoleShell><Overview /></ConsoleShell>} />
          <Route path="/console/wallet" element={<ConsoleShell><WalletPage /></ConsoleShell>} />
          <Route path="/console/session" element={<ConsoleShell><SessionPage /></ConsoleShell>} />
          <Route path="/console/intents" element={<ConsoleShell><IntentsPage /></ConsoleShell>} />
          <Route path="/console/reads" element={<ConsoleShell><ReadsPage /></ConsoleShell>} />
          <Route path="/console/mempool" element={<ConsoleShell><MempoolPage /></ConsoleShell>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </StoreProvider>
    </BrowserRouter>
  );
}
