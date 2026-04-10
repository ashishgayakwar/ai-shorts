import { NextResponse } from "next/server";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import OpenAI from "openai";

import { parseModelJson } from "@/lib/model-json";

export const runtime = "nodejs";

const PROJECT_RATE_LIMIT_MAX = 30;
const PROJECT_RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000;

type QuizAnswers = {
  q1: string;
  q2: string;
  q3: string;
  q4: string;
  q5: string;
};

type MatchReason = {
  title: string;
  explanation: string;
};

type MatchResult = {
  character: string;
  show: string;
  match_percent: number;
  accent_color: string;
  reasons: MatchReason[];
  iconic_quote: string;
  dark_side: {
    character: string;
    show: string;
    reason: string;
  };
};

type ProjectRateEntry = {
  count: number;
  resetAt: number;
};

type RateDecision =
  | { allowed: true; remaining: number }
  | { allowed: false; remaining: number; retryAfterSeconds: number; reason: "project_cap" };

const MODEL = process.env.OPENAI_CHARACTER_MODEL || "gpt-4o";

const FILE_ENV_CACHE = loadEnvFileValues();

function getProjectRateState(): ProjectRateEntry {
  const globalState = globalThis as unknown as {
    characterMatchProjectRate?: ProjectRateEntry;
  };
  if (!globalState.characterMatchProjectRate) {
    globalState.characterMatchProjectRate = {
      count: 0,
      resetAt: Date.now() + PROJECT_RATE_LIMIT_WINDOW_MS,
    };
  }
  return globalState.characterMatchProjectRate;
}

function setProjectRateState(next: ProjectRateEntry): void {
  const globalState = globalThis as unknown as {
    characterMatchProjectRate?: ProjectRateEntry;
  };
  globalState.characterMatchProjectRate = next;
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
  return { ...env, ...envLocal };
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

function getTmdbApiKey(): string {
  return pickEnvValue("TMDB_API_KEY");
}

function getOpenAiClient(): OpenAI {
  return new OpenAI({
    apiKey: pickEnvValue("OPENAI_API_KEY", "VITE_API_KEY"),
  });
}

function toText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function toHexColor(value: unknown, fallback = "#ff5a36"): string {
  const raw = toText(value);
  return /^#[0-9a-fA-F]{6}$/.test(raw) ? raw : fallback;
}

function normalizeResult(raw: unknown): MatchResult {
  const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};

  const reasonsRaw = Array.isArray(obj.reasons) ? obj.reasons : [];
  const reasons = reasonsRaw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const title = toText(row.title);
      const explanation = toText(row.explanation);
      if (!title || !explanation) return null;
      return { title, explanation };
    })
    .filter(Boolean)
    .slice(0, 3) as MatchReason[];

  while (reasons.length < 3) {
    reasons.push({
      title: "You are highly adaptive",
      explanation:
        "You can shift your style based on the room while still keeping a strong internal compass.",
    });
  }

  const darkSideRaw =
    obj.dark_side && typeof obj.dark_side === "object"
      ? (obj.dark_side as Record<string, unknown>)
      : {};

  const matchPercent = clamp(Math.round(Number(obj.match_percent) || 82), 72, 96);

  return {
    character: toText(obj.character) || "Sherlock Holmes",
    show: toText(obj.show) || "Sherlock",
    match_percent: matchPercent,
    accent_color: toHexColor(obj.accent_color),
    reasons,
    iconic_quote: toText(obj.iconic_quote) || "The game is on.",
    dark_side: {
      character: toText(darkSideRaw.character) || "Tommy Shelby",
      show: toText(darkSideRaw.show) || "Peaky Blinders",
      reason:
        toText(darkSideRaw.reason) ||
        "When you are pushed too far, you can become intensely strategic and emotionally distant.",
    },
  };
}

function buildPrompt(answers: QuizAnswers): string {
  return `You are a character matching engine for a personality quiz. Based on the user's answers, match them to the single most fitting character from any movie or TV show, across all genres, eras, and languages.

Return ONLY valid JSON. No markdown. No explanation. No preamble.

Input answers:
${JSON.stringify({ answers })}

The input contains exactly 5 answers (q1 to q5).

Return this exact structure:
{
  "character": "Character full name",
  "show": "Show or Movie title",
  "match_percent": 87,
  "accent_color": "#hex color that represents this character's vibe",
  "reasons": [
    { "title": "Bold one-line trait", "explanation": "One sentence connecting this trait to the character." },
    { "title": "Bold one-line trait", "explanation": "One sentence connecting this trait to the character." },
    { "title": "Bold one-line trait", "explanation": "One sentence connecting this trait to the character." }
  ],
  "iconic_quote": "Their most famous quote",
  "dark_side": {
    "character": "Dark side character name",
    "show": "Their show or movie",
    "reason": "One sentence explaining why"
  }
}

Rules:
- Draw from ALL of film and TV history: Hollywood, Bollywood, Korean, anime, indie, classic, modern
- Do NOT default to safe popular picks like GOT, Sherlock, or Breaking Bad unless the answers strongly justify it
- Vary widely across eras, genres, and cultures based on the answers
- The character must genuinely match the personality, not just be a famous name
- Pick unexpected, surprising matches when the answers support it
- Accent color must reflect the character's personality and world
- match_percent must be between 72 and 96 and should feel earned
- Reasons must feel personal and specific, not generic
- iconic_quote must be real and accurate
- All strings must be single-line text`;
}

function isValidAnswers(value: unknown): value is QuizAnswers {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  const keys = ["q1", "q2", "q3", "q4", "q5"];
  return keys.every((k) => toText(obj[k]).length > 0);
}

async function fetchTmdbImageForShow(showName: string): Promise<string | null> {
  const tmdbApiKey = getTmdbApiKey();
  if (!tmdbApiKey) return null;

  const query = encodeURIComponent(showName);
  const url = `https://api.themoviedb.org/3/search/multi?api_key=${encodeURIComponent(
    tmdbApiKey
  )}&query=${query}`;

  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) return null;

  const payload = (await response.json().catch(() => null)) as
    | {
        results?: Array<{
          backdrop_path?: string | null;
          poster_path?: string | null;
        }>;
      }
    | null;

  const first = payload?.results?.[0];
  const path = first?.backdrop_path || first?.poster_path;
  if (!path) return null;

  return `https://image.tmdb.org/t/p/w780${path}`;
}

export async function POST(request: Request) {
  try {
    const limit = checkAndConsumeProjectLimit();
    if (!limit.allowed) {
      const response = NextResponse.json(
        {
          error: `Character Match is at full project capacity right now. Retry in ${limit.retryAfterSeconds}s.`,
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

    const openaiKey = pickEnvValue("OPENAI_API_KEY", "VITE_API_KEY");
    if (!openaiKey) {
      const response = NextResponse.json(
        { error: "OPENAI_API_KEY is missing on server." },
        { status: 500 }
      );
      response.headers.set("x-ratelimit-limit", String(PROJECT_RATE_LIMIT_MAX));
      response.headers.set("x-ratelimit-remaining", String(limit.remaining));
      return response;
    }
    const openai = getOpenAiClient();

    const payload = (await request.json().catch(() => null)) as
      | { answers?: unknown }
      | null;

    if (!isValidAnswers(payload?.answers)) {
      const response = NextResponse.json(
        { error: "Please answer all 5 questions." },
        { status: 400 }
      );
      response.headers.set("x-ratelimit-limit", String(PROJECT_RATE_LIMIT_MAX));
      response.headers.set("x-ratelimit-remaining", String(limit.remaining));
      return response;
    }

    const prompt = buildPrompt(payload.answers);

    const createCompletion = () =>
      openai.chat.completions.create(
        {
          model: MODEL,
          temperature: 0.9,
          max_tokens: 1400,
          response_format: { type: "json_object" },
          messages: [{ role: "user", content: prompt }],
        },
        { signal: AbortSignal.timeout(60_000) }
      );

    const completion = await createCompletion();
    const raw = completion.choices[0]?.message?.content || "{}";

    let parsed: unknown;
    try {
      parsed = parseModelJson(raw);
    } catch {
      const retry = await createCompletion();
      parsed = parseModelJson(retry.choices[0]?.message?.content || "{}");
    }

    const result = normalizeResult(parsed);
    const imageUrl = await fetchTmdbImageForShow(result.show).catch(() => null);
    const response = NextResponse.json({ result, imageUrl, remaining: limit.remaining });
    response.headers.set("x-ratelimit-limit", String(PROJECT_RATE_LIMIT_MAX));
    response.headers.set("x-ratelimit-remaining", String(limit.remaining));
    return response;
  } catch (error) {
    const status =
      typeof error === "object" &&
      error !== null &&
      "status" in error &&
      typeof (error as { status?: unknown }).status === "number"
        ? (error as { status: number }).status
        : 500;

    const message =
      typeof error === "object" &&
      error !== null &&
      "message" in error &&
      typeof (error as { message?: unknown }).message === "string"
        ? (error as { message: string }).message
        : "Unable to match character right now.";

    const response = NextResponse.json({ error: message }, { status: status >= 400 ? status : 500 });
    response.headers.set("x-ratelimit-limit", String(PROJECT_RATE_LIMIT_MAX));
    return response;
  }
}
