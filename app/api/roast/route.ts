import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

import type { RoastResult } from "@/app/roast/types";

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60_000;
const ipRateLimitStore = new Map<string, RateLimitEntry>();

const SYSTEM_PROMPT =
  "You are a savage but lovable startup roaster — like that brutally honest friend who genuinely wants you to win. Your job is to stress-test ideas with real insight, not meme insults. Every roast point must contain a specific, actionable observation about THIS idea — not generic startup advice. Be brutal but useful.";
const EXHIBIT_TAGS = [
  "Problem Validity",
  "Market Reality",
  "Business Model",
  "User Behaviour",
  "Unfair Advantage",
  "Execution Trap",
];

function extractIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  }
  return "127.0.0.1";
}

function consumeRateLimit(ip: string): { limited: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const existing = ipRateLimitStore.get(ip);

  if (!existing || now >= existing.resetAt) {
    ipRateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { limited: false, retryAfterSeconds: 0 };
  }

  const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));

  if (existing.count >= RATE_LIMIT_MAX) {
    return { limited: true, retryAfterSeconds };
  }

  existing.count += 1;
  ipRateLimitStore.set(ip, existing);
  return { limited: false, retryAfterSeconds: 0 };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function clampBrutality(value: unknown): 1 | 2 | 3 {
  const num = Number(value);
  if (num === 1 || num === 2 || num === 3) return num;
  return 2;
}

function clampIndex(value: unknown): number {
  const num = Number(value);
  if (!Number.isFinite(num)) return 50;
  return Math.max(0, Math.min(100, Math.round(num)));
}

function normalizeRoastResult(data: unknown): RoastResult | null {
  if (!isRecord(data)) return null;

  const rawExhibits = Array.isArray(data.exhibits) ? data.exhibits : [];
  const exhibits = EXHIBIT_TAGS.map((defaultTag, idx) => {
    const raw = rawExhibits[idx];
    const item = isRecord(raw) ? raw : {};
    const tag = typeof item.tag === "string" && item.tag.trim() ? item.tag.trim() : defaultTag;
    const verdict =
      typeof item.verdict === "string" && item.verdict.trim()
        ? item.verdict.trim()
        : "THIS NEEDS HARDER TRUTH";
    const body =
      typeof item.body === "string" && item.body.trim()
        ? item.body.trim()
        : "The insight came back fuzzy, so run one user interview before building more.";
    const brutality = clampBrutality(item.brutality);
    return { tag, verdict, body, brutality };
  });

  const rawScore = isRecord(data.score) ? data.score : {};
  const rawDefence = isRecord(data.defence) ? data.defence : {};

  const score = {
    line:
      typeof rawScore.line === "string" && rawScore.line.trim()
        ? rawScore.line.trim()
        : "TOO EARLY TO FALL IN LOVE WITH THIS",
    index: clampIndex(rawScore.index),
  };

  const defence = {
    title:
      typeof rawDefence.title === "string" && rawDefence.title.trim()
        ? rawDefence.title.trim()
        : "THERE IS ONE WAY",
    body:
      typeof rawDefence.body === "string" && rawDefence.body.trim()
        ? rawDefence.body.trim()
        : "Narrow to one user, one painful job, one weekly measurable outcome.",
  };

  return { exhibits, score, defence };
}

function tryParseRawCompletion(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    const sanitized = raw.replace(/```json|```/gi, "").trim();
    const firstBrace = sanitized.indexOf("{");
    const lastBrace = sanitized.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      const candidate = sanitized.slice(firstBrace, lastBrace + 1);
      try {
        return JSON.parse(candidate);
      } catch {
        return null;
      }
    }
    return null;
  }
}

function buildUserPrompt(
  idea: string,
  audience: string | null,
  stage: string | null,
  risk: string | null
): string {
  const ctx: string[] = [];
  if (audience) ctx.push(`Target audience: ${audience}`);
  if (stage) ctx.push(`Current stage: ${stage}`);
  if (risk) ctx.push(`Known risk the founder flagged: ${risk}`);
  const ctxStr = ctx.length ? `\n\nContext:\n${ctx.join("\n")}` : "";

  const schema = JSON.stringify(
    {
      exhibits: [
        {
          tag: "Problem Validity",
          verdict: "NOBODY ASKED FOR THIS",
          body: "one casual sharp sentence specific to this idea",
          brutality: 2,
        },
        { tag: "Market Reality", verdict: "...", body: "...", brutality: 3 },
        { tag: "Business Model", verdict: "...", body: "...", brutality: 2 },
        { tag: "User Behaviour", verdict: "...", body: "...", brutality: 1 },
        { tag: "Unfair Advantage", verdict: "...", body: "...", brutality: 3 },
        { tag: "Execution Trap", verdict: "...", body: "...", brutality: 2 },
      ],
      score: { line: "ONE SAVAGE PUNCHLINE", index: 71 },
      defence: {
        title: "HOPEFUL TITLE MAX 5 WORDS",
        body: "one specific genuinely useful sentence",
      },
    },
    null,
    2
  );

  return `Roast this idea: "${idea}"${ctxStr}

Respond ONLY with raw JSON matching this schema exactly:
${schema}

VERDICT RULES:
- Sound like a loud opinionated friend, not a consultant
- Must be specific to THIS idea — not generic startup wisdom
- GOOD: "NOBODY ASKED FOR THIS", "YOUR MOM IS THE ONLY USER", "GOOGLE DOES THIS FREE", "YOU WILL QUIT SOON"
- BAD (too generic): "MARKET SATURATION EXISTS", "REVENUE MODEL UNCLEAR", "EXECUTION IS HARD"
- ALL CAPS, max 5 words
- body = 1 casual sentence, must reference something specific about this exact idea
- brutality: 1 mild / 2 harsh / 3 devastating
- defence.body must be a genuine insight, not encouragement fluff`;
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  if (!isRecord(body)) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const idea = typeof body.idea === "string" ? body.idea.trim() : "";
  const audience = typeof body.audience === "string" ? body.audience : null;
  const stage = typeof body.stage === "string" ? body.stage : null;
  const risk = typeof body.risk === "string" ? body.risk : null;

  if (!idea) {
    return NextResponse.json({ error: "Idea is required." }, { status: 400 });
  }
  if (idea.length > 300) {
    return NextResponse.json(
      { error: "Idea is too long. Max 300 characters." },
      { status: 400 }
    );
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

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    const completionPromise = openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(idea, audience, stage, risk) },
      ],
      temperature: 0.85,
      max_tokens: 900,
      response_format: { type: "json_object" },
    });

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error("OPENAI_TIMEOUT")), 25_000);
    });

    const completion = await Promise.race([completionPromise, timeoutPromise]);
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    const raw = completion.choices[0]?.message?.content ?? "{}";

    const parsed = tryParseRawCompletion(raw);
    const normalized = normalizeRoastResult(parsed);
    if (!normalized) {
      return NextResponse.json(
        { error: "Invalid AI response structure. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json(normalized);
  } catch (error) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    if (error instanceof Error && error.message === "OPENAI_TIMEOUT") {
      return NextResponse.json(
        { error: "Request timed out. Please try again." },
        { status: 504 }
      );
    }

    return NextResponse.json({ error: "Failed to generate roast." }, { status: 500 });
  }
}
