import { NextResponse } from "next/server";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

export const runtime = "nodejs";

type Provider = "anthropic" | "openai" | "deepseek" | "gemini";

type ProviderConfig = {
  model: string;
  url: string;
};

const PROJECT_RATE_LIMIT_MAX = 5;
const PROJECT_RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000;

const PROVIDERS: Record<Provider, ProviderConfig> = {
  anthropic: {
    url: "https://api.anthropic.com/v1/messages",
    model: "claude-sonnet-4-20250514",
  },
  openai: {
    url: "https://api.openai.com/v1/chat/completions",
    model: "gpt-4o-mini",
  },
  deepseek: {
    url: "https://api.deepseek.com/v1/chat/completions",
    model: "deepseek-chat",
  },
  gemini: {
    url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent",
    model: "gemini-1.5-flash",
  },
};

type ProjectRateEntry = {
  count: number;
  resetAt: number;
};

type RateDecision =
  | { allowed: true; remaining: number }
  | { allowed: false; remaining: number; retryAfterSeconds: number; reason: "project_cap" };

const FILE_ENV_CACHE = loadEnvFileValues();

function getProjectRateState(): ProjectRateEntry {
  const globalState = globalThis as unknown as {
    interviewGuideProjectRate?: ProjectRateEntry;
  };
  if (!globalState.interviewGuideProjectRate) {
    globalState.interviewGuideProjectRate = {
      count: 0,
      resetAt: Date.now() + PROJECT_RATE_LIMIT_WINDOW_MS,
    };
  }
  return globalState.interviewGuideProjectRate;
}

function setProjectRateState(next: ProjectRateEntry): void {
  const globalState = globalThis as unknown as {
    interviewGuideProjectRate?: ProjectRateEntry;
  };
  globalState.interviewGuideProjectRate = next;
}

function checkAndConsumeProjectLimit(): RateDecision {
  const now = Date.now();
  const state = getProjectRateState();

  if (now >= state.resetAt) {
    const resetState = { count: 1, resetAt: now + PROJECT_RATE_LIMIT_WINDOW_MS };
    setProjectRateState(resetState);
    return { allowed: true, remaining: PROJECT_RATE_LIMIT_MAX - 1 };
  }

  if (state.count >= PROJECT_RATE_LIMIT_MAX) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((state.resetAt - now) / 1000)),
      reason: "project_cap",
    };
  }

  const nextState = { ...state, count: state.count + 1 };
  setProjectRateState(nextState);
  return { allowed: true, remaining: Math.max(0, PROJECT_RATE_LIMIT_MAX - nextState.count) };
}

function parseEnvFile(filePath: string): Record<string, string> {
  if (!existsSync(filePath)) return {};

  const raw = readFileSync(filePath, "utf8");
  const values: Record<string, string> = {};

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }

  return values;
}

function loadEnvFileValues(): Record<string, string> {
  const cwd = process.cwd();
  const env = parseEnvFile(join(cwd, ".env"));
  const envLocal = parseEnvFile(join(cwd, ".env.local"));
  return {
    ...env,
    ...envLocal,
  };
}

function pickEnvValue(...keys: string[]): string {
  for (const key of keys) {
    const fromFile = (FILE_ENV_CACHE[key] || "").trim();
    if (fromFile) return fromFile;

    const fromProcess = (process.env[key] || "").trim();
    if (fromProcess) return fromProcess;
  }
  return "";
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function toText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function normalizeProvider(value: unknown): Provider {
  const raw = toText(value).trim().toLowerCase();
  if (raw === "anthropic") return "anthropic";
  if (raw === "openai") return "openai";
  if (raw === "deepseek") return "deepseek";
  if (raw === "gemini") return "gemini";
  return "openai";
}

function getApiKey(provider: Provider): string {
  if (provider === "openai") {
    return pickEnvValue("OPENAI_API_KEY", "VITE_API_KEY");
  }
  if (provider === "deepseek") {
    return pickEnvValue("DEEPSEEK_API_KEY", "VITE_API_KEY");
  }
  if (provider === "gemini") {
    return pickEnvValue("GEMINI_API_KEY", "VITE_API_KEY");
  }
  return pickEnvValue("ANTHROPIC_API_KEY", "VITE_API_KEY");
}

function extractErrorMessage(payload: unknown, status: number): string {
  if (typeof payload === "object" && payload !== null) {
    const asRecord = payload as Record<string, unknown>;

    const directMessage = toText(asRecord.message).trim();
    if (directMessage) return directMessage;

    if (typeof asRecord.error === "object" && asRecord.error !== null) {
      const nestedMessage = toText((asRecord.error as Record<string, unknown>).message).trim();
      if (nestedMessage) return nestedMessage;
      return JSON.stringify(asRecord.error);
    }
  }

  return `Upstream provider error (${status}).`;
}

function extractOpenCompatibleText(payload: unknown): string {
  if (typeof payload !== "object" || payload === null) return "";

  const choices = (payload as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || choices.length === 0) return "";

  const first = choices[0];
  if (typeof first !== "object" || first === null) return "";
  const message = (first as { message?: unknown }).message;
  if (typeof message !== "object" || message === null) return "";

  return toText((message as { content?: unknown }).content).trim();
}

function extractAnthropicText(payload: unknown): string {
  if (typeof payload !== "object" || payload === null) return "";

  const content = (payload as { content?: unknown }).content;
  if (!Array.isArray(content) || content.length === 0) return "";

  for (const block of content) {
    if (typeof block !== "object" || block === null) continue;
    const type = toText((block as { type?: unknown }).type);
    if (type !== "text") continue;
    const text = toText((block as { text?: unknown }).text).trim();
    if (text) return text;
  }

  return "";
}

function extractGeminiText(payload: unknown): string {
  if (typeof payload !== "object" || payload === null) return "";

  const candidates = (payload as { candidates?: unknown }).candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) return "";

  const first = candidates[0];
  if (typeof first !== "object" || first === null) return "";
  const content = (first as { content?: unknown }).content;
  if (typeof content !== "object" || content === null) return "";

  const parts = (content as { parts?: unknown }).parts;
  if (!Array.isArray(parts) || parts.length === 0) return "";

  return parts
    .map((part) => {
      if (typeof part !== "object" || part === null) return "";
      return toText((part as { text?: unknown }).text);
    })
    .join("")
    .trim();
}

async function callOpenCompatibleProvider(
  provider: Provider,
  prompt: string,
  maxTokens: number
): Promise<string> {
  const apiKey = getApiKey(provider);
  if (!apiKey) {
    throw new Error(`${provider.toUpperCase()} API key is missing.`);
  }

  const cfg = PROVIDERS[provider];
  const response = await fetch(cfg.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: cfg.model,
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const payload = (await response.json().catch(() => null)) as unknown;
  if (!response.ok) {
    throw new Error(extractErrorMessage(payload, response.status));
  }

  const text = extractOpenCompatibleText(payload);
  if (!text) {
    throw new Error(`${provider.toUpperCase()} returned an empty response.`);
  }

  return text;
}

async function callAnthropic(prompt: string, maxTokens: number): Promise<string> {
  const apiKey = getApiKey("anthropic");
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is missing.");
  }

  const cfg = PROVIDERS.anthropic;
  const response = await fetch(cfg.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "anthropic-version": "2023-06-01",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({
      model: cfg.model,
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const payload = (await response.json().catch(() => null)) as unknown;
  if (!response.ok) {
    throw new Error(extractErrorMessage(payload, response.status));
  }

  const text = extractAnthropicText(payload);
  if (!text) {
    throw new Error("ANTHROPIC returned an empty response.");
  }

  return text;
}

async function callGemini(prompt: string, maxTokens: number): Promise<string> {
  const apiKey = getApiKey("gemini");
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing.");
  }

  const cfg = PROVIDERS.gemini;
  const url = `${cfg.url}?key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: maxTokens,
      },
    }),
  });

  const payload = (await response.json().catch(() => null)) as unknown;
  if (!response.ok) {
    throw new Error(extractErrorMessage(payload, response.status));
  }

  const text = extractGeminiText(payload);
  if (!text) {
    throw new Error("GEMINI returned an empty response.");
  }

  return text;
}

async function callProvider(provider: Provider, prompt: string, maxTokens: number): Promise<string> {
  if (provider === "anthropic") {
    return callAnthropic(prompt, maxTokens);
  }
  if (provider === "gemini") {
    return callGemini(prompt, maxTokens);
  }
  return callOpenCompatibleProvider(provider, prompt, maxTokens);
}

export async function POST(request: Request) {
  try {
    const limit = checkAndConsumeProjectLimit();
    if (!limit.allowed) {
      const response = NextResponse.json(
        {
          error: `Interview Guide is at full project capacity right now. Retry in ${limit.retryAfterSeconds}s.`,
          remaining: limit.remaining,
          retryAfterSeconds: limit.retryAfterSeconds,
        },
        { status: 429 }
      );
      response.headers.set("x-ratelimit-limit", String(PROJECT_RATE_LIMIT_MAX));
      response.headers.set("x-ratelimit-remaining", String(limit.remaining));
      response.headers.set("retry-after", String(limit.retryAfterSeconds));
      return response;
    }

    const body = (await request.json().catch(() => null)) as
      | {
          prompt?: unknown;
          maxTokens?: unknown;
          provider?: unknown;
        }
      | null;

    const prompt = toText(body?.prompt).trim();
    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
    }

    const maxTokensRaw = Number(body?.maxTokens);
    const maxTokens = Number.isFinite(maxTokensRaw)
      ? clamp(Math.round(maxTokensRaw), 300, 5000)
      : 2500;

    const provider = normalizeProvider(body?.provider || process.env.VITE_PROVIDER || "openai");
    const text = await callProvider(provider, prompt, maxTokens);
    const response = NextResponse.json({ text, provider, remaining: limit.remaining });
    response.headers.set("x-ratelimit-limit", String(PROJECT_RATE_LIMIT_MAX));
    response.headers.set("x-ratelimit-remaining", String(limit.remaining));
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to generate response right now.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
