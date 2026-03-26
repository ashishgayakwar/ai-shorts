import { createHash, randomUUID } from "crypto";

import { NextResponse } from "next/server";
import OpenAI from "openai";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MAX_JD_CHARS = 12_000;
const MAX_RESUME_CHARS = 12_000;
const MAX_ANALYSES_PER_VISITOR = 5;
const COOLDOWN_SECONDS = 30;

type MatchStatus = "Strong Match" | "Needs Work" | "Not a Fit";

type ScreenerResult = {
  fitScore: number;
  status: MatchStatus;
  matching: string[];
  missing: string[];
  oneThingToFixNow: string;
};

type RateLimitDecision =
  | {
      allowed: true;
      remaining: number;
    }
  | {
      allowed: false;
      remaining: number;
      retryAfterSeconds: number;
      reason: "cap" | "cooldown";
    };

type RateStatsRow = {
  total_count: number;
  latest_created_at: Date | null;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function toCleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeWhitespace(text: string): string {
  return text.replace(/\u0000/g, "").replace(/\s+/g, " ").trim();
}

function normalizeList(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback;
  const cleaned = value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
    .slice(0, 8);

  return cleaned.length ? cleaned : fallback;
}

function scoreToStatus(score: number): MatchStatus {
  if (score >= 75) return "Strong Match";
  if (score >= 45) return "Needs Work";
  return "Not a Fit";
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

function buildServerFingerprint(request: Request): string {
  const parts = [
    request.headers.get("user-agent") || "",
    request.headers.get("accept-language") || "",
    request.headers.get("sec-ch-ua") || "",
    request.headers.get("sec-ch-ua-platform") || "",
    request.headers.get("sec-ch-ua-mobile") || "",
    request.headers.get("accept") || "",
    request.headers.get("accept-encoding") || "",
  ];

  return parts.join("|");
}

function hashWithSecret(value: string): string {
  const secret = process.env.NEXTAUTH_SECRET || process.env.OPENAI_API_KEY || "pm-resume-screener-secret";
  return createHash("sha256").update(`${value}|${secret}`).digest("hex");
}

function isMissingRateLimitTableError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const maybeError = error as {
    message?: string;
    meta?: { code?: string; message?: string };
  };

  if (maybeError.meta?.code === "42P01") return true;
  if (typeof maybeError.meta?.message === "string" && maybeError.meta.message.includes("ResumeScreenerRequest")) {
    return true;
  }
  if (typeof maybeError.message === "string" && maybeError.message.includes("ResumeScreenerRequest")) {
    return true;
  }

  return false;
}

function getInMemoryRateLimitStore() {
  const globalState = globalThis as unknown as {
    pmResumeScreenerRateLimit?: Map<string, { count: number; lastCreatedAtMs: number }>;
  };

  if (!globalState.pmResumeScreenerRateLimit) {
    globalState.pmResumeScreenerRateLimit = new Map();
  }

  return globalState.pmResumeScreenerRateLimit;
}

function checkRateLimitInMemory(visitorHash: string): RateLimitDecision {
  const now = Date.now();
  const store = getInMemoryRateLimitStore();
  const existing = store.get(visitorHash);

  if (!existing) {
    store.set(visitorHash, { count: 1, lastCreatedAtMs: now });
    return {
      allowed: true,
      remaining: MAX_ANALYSES_PER_VISITOR - 1,
    };
  }

  if (now - existing.lastCreatedAtMs < COOLDOWN_SECONDS * 1000) {
    const retryAfterSeconds = clamp(
      Math.ceil((COOLDOWN_SECONDS * 1000 - (now - existing.lastCreatedAtMs)) / 1000),
      1,
      COOLDOWN_SECONDS
    );

    return {
      allowed: false,
      remaining: Math.max(0, MAX_ANALYSES_PER_VISITOR - existing.count),
      retryAfterSeconds,
      reason: "cooldown",
    };
  }

  if (existing.count >= MAX_ANALYSES_PER_VISITOR) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: 0,
      reason: "cap",
    };
  }

  const updated = {
    count: existing.count + 1,
    lastCreatedAtMs: now,
  };

  store.set(visitorHash, updated);

  return {
    allowed: true,
    remaining: Math.max(0, MAX_ANALYSES_PER_VISITOR - updated.count),
  };
}

async function checkAndStoreRateLimit(request: Request): Promise<RateLimitDecision> {
  const ip = getClientIp(request);
  const fingerprintSource = buildServerFingerprint(request);

  const ipHash = hashWithSecret(ip);
  const fingerprintHash = hashWithSecret(fingerprintSource || "unknown");
  const visitorHash = hashWithSecret(`${ipHash}|${fingerprintHash}`);

  try {
    const statsRows = await prisma.$queryRaw<RateStatsRow[]>`
      SELECT
        COUNT(*)::int AS total_count,
        MAX("createdAt") AS latest_created_at
      FROM "ResumeScreenerRequest"
      WHERE "visitorHash" = ${visitorHash}
    `;

    const stats = statsRows[0] || { total_count: 0, latest_created_at: null };
    const latestCreatedAtMs = stats.latest_created_at
      ? new Date(stats.latest_created_at).getTime()
      : 0;
    const nowMs = Date.now();

    if (latestCreatedAtMs && nowMs - latestCreatedAtMs < COOLDOWN_SECONDS * 1000) {
      const retryAfterSeconds = clamp(
        Math.ceil((COOLDOWN_SECONDS * 1000 - (nowMs - latestCreatedAtMs)) / 1000),
        1,
        COOLDOWN_SECONDS
      );

      return {
        allowed: false,
        remaining: Math.max(0, MAX_ANALYSES_PER_VISITOR - stats.total_count),
        retryAfterSeconds,
        reason: "cooldown",
      };
    }

    if (stats.total_count >= MAX_ANALYSES_PER_VISITOR) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: 0,
        reason: "cap",
      };
    }

    const now = new Date(nowMs);
    await prisma.$executeRaw`
      INSERT INTO "ResumeScreenerRequest" ("id", "visitorHash", "ipHash", "fingerprintHash", "createdAt")
      VALUES (${randomUUID()}, ${visitorHash}, ${ipHash}, ${fingerprintHash}, ${now})
    `;

    return {
      allowed: true,
      remaining: Math.max(0, MAX_ANALYSES_PER_VISITOR - (stats.total_count + 1)),
    };
  } catch (error) {
    if (!isMissingRateLimitTableError(error)) {
      console.warn("Rate-limit DB unavailable; using in-memory fallback.", error);
    }

    return checkRateLimitInMemory(visitorHash);
  }
}

function toResult(raw: unknown): ScreenerResult {
  const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};

  const scoreRaw = Number(obj.fitScore);
  const fitScore = Number.isFinite(scoreRaw) ? clamp(Math.round(scoreRaw), 0, 100) : 0;

  const matching = normalizeList(obj.matching, ["No strong overlaps detected yet."]);
  const missing = normalizeList(obj.missing, ["Core PM signals could not be identified from the current resume."]);

  const fix =
    typeof obj.oneThingToFixNow === "string" && obj.oneThingToFixNow.trim().length
      ? obj.oneThingToFixNow.trim()
      : "Add one quantified PM achievement that matches the JD's top requirement.";

  return {
    fitScore,
    status: scoreToStatus(fitScore),
    matching,
    missing,
    oneThingToFixNow: fix,
  };
}

export async function POST(request: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Server is missing OPENAI_API_KEY." },
        { status: 500 }
      );
    }

    const body = (await request.json().catch(() => null)) as
      | {
          jobDescription?: unknown;
          resumeText?: unknown;
        }
      | null;

    const jobDescription = toCleanString(body?.jobDescription);
    const resumeText = normalizeWhitespace(toCleanString(body?.resumeText));

    if (jobDescription.length < 80) {
      return NextResponse.json(
        { error: "Please paste a fuller job description (at least 80 characters)." },
        { status: 400 }
      );
    }

    if (resumeText.length < 100) {
      return NextResponse.json(
        { error: "Please provide at least 100 characters of resume text." },
        { status: 400 }
      );
    }

    const rateLimit = await checkAndStoreRateLimit(request);
    if (!rateLimit.allowed) {
      const message =
        rateLimit.reason === "cooldown"
          ? `Please wait ${rateLimit.retryAfterSeconds}s before analyzing again.`
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

    const trimmedJobDescription = jobDescription.slice(0, MAX_JD_CHARS);
    const trimmedResumeText = resumeText.slice(0, MAX_RESUME_CHARS);

    const prompt = `
You are an expert product-management resume evaluator.

Compare the candidate resume against the job description and return ONLY valid JSON.
Do not return markdown.

Schema:
{
  "fitScore": number, // 0 to 100
  "matching": string[], // 3 to 8 concise bullets
  "missing": string[], // 3 to 8 concise bullets
  "oneThingToFixNow": string // one concrete, immediate resume edit
}

Scoring guidance:
- Strongly reward direct PM ownership, shipped outcomes, metrics impact, user/research depth, cross-functional leadership, and domain alignment.
- Penalize vague language, missing impact numbers, missing required skills from JD, and irrelevant experience.
- Be strict and realistic. Do not inflate.

Job Description:
${trimmedJobDescription}

Resume:
${trimmedResumeText}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.2,
      max_tokens: 900,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You evaluate PM resumes with strict hiring standards.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const rawContent = completion.choices[0]?.message?.content || "{}";
    const parsedResult = JSON.parse(rawContent) as unknown;
    const result = toResult(parsedResult);

    const response = NextResponse.json({ result, remaining: rateLimit.remaining });
    response.headers.set("x-ratelimit-limit", String(MAX_ANALYSES_PER_VISITOR));
    response.headers.set("x-ratelimit-remaining", String(rateLimit.remaining));
    return response;
  } catch (error) {
    console.error("PM resume screener failed:", error);
    return NextResponse.json(
      { error: "Unable to analyze resume right now. Please try again." },
      { status: 500 }
    );
  }
}
