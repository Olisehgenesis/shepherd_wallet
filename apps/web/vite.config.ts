import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import { ensureAnonBridge } from "../../packages/core/src/anon-bridge.js";

const root = fileURLToPath(new URL(".", import.meta.url));

function anonBridgePlugin(): Plugin {
  return {
    name: "shepherd-anon-bridge",
    async configureServer() {
      const { url, started } = await ensureAnonBridge();
      console.log(
        started
          ? `[shepherd] Anon-RPC bridge listening on ${url} (MCP eth_* reads → this console)`
          : `[shepherd] Anon-RPC bridge already up at ${url}`,
      );
    },
  };
}

export default defineConfig({
  root,
  plugins: [react(), tailwindcss(), anonBridgePlugin()],
  resolve: {
    alias: {
      "@": path.resolve(root, "src"),
    },
  },
  server: { port: 5173, strictPort: true },
});
