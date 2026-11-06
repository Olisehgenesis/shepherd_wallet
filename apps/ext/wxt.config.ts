import { defineConfig } from "wxt";

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "Shepherd Wallet",
    description:
      "Doors (MetaMask, Rabby, …) unlock Shepherd. Shepherd keys connect to every dApp — Anon-ready reads, scoped spends.",
    version: "0.1.0",
    permissions: ["storage", "tabs", "scripting"],
    host_permissions: ["*://*/*"],
    action: {
      default_title: "Shepherd Wallet",
    },
    web_accessible_resources: [
      {
        resources: ["inpage.js"],
        matches: ["*://*/*"],
      },
    ],
  },
});
