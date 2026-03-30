import { createHash } from "crypto";

import { NextResponse } from "next/server";

const MAX_USES_PER_WINDOW = 5;
const WINDOW_MS = 24 * 60 * 60 * 1000;
const COOLDOWN_MS = 30 * 1000;

type RateEntry = {
  windowStartMs: number;
  usedCount: number;
  lastRequestMs: number;
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

function checkAndConsumeLimit(request: Request): RateDecision {
  const now = Date.now();
  const key = getRateLimitKey(request);
  const store = getRateStore();
  const current = store.get(key);

  if (!current || now - current.windowStartMs >= WINDOW_MS) {
    store.set(key, { windowStartMs: now, usedCount: 1, lastRequestMs: now });
    return { allowed: true, remaining: MAX_USES_PER_WINDOW - 1 };
  }

  if (now - current.lastRequestMs < COOLDOWN_MS) {
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
  const rateLimit = checkAndConsumeLimit(req);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error:
          rateLimit.reason === "cooldown"
            ? `Please wait ${rateLimit.retryAfterSeconds}s before requesting another photo set.`
            : "You have reached the maximum of 5 photo requests for this browser and IP in 24 hours.",
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

  const { queries } = (await req.json().catch(() => ({ queries: [] }))) as { queries?: string[] };

  const safeQueries = Array.isArray(queries) ? queries.slice(0, 5) : [];

  const results = await Promise.all(
    safeQueries.map(async (q: string) => {
      try {
        const res = await fetch(
          `https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&per_page=1&orientation=landscape`,
          {
            headers: {
              Authorization: process.env.PEXELS_API_KEY ?? "",
            },
            cache: "no-store",
          }
        );

        if (!res.ok) {
          console.error("Pexels error:", res.status, await res.text());
          return null;
        }

        const data = (await res.json()) as {
          photos?: Array<{ src?: { large2x?: string } }>;
        };

        return data.photos?.[0]?.src?.large2x ?? null;
      } catch (e) {
        console.error("Pexels fetch failed:", e);
        return null;
      }
    })
  );

  return NextResponse.json({ photos: results, remaining: rateLimit.remaining });
}
