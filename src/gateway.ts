// stoa/src/gateway.ts — Multi-LLM Gateway with fallback routing
//
// Provides automatic failover between LLM providers.
// Primary: Anthropic Claude (via Claude Code CLI)
// Fallback: OpenAI (via API), Google Gemini (via API)

import { execSync } from "child_process";
import { writeFileSync, unlinkSync } from "fs";
import { createLogger } from "./logger.js";

const log = createLogger("gateway");

export interface LLMProvider {
  name: string;
  type: "claude-cli" | "openai-api" | "gemini-api";
  model: string;
  enabled: boolean;
  priority: number;
  timeout_ms: number;
  env_key?: string;
}

export interface LLMResponse {
  provider: string;
  model: string;
  output: string;
  duration_ms: number;
  success: boolean;
  error?: string;
}

const DEFAULT_PROVIDERS: LLMProvider[] = [
  {
    name: "claude",
    type: "claude-cli",
    model: "claude-3-opus-20240229",
    enabled: true,
    priority: 1,
    timeout_ms: 300_000,
    env_key: "ANTHROPIC_API_KEY",
  },
  {
    name: "openai",
    type: "openai-api",
    model: "gpt-4o",
    enabled: true,
    priority: 2,
    timeout_ms: 120_000,
    env_key: "OPENAI_API_KEY",
  },
  {
    name: "gemini",
    type: "gemini-api",
    model: "gemini-2.5-flash",
    enabled: true,
    priority: 3,
    timeout_ms: 120_000,
    env_key: "GEMINI_API_KEY",
  },
];

function isProviderAvailable(provider: LLMProvider): boolean {
  if (!provider.enabled) return false;
  if (provider.env_key && !process.env[provider.env_key]) return false;
  return true;
}

function executeClaudeCLI(prompt: string, model: string, timeout: number, allowedTools: string): string {
  const tmpFile = `/tmp/stoa-gateway-${Date.now()}.md`;
  writeFileSync(tmpFile, prompt);

  try {
    return execSync(
      `claude --model ${model} --allowedTools ${allowedTools} --print < ${tmpFile}`,
      { encoding: "utf-8", timeout, maxBuffer: 10 * 1024 * 1024 }
    );
  } finally {
    try { unlinkSync(tmpFile); } catch { /* ignore */ }
  }
}

function executeOpenAI(prompt: string, model: string, timeout: number): string {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not set");

  const payload = JSON.stringify({
    model,
    messages: [{ role: "user", content: prompt }],
    max_tokens: 4096,
    temperature: 0.3,
  });

  const tmpPayload = `/tmp/stoa-openai-${Date.now()}.json`;
  writeFileSync(tmpPayload, payload);

  try {
    const result = execSync(
      `curl -s -X POST "https://api.openai.com/v1/chat/completions" ` +
      `-H "Authorization: Bearer ${apiKey}" ` +
      `-H "Content-Type: application/json" ` +
      `-d @${tmpPayload}`,
      { encoding: "utf-8", timeout }
    );
    const parsed = JSON.parse(result);
    if (parsed.error) throw new Error(parsed.error.message);
    return parsed.choices?.[0]?.message?.content || "";
  } finally {
    try { unlinkSync(tmpPayload); } catch { /* ignore */ }
  }
}

function executeGemini(prompt: string, model: string, timeout: number): string {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not set");

  const payload = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.3, maxOutputTokens: 4096 },
  });

  const tmpPayload = `/tmp/stoa-gemini-${Date.now()}.json`;
  writeFileSync(tmpPayload, payload);

  try {
    const result = execSync(
      `curl -s -X POST "https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}" ` +
      `-H "Content-Type: application/json" ` +
      `-d @${tmpPayload}`,
      { encoding: "utf-8", timeout }
    );
    const parsed = JSON.parse(result);
    if (parsed.error) throw new Error(parsed.error.message);
    return parsed.candidates?.[0]?.content?.parts?.[0]?.text || "";
  } finally {
    try { unlinkSync(tmpPayload); } catch { /* ignore */ }
  }
}

function executeProvider(provider: LLMProvider, prompt: string, allowedTools: string): string {
  switch (provider.type) {
    case "claude-cli":
      return executeClaudeCLI(prompt, provider.model, provider.timeout_ms, allowedTools);
    case "openai-api":
      return executeOpenAI(prompt, provider.model, provider.timeout_ms);
    case "gemini-api":
      return executeGemini(prompt, provider.model, provider.timeout_ms);
    default:
      throw new Error(`Unknown provider type: ${provider.type}`);
  }
}

export function getAvailableProviders(customProviders?: LLMProvider[]): LLMProvider[] {
  const providers = customProviders || DEFAULT_PROVIDERS;
  return providers.filter(isProviderAvailable).sort((a, b) => a.priority - b.priority);
}

export async function executeWithFallback(
  prompt: string,
  options: {
    preferredModel?: string;
    allowedTools?: string;
    maxRetriesPerProvider?: number;
    fallbackEnabled?: boolean;
  } = {}
): Promise<LLMResponse> {
  const {
    allowedTools = "Read,Write,Edit,Bash,Glob,Grep",
    maxRetriesPerProvider = 1,
    fallbackEnabled = true,
  } = options;

  const available = getAvailableProviders();

  if (available.length === 0) {
    return { provider: "none", model: "none", output: "", duration_ms: 0, success: false, error: "No LLM providers available" };
  }

  // If preferred model specified, prioritize matching provider
  if (options.preferredModel) {
    const idx = available.findIndex((p) => p.model === options.preferredModel);
    if (idx > 0) {
      const [preferred] = available.splice(idx, 1);
      available.unshift(preferred);
    }
  }

  for (const provider of available) {
    for (let attempt = 1; attempt <= maxRetriesPerProvider; attempt++) {
      const startTime = Date.now();
      try {
        log.info(`Trying ${provider.name} (${provider.model}), attempt ${attempt}`);
        const output = executeProvider(provider, prompt, allowedTools);
        const duration = Date.now() - startTime;
        log.info(`${provider.name} succeeded`, { duration_ms: duration });
        return { provider: provider.name, model: provider.model, output, duration_ms: duration, success: true };
      } catch (e) {
        const error = e instanceof Error ? e.message : String(e);
        const duration = Date.now() - startTime;
        log.warn(`${provider.name} failed (attempt ${attempt})`, { error: error.slice(0, 200), duration_ms: duration });

        if (!fallbackEnabled) {
          return { provider: provider.name, model: provider.model, output: "", duration_ms: duration, success: false, error };
        }
      }
    }
  }

  log.error("All LLM providers failed");
  return { provider: "all-failed", model: "none", output: "", duration_ms: 0, success: false, error: "All providers failed" };
}

export function getGatewayStatus(): { available: string[]; unavailable: string[] } {
  const available: string[] = [];
  const unavailable: string[] = [];

  for (const p of DEFAULT_PROVIDERS) {
    if (isProviderAvailable(p)) {
      available.push(`${p.name} (${p.model})`);
    } else {
      unavailable.push(`${p.name} (${!p.enabled ? "disabled" : `missing ${p.env_key}`})`);
    }
  }
  return { available, unavailable };
}
