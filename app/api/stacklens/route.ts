import { createHash } from "crypto";

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
const deepseek = process.env.DEEPSEEK_API_KEY
  ? new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: "https://api.deepseek.com/v1",
    })
  : null;

const RATE_LIMIT_MAX = 8;
const RATE_LIMIT_WINDOW_MS = 60_000;
const PROMPT_MAX_CHARS = 8_000;
const OPENAI_TIMEOUT_MS = 60_000;
const APPROVED_TOOLS = {
  Frontend: [
    "Next.js",
    "React",
    "Vue.js",
    "Nuxt",
    "Svelte",
    "Remix",
    "Astro",
    "React Native",
    "Flutter",
    "Expo",
  ],
  Design: ["Figma", "Framer", "Webflow", "Sketch"],
  Backend: ["Node.js", "FastAPI", "Django", "Express.js", "Go", "Flask", "Spring"],
  Database: [
    "PostgreSQL",
    "MongoDB",
    "Supabase",
    "Firebase",
    "PlanetScale",
    "Redis",
    "MySQL",
    "SQLite",
  ],
  Auth: ["Clerk", "Auth0", "Supabase Auth", "NextAuth", "Firebase Auth"],
  "AI Layer": [
    "OpenAI",
    "Anthropic",
    "Replicate",
    "Hugging Face",
    "LangChain",
    "Vercel AI SDK",
  ],
  Analytics: ["PostHog", "Mixpanel", "Amplitude", "Google Analytics", "Sentry"],
  Hosting: ["Vercel", "Railway", "Render", "AWS", "DigitalOcean", "Google Cloud", "Heroku"],
  "Project Management": ["Linear", "Notion", "Jira", "Trello", "Slack", "GitHub"],
} as const;

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const rateLimitStore = new Map<string, RateLimitEntry>();

function getClientIp(request: NextRequest): string {
  const xForwardedFor = request.headers.get("x-forwarded-for");
  if (xForwardedFor) {
    const firstIp = xForwardedFor.split(",")[0]?.trim();
    if (firstIp) return firstIp;
  }

  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

function hashWithSecret(value: string): string {
  const secret = process.env.NEXTAUTH_SECRET || process.env.OPENAI_API_KEY || "stacklens-rate-limit-secret";
  return createHash("sha256").update(`${value}|${secret}`).digest("hex");
}

function getRateLimitKey(request: NextRequest): string {
  const ip = getClientIp(request);
  const fingerprint = request.headers.get("x-fingerprint") || "unknown";
  return hashWithSecret(`${ip}|${fingerprint}`);
}

function consumeRateLimit(
  key: string,
): { limited: boolean; remaining: number; retryAfterSeconds: number } {
  const now = Date.now();
  const existing = rateLimitStore.get(key);

  if (!existing || now >= existing.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { limited: false, remaining: RATE_LIMIT_MAX - 1, retryAfterSeconds: 0 };
  }

  const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
  if (existing.count >= RATE_LIMIT_MAX) {
    return { limited: true, remaining: 0, retryAfterSeconds };
  }

  existing.count += 1;
  rateLimitStore.set(key, existing);
  return { limited: false, remaining: Math.max(0, RATE_LIMIT_MAX - existing.count), retryAfterSeconds: 0 };
}

function withRateHeaders(
  response: NextResponse,
  remaining: number,
  retryAfterSeconds?: number,
) {
  response.headers.set("x-ratelimit-limit", String(RATE_LIMIT_MAX));
  response.headers.set("x-ratelimit-remaining", String(Math.max(0, remaining)));
  if (typeof retryAfterSeconds === "number" && retryAfterSeconds > 0) {
    response.headers.set("retry-after", String(retryAfterSeconds));
  }
}

function getErrorStatus(error: unknown): number | undefined {
  if (typeof error === "object" && error !== null && "status" in error) {
    const status = (error as { status?: unknown }).status;
    if (typeof status === "number") return status;
  }
  return undefined;
}

function getErrorMessage(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }
  if (error instanceof Error) return error.message;
  return "";
}

async function runGpt4o(prompt: string): Promise<string> {
  const completion = await openai.chat.completions.create(
    {
      model: "gpt-4o",
      temperature: 0.3,
      max_tokens: 4000,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
    },
    { signal: AbortSignal.timeout(OPENAI_TIMEOUT_MS) },
  );

  return completion.choices[0]?.message?.content?.trim() || "";
}

async function runDeepSeek(prompt: string): Promise<string> {
  if (!deepseek) {
    throw new Error("DEEPSEEK_API_KEY is not configured.");
  }

  const completion = await deepseek.chat.completions.create(
    {
      model: "deepseek-chat",
      temperature: 0.3,
      max_tokens: 4000,
      messages: [{ role: "user", content: prompt }],
    },
    { signal: AbortSignal.timeout(OPENAI_TIMEOUT_MS) },
  );

  return completion.choices[0]?.message?.content?.trim() || "";
}

function parseStackPromptContext(prompt: string): { userIdea: string; detectedAppType: string; answers: string } | null {
  if (!prompt.includes("Tech stack advisor for PMs and founders.")) return null;

  const appMatch = prompt.match(/App:\s*"([^"]+)"/i);
  const typeMatch = prompt.match(/Type:\s*([^\n]+)/i);
  const contextMatch = prompt.match(/Context:\s*([^\n]+)/i);

  const userIdea = appMatch?.[1]?.trim() || "";
  const detectedAppType = typeMatch?.[1]?.trim() || "";
  const answers = contextMatch?.[1]?.trim() || "";

  if (!userIdea || !detectedAppType) return null;

  return { userIdea, detectedAppType, answers: answers || "Not specified" };
}

function buildApprovedStackPrompt(userIdea: string, detectedAppType: string, answers: string): string {
  return `You are a tech stack advisor for PMs and founders.

App: "${userIdea}"
Type: ${detectedAppType}
Context: ${answers}

Your job is to recommend the best tools for this specific app based on the user's scale, budget, team size and app type. Use your judgment — a solo founder building a fitness app needs a different stack than a team building enterprise SaaS.

You MUST only recommend tools from this approved list:
${JSON.stringify(APPROVED_TOOLS)}

Respond ONLY valid JSON, no markdown:
{"costRange":"$X–Y/mo","costNote":"brief","scaleTrigger":"X users","complexity":"Low|Medium|High","layers":[{"name":"Frontend","tools":[{"name":"Tool","badge":"Best Pick","reason":"12 words max specific reason"}]}]}

Each layer: recommend as many tools as are genuinely relevant from the approved list. Minimum 2, maximum 4. Do not pad with weak options just to hit a number. Do not limit to 2 if there are stronger options worth showing. First = best fit for their context. Badge: exactly "Best Pick", "Free Tier", or "For Scale". Reasons must be specific to their app and answers, not generic.`;
}

function toErrorMessage(error: unknown): { message: string; status: number } {
  if (error instanceof Error && error.name === "AbortError") {
    return { message: "Request timed out. Please try again.", status: 504 };
  }

  const status = getErrorStatus(error);
  const upstreamMessage = getErrorMessage(error);

  if (status === 401) {
    return { message: "OpenAI authentication failed. Check OPENAI_API_KEY on server.", status: 500 };
  }
  if (status === 429) {
    if (upstreamMessage.toLowerCase().includes("insufficient_quota")) {
      return {
        message: "OpenAI quota is exhausted for the current API key. Add credits or change key.",
        status: 429,
      };
    }
    return { message: "OpenAI rate limit reached (429). Please retry in a minute.", status: 429 };
  }
  if (typeof status === "number" && status >= 500) {
    return { message: "OpenAI is temporarily unavailable. Please try again.", status: 502 };
  }
  if (typeof status === "number" && status >= 400) {
    const msg = upstreamMessage || "OpenAI request failed due to invalid input.";
    return { message: msg, status: 400 };
  }

  const msg = upstreamMessage.trim() || "Failed to generate StackLens response.";

  return { message: msg, status: 500 };
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Server is missing OPENAI_API_KEY." },
        { status: 500 },
      );
    }

    const rateLimitKey = getRateLimitKey(request);
    const decision = consumeRateLimit(rateLimitKey);
    if (decision.limited) {
      const response = NextResponse.json(
        { error: "Too many requests. Try again in a minute." },
        { status: 429 },
      );
      withRateHeaders(response, decision.remaining, decision.retryAfterSeconds);
      return response;
    }

    const body = (await request.json().catch(() => null)) as { prompt?: unknown } | null;
    const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";

    if (!prompt) {
      const response = NextResponse.json(
        { error: "Prompt is required." },
        { status: 400 },
      );
      withRateHeaders(response, decision.remaining);
      return response;
    }

    if (prompt.length > PROMPT_MAX_CHARS) {
      const response = NextResponse.json(
        { error: `Prompt too long. Maximum ${PROMPT_MAX_CHARS} characters.` },
        { status: 400 },
      );
      withRateHeaders(response, decision.remaining);
      return response;
    }

    const stackContext = parseStackPromptContext(prompt);
    const llmPrompt = stackContext
      ? buildApprovedStackPrompt(stackContext.userIdea, stackContext.detectedAppType, stackContext.answers)
      : prompt;

    let result = "";
    let modelUsed = "gpt-4o";

    try {
      result = await runGpt4o(llmPrompt);
    } catch (primaryError) {
      const status = getErrorStatus(primaryError);
      const shouldFallback =
        !!deepseek &&
        (status === 429 ||
          (typeof status === "number" && status >= 500) ||
          (primaryError instanceof Error && primaryError.name === "AbortError"));

      if (!shouldFallback) {
        throw primaryError;
      }

      result = await runDeepSeek(llmPrompt);
      modelUsed = "deepseek-chat";
    }

    if (!result) {
      throw new Error("Empty response from OpenAI.");
    }

    const response = NextResponse.json({ result });
    withRateHeaders(response, decision.remaining);
    response.headers.set("x-stacklens-model", modelUsed);
    return response;
  } catch (error) {
    const { message, status } = toErrorMessage(error);
    return NextResponse.json({ error: message }, { status });
  }
}
