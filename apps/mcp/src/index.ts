import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { randomBytes } from "node:crypto";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { isAddress } from "viem";
import { z } from "zod";
import {
  agentAct,
  buildTree,
  DEFAULT_TTL_SECONDS,
  grantSession,
  highRiskCall,
  inPolicyCall,
  injectedCall,
  posture,
  readSession,
  revoke,
  revokeCascadeOrder,
} from "../../../packages/core/src/index.js";
import { appendOps } from "./ops.js";
import { delegate } from "./scope.js";
import { loadState, requireDeployed, saveState, type AgentRecord, type ShepherdState } from "./state.js";

const server = new McpServer({ name: "shepherd-mcp-server", version: "0.1.0" });

const POLICY_DOC = {
  rules: [
    { call: "vault.ping()", rule: "allow", note: "Healthy agents may sign this." },
    { call: "vault.sweep()", rule: "high-risk", note: "Needs owner or P256 co-sign. Agents must not sign alone." },
    { call: "any other target or selector", rule: "deny", note: "VERIFY reverts before APPROVE." },
  ],
  limits: {
    maxDepth: 3,
    maxChildrenPerParent: 8,
    childCannotExceedParentCapOrExpiry: true,
    ownerKeyNeverReturned: true,
  },
  workflow: [
    "1. npm run demo (once) so .shepherd-state.json has an account and root session",
    "2. shepherd_posture — confirm active + staked",
    "3. shepherd_spawn_agent with parentId \"root\"",
    "4. shepherd_propose_intent with intent \"ping\"",
    "5. shepherd_revoke_agent when done (cascades to descendants)",
  ],
};

function text(payload: unknown, isError = false) {
  return {
    isError,
    content: [{ type: "text" as const, text: typeof payload === "string" ? payload : JSON.stringify(payload) }],
    ...(typeof payload === "string" ? {} : { structuredContent: payload as Record<string, unknown> }),
  };
}

function agentsOf(state: ShepherdState): AgentRecord[] {
  return state.agents ?? [];
}

function findAgent(state: ShepherdState, id: string): AgentRecord | undefined {
  return agentsOf(state).find((agent) => agent.id === id);
}

function parentView(state: ShepherdState, parentId: string | undefined) {
  if (!parentId || parentId === "root") {
    return {
      id: "root",
      depth: 0,
      address: privateKeyToAccount(state.sessionKey).address,
      sessionKey: state.sessionKey,
    };
  }
  const parent = findAgent(state, parentId);
  if (!parent) return undefined;
  return parent;
}

function intentCall(vault: `0x${string}`, intent: "ping" | "drain" | "sweep") {
  if (intent === "drain") return injectedCall();
  if (intent === "sweep") return highRiskCall(vault);
  return inPolicyCall(vault);
}

server.registerResource(
  "shepherd-policy",
  "shepherd://policy",
  {
    title: "Shepherd policy",
    description: "Allowlist rules and the agent spawn workflow. Read this before proposing intents.",
    mimeType: "application/json",
  },
  async () => ({
    contents: [
      {
        uri: "shepherd://policy",
        mimeType: "application/json",
        text: JSON.stringify(POLICY_DOC, null, 2),
      },
    ],
  }),
);

server.registerTool(
  "shepherd_posture",
  {
    title: "Read Shepherd posture",
    description: `Read whether the root session is active and whether the account is staked.

When to use: before spawning or proposing. Example: call with no args after npm run demo.

Returns JSON: { "active": boolean, "staked": boolean }.

Does not return keys or the owner address.

Error Handling:
- "No .shepherd-state.json" means run npm run demo first.`,
    inputSchema: {},
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  },
  async () => {
    try {
      const state = loadState();
      const deployed = requireDeployed(state);
      const row = await posture(deployed.account, privateKeyToAccount(state.sessionKey).address);
      appendOps("shepherd_posture", "clear", row.active ? (row.staked ? "active+staked" : "active") : "inactive");
      return text(row);
    } catch (error) {
      return text(error instanceof Error ? error.message : "Posture read failed.", true);
    }
  },
);

server.registerTool(
  "shepherd_list_agents",
  {
    title: "List spawned agents",
    description: `List child agents and a nested tree. Keys are not included.

When to use: before spawn (to pick a parentId) or after spawn (to confirm). Example: call with no args, then pass one of the ids to shepherd_propose_intent.

The root session is not in agents[]. Pass parentId "root" to shepherd_spawn_agent to hang a child off it.

Returns JSON: { "agents": [...], "tree": [...] }.
active is read from the chain. address is the session account, not the owner.`,
    inputSchema: {},
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  },
  async () => {
    try {
      const state = loadState();
      const deployed = requireDeployed(state);
      const agents = [];
      for (const agent of agentsOf(state)) {
        const live = await readSession(deployed.account, agent.address);
        agents.push({
          id: agent.id,
          parentId: agent.parentId,
          depth: agent.depth,
          address: agent.address,
          valueCap: agent.valueCap,
          expiry: agent.expiry,
          active: live.active,
        });
      }
      appendOps("shepherd_list_agents", "clear", `count:${agents.length}`);
      return text({ agents, tree: buildTree(agents) });
    } catch (error) {
      return text(error instanceof Error ? error.message : "Could not list agents.", true);
    }
  },
);

const spawnSchema = {
  parentId: z
    .string()
    .default("root")
    .describe('Parent agent id. Use "root" for the human-granted session. A child id lets that agent spawn its own child.'),
  valueCapWei: z
    .string()
    .regex(/^\d+$/)
    .optional()
    .describe("Child value cap in wei. Omit it to copy the parent cap. Cannot exceed the parent cap."),
  ttlSeconds: z
    .number()
    .int()
    .min(60)
    .max(86_400)
    .default(DEFAULT_TTL_SECONDS)
    .describe("Requested lifetime in seconds. Clipped to the parent expiry."),
};

server.registerTool(
  "shepherd_spawn_agent",
  {
    title: "Spawn a child agent",
    description: `Create a new session key and grant it on the Shepherd account, under a parent session.

When to use: after shepherd_posture shows active (+ staked for later proposes). Example: { "parentId": "root", "ttlSeconds": 3600 }.

The child cannot receive the owner key, a higher value cap, or a later expiry than its parent. Depth stops at 3. Each parent can have 8 children.

The owner key stays in .shepherd-state.json and is never returned. The sessionKey in the response is the new child's key, shown once so the child can sign. Later calls should use agentId, not the key.

Args:
  - parentId (string): "root" or an existing child id. Default "root".
  - valueCapWei (string, optional): positive integer wei, at most the parent cap.
  - ttlSeconds (number, optional): 60 to 86400, clipped to the parent expiry. Default 3600.

Returns JSON: { "agentId", "parentId", "depth", "address", "valueCap", "expiry", "sessionKey", "verdict" }.

Error Handling:
- Parent session inactive: grant the parent (npm run demo, or shepherd_spawn_agent from a live parent) and retry.
- Cap or depth errors name the limit to change.
- A frame revert returns the chain verdict. Do not retry with a larger cap.`,
    inputSchema: spawnSchema,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  },
  async ({ parentId = "root", valueCapWei, ttlSeconds = DEFAULT_TTL_SECONDS }) => {
    try {
      const state = loadState();
      const deployed = requireDeployed(state);
      const parent = parentView(state, parentId);
      if (!parent) return text(`No agent with id ${parentId}. Call shepherd_list_agents and use one of those ids, or "root".`, true);
      const live = await readSession(deployed.account, parent.address);
      if (!live.active) {
        return text("That parent session is not active on the account. Grant it before spawning a child.", true);
      }
      const childCount = agentsOf(state).filter((agent) => agent.parentId === parent.id).length;
      const bounds = delegate({
        parentExpiry: live.expiry,
        parentCap: live.valueCap,
        now: BigInt(Math.floor(Date.now() / 1000)),
        ttlSeconds,
        requestedCap: valueCapWei ? BigInt(valueCapWei) : null,
        depth: parent.depth,
        childCount,
      });
      if ("error" in bounds) return text(bounds.error, true);
      const sessionKey = generatePrivateKey();
      const address = privateKeyToAccount(sessionKey).address;
      const outcome = await grantSession(deployed.account, state.ownerKey, address, bounds.expiry, bounds.valueCap);
      if (outcome.verdict !== "admitted") {
        appendOps("shepherd_spawn_agent", outcome.route, `${outcome.verdict}:${outcome.reason}`);
        return text(
          `Grant was ${outcome.verdict} (${outcome.reason}). The child key was not stored. ${outcome.explorerUrl ?? "No explorer link."}`,
          true,
        );
      }
      const granted = await readSession(deployed.account, address);
      if (!granted.active) {
        return text("The grant was mined but the session is not active. The child key was not stored.", true);
      }
      const record: AgentRecord = {
        id: `agent_${randomBytes(4).toString("hex")}`,
        parentId: parent.id,
        depth: parent.depth + 1,
        address,
        sessionKey,
        valueCap: bounds.valueCap.toString(),
        expiry: bounds.expiry.toString(),
      };
      state.agents = [...agentsOf(state), record];
      saveState(state);
      appendOps("shepherd_spawn_agent", "alt", `admitted:depth:${record.depth}`);
      return text({
        agentId: record.id,
        parentId: record.parentId,
        depth: record.depth,
        address: record.address,
        valueCap: record.valueCap,
        expiry: record.expiry,
        sessionKey: record.sessionKey,
        verdict: "admitted",
        explorerUrl: outcome.explorerUrl,
      });
    } catch (error) {
      return text(error instanceof Error ? error.message : "Spawn failed.", true);
    }
  },
);

server.registerTool(
  "shepherd_revoke_agent",
  {
    title: "Revoke a spawned agent",
    description: `Revoke one spawned session and every descendant (deepest first).

When to use: after a child is done, or as the kill switch for a subtree. Example: { "agentId": "agent_ab12cd34" }.

Args:
  - agentId (string): id from shepherd_list_agents or shepherd_spawn_agent.

Returns JSON: { "agentId", "revoked": [{ "agentId", "verdict", "reason" }], "cascade": number }.`,
    inputSchema: {
      agentId: z.string().min(1).describe("Id of the spawned agent to revoke, such as agent_ab12cd34."),
    },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
  },
  async ({ agentId }) => {
    try {
      const state = loadState();
      const deployed = requireDeployed(state);
      const agent = findAgent(state, agentId);
      if (!agent) return text(`No spawned agent ${agentId}. List agents and copy an id.`, true);
      const cascade = revokeCascadeOrder(agentsOf(state), agentId);
      const revoked = [];
      for (const row of cascade) {
        const outcome = await revoke(deployed.account, state.ownerKey, row.address);
        revoked.push({ agentId: row.id, verdict: outcome.verdict, reason: outcome.reason, explorerUrl: outcome.explorerUrl });
        appendOps("shepherd_revoke_agent", outcome.route, `${outcome.verdict}:${outcome.reason}`);
      }
      const gone = new Set(cascade.map((row) => row.id));
      state.agents = agentsOf(state).filter((row) => !gone.has(row.id));
      saveState(state);
      return text({ agentId, revoked, cascade: cascade.length });
    } catch (error) {
      return text(error instanceof Error ? error.message : "Revoke failed.", true);
    }
  },
);

const proposeSchema = {
  agentId: z.string().default("root").describe('"root" or a spawned agent id.'),
  intent: z
    .enum(["ping", "drain", "sweep"])
    .default("ping")
    .describe(
      'ping = in-policy sign+submit when mirror allows. drain = refuse to sign (healthy agent). sweep = return NeedsCosign without signing.',
    ),
};

server.registerTool(
  "shepherd_propose_intent",
  {
    title: "Propose an intent",
    description: `Run propose → mirror → maybe sign for one spawned agent or the root session.

When to use: after spawn (or with agentId "root"). Examples:
- { "agentId": "root", "intent": "ping" } — signs only when mirror says allow
- { "intent": "drain" } — healthy agent refuses; does not submit
- { "intent": "sweep" } — returns waiting:NeedsCosign; does not co-sign

The chain still re-checks inside VERIFY for anything that is submitted.

Args:
  - agentId (string): "root" or a spawned agent id.
  - intent (string): "ping" | "drain" | "sweep". Default "ping".

Returns JSON: { "agentId", "intent", "verdict", "reason", "explorerUrl?" }.`,
    inputSchema: proposeSchema,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  },
  async ({ agentId = "root", intent = "ping" }) => {
    try {
      const state = loadState();
      const deployed = requireDeployed(state);
      const agent = parentView(state, agentId);
      if (!agent) return text(`No agent ${agentId}.`, true);
      if (!isAddress(agent.address)) return text("Stored session address is not an address.", true);
      const call = intentCall(deployed.vault, intent);
      const outcome = await agentAct(
        {
          account: deployed.account,
          policy: deployed.policy,
          sessionKey: agent.sessionKey,
          call,
        },
        { route: "alt", sign: false },
      );
      if (intent === "drain" || intent === "sweep") {
        appendOps("shepherd_propose_intent", "local", `${intent}:${outcome.reason}`);
        return text({
          agentId: agent.id,
          intent,
          verdict: outcome.verdict,
          reason: outcome.reason,
          note:
            intent === "drain"
              ? "Healthy agent refused to sign a drain. The chain would deny it in VERIFY anyway."
              : "Healthy agent will not co-sign. Use the console or owner path for high-risk.",
        });
      }
      if (outcome.reason !== "allow") {
        appendOps("shepherd_propose_intent", "local", `ping:${outcome.reason}`);
        return text({
          agentId: agent.id,
          intent,
          verdict: outcome.verdict,
          reason: outcome.reason,
          note: "Not signed. Fix the session or the policy, then propose again.",
        });
      }
      const submitted = await agentAct(
        {
          account: deployed.account,
          policy: deployed.policy,
          sessionKey: agent.sessionKey,
          call,
        },
        { route: "alt", sign: true },
      );
      appendOps("shepherd_propose_intent", submitted.route, `ping:${submitted.verdict}:${submitted.reason}`);
      return text({
        agentId: agent.id,
        intent,
        verdict: submitted.verdict,
        reason: submitted.reason,
        explorerUrl: submitted.explorerUrl,
      });
    } catch (error) {
      return text(error instanceof Error ? error.message : "Propose failed.", true);
    }
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
