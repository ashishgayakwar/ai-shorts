import { createHash, randomUUID } from "crypto";

import { NextResponse } from "next/server";
import OpenAI from "openai";

import { parseModelJson } from "@/lib/model-json";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MAX_FEATURE_CHARS = 14_000;
const MAX_GENERATIONS_PER_VISITOR = 5;
const COOLDOWN_SECONDS = 30;
const BYPASS_USER_STORY_RATE_LIMIT = process.env.BYPASS_USER_STORY_RATE_LIMIT === "true";

type Priority = "Must Have" | "Should Have" | "Could Have";

type Story = {
  userType: string;
  story: string;
  priority: Priority;
  acceptanceCriteria: string[];
  edgeCases: string[];
  definitionOfDone: string;
};

type Epic = {
  name: string;
  description: string;
  userTypes: string[];
  stories: Story[];
};

type StorySuiteResult = {
  productName: string;
  epics: Epic[];
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

const SYSTEM_PROMPT = `You are a senior Product Manager with 15 years experience writing user stories for engineering teams. Given a product or feature description, generate a concise user story suite.

Structure your response as JSON with this shape:
{
  productName: string,
  epics: [
    {
      name: string,
      description: string,
      userTypes: string[],
      stories: [
        {
          userType: string,
          story: string,
          priority: 'Must Have' | 'Should Have' | 'Could Have',
          acceptanceCriteria: string[],
          edgeCases: string[],
          definitionOfDone: string
        }
      ]
    }
  ]
}

Rules:
- Maximum 3 epics
- Maximum 3 stories per epic
- Total output should be concise: target 9 stories and never exceed 12 stories
- Stories must be specific to the product described - never generic
- Acceptance criteria must be testable and specific
- Maximum 3 acceptance criteria per story
- Acceptance criteria must be specific to each individual story. Never use generic templates. Each criterion must describe a real, testable condition specific to that exact feature. Never repeat the same criteria across stories.
- Maximum 2 edge cases per story, and they must be real failure scenarios
- definitionOfDone must be exactly one short line
- Return strict JSON only. No markdown. No preamble.`;

function toCleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeWhitespace(text: string): string {
  return text.replace(/\u0000/g, "").replace(/\s+/g, " ").trim();
}

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
  const secret =
    process.env.NEXTAUTH_SECRET ||
    process.env.OPENAI_API_KEY ||
    "user-story-generator-secret";
  return createHash("sha256").update(`${value}|${secret}`).digest("hex");
}

function isMissingRateLimitTableError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const maybeError = error as {
    message?: string;
    meta?: { code?: string; message?: string };
  };

  if (maybeError.meta?.code === "42P01") return true;

  if (
    typeof maybeError.meta?.message === "string" &&
    maybeError.meta.message.includes("UserStoryGeneratorRequest")
  ) {
    return true;
  }

  if (
    typeof maybeError.message === "string" &&
    maybeError.message.includes("UserStoryGeneratorRequest")
  ) {
    return true;
  }

  return false;
}

function getInMemoryRateLimitStore() {
  const globalState = globalThis as unknown as {
    userStoryGeneratorRateLimit?: Map<string, { count: number; lastCreatedAtMs: number }>;
  };

  if (!globalState.userStoryGeneratorRateLimit) {
    globalState.userStoryGeneratorRateLimit = new Map();
  }

  return globalState.userStoryGeneratorRateLimit;
}

function checkRateLimitInMemory(visitorHash: string): RateLimitDecision {
  const now = Date.now();
  const store = getInMemoryRateLimitStore();
  const existing = store.get(visitorHash);

  if (!existing) {
    store.set(visitorHash, { count: 1, lastCreatedAtMs: now });
    return {
      allowed: true,
      remaining: MAX_GENERATIONS_PER_VISITOR - 1,
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
      remaining: Math.max(0, MAX_GENERATIONS_PER_VISITOR - existing.count),
      retryAfterSeconds,
      reason: "cooldown",
    };
  }

  if (existing.count >= MAX_GENERATIONS_PER_VISITOR) {
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
    remaining: Math.max(0, MAX_GENERATIONS_PER_VISITOR - updated.count),
  };
}

async function checkAndStoreRateLimit(request: Request): Promise<RateLimitDecision> {
  const ip = getClientIp(request);
  const fingerprintSource = buildServerFingerprint(request);

  const ipHash = hashWithSecret(ip);
  const fingerprintHash = hashWithSecret(fingerprintSource || "unknown");
  const visitorHash = hashWithSecret(`${ipHash}|${fingerprintHash}`);

  try {
    const rows = await prisma.$queryRaw<RateStatsRow[]>`
      SELECT
        COUNT(*)::int AS total_count,
        MAX("createdAt") AS latest_created_at
      FROM "UserStoryGeneratorRequest"
      WHERE "visitorHash" = ${visitorHash}
    `;

    const stats = rows[0] || { total_count: 0, latest_created_at: null };
    const latestCreatedAtMs = stats.latest_created_at
      ? new Date(stats.latest_created_at).getTime()
      : 0;
    const now = Date.now();

    if (latestCreatedAtMs && now - latestCreatedAtMs < COOLDOWN_SECONDS * 1000) {
      const retryAfterSeconds = clamp(
        Math.ceil((COOLDOWN_SECONDS * 1000 - (now - latestCreatedAtMs)) / 1000),
        1,
        COOLDOWN_SECONDS
      );

      return {
        allowed: false,
        remaining: Math.max(0, MAX_GENERATIONS_PER_VISITOR - stats.total_count),
        retryAfterSeconds,
        reason: "cooldown",
      };
    }

    if (stats.total_count >= MAX_GENERATIONS_PER_VISITOR) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: 0,
        reason: "cap",
      };
    }

    await prisma.$executeRaw`
      INSERT INTO "UserStoryGeneratorRequest" ("id", "visitorHash", "ipHash", "fingerprintHash", "createdAt")
      VALUES (${randomUUID()}, ${visitorHash}, ${ipHash}, ${fingerprintHash}, ${new Date(now)})
    `;

    return {
      allowed: true,
      remaining: Math.max(0, MAX_GENERATIONS_PER_VISITOR - (stats.total_count + 1)),
    };
  } catch (error) {
    if (!isMissingRateLimitTableError(error)) {
      console.warn("User-story rate-limit DB unavailable; using in-memory fallback.", error);
    }

    return checkRateLimitInMemory(visitorHash);
  }
}

function normalizeList(value: unknown, min: number, max: number, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback.slice(0, max);

  const cleaned = value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
    .slice(0, max);

  if (cleaned.length >= min) return cleaned;
  return fallback.slice(0, max);
}

function normalizePriority(value: unknown): Priority {
  if (value === "Must Have" || value === "Should Have" || value === "Could Have") return value;
  return "Should Have";
}

function normalizeStory(value: unknown): Story | null {
  if (!value || typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;

  const userType = toCleanString(obj.userType);
  const story = toCleanString(obj.story);
  if (!userType || !story) return null;

  const definitionOfDoneRaw =
    typeof obj.definitionOfDone === "string" ? obj.definitionOfDone : "";
  const singleLineDefinitionOfDone = normalizeWhitespace(
    definitionOfDoneRaw.replace(/\r?\n/g, " ")
  );

  return {
    userType,
    story,
    priority: normalizePriority(obj.priority),
    acceptanceCriteria: normalizeList(obj.acceptanceCriteria, 0, 3, []),
    edgeCases: normalizeList(obj.edgeCases, 0, 2, []),
    definitionOfDone:
      singleLineDefinitionOfDone ||
      "Feature is implemented, tested, and ready for release with required quality checks.",
  };
}

function normalizeEpic(value: unknown): Epic | null {
  if (!value || typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;

  const name = toCleanString(obj.name);
  const description = toCleanString(obj.description);
  const storiesRaw = Array.isArray(obj.stories) ? obj.stories : [];
  const stories = storiesRaw.map(normalizeStory).filter(Boolean) as Story[];
  if (!name || !description || stories.length === 0) return null;

  const rawUserTypes = normalizeList(obj.userTypes, 1, 8, []);
  const storyUserTypes = Array.from(new Set(stories.map((s) => s.userType)));
  const userTypes = rawUserTypes.length > 0 ? rawUserTypes : storyUserTypes;

  return {
    name,
    description,
    userTypes: userTypes.slice(0, 8),
    stories: stories.slice(0, 3),
  };
}

function normalizeResult(raw: unknown): StorySuiteResult | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;

  const productName = toCleanString(obj.productName) || "Product";
  const epicsRaw = Array.isArray(obj.epics) ? obj.epics : [];
  const epics = epicsRaw.map(normalizeEpic).filter(Boolean) as Epic[];

  if (epics.length === 0) return null;

  return {
    productName,
    epics: epics.slice(0, 3),
  };
}

async function generateSuite(featureDescription: string): Promise<StorySuiteResult | null> {
  const createCompletion = () =>
    openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      max_tokens: 4_000,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: `Feature description:\n${featureDescription}`,
        },
      ],
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
  return normalizeResult(parsed);
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
          featureDescription?: unknown;
        }
      | null;

    const featureDescription = normalizeWhitespace(toCleanString(body?.featureDescription));

    if (featureDescription.length < 80) {
      return NextResponse.json(
        { error: "Please paste a fuller feature description (at least 80 characters)." },
        { status: 400 }
      );
    }

    const rateLimit = BYPASS_USER_STORY_RATE_LIMIT
      ? { allowed: true as const, remaining: MAX_GENERATIONS_PER_VISITOR }
      : await checkAndStoreRateLimit(request);
    if (!rateLimit.allowed) {
      const message =
        rateLimit.reason === "cooldown"
          ? `Please wait ${rateLimit.retryAfterSeconds}s before generating again.`
          : "You have reached the maximum of 5 generations for this browser and IP.";

      const response = NextResponse.json(
        {
          error: message,
          remaining: rateLimit.remaining,
          retryAfterSeconds: rateLimit.retryAfterSeconds,
        },
        { status: 429 }
      );

      response.headers.set("x-ratelimit-limit", String(MAX_GENERATIONS_PER_VISITOR));
      response.headers.set("x-ratelimit-remaining", String(rateLimit.remaining));
      response.headers.set("retry-after", String(rateLimit.retryAfterSeconds));
      return response;
    }

    const trimmed = featureDescription.slice(0, MAX_FEATURE_CHARS);

    const result = await generateSuite(trimmed);
    if (!result) {
      return NextResponse.json(
        {
          error: "Could not parse model output into the expected suite structure. Please retry.",
          remaining: rateLimit.remaining,
        },
        { status: 502 }
      );
    }

    const response = NextResponse.json({ result, remaining: rateLimit.remaining });
    response.headers.set("x-ratelimit-limit", String(MAX_GENERATIONS_PER_VISITOR));
    response.headers.set("x-ratelimit-remaining", String(rateLimit.remaining));
    return response;
  } catch (error) {
    console.error("User story suite generator failed:", error);
    return NextResponse.json(
      { error: "Unable to generate the story suite right now. Please try again." },
      { status: 500 }
    );
  }
}
