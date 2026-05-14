import { NextResponse } from "next/server";

import {
  checkApiRateLimit,
  fingerprintRateLimitKey,
  type ApiRateLimitDecision,
} from "@/lib/api-rate-limit";

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

type PhotoCacheEntry = {
  url: string;
  expiresAtMs: number;
};

type RateDecision =
  ApiRateLimitDecision;

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
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

function getFallbackPhotoUrl(query: string): string {
  return `https://picsum.photos/seed/${encodeURIComponent(normalizeQuery(query))}/1600/900`;
}

async function fetchPexelsPhoto(query: string): Promise<string | null> {
  const cached = getCachedPhoto(query);
  if (cached) return cached;

  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    console.error("PEXELS_API_KEY is missing.");
    return getFallbackPhotoUrl(query);
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
        return getFallbackPhotoUrl(query);
      }

      await sleep(getRetryDelayMs(attempt, res.headers.get("retry-after")));
    } catch (e) {
      console.error("Pexels fetch failed:", e);
      if (attempt >= PEXELS_MAX_ATTEMPTS) {
        return getFallbackPhotoUrl(query);
      }
      await sleep(getRetryDelayMs(attempt, null));
    } finally {
      clearTimeout(timeout);
    }
  }

  return getFallbackPhotoUrl(query);
}

function checkAndConsumeLimit(request: Request): Promise<RateDecision> {
  return checkApiRateLimit({
    key: fingerprintRateLimitKey(request, "city-photos"),
    route: "city-photos",
    limit: MAX_USES_PER_WINDOW,
    windowMs: WINDOW_MS,
    cooldownMs: COOLDOWN_MS,
  });
}

export async function POST(req: Request) {
  const { queries } = (await req.json().catch(() => ({ queries: [] }))) as { queries?: string[] };

  const safeQueries = Array.isArray(queries) ? queries.slice(0, 5) : [];
  const cachedResults = safeQueries.map((query) => getCachedPhoto(query));
  if (cachedResults.length > 0 && cachedResults.every((url) => typeof url === "string" && url.length > 0)) {
    return NextResponse.json({ photos: cachedResults, remaining: MAX_USES_PER_WINDOW });
  }

  const rateLimit = await checkAndConsumeLimit(req);
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
