import { NextResponse } from "next/server";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import OpenAI from "openai";

import { parseModelJson } from "@/lib/model-json";

export const runtime = "nodejs";

const PROJECT_RATE_LIMIT_MAX = 30;
const PROJECT_RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000;

type QuizAnswers = {
  universe: "Hollywood" | "Bollywood";
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
  return `You are a precise character matching engine. You will receive a universe choice plus 5 specific answers from a personality quiz. You MUST use each answer as a direct signal to narrow down the character match.

Here is how to use each answer:
- Universe (Which world do you belong to?) -> hard filter for character source
- Q1 (Friday night behaviour) -> reveals social style and energy level
- Q2 (Someone wrongs you) -> reveals emotional response and moral code
- Q3 (Superpower) -> reveals core strength and self-perception
- Q4 (Pick a world) -> reveals genre affinity - use this to filter which universe the character comes from
- Q5 (What drives you) -> reveals core motivation - this is the most important signal

Input answers:
${JSON.stringify({ answers })}

CRITICAL RULES:
- Different answer combinations MUST produce different characters. Never return the same character for different answer sets.
- Q4 is a hard filter - if user picks "Gritty crime thriller", the character MUST come from that world. If they pick "Epic fantasy", pick from that world. Do not ignore this.
- Q5 is the soul filter - Power, Justice, Freedom, Love must each lead to fundamentally different character archetypes
- Draw from ALL of film and TV - Hollywood, Bollywood, Korean drama, anime, indie, classic cinema, prestige TV, cult shows
- Avoid defaulting to GOT, Sherlock, Breaking Bad, Friends unless the answers very specifically point there
- Be surprising and specific - an unexpected perfect match is better than an obvious safe pick
- The character must genuinely reflect the combination of ALL 5 answers, not just one
- Match percent between 72 and 96 - vary it, don't always return 87
- Iconic quote must be real and accurate
- Accent color must reflect the character's world and personality

Return ONLY valid JSON. No markdown. No explanation. No preamble.

BANNED characters unless answers make them truly unavoidable:
- Francis Underwood
- Walter White
- Sherlock Holmes
- Jon Snow
- Tony Stark

If you were about to pick any of these, stop and pick the next best alternative that fits the answers just as well.

{
  "character": "Character full name",
  "show": "Show or Movie title",
  "match_percent": 87,
  "accent_color": "#hex color",
  "reasons": [
    { "title": "Bold one-line trait", "explanation": "One sentence tying this directly to both the user's answer and the character." },
    { "title": "Bold one-line trait", "explanation": "One sentence tying this directly to both the user's answer and the character." },
    { "title": "Bold one-line trait", "explanation": "One sentence tying this directly to both the user's answer and the character." }
  ],
  "iconic_quote": "Their most famous quote",
  "dark_side": {
    "character": "Dark side character name",
    "show": "Their show or movie",
    "reason": "One sentence explaining why"
  }
}`;
}

function isValidAnswers(value: unknown): value is QuizAnswers {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  const universe = toText(obj.universe);
  if (universe !== "Hollywood" && universe !== "Bollywood") return false;
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
    const selectedUniverse = payload.answers.universe;

    const createCompletion = () =>
      openai.chat.completions.create(
        {
          model: MODEL,
          temperature: 0.9,
          max_tokens: 1400,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
                `You have an enormous database of characters across all of film and TV history. Your job is to find the MOST UNIQUE and SPECIFIC match for this exact combination of answers. Generic or obvious answers are a failure.\n\nThe user has selected ${selectedUniverse}. You MUST only return characters from that universe. If Hollywood - only Western films and TV. If Bollywood - only Indian films, shows, and web series like Sacred Games, Mirzapur, Scam 1992, Bollywood classics and modern hits.`,
            },
            { role: "user", content: prompt },
          ],
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
