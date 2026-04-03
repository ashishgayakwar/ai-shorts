import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

import type { InterviewAnswer } from "@/app/pm-interview-coach/types";

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const RATE_LIMIT_MAX = 8;
const RATE_LIMIT_WINDOW_MS = 60_000;
const rateLimitStore = new Map<string, RateLimitEntry>();

const SYSTEM_PROMPT =
  "You are an expert PM interview coach. You give structured, grounded, specific model answers to PM interview questions. Every answer must be built on real product logic — no generic frameworks, no fluff, no theory. Every action point must have a specific \"because\" — not just what to do, but why it works for this specific product.";
const OPENAI_TIMEOUT_MS = 60_000;
const OPENAI_MAX_TOKENS = 3500;

function buildPrompt(question: string): string {
  return `Generate model PM interview answers for this question: "${question}"

Return a JSON object matching this exact schema:
{
  "questionType": "short label e.g. Product Improvement · Revenue",
  "routes": [
    {
      "tabLabel": "3-5 word angle name",
      "clarifyingQuestions": [
        { "number": "01", "text": "question to ask the interviewer" },
        { "number": "02", "text": "..." },
        { "number": "03", "text": "..." }
      ],
      "hook": "one punchy sentence, 20-30 words, memorisable opening",
      "situation": "60-80 words. Context only. No solutions yet.",
      "complication": "50-70 words. The real tension or problem. What makes this hard.",
      "action": [
        {
          "number": "01",
          "priority": "Highest impact",
          "title": "specific action title",
          "body": "60-80 words. What exactly, and WHY it works for this product specifically. Must include a specific mechanism, one real industry example or analogy, and an expected outcome."
        },
        { "number": "02", "priority": "Medium term", "title": "...", "body": "60-80 words with mechanism, industry example/analogy, expected outcome" },
        { "number": "03", "priority": "Quick win", "title": "...", "body": "60-80 words with mechanism, industry example/analogy, expected outcome" }
      ],
      "resultStats": [
        { "label": "Primary metric", "value": "specific metric to track" },
        { "label": "Success signal", "value": "what success looks like" }
      ],
      "resultBody": "60-80 words. How to pilot this. What to instrument. What proves it worked.",
      "insight": "35-45 words. One closing thought. Quotable. Must feel earned, not generic.",
      "speakTime": "~2 min 10 sec"
    }
  ]
}

RULES:
- Generate exactly 3 to 5 routes depending on how many meaningfully distinct strategic angles exist
- Each route must be a genuinely different strategic direction — not variations on the same idea
- No framework names (no MECE, no JTBD, no HEART) — just real reasoning
- Every action body must be specific to THIS product — not generic startup advice
- Every action body must include: (1) mechanism, (2) industry example or analogy, (3) expected outcome
- Numbers and estimates where possible — state assumptions if using estimates
- hook, situation, complication, insight are plain strings — no bullet points inside them
- Total per route target: 500-600 words
- No sentence should be removable without losing meaning
- Return ONLY the JSON object — no markdown, no explanation`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function hasStringField(obj: Record<string, unknown>, field: string): boolean {
  return typeof obj[field] === "string" && Boolean((obj[field] as string).trim());
}

function isValidAnswer(data: unknown): data is InterviewAnswer {
  if (!isRecord(data)) return false;
  if (typeof data.questionType !== "string") return false;
  if (!Array.isArray(data.routes) || data.routes.length < 3 || data.routes.length > 5) return false;

  for (const route of data.routes) {
    if (!isRecord(route)) return false;
    if (!hasStringField(route, "tabLabel")) return false;
    if (!hasStringField(route, "hook")) return false;
    if (!hasStringField(route, "situation")) return false;
    if (!hasStringField(route, "complication")) return false;
    if (!hasStringField(route, "resultBody")) return false;
    if (!hasStringField(route, "insight")) return false;
    if (!hasStringField(route, "speakTime")) return false;

    if (!Array.isArray(route.clarifyingQuestions) || route.clarifyingQuestions.length !== 3) return false;
    if (!Array.isArray(route.action) || route.action.length !== 3) return false;
    if (!Array.isArray(route.resultStats) || route.resultStats.length !== 2) return false;

    for (const question of route.clarifyingQuestions) {
      if (!isRecord(question)) return false;
      if (!hasStringField(question, "number") || !hasStringField(question, "text")) return false;
    }

    for (const action of route.action) {
      if (!isRecord(action)) return false;
      if (
        !hasStringField(action, "number") ||
        !hasStringField(action, "priority") ||
        !hasStringField(action, "title") ||
        !hasStringField(action, "body")
      ) {
        return false;
      }
    }

    for (const stat of route.resultStats) {
      if (!isRecord(stat)) return false;
      if (!hasStringField(stat, "label") || !hasStringField(stat, "value")) return false;
    }
  }

  return true;
}

function extractIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded ? forwarded.split(",")[0].trim() : "127.0.0.1";
}

function consumeRateLimit(ip: string): { limited: boolean; remaining: number; retryAfterSeconds: number } {
  const now = Date.now();
  const existing = rateLimitStore.get(ip);
  if (!existing || now >= existing.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { limited: false, remaining: RATE_LIMIT_MAX - 1, retryAfterSeconds: 0 };
  }
  const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
  if (existing.count >= RATE_LIMIT_MAX) {
    return { limited: true, remaining: 0, retryAfterSeconds };
  }
  existing.count += 1;
  rateLimitStore.set(ip, existing);
  return { limited: false, remaining: Math.max(0, RATE_LIMIT_MAX - existing.count), retryAfterSeconds: 0 };
}

function shouldRetryOpenAIError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const status = (error as { status?: number }).status;
  if (error.name === "AbortError") return true;
  if (typeof status === "number" && (status === 429 || status >= 500)) return true;
  if (error.message.includes("fetch")) return true;
  return false;
}

export async function POST(request: NextRequest) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  if (!isRecord(payload)) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const question = typeof payload.question === "string" ? payload.question.trim() : "";
  if (!question) {
    return NextResponse.json({ error: "Question is required." }, { status: 400 });
  }
  if (question.length < 10) {
    return NextResponse.json({ error: "Question is too short. Min 10 characters." }, { status: 400 });
  }
  if (question.length > 500) {
    return NextResponse.json({ error: "Question is too long. Max 500 characters." }, { status: 400 });
  }

  const ip = extractIp(request);
  const rateLimit = consumeRateLimit(ip);
  if (rateLimit.limited) {
    return NextResponse.json(
      { error: "Too many requests. Try again in a minute." },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.retryAfterSeconds),
          "X-RateLimit-Limit": String(RATE_LIMIT_MAX),
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }

  try {
    const createCompletion = () =>
      openai.chat.completions.create(
        {
          model: "gpt-4o",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: buildPrompt(question) },
          ],
          temperature: 0.8,
          max_tokens: OPENAI_MAX_TOKENS,
          response_format: { type: "json_object" },
        },
        { signal: AbortSignal.timeout(OPENAI_TIMEOUT_MS) }
      );

    // Retry once on failure (timeout/network/transient upstream issues).
    let completion;
    try {
      completion = await createCompletion();
    } catch (error) {
      if (!shouldRetryOpenAIError(error)) {
        throw error;
      }
      completion = await createCompletion();
    }

    const raw = completion.choices[0]?.message?.content ?? "{}";
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { error: "Invalid response structure. Please try again." },
        { status: 500 }
      );
    }

    if (!isValidAnswer(parsed)) {
      return NextResponse.json(
        { error: "Invalid response structure. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json(parsed);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json({ error: "Request timed out. Please try again." }, { status: 504 });
    }

    const apiError = error as { status?: number; message?: string };
    if (typeof apiError.status === "number") {
      if (apiError.status === 401) {
        return NextResponse.json(
          { error: "OpenAI authentication failed. Check OPENAI_API_KEY on server." },
          { status: 500 }
        );
      }
      if (apiError.status === 429) {
        return NextResponse.json(
          { error: "OpenAI rate limit or quota reached. Please try again shortly." },
          { status: 429 }
        );
      }
      if (apiError.status >= 500) {
        return NextResponse.json(
          { error: "OpenAI is temporarily unavailable. Please try again." },
          { status: 502 }
        );
      }
      if (apiError.status >= 400) {
        return NextResponse.json(
          { error: apiError.message || "OpenAI request failed due to invalid input." },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: apiError.message || "Failed to generate interview answers." },
      { status: 500 }
    );
  }
}
