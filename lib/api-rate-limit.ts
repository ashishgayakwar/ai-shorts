import { createHmac } from "crypto";

import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type ApiRateLimitDecision =
  | { allowed: true; remaining: number }
  | {
      allowed: false;
      remaining: number;
      retryAfterSeconds: number;
      reason: "cap" | "cooldown" | "project_cap";
    };

type ApiRateLimitRow = {
  count: number;
  windowStart: Date;
  lastRequestAt: Date;
};

type CheckApiRateLimitOptions = {
  key: string;
  route: string;
  limit: number;
  windowMs: number;
  cooldownMs?: number;
  capReason?: "cap" | "project_cap";
};

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

export function hmacHash(value: string, namespace = "api-rate-limit"): string {
  const secret =
    process.env.NEXTAUTH_SECRET ||
    process.env.RATE_LIMIT_SECRET ||
    process.env.OPENAI_API_KEY ||
    "api-rate-limit-fallback-secret";

  return createHmac("sha256", secret).update(`${namespace}|${value}`).digest("hex");
}

export function fingerprintRateLimitKey(request: Request, route: string): string {
  const ip = getClientIp(request);
  const fingerprint = request.headers.get("x-fingerprint") || "unknown";
  return `${route}:${hmacHash(`${ip}|${fingerprint}`, route)}`;
}

export function ipRateLimitKey(request: Request, route: string): string {
  return `${route}:${hmacHash(getClientIp(request), route)}`;
}

export function projectRateLimitKey(route: string): string {
  return `${route}:project`;
}

export async function checkApiRateLimit({
  key,
  route,
  limit,
  windowMs,
  cooldownMs = 0,
  capReason = "cap",
}: CheckApiRateLimitOptions): Promise<ApiRateLimitDecision> {
  const nowMs = Date.now();
  const now = new Date(nowMs);

  return prisma.$transaction(
    async (tx: Prisma.TransactionClient) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))`;

      const rows = await tx.$queryRaw<ApiRateLimitRow[]>`
        SELECT "count", "windowStart", "lastRequestAt"
        FROM "ApiRateLimit"
        WHERE "key" = ${key}
        FOR UPDATE
      `;

      const current = rows[0];
      if (!current || nowMs - new Date(current.windowStart).getTime() >= windowMs) {
        await tx.$executeRaw`
          INSERT INTO "ApiRateLimit" ("key", "route", "windowStart", "count", "lastRequestAt", "updatedAt")
          VALUES (${key}, ${route}, ${now}, 1, ${now}, ${now})
          ON CONFLICT ("key") DO UPDATE SET
            "route" = EXCLUDED."route",
            "windowStart" = EXCLUDED."windowStart",
            "count" = EXCLUDED."count",
            "lastRequestAt" = EXCLUDED."lastRequestAt",
            "updatedAt" = EXCLUDED."updatedAt"
        `;
        return { allowed: true as const, remaining: limit - 1 };
      }

      const lastRequestMs = new Date(current.lastRequestAt).getTime();
      if (cooldownMs > 0 && nowMs - lastRequestMs < cooldownMs) {
        return {
          allowed: false as const,
          remaining: Math.max(0, limit - current.count),
          retryAfterSeconds: clamp(
            Math.ceil((cooldownMs - (nowMs - lastRequestMs)) / 1000),
            1,
            Math.ceil(cooldownMs / 1000)
          ),
          reason: "cooldown" as const,
        };
      }

      if (current.count >= limit) {
        return {
          allowed: false as const,
          remaining: 0,
          retryAfterSeconds: clamp(
            Math.ceil((new Date(current.windowStart).getTime() + windowMs - nowMs) / 1000),
            1,
            Math.ceil(windowMs / 1000)
          ),
          reason: capReason,
        };
      }

      await tx.$executeRaw`
        UPDATE "ApiRateLimit"
        SET "count" = "count" + 1,
            "lastRequestAt" = ${now},
            "updatedAt" = ${now}
        WHERE "key" = ${key}
      `;

      return { allowed: true as const, remaining: Math.max(0, limit - (current.count + 1)) };
    },
    { isolationLevel: "Serializable" }
  );
}
