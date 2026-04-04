import { createHash } from "crypto";

import { NextResponse } from "next/server";

import { buildUserMessage, SYSTEM_PROMPT } from "@/lib/metrics-intelligence/prompt";
import type { MetricsResult } from "@/lib/metrics-intelligence/types";
import { parseModelJson } from "@/lib/model-json";

export const runtime = "nodejs";

const MODEL = "gpt-4o";
const MAX_ANALYSES_PER_VISITOR = 5;
const COOLDOWN_MS = 30 * 1000;
const WINDOW_MS = 24 * 60 * 60 * 1000;

type RateLimitDecision =
  | { allowed: true; remaining: number }
  | {
      allowed: false;
      remaining: number;
      retryAfterSeconds: number;
      reason: "cap" | "cooldown";
    };

type RateEntry = {
  windowStartMs: number;
  count: number;
  lastRequestMs: number;
};

function clamp(n: number, min: number, max: number): number {
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
    process.env.NEXTAUTH_SECRET ||
    process.env.OPENAI_API_KEY ||
    "metrics-intelligence-rate-limit";
  return createHash("sha256").update(`${value}|${secret}`).digest("hex");
}

function getRateStore(): Map<string, RateEntry> {
  const globalState = globalThis as unknown as {
    metricsIntelligenceRateStore?: Map<string, RateEntry>;
  };
  if (!globalState.metricsIntelligenceRateStore) {
    globalState.metricsIntelligenceRateStore = new Map();
  }
  return globalState.metricsIntelligenceRateStore;
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

function hasText(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function isMetricsResult(value: unknown): value is MetricsResult {
  if (!value || typeof value !== "object") return false;
  const data = value as Partial<MetricsResult>;
  return Boolean(
    data.company &&
      data.north_star &&
      Array.isArray(data.input_metrics) &&
      Array.isArray(data.guardrails) &&
      Array.isArray(data.metric_traps) &&
      data.callouts
  );
}

function validateResult(result: MetricsResult): string[] {
  const issues: string[] = [];

  if (result.input_metrics.length !== 4) {
    issues.push(`Expected 4 input metrics, got ${result.input_metrics.length}`);
  }
  if (result.guardrails.length !== 2) {
    issues.push(`Expected 2 guardrails, got ${result.guardrails.length}`);
  }
  if (result.metric_traps.length !== 3) {
    issues.push(`Expected 3 metric traps, got ${result.metric_traps.length}`);
  }

  if (!hasText(result.company.name)) issues.push("company.name is empty");
  if (!hasText(result.company.business_type)) issues.push("company.business_type is empty");
  if (!hasText(result.company.summary)) issues.push("company.summary is empty");
  if (!hasText(result.company.primary_user)) issues.push("company.primary_user is empty");
  if (!hasText(result.company.value_event)) issues.push("company.value_event is empty");
  if (!Array.isArray(result.company.assumptions) || result.company.assumptions.length === 0) {
    issues.push("company.assumptions is empty");
  }

  if (!hasText(result.north_star.name)) issues.push("north_star.name is empty");
  if (!hasText(result.north_star.definition)) issues.push("north_star.definition is empty");
  if (!hasText(result.north_star.formula)) issues.push("north_star.formula is empty");
  if (!hasText(result.north_star.why_this_works)) issues.push("north_star.why_this_works is empty");

  for (const [i, metric] of result.input_metrics.entries()) {
    if (!hasText(metric.name)) issues.push(`input_metrics[${i}].name is empty`);
    if (!hasText(metric.description)) {
      issues.push(`input_metrics[${i}].description is empty`);
    }
    if (!hasText(metric.owner)) issues.push(`input_metrics[${i}].owner is empty`);
  }

  for (const [i, guardrail] of result.guardrails.entries()) {
    if (!hasText(guardrail.name)) issues.push(`guardrails[${i}].name is empty`);
    if (!hasText(guardrail.description)) {
      issues.push(`guardrails[${i}].description is empty`);
    }
  }

  for (const [i, trap] of result.metric_traps.entries()) {
    if (!hasText(trap.title)) issues.push(`metric_traps[${i}].title is empty`);
    if (!hasText(trap.explanation)) {
      issues.push(`metric_traps[${i}].explanation is empty`);
    }
  }

  if (!hasText(result.callouts.north_star_insight)) {
    issues.push("callouts.north_star_insight is empty");
  }
  if (!hasText(result.callouts.system_insight)) {
    issues.push("callouts.system_insight is empty");
  }

  const rejectedNames = new Set(
    result.north_star.rejected_alternatives
      .map((item) => item.metric.toLowerCase().trim())
      .filter(Boolean)
  );

  for (const trap of result.metric_traps) {
    const normalized = trap.title.toLowerCase().trim();
    if (normalized && rejectedNames.has(normalized)) {
      issues.push(`Metric trap "${trap.title}" overlaps with a rejected alternative`);
    }
  }

  return issues;
}

async function callGpt4o(company: string): Promise<MetricsResult> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.7,
      max_tokens: 4096,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserMessage(company) },
      ],
    }),
  });

  const data = (await response.json().catch(() => null)) as
    | { choices?: Array<{ message?: { content?: string } }>; error?: { message?: string } }
    | null;

  if (!response.ok) {
    throw new Error(data?.error?.message || "OpenAI request failed");
  }

  const resultText = data?.choices?.[0]?.message?.content;
  if (!resultText || !resultText.trim()) {
    throw new Error("No response from API");
  }

  const parsed = parseModelJson(resultText);
  if (!isMetricsResult(parsed)) {
    throw new Error("Response schema mismatch");
  }

  return parsed;
}

async function analyzeCompany(company: string, isRetry = false): Promise<MetricsResult> {
  let result: MetricsResult;
  try {
    result = await callGpt4o(company);
  } catch (error) {
    if (!isRetry) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("metrics-intelligence parse/request failed, retrying once", error);
      }
      return analyzeCompany(company, true);
    }
    throw error;
  }

  const issues = validateResult(result);

  if (issues.length > 0 && !isRetry) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("metrics-intelligence validation failed, retrying once", issues);
    }
    return analyzeCompany(company, true);
  }

  if (issues.length > 0) {
    throw new Error(`Incomplete model output after retry: ${issues.slice(0, 4).join("; ")}`);
  }

  return result;
}

export async function POST(request: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "API key not configured" }, { status: 500 });
    }

    const body = (await request.json().catch(() => null)) as
      | { company?: string }
      | null;
    const company = body?.company?.trim() || "";

    if (company.length < 2) {
      return NextResponse.json(
        { error: "Please enter a valid company name" },
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

    const result = await analyzeCompany(company);
    const response = NextResponse.json({ ...result, remaining: rateLimit.remaining });
    response.headers.set("x-ratelimit-limit", String(MAX_ANALYSES_PER_VISITOR));
    response.headers.set("x-ratelimit-remaining", String(rateLimit.remaining));
    return response;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate analysis";
    if (process.env.NODE_ENV !== "production") {
      console.error("metrics-intelligence POST error", message, error);
      return NextResponse.json(
        { error: `Failed to generate analysis: ${message}` },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: "Failed to generate analysis" }, { status: 500 });
  }
}
