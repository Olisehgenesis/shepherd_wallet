import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { randomBytes } from "node:crypto";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { isAddress } from "viem";
import { z } from "zod";
import {
  agentAct,
  grantSession,
  inPolicyCall,
  posture,
  readSession,
  revoke,
} from "../../../packages/core/src/index.js";
import { DEFAULT_TTL_SECONDS, delegate } from "./scope.js";
import { loadState, requireDeployed, saveState, type AgentRecord, type ShepherdState } from "./state.js";

const server = new McpServer({ name: "shepherd-mcp-server", version: "0.1.0" });

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

server.registerTool(
  "shepherd_posture",
  {
    title: "Read Shepherd posture",
    description: `Read whether the root session is active and whether the account is staked.

Use this before spawning. It does not return keys or the owner address.

Returns JSON: { "active": boolean, "staked": boolean }.

Error Handling:
- "No .shepherd-state.json" means npm run demo has not created the devnet account yet.`,
    inputSchema: {},
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  },
  async () => {
    try {
      const state = loadState();
      const deployed = requireDeployed(state);
      const row = await posture(deployed.account, privateKeyToAccount(state.sessionKey).address);
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
    description: `List child agents this process has spawned. Keys are not included.

The root session is not in this list. Pass parentId "root" to shepherd_spawn_agent to hang a child off it.

Returns JSON: { "agents": [{ "id", "parentId", "depth", "address", "valueCap", "expiry", "active" }] }.
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
      return text({ agents });
    } catch (error) {
      return text(error instanceof Error ? error.message : "Could not list agents.", true);
    }
  },
);

const spawnSchema = {
  parentId: z
    .string()
    .default("root")
    .describe("Parent agent id. Use \"root\" for the human-granted session. A child id lets that agent spawn its own child."),
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
    description: `Revoke one spawned session. Children of that agent are not granted new authority, but their keys remain until you revoke them too.

Args:
  - agentId (string): id from shepherd_list_agents or shepherd_spawn_agent.

Returns JSON: { "agentId", "verdict", "reason" }.`,
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
      const outcome = await revoke(deployed.account, state.ownerKey, agent.address);
      return text({ agentId, verdict: outcome.verdict, reason: outcome.reason, explorerUrl: outcome.explorerUrl });
    } catch (error) {
      return text(error instanceof Error ? error.message : "Revoke failed.", true);
    }
  },
);

server.registerTool(
  "shepherd_propose_intent",
  {
    title: "Propose an in-policy intent",
    description: `Run propose, mirror, then sign for one spawned agent or the root session.

This tool signs only when the local mirror says allow. A drain or a high-risk sweep is refused here. The chain still re-checks inside VERIFY.

Args:
  - agentId (string): "root" or a spawned agent id.

Returns JSON: { "agentId", "verdict", "reason", "explorerUrl" }.
reason "allow" with verdict "ready" means the mirror passed and nothing was submitted. verdict "admitted" means the alt mempool included it.`,
    inputSchema: {
      agentId: z.string().default("root").describe("\"root\" or a spawned agent id."),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  },
  async ({ agentId }) => {
    try {
      const state = loadState();
      const deployed = requireDeployed(state);
      const agent = parentView(state, agentId);
      if (!agent) return text(`No agent ${agentId}.`, true);
      if (!isAddress(agent.address)) return text("Stored session address is not an address.", true);
      const outcome = await agentAct(
        {
          account: deployed.account,
          policy: deployed.policy,
          sessionKey: agent.sessionKey,
          call: inPolicyCall(deployed.vault),
        },
        { route: "alt", sign: false },
      );
      if (outcome.reason !== "allow") {
        return text({
          agentId: agent.id,
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
          call: inPolicyCall(deployed.vault),
        },
        { route: "alt", sign: true },
      );
      return text({
        agentId: agent.id,
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
