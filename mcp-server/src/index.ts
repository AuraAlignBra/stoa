#!/usr/bin/env node
// stoa MCP Server — Exposes swarm skills and state as callable tools
//
// Run: npx tsx mcp-server/src/index.ts
// Claude Desktop config: { "command": "npx", "args": ["tsx", "mcp-server/src/index.ts"] }

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { execSync } from "child_process";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve } from "path";

const ROOT = resolve(import.meta.dirname, "..");

function readState(file: string): unknown {
  const path = `${ROOT}/memory/${file}`;
  if (!existsSync(path)) return null;
  try { return JSON.parse(readFileSync(path, "utf-8")); } catch { return null; }
}

function runCLI(command: string): string {
  try {
    return execSync(`npx tsx ${ROOT}/src/index.ts ${command}`, {
      encoding: "utf-8", cwd: ROOT, timeout: 30_000,
    });
  } catch (e: unknown) {
    const err = e as { stdout?: string; stderr?: string };
    return err.stdout || err.stderr || "Command failed";
  }
}

const server = new McpServer({ name: "stoa", version: "0.2.0" });

// --- Tools ---

server.tool(
  "stoa_status",
  "Get current swarm status: agent states, portfolio value, open positions, wallet balance",
  {},
  async () => {
    const cronState = readState("cron-state.json");
    const portfolio = readState("portfolio-state.json");
    const positions = readState("positions.json");
    const wallet = readState("wallet-balance.json");
    return { content: [{ type: "text" as const, text: JSON.stringify({ cronState, portfolio, positions, wallet }, null, 2) }] };
  }
);

server.tool(
  "stoa_health",
  "Get skill health reports: quality scores, trends, failing skills that need repair",
  {},
  async () => {
    const output = runCLI("health");
    return { content: [{ type: "text" as const, text: output }] };
  }
);

server.tool(
  "stoa_dispatch",
  "Run the cron dispatcher to check which agents are due and trigger them (dry-run outside CI)",
  {},
  async () => {
    const output = runCLI("dispatch");
    return { content: [{ type: "text" as const, text: output }] };
  }
);

server.tool(
  "stoa_execute",
  "Execute a specific agent's skill immediately",
  {
    agent: z.enum(["scout", "analyst", "executor", "guardian"]).describe("Agent name"),
    skill: z.string().describe("Skill name (e.g., scan-tokens, analyze-signal, check-risk)"),
  },
  async ({ agent, skill }) => {
    const output = runCLI(`execute ${agent} ${skill}`);
    return { content: [{ type: "text" as const, text: output }] };
  }
);

server.tool(
  "stoa_mesh_read",
  "Read an agent's inbox messages (mesh communication)",
  {
    agent: z.enum(["scout", "analyst", "executor", "guardian"]).describe("Agent whose inbox to read"),
  },
  async ({ agent }) => {
    const messages = readState(`mesh/${agent}.json`);
    return { content: [{ type: "text" as const, text: JSON.stringify(messages, null, 2) }] };
  }
);

server.tool(
  "stoa_mesh_post",
  "Post a message to an agent's inbox (e.g., manual signal injection or halt command)",
  {
    from: z.string().describe("Sender identifier"),
    to: z.enum(["scout", "analyst", "executor", "guardian"]).describe("Recipient agent"),
    type: z.string().describe("Message type: signal, trade-signal, halt, feedback, cooldown"),
    data: z.string().describe("JSON string of message payload"),
  },
  async ({ from, to, type, data }) => {
    try {
      const meshPath = `${ROOT}/memory/mesh/${to}.json`;
      const inbox = existsSync(meshPath) ? JSON.parse(readFileSync(meshPath, "utf-8")) : [];
      inbox.push({
        from, to, type,
        id: `${from}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toISOString(),
        data: JSON.parse(data),
      });
      writeFileSync(meshPath, JSON.stringify(inbox, null, 2));
      return { content: [{ type: "text" as const, text: `Message posted: ${from} → ${to} (${type})` }] };
    } catch (e) {
      return { content: [{ type: "text" as const, text: `Error: ${e instanceof Error ? e.message : e}` }] };
    }
  }
);

server.tool(
  "stoa_positions",
  "Get all open trading positions with entry prices, stop-losses, and current state",
  {},
  async () => {
    const positions = readState("positions.json");
    return { content: [{ type: "text" as const, text: JSON.stringify(positions, null, 2) }] };
  }
);

server.tool(
  "stoa_cost",
  "Get token usage and cost summary (last 7 days breakdown by agent and model)",
  {},
  async () => {
    const output = runCLI("cost");
    return { content: [{ type: "text" as const, text: output }] };
  }
);

server.tool(
  "stoa_chain",
  "Execute a predefined skill chain (multi-step pipeline with dependency resolution)",
  {
    chain_id: z.enum(["full-scan", "morning-pipeline", "weekly-maintenance"]).describe("Chain ID from stoa.yml"),
  },
  async ({ chain_id }) => {
    const output = runCLI(`chain ${chain_id}`);
    return { content: [{ type: "text" as const, text: output }] };
  }
);

server.tool(
  "stoa_halt",
  "Emergency halt: freeze all agents immediately. Only Guardian continues running.",
  {
    reason: z.string().describe("Reason for emergency halt"),
    cooldown_hours: z.number().default(4).describe("Hours to keep swarm frozen"),
  },
  async ({ reason, cooldown_hours }) => {
    const cooldownUntil = new Date(Date.now() + cooldown_hours * 60 * 60 * 1000).toISOString();
    for (const agent of ["scout", "analyst", "executor", "guardian"]) {
      const meshPath = `${ROOT}/memory/mesh/${agent}.json`;
      const inbox = existsSync(meshPath) ? JSON.parse(readFileSync(meshPath, "utf-8")) : [];
      inbox.push({ from: "mcp-operator", to: agent, type: "halt", id: `halt-${Date.now()}`, timestamp: new Date().toISOString(), data: { reason, cooldown_until: cooldownUntil } });
      writeFileSync(meshPath, JSON.stringify(inbox, null, 2));
    }
    const cronPath = `${ROOT}/memory/cron-state.json`;
    const state = existsSync(cronPath) ? JSON.parse(readFileSync(cronPath, "utf-8")) : { agents: {} };
    state.swarm_status = "halted";
    state.cooldown_until = cooldownUntil;
    writeFileSync(cronPath, JSON.stringify(state, null, 2));
    return { content: [{ type: "text" as const, text: `Swarm HALTED until ${cooldownUntil}. Reason: ${reason}` }] };
  }
);

server.tool(
  "stoa_resume",
  "Resume swarm from halted/cooldown state back to active operation",
  {},
  async () => {
    const cronPath = `${ROOT}/memory/cron-state.json`;
    const state = existsSync(cronPath) ? JSON.parse(readFileSync(cronPath, "utf-8")) : { agents: {} };
    state.swarm_status = "active";
    delete state.cooldown_until;
    writeFileSync(cronPath, JSON.stringify(state, null, 2));
    return { content: [{ type: "text" as const, text: "Swarm RESUMED. Status: active" }] };
  }
);

server.tool(
  "stoa_validate",
  "Validate swarm configuration (stoa.yml) and all referenced skill/agent files",
  {},
  async () => {
    const output = runCLI("validate");
    return { content: [{ type: "text" as const, text: output }] };
  }
);

server.tool(
  "stoa_gateway",
  "Check LLM gateway status: which providers are available for fallback",
  {},
  async () => {
    const output = runCLI("gateway");
    return { content: [{ type: "text" as const, text: output }] };
  }
);

// --- Start ---
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
