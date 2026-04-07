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

const MAX_USES_PER_WINDOW = 5;
const WINDOW_MS = 24 * 60 * 60 * 1000;
const COOLDOWN_MS = 30 * 1000;
const MAX_TITLE_CHARS = 160;
const GOOGLE_BOOKS_VOLUMES_URL = "https://www.googleapis.com/books/v1/volumes";
const OPEN_LIBRARY_SEARCH_URL = "https://openlibrary.org/search.json";
const REMOTE_FETCH_TIMEOUT_MS = 6000;

type Idea = {
  headline: string;
  summary: string;
};

type Quote = {
  text: string;
  context: string;
};

type SummaryPayload = {
  essence: string;
  publishedYear: number;
  author: string;
  ideas: Idea[];
  quotes: Quote[];
  whoShouldRead: string;
};

type RateLimitAllowed = {
  allowed: true;
  remaining: number;
};

type RateLimitBlocked = {
  allowed: false;
  remaining: number;
  retryAfterSeconds: number;
  reason: "cooldown" | "limit";
};

type RateDecision = RateLimitAllowed | RateLimitBlocked;

type RateEntry = {
  windowStartMs: number;
  usedCount: number;
  lastRequestMs: number;
};

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
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  const realIp = request.headers.get("x-real-ip")?.trim();
  return realIp || "unknown";
}

function hashWithSecret(value: string): string {
  const secret =
    process.env.NEXTAUTH_SECRET ||
    process.env.OPENAI_API_KEY ||
    "book-summarizer-rate-limit-secret";

  return createHash("sha256").update(`${value}|${secret}`).digest("hex");
}

function getRateLimitKey(request: Request): string {
  const ip = getClientIp(request);
  const fingerprint = request.headers.get("x-fingerprint") || "unknown";
  return hashWithSecret(`${ip}|${fingerprint}`);
}

function getRateStore(): Map<string, RateEntry> {
  const globalState = globalThis as unknown as {
    bookSummarizerRateStore?: Map<string, RateEntry>;
  };

  if (!globalState.bookSummarizerRateStore) {
    globalState.bookSummarizerRateStore = new Map();
  }

  return globalState.bookSummarizerRateStore;
}

function checkAndConsumeLimit(request: Request): RateDecision {
  const now = Date.now();
  const key = getRateLimitKey(request);
  const store = getRateStore();
  const current = store.get(key);

  if (!current) {
    store.set(key, {
      windowStartMs: now,
      usedCount: 1,
      lastRequestMs: now,
    });

    return {
      allowed: true,
      remaining: MAX_USES_PER_WINDOW - 1,
    };
  }

  const expiredWindow = now - current.windowStartMs >= WINDOW_MS;
  if (expiredWindow) {
    store.set(key, {
      windowStartMs: now,
      usedCount: 1,
      lastRequestMs: now,
    });

    return {
      allowed: true,
      remaining: MAX_USES_PER_WINDOW - 1,
    };
  }

  if (now - current.lastRequestMs < COOLDOWN_MS) {
    const retryAfterSeconds = clamp(
      Math.ceil((COOLDOWN_MS - (now - current.lastRequestMs)) / 1000),
      1,
      30
    );

    return {
      allowed: false,
      remaining: Math.max(0, MAX_USES_PER_WINDOW - current.usedCount),
      retryAfterSeconds,
      reason: "cooldown",
    };
  }

  if (current.usedCount >= MAX_USES_PER_WINDOW) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: clamp(
        Math.ceil((current.windowStartMs + WINDOW_MS - now) / 1000),
        1,
        24 * 60 * 60
      ),
      reason: "limit",
    };
  }

  const updated: RateEntry = {
    ...current,
    usedCount: current.usedCount + 1,
    lastRequestMs: now,
  };

  store.set(key, updated);

  return {
    allowed: true,
    remaining: Math.max(0, MAX_USES_PER_WINDOW - updated.usedCount),
  };
}

function normalizeIdeas(value: unknown): Idea[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const obj = item as Record<string, unknown>;
      const headline = toCleanString(obj.headline);
      const summary = toCleanString(obj.summary);
      if (!headline || !summary) return null;
      return { headline, summary };
    })
    .filter(Boolean)
    .slice(0, 5) as Idea[];
}

function normalizeQuotes(value: unknown): Quote[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const obj = item as Record<string, unknown>;
      const text = toCleanString(obj.text);
      const context = toCleanString(obj.context);
      if (!text || !context) return null;
      return { text, context };
    })
    .filter(Boolean)
    .slice(0, 3) as Quote[];
}

function fillIdeas(ideas: Idea[]): Idea[] {
  const fallback: Idea[] = [
    {
      headline: "Core Thesis",
      summary: "Primary idea that captures the book's central argument.",
    },
    {
      headline: "Decision Pattern",
      summary: "A practical lens to make better choices using the book's model.",
    },
    {
      headline: "Behavior Mechanism",
      summary: "How this concept explains recurring human behavior in real life.",
    },
    {
      headline: "Execution Insight",
      summary: "How to apply the concept in product, leadership, or personal workflow.",
    },
    {
      headline: "Long-term Shift",
      summary: "What mindset change compounds over time if this idea is practiced.",
    },
  ];

  return Array.from({ length: 5 }).map((_, idx) => ideas[idx] || fallback[idx]);
}

function fillQuotes(quotes: Quote[]): Quote[] {
  const fallback: Quote[] = [
    {
      text: "A notable line from the book was unavailable in this response.",
      context: "Retry once to retrieve stronger quote extraction.",
    },
    {
      text: "A second notable line from the book was unavailable in this response.",
      context: "Retry once to retrieve stronger quote extraction.",
    },
    {
      text: "A third notable line from the book was unavailable in this response.",
      context: "Retry once to retrieve stronger quote extraction.",
    },
  ];

  return Array.from({ length: 3 }).map((_, idx) => quotes[idx] || fallback[idx]);
}

function toSummaryPayload(raw: unknown): SummaryPayload {
  const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};

  const currentYear = new Date().getFullYear();
  const yearRaw = Number(obj.publishedYear);
  const publishedYear = Number.isFinite(yearRaw)
    ? clamp(Math.round(yearRaw), 1300, currentYear)
    : currentYear;

  const ideas = normalizeIdeas(obj.ideas);
  const quotes = normalizeQuotes(obj.quotes);
  const author = toCleanString(obj.author) || "Unknown";

  return {
    essence:
      toCleanString(obj.essence) ||
      "A practical distillation of the book's core thesis and the mental models it teaches.",
    publishedYear,
    author,
    ideas: fillIdeas(ideas),
    quotes: fillQuotes(quotes),
    whoShouldRead:
      toCleanString(obj.whoShouldRead) ||
      "Readers who want fast comprehension of the key ideas before diving into the full text.",
  };
}

function buildOpenLibraryCoverUrl(coverId: number): string {
  return `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`;
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = REMOTE_FETCH_TIMEOUT_MS
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      cache: "no-store",
    });
  } finally {
    clearTimeout(timeout);
  }
}

function toHttpsUrl(url: string): string {
  return url.startsWith("http://") ? `https://${url.slice("http://".length)}` : url;
}

function getProviderErrorMessage(error: unknown): string | null {
  if (error instanceof Error && error.name === "AbortError") {
    return "Summary request timed out. Please try again.";
  }

  if (typeof error !== "object" || error === null) return null;

  const status = "status" in error ? (error as { status?: unknown }).status : undefined;
  if (typeof status !== "number") return null;

  if (status === 401 || status === 403) {
    return "Summary provider rejected server credentials. Please check API key configuration.";
  }

  if (status === 429) {
    return "Summary provider is rate-limiting requests right now. Please retry in a moment.";
  }

  if (status >= 500) {
    return "Summary provider is temporarily unavailable. Please retry in a moment.";
  }

  return null;
}

async function fetchGoogleBooksThumbnail(title: string): Promise<string | null> {
  try {
    const url = `${GOOGLE_BOOKS_VOLUMES_URL}?q=intitle:${encodeURIComponent(title)}&maxResults=1`;
    const response = await fetchWithTimeout(url, { method: "GET", redirect: "follow" });
    if (!response.ok) return null;

    const payload = (await response.json().catch(() => null)) as
      | {
          items?: Array<{
            volumeInfo?: {
              imageLinks?: {
                thumbnail?: unknown;
              };
            };
          }>;
        }
      | null;

    const thumbnail = toCleanString(
      payload?.items?.[0]?.volumeInfo?.imageLinks?.thumbnail
    );
    if (!thumbnail) return null;
    return toHttpsUrl(thumbnail);
  } catch {
    return null;
  }
}

async function fetchOpenLibraryCoverUrl(title: string): Promise<string | null> {
  try {
    const url = `${OPEN_LIBRARY_SEARCH_URL}?title=${encodeURIComponent(title)}&limit=1`;
    const response = await fetchWithTimeout(url, { method: "GET", redirect: "follow" });
    if (!response.ok) return null;

    const payload = (await response.json().catch(() => null)) as
      | { docs?: Array<{ cover_i?: unknown }> }
      | null;
    const coverId = Number(payload?.docs?.[0]?.cover_i);
    if (!Number.isFinite(coverId) || coverId <= 0) return null;

    return buildOpenLibraryCoverUrl(coverId);
  } catch {
    return null;
  }
}

async function resolveCoverUrl(title: string): Promise<string | null> {
  const normalized = normalizeWhitespace(title);
  if (!normalized) return null;

  const googleCover = await fetchGoogleBooksThumbnail(normalized);
  if (googleCover) return googleCover;

  const openLibraryCover = await fetchOpenLibraryCoverUrl(normalized);
  if (openLibraryCover) return openLibraryCover;

  return null;
}

export async function POST(request: Request) {
  try {
    if (!process.env.OPENAI_API_KEY && !process.env.DEEPSEEK_API_KEY) {
      return NextResponse.json(
        { error: "Server is missing OPENAI_API_KEY and DEEPSEEK_API_KEY." },
        { status: 500 }
      );
    }

    const decision = checkAndConsumeLimit(request);
    if (!decision.allowed) {
      const message =
        decision.reason === "cooldown"
          ? `Please wait ${decision.retryAfterSeconds}s before requesting another summary.`
          : "Daily limit reached. You can generate up to 5 summaries in a 24-hour window.";

      const blocked = NextResponse.json(
        {
          error: message,
          remaining: decision.remaining,
          retryAfterSeconds: decision.retryAfterSeconds,
        },
        { status: 429 }
      );

      blocked.headers.set("x-ratelimit-limit", String(MAX_USES_PER_WINDOW));
      blocked.headers.set("x-ratelimit-remaining", String(decision.remaining));
      blocked.headers.set("retry-after", String(decision.retryAfterSeconds));
      return blocked;
    }

    const body = (await request.json().catch(() => null)) as { title?: unknown } | null;
    const title = normalizeWhitespace(toCleanString(body?.title)).slice(0, MAX_TITLE_CHARS);

    if (title.length < 2) {
      return NextResponse.json({ error: "Please enter a valid book title." }, { status: 400 });
    }

    const createSummaryCompletion = () =>
      createCompletionWithDeepSeekFallback({
        openai,
        deepseek,
        timeoutMs: 60_000,
        params: {
          model: "gpt-4o-mini",
          temperature: 0.2,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
                "You are a precise book summarizer. Return strict JSON only with this exact shape: {\"essence\": string, \"publishedYear\": number, \"author\": string, \"ideas\": [{\"headline\": string, \"summary\": string}], \"quotes\": [{\"text\": string, \"context\": string}], \"whoShouldRead\": string }. Output exactly 5 ideas and exactly 3 quotes. Keep ideas actionable and quote contexts concise.",
            },
            {
              role: "user",
              content: `Book title: ${title}`,
            },
          ],
        },
      });

    const coverPromise = resolveCoverUrl(title);

    const [completion, coverUrl] = await Promise.all([createSummaryCompletion(), coverPromise]);

    const content = completion.choices[0]?.message?.content || "{}";
    let parsed: unknown;
    try {
      parsed = parseModelJson(content);
    } catch {
      try {
        const retry = await createSummaryCompletion();
        parsed = parseModelJson(retry.choices[0]?.message?.content || "{}");
      } catch {
        parsed = {};
      }
    }
    const payload = toSummaryPayload(parsed);

    const ok = NextResponse.json({
      ...payload,
      coverUrl,
    });

    ok.headers.set("x-ratelimit-limit", String(MAX_USES_PER_WINDOW));
    ok.headers.set("x-ratelimit-remaining", String(decision.remaining));

    return ok;
  } catch (error) {
    console.error("/api/summarize failed", error);
    const providerMessage = getProviderErrorMessage(error);
    return NextResponse.json(
      {
        error: providerMessage || "Unable to summarize right now. Please try again in a moment.",
      },
      { status: 500 }
    );
  }
}
