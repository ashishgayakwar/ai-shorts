import { createHash } from "crypto";

import { NextResponse } from "next/server";
import OpenAI from "openai";

import { parseModelJson } from "@/lib/model-json";
import { createCompletionWithDeepSeekFallback } from "@/lib/openai-fallback";

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

const MAX_ANALYSES_PER_VISITOR = 5;
const COOLDOWN_MS = 30 * 1000;
const WINDOW_MS = 24 * 60 * 60 * 1000;

type Competitor = {
  name: string;
  domain: string;
  tagline: string;
  pricing: string;
  description: string;
  target_audience: string;
  key_features: string[];
  weaknesses: string[];
  strength: string;
};

type Opportunity = {
  title: string;
  summary: string;
  gaps: string[];
};

type CompetitorPayload = {
  industry: string;
  competitors: Competitor[];
  opportunity: Opportunity;
};

type RateLimitDecision =
  | { allowed: true; remaining: number }
  | { allowed: false; remaining: number; retryAfterSeconds: number; reason: "cap" | "cooldown" };

type RateEntry = {
  windowStartMs: number;
  count: number;
  lastRequestMs: number;
};

function toText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function getClientIp(request: Request): string {
  const xForwardedFor = request.headers.get("x-forwarded-for");
  if (xForwardedFor) {
    const firstIp = xForwardedFor.split(",")[0]?.trim();
    if (firstIp) return firstIp;
  }

  const realIp = request.headers.get("x-real-ip")?.trim();
  return realIp || "unknown";
}

function hashWithSecret(value: string): string {
  const secret =
    process.env.NEXTAUTH_SECRET || process.env.OPENAI_API_KEY || "competitor-analysis-rate-limit";
  return createHash("sha256").update(`${value}|${secret}`).digest("hex");
}

function getRateStore(): Map<string, RateEntry> {
  const globalState = globalThis as unknown as {
    competitorAnalysisRateStore?: Map<string, RateEntry>;
  };

  if (!globalState.competitorAnalysisRateStore) {
    globalState.competitorAnalysisRateStore = new Map();
  }

  return globalState.competitorAnalysisRateStore;
}

function checkAndConsumeRateLimit(request: Request): RateLimitDecision {
  const now = Date.now();
  const ip = getClientIp(request);
  const fingerprint = request.headers.get("x-fingerprint") || "unknown";
  const key = hashWithSecret(`${ip}|${fingerprint}`);
  const store = getRateStore();
  const existing = store.get(key);

  if (!existing) {
    store.set(key, { windowStartMs: now, count: 1, lastRequestMs: now });
    return { allowed: true, remaining: MAX_ANALYSES_PER_VISITOR - 1 };
  }

  if (now - existing.windowStartMs >= WINDOW_MS) {
    store.set(key, { windowStartMs: now, count: 1, lastRequestMs: now });
    return { allowed: true, remaining: MAX_ANALYSES_PER_VISITOR - 1 };
  }

  if (now - existing.lastRequestMs < COOLDOWN_MS) {
    const retryAfterSeconds = clamp(
      Math.ceil((COOLDOWN_MS - (now - existing.lastRequestMs)) / 1000),
      1,
      30
    );
    return {
      allowed: false,
      remaining: Math.max(0, MAX_ANALYSES_PER_VISITOR - existing.count),
      retryAfterSeconds,
      reason: "cooldown",
    };
  }

  if (existing.count >= MAX_ANALYSES_PER_VISITOR) {
    const retryAfterSeconds = clamp(
      Math.ceil((existing.windowStartMs + WINDOW_MS - now) / 1000),
      1,
      24 * 60 * 60
    );
    return { allowed: false, remaining: 0, retryAfterSeconds, reason: "cap" };
  }

  const updated: RateEntry = {
    ...existing,
    count: existing.count + 1,
    lastRequestMs: now,
  };
  store.set(key, updated);

  return { allowed: true, remaining: Math.max(0, MAX_ANALYSES_PER_VISITOR - updated.count) };
}

function normalizeList(value: unknown, fallback: string[] = []): string[] {
  if (!Array.isArray(value)) return fallback;
  const list = value
    .map((item) => toText(item))
    .filter(Boolean)
    .slice(0, 8);
  return list.length ? list : fallback;
}

function inferDomainFromName(name: string): string {
  const root = name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .trim()
    .split(/\s+/)[0];
  return root ? `${root}.com` : "example.com";
}

function normalizeCompetitor(value: unknown): Competitor | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  const name = toText(item.name);
  if (!name) return null;
  const rawDomain = toText(item.domain).toLowerCase();
  const domain = rawDomain.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0].trim();

  return {
    name,
    domain: domain || inferDomainFromName(name),
    tagline: toText(item.tagline) || "Competitor in this space.",
    pricing: toText(item.pricing) || "Not publicly disclosed",
    description:
      toText(item.description) ||
      "A recognized player in this category with established distribution and a defined market segment.",
    target_audience: toText(item.target_audience) || "General market users",
    key_features: normalizeList(item.key_features, ["Core product workflow"]).slice(0, 5),
    weaknesses: normalizeList(item.weaknesses, ["Limited differentiation"]),
    strength: toText(item.strength) || "Strong brand and distribution make it difficult to displace.",
  };
}

function normalizeOpportunity(value: unknown): Opportunity {
  const obj = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return {
    title: toText(obj.title) || "Opportunity to Differentiate",
    summary:
      toText(obj.summary) ||
      "There is room to offer a cleaner, more focused product experience in this market.",
    gaps: normalizeList(obj.gaps, [
      "A focused positioning angle is still open.",
      "Simpler onboarding could capture underserved users.",
      "Better pricing clarity can improve conversion trust.",
    ]).slice(0, 3),
  };
}

function parseResult(raw: unknown, industryInput: string): CompetitorPayload {
  const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const competitors = Array.isArray(obj.competitors)
    ? obj.competitors.map(normalizeCompetitor).filter(Boolean).slice(0, 5)
    : [];

  return {
    industry: toText(obj.industry) || industryInput,
    competitors: (competitors as Competitor[]).length
      ? (competitors as Competitor[])
      : [
          {
            name: "No clear competitor found",
            domain: "example.com",
            tagline: "Try a more specific industry input.",
            pricing: "N/A",
            description: "Insufficient signals were found for this market input.",
            target_audience: "N/A",
            key_features: ["N/A"],
            weaknesses: ["N/A"],
            strength: "Market signal is currently too weak for a defensible read.",
          },
        ],
    opportunity: normalizeOpportunity(obj.opportunity),
  };
}

export async function POST(request: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "Server is missing OPENAI_API_KEY." }, { status: 500 });
    }

    const body = (await request.json().catch(() => null)) as { industry?: unknown } | null;
    const industry = toText(body?.industry).slice(0, 180);

    if (industry.length < 2) {
      return NextResponse.json(
        { error: "Please enter a valid industry or product space." },
        { status: 400 }
      );
    }

    const rateLimit = checkAndConsumeRateLimit(request);
    if (!rateLimit.allowed) {
      const message =
        rateLimit.reason === "cooldown"
          ? `Please wait ${rateLimit.retryAfterSeconds}s before trying again.`
          : "You have reached the maximum of 5 analyses for this browser and IP.";

      const response = NextResponse.json(
        {
          error: message,
          remaining: rateLimit.remaining,
          retryAfterSeconds: rateLimit.retryAfterSeconds,
        },
        { status: 429 }
      );
      response.headers.set("x-ratelimit-limit", String(MAX_ANALYSES_PER_VISITOR));
      response.headers.set("x-ratelimit-remaining", String(rateLimit.remaining));
      response.headers.set("retry-after", String(rateLimit.retryAfterSeconds));
      return response;
    }

    const prompt = `Research top 5 competitors in: "${industry}".

Return ONLY JSON:
{
  "industry": "...",
  "competitors": [
    {
      "name": "...",
      "domain": "e.g. khanacademy.org",
      "tagline": "One short line — max 8 words",
      "pricing": "Concise: Free / $X/mo / Enterprise",
      "description": "2 sentences max. Max 40 words.",
      "target_audience": "1–2 sentences describing who uses this",
      "key_features": ["...", "...", "...", "...", "..."],
      "weaknesses": ["Full sentence.", "Full sentence.", "Full sentence."],
      "strength": "One sentence: what makes them genuinely hard to beat."
    }
  ],
  "opportunity": {
    "title": "Max 8 words",
    "summary": "3 sentences on the white space",
    "gaps": ["Specific gap 1", "Specific gap 2", "Specific gap 3"]
  }
}`;

    const createCompletion = () =>
      createCompletionWithDeepSeekFallback({
        openai,
        deepseek,
        timeoutMs: 60_000,
        params: {
          model: "gpt-4o-mini",
          temperature: 0.2,
          response_format: { type: "json_object" },
          messages: [{ role: "user", content: prompt }],
          max_tokens: 2200,
        },
      });

    const completion = await createCompletion();
    const content = completion.choices[0]?.message?.content || "{}";
    let parsed: unknown;
    try {
      parsed = parseModelJson(content);
    } catch {
      const retry = await createCompletion();
      parsed = parseModelJson(retry.choices[0]?.message?.content || "{}");
    }
    const payload = parseResult(parsed, industry);

    const response = NextResponse.json(payload);
    response.headers.set("x-ratelimit-limit", String(MAX_ANALYSES_PER_VISITOR));
    response.headers.set("x-ratelimit-remaining", String(rateLimit.remaining));
    return response;
  } catch (error) {
    console.error("/api/competitor-analysis failed", error);
    return NextResponse.json(
      { error: "Unable to analyze competitors right now. Please try again." },
      { status: 500 }
    );
  }
}
