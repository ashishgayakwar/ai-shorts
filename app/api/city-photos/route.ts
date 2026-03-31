import { createHash } from "crypto";

import { NextResponse } from "next/server";

const MAX_USES_PER_WINDOW = clamp(
  Number(process.env.CITY_PHOTOS_MAX_USES_PER_WINDOW ?? "100"),
  1,
  10000
);
const WINDOW_MS = clamp(
  Number(process.env.CITY_PHOTOS_WINDOW_MS ?? `${24 * 60 * 60 * 1000}`),
  60 * 1000,
  30 * 24 * 60 * 60 * 1000
);
const COOLDOWN_MS = clamp(Number(process.env.CITY_PHOTOS_COOLDOWN_MS ?? "0"), 0, 60 * 1000);
const PEXELS_TIMEOUT_MS = 7000;
const PEXELS_MAX_ATTEMPTS = 3;
const PEXELS_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

type RateEntry = {
  windowStartMs: number;
  usedCount: number;
  lastRequestMs: number;
};

type PhotoCacheEntry = {
  url: string;
  expiresAtMs: number;
};

type RateDecision =
  | { allowed: true; remaining: number }
  | { allowed: false; remaining: number; retryAfterSeconds: number; reason: "cap" | "cooldown" };

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

function hashWithSecret(value: string): string {
  const secret =
    process.env.NEXTAUTH_SECRET || process.env.OPENAI_API_KEY || "city-photo-rate-limit-secret";
  return createHash("sha256").update(`${value}|${secret}`).digest("hex");
}

function getRateLimitKey(request: Request): string {
  const ip = getClientIp(request);
  const fingerprint = request.headers.get("x-fingerprint") || "unknown";
  return hashWithSecret(`${ip}|${fingerprint}`);
}

function getRateStore(): Map<string, RateEntry> {
  const globalState = globalThis as unknown as { cityPhotosRateStore?: Map<string, RateEntry> };
  if (!globalState.cityPhotosRateStore) {
    globalState.cityPhotosRateStore = new Map();
  }
  return globalState.cityPhotosRateStore;
}

function getPhotoCache(): Map<string, PhotoCacheEntry> {
  const globalState = globalThis as unknown as { cityPhotosCache?: Map<string, PhotoCacheEntry> };
  if (!globalState.cityPhotosCache) {
    globalState.cityPhotosCache = new Map();
  }
  return globalState.cityPhotosCache;
}

function normalizeQuery(query: string): string {
  return query.trim().toLowerCase();
}

function getCachedPhoto(query: string): string | null {
  const key = normalizeQuery(query);
  const cache = getPhotoCache();
  const cached = cache.get(key);
  if (!cached) return null;
  if (cached.expiresAtMs < Date.now()) {
    cache.delete(key);
    return null;
  }
  return cached.url;
}

function setCachedPhoto(query: string, url: string): void {
  getPhotoCache().set(normalizeQuery(query), {
    url,
    expiresAtMs: Date.now() + PEXELS_CACHE_TTL_MS,
  });
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function getRetryDelayMs(attempt: number, retryAfterHeader: string | null): number {
  const retryAfterSec = Number(retryAfterHeader ?? "");
  if (Number.isFinite(retryAfterSec) && retryAfterSec > 0) {
    return clamp(Math.round(retryAfterSec * 1000), 500, 10000);
  }
  const expBackoff = 400 * 2 ** Math.max(0, attempt - 1);
  const jitter = Math.floor(Math.random() * 200);
  return clamp(expBackoff + jitter, 300, 5000);
}

async function fetchPexelsPhoto(query: string): Promise<string | null> {
  const cached = getCachedPhoto(query);
  if (cached) return cached;

  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    console.error("PEXELS_API_KEY is missing.");
    return null;
  }

  for (let attempt = 1; attempt <= PEXELS_MAX_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PEXELS_TIMEOUT_MS);

    try {
      const res = await fetch(
        `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`,
        {
          headers: { Authorization: apiKey },
          cache: "no-store",
          signal: controller.signal,
        }
      );

      if (res.ok) {
        const data = (await res.json()) as {
          photos?: Array<{ src?: { large2x?: string } }>;
        };
        const url = data.photos?.[0]?.src?.large2x ?? null;
        if (url) setCachedPhoto(query, url);
        return url;
      }

      const shouldRetry = res.status === 429 || res.status >= 500;
      const responseText = await res.text();
      console.error("Pexels error:", res.status, responseText);

      if (!shouldRetry || attempt >= PEXELS_MAX_ATTEMPTS) {
        return null;
      }

      await sleep(getRetryDelayMs(attempt, res.headers.get("retry-after")));
    } catch (e) {
      console.error("Pexels fetch failed:", e);
      if (attempt >= PEXELS_MAX_ATTEMPTS) {
        return null;
      }
      await sleep(getRetryDelayMs(attempt, null));
    } finally {
      clearTimeout(timeout);
    }
  }

  return null;
}

function checkAndConsumeLimit(request: Request): RateDecision {
  const now = Date.now();
  const key = getRateLimitKey(request);
  const store = getRateStore();
  const current = store.get(key);

  if (!current || now - current.windowStartMs >= WINDOW_MS) {
    store.set(key, { windowStartMs: now, usedCount: 1, lastRequestMs: now });
    return { allowed: true, remaining: MAX_USES_PER_WINDOW - 1 };
  }

  if (COOLDOWN_MS > 0 && now - current.lastRequestMs < COOLDOWN_MS) {
    return {
      allowed: false,
      remaining: Math.max(0, MAX_USES_PER_WINDOW - current.usedCount),
      retryAfterSeconds: clamp(
        Math.ceil((COOLDOWN_MS - (now - current.lastRequestMs)) / 1000),
        1,
        30
      ),
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
      reason: "cap",
    };
  }

  const updated: RateEntry = {
    ...current,
    usedCount: current.usedCount + 1,
    lastRequestMs: now,
  };
  store.set(key, updated);
  return { allowed: true, remaining: Math.max(0, MAX_USES_PER_WINDOW - updated.usedCount) };
}

export async function POST(req: Request) {
  const { queries } = (await req.json().catch(() => ({ queries: [] }))) as { queries?: string[] };

  const safeQueries = Array.isArray(queries) ? queries.slice(0, 5) : [];
  const cachedResults = safeQueries.map((query) => getCachedPhoto(query));
  if (cachedResults.length > 0 && cachedResults.every((url) => typeof url === "string" && url.length > 0)) {
    return NextResponse.json({ photos: cachedResults, remaining: MAX_USES_PER_WINDOW });
  }

  const rateLimit = checkAndConsumeLimit(req);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error:
          rateLimit.reason === "cooldown"
            ? `Please wait ${rateLimit.retryAfterSeconds}s before requesting another photo set.`
            : `You have reached the maximum of ${MAX_USES_PER_WINDOW} photo requests for this browser and IP in this window.`,
        remaining: rateLimit.remaining,
        retryAfterSeconds: rateLimit.retryAfterSeconds,
        reason: rateLimit.reason,
      },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
      }
    );
  }

  const uniqueQueries = Array.from(
    new Map(safeQueries.map((query) => [normalizeQuery(query), query])).values()
  );
  const uniqueResults = await Promise.all(uniqueQueries.map((query) => fetchPexelsPhoto(query)));
  const byNormalizedQuery = new Map<string, string | null>(
    uniqueQueries.map((query, index) => [normalizeQuery(query), uniqueResults[index] ?? null])
  );
  const results = safeQueries.map((query) => byNormalizedQuery.get(normalizeQuery(query)) ?? null);

  return NextResponse.json({ photos: results, remaining: rateLimit.remaining });
}
