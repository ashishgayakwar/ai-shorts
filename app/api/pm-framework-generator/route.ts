import { createHash } from "crypto";
import { NextResponse } from "next/server";
import OpenAI from "openai";

import { parseModelJson } from "@/lib/model-json";

export const runtime = "nodejs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MAX_GENERATIONS_PER_VISITOR = 8;
const WINDOW_MS = 24 * 60 * 60 * 1000;
const COOLDOWN_MS = 12 * 1000;

type RequestBody = {
  task?: string;
  persona?: string;
  metric?: string;
  effort?: "S" | "M" | "L" | "XL";
  stage?: "discovery" | "build" | "launch";
};

type WhyItem = { why?: string; impact?: string };
type Story = { actor?: string; need?: string; outcome?: string; dod?: string };
type Acceptance = { scenario?: string; criterion?: string };
type KR = { label?: string; target?: string; metric?: string; progress?: number };
type MatrixItem = { quadrant?: string; intent?: string; recommendation?: string };

type AIPack = {
  rice_note?: string;
  rice_decision?: string;
  kano_basic?: string;
  kano_performance?: string;
  kano_delight?: string;
  kano_product_call?: string;
  kano_signal_check?: string;
  jtbd_opportunity?: string;
  jtbd_statement?: string;
  jtbd_jobs?: string[];
  okr_objective?: string;
  okr_krs?: KR[];
  okr_cadence?: string;
  moscow_must?: string[];
  moscow_should?: string[];
  moscow_could?: string[];
  moscow_wont?: string[];
  moscow_scope_call?: string;
  five_whys?: WhyItem[];
  stories?: Story[];
  acceptance?: Acceptance[];
  prd_out_of_scope?: string;
  prd_release_strategy?: string;
  prd_risk_register?: string[];
  north_star_metric?: string;
  north_star_description?: string;
  north_star_inputs?: string[];
  north_star_note?: string;
  matrix?: MatrixItem[];
  plan_30d?: string[];
};

type RateLimitDecision =
  | { allowed: true; remaining: number }
  | {
      allowed: false;
      remaining: number;
      retryAfterSeconds: number;
      reason: "cap" | "cooldown";
    };

type RateEntry = {
  windowStartMs: number;
  count: number;
  lastRequestMs: number;
};

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

function hashWithSecret(value: string): string {
  const secret =
    process.env.NEXTAUTH_SECRET ||
    process.env.OPENAI_API_KEY ||
    "pm-framework-generator-rate-limit";
  return createHash("sha256").update(`${value}|${secret}`).digest("hex");
}

function getRateStore(): Map<string, RateEntry> {
  const globalState = globalThis as unknown as {
    pmFrameworkGeneratorRateStore?: Map<string, RateEntry>;
  };
  if (!globalState.pmFrameworkGeneratorRateStore) {
    globalState.pmFrameworkGeneratorRateStore = new Map();
  }
  return globalState.pmFrameworkGeneratorRateStore;
}

function checkAndConsumeRateLimit(request: Request): RateLimitDecision {
  const now = Date.now();
  const ip = getClientIp(request);
  const fingerprint = request.headers.get("x-fingerprint") || "unknown";
  const key = hashWithSecret(`${ip}|${fingerprint}`);
  const store = getRateStore();
  const existing = store.get(key);

  if (!existing) {
    store.set(key, { windowStartMs: now, count: 1, lastRequestMs: now });
    return { allowed: true, remaining: MAX_GENERATIONS_PER_VISITOR - 1 };
  }

  if (now - existing.windowStartMs >= WINDOW_MS) {
    store.set(key, { windowStartMs: now, count: 1, lastRequestMs: now });
    return { allowed: true, remaining: MAX_GENERATIONS_PER_VISITOR - 1 };
  }

  if (now - existing.lastRequestMs < COOLDOWN_MS) {
    const retryAfterSeconds = clamp(
      Math.ceil((COOLDOWN_MS - (now - existing.lastRequestMs)) / 1000),
      1,
      30,
    );
    return {
      allowed: false,
      remaining: Math.max(0, MAX_GENERATIONS_PER_VISITOR - existing.count),
      retryAfterSeconds,
      reason: "cooldown",
    };
  }

  if (existing.count >= MAX_GENERATIONS_PER_VISITOR) {
    const retryAfterSeconds = clamp(
      Math.ceil((existing.windowStartMs + WINDOW_MS - now) / 1000),
      1,
      24 * 60 * 60,
    );
    return { allowed: false, remaining: 0, retryAfterSeconds, reason: "cap" };
  }

  const updated: RateEntry = {
    ...existing,
    count: existing.count + 1,
    lastRequestMs: now,
  };
  store.set(key, updated);
  return {
    allowed: true,
    remaining: Math.max(0, MAX_GENERATIONS_PER_VISITOR - updated.count),
  };
}

function applySecurityHeaders(response: NextResponse) {
  response.headers.set("cache-control", "no-store");
  response.headers.set("x-content-type-options", "nosniff");
}

function withRateHeaders(response: NextResponse, remaining: number, retryAfterSeconds?: number) {
  response.headers.set("x-ratelimit-limit", String(MAX_GENERATIONS_PER_VISITOR));
  response.headers.set("x-ratelimit-remaining", String(remaining));
  if (typeof retryAfterSeconds === "number") {
    response.headers.set("retry-after", String(retryAfterSeconds));
  }
}

function clean(value: unknown): string {
  return typeof value === "string" ? value.replace(/\u0000/g, "").trim() : "";
}

function clampText(value: string, max: number): string {
  return value.slice(0, max);
}

function textArray(value: unknown, maxItems = 6, maxLen = 240): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out = value
    .map((v) => clean(v))
    .filter(Boolean)
    .slice(0, maxItems)
    .map((v) => clampText(v, maxLen));
  return out.length ? out : undefined;
}

function normalizeEnhancements(value: unknown): AIPack {
  if (!value || typeof value !== "object") return {};
  const data = value as Record<string, unknown>;

  const out: AIPack = {};
  const textKeys: Array<keyof AIPack> = [
    "rice_note",
    "rice_decision",
    "kano_basic",
    "kano_performance",
    "kano_delight",
    "kano_product_call",
    "kano_signal_check",
    "jtbd_opportunity",
    "jtbd_statement",
    "okr_objective",
    "okr_cadence",
    "moscow_scope_call",
    "prd_out_of_scope",
    "prd_release_strategy",
    "north_star_metric",
    "north_star_description",
    "north_star_note",
  ];
  for (const key of textKeys) {
    const text = clean(data[key]);
    if (text) out[key] = clampText(text, 520) as never;
  }

  out.moscow_must = textArray(data.moscow_must);
  out.moscow_should = textArray(data.moscow_should);
  out.moscow_could = textArray(data.moscow_could);
  out.moscow_wont = textArray(data.moscow_wont);
  out.jtbd_jobs = textArray(data.jtbd_jobs, 5);
  out.prd_risk_register = textArray(data.prd_risk_register, 8);
  out.north_star_inputs = textArray(data.north_star_inputs, 5);
  out.plan_30d = textArray(data.plan_30d, 8);

  if (Array.isArray(data.five_whys)) {
    const items = (data.five_whys as Array<Record<string, unknown>>)
      .map((x) => ({ why: clampText(clean(x?.why), 280), impact: clampText(clean(x?.impact), 280) }))
      .filter((x) => x.why && x.impact)
      .slice(0, 5);
    if (items.length) out.five_whys = items;
  }

  if (Array.isArray(data.stories)) {
    const items = (data.stories as Array<Record<string, unknown>>)
      .map((x) => ({
        actor: clampText(clean(x?.actor), 120),
        need: clampText(clean(x?.need), 220),
        outcome: clampText(clean(x?.outcome), 220),
        dod: clampText(clean(x?.dod), 220),
      }))
      .filter((x) => x.actor && x.need && x.outcome && x.dod)
      .slice(0, 4);
    if (items.length) out.stories = items;
  }

  if (Array.isArray(data.acceptance)) {
    const items = (data.acceptance as Array<Record<string, unknown>>)
      .map((x) => ({
        scenario: clampText(clean(x?.scenario), 180),
        criterion: clampText(clean(x?.criterion), 260),
      }))
      .filter((x) => x.scenario && x.criterion)
      .slice(0, 6);
    if (items.length) out.acceptance = items;
  }

  if (Array.isArray(data.okr_krs)) {
    const items = (data.okr_krs as Array<Record<string, unknown>>)
      .map((x) => ({
        label: clampText(clean(x?.label), 50),
        target: clampText(clean(x?.target), 180),
        metric: clampText(clean(x?.metric), 180),
        progress: typeof x?.progress === "number" ? Math.max(0, Math.min(100, x.progress)) : undefined,
      }))
      .filter((x) => x.label && x.target && x.metric)
      .slice(0, 4);
    if (items.length) out.okr_krs = items;
  }

  if (Array.isArray(data.matrix)) {
    const items = (data.matrix as Array<Record<string, unknown>>)
      .map((x) => ({
        quadrant: clampText(clean(x?.quadrant), 80),
        intent: clampText(clean(x?.intent), 120),
        recommendation: clampText(clean(x?.recommendation), 260),
      }))
      .filter((x) => x.quadrant && x.intent && x.recommendation)
      .slice(0, 4);
    if (items.length) out.matrix = items;
  }

  return out;
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.toLowerCase().includes("application/json")) {
      const badType = NextResponse.json(
        { error: "Unsupported content type. Use application/json." },
        { status: 415 },
      );
      applySecurityHeaders(badType);
      return badType;
    }

    if (!process.env.OPENAI_API_KEY) {
      const missing = NextResponse.json(
        { error: "Server is missing OPENAI_API_KEY." },
        { status: 500 },
      );
      applySecurityHeaders(missing);
      return missing;
    }

    const rateLimit = checkAndConsumeRateLimit(request);
    if (!rateLimit.allowed) {
      const message =
        rateLimit.reason === "cooldown"
          ? `Please wait ${rateLimit.retryAfterSeconds}s before generating again.`
          : "You have reached the maximum number of generations for this browser and IP.";
      const blocked = NextResponse.json(
        {
          error: message,
          remaining: rateLimit.remaining,
          retryAfterSeconds: rateLimit.retryAfterSeconds,
        },
        { status: 429 },
      );
      applySecurityHeaders(blocked);
      withRateHeaders(blocked, rateLimit.remaining, rateLimit.retryAfterSeconds);
      return blocked;
    }

    const body = (await request.json().catch(() => null)) as RequestBody | null;
    const task = clampText(clean(body?.task), 400);
    const persona = clampText(clean(body?.persona) || "core users", 120);
    const metric = clampText(clean(body?.metric), 260);
    const effort = body?.effort && ["S", "M", "L", "XL"].includes(body.effort) ? body.effort : "M";
    const stage =
      body?.stage && ["discovery", "build", "launch"].includes(body.stage) ? body.stage : "build";

    if (!task || task.length < 8) {
      const badTask = NextResponse.json(
        { error: "Please enter a fuller task (at least 8 characters)." },
        { status: 400 },
      );
      applySecurityHeaders(badTask);
      withRateHeaders(badTask, rateLimit.remaining);
      return badTask;
    }

    const system = `You are a senior AI PM coach. Return strict JSON only with practical, PM-grade output.`;
    const user = `Task context:\n${JSON.stringify({ task, persona, metric, effort, stage })}\n\nReturn JSON with ALL keys exactly (omit key only if truly not applicable):\n- rice_note\n- rice_decision\n- moscow_must\n- moscow_should\n- moscow_could\n- moscow_wont\n- moscow_scope_call\n- kano_basic\n- kano_performance\n- kano_delight\n- kano_product_call\n- kano_signal_check\n- five_whys (array of {why, impact})\n- jtbd_statement\n- jtbd_jobs (array)\n- jtbd_opportunity\n- prd_out_of_scope\n- prd_release_strategy\n- prd_risk_register (array)\n- stories (array of {actor, need, outcome, dod})\n- acceptance (array of {scenario, criterion})\n- okr_objective\n- okr_krs (array of {label, target, metric, progress})\n- okr_cadence\n- north_star_metric\n- north_star_description\n- north_star_inputs (array)\n- north_star_note\n- matrix (array of {quadrant, intent, recommendation})\n- plan_30d (array)\n\nRules:\n- Ground every line in the given task/persona/metric.\n- Do not invent unrelated domains or assumptions.\n- Keep content concise, practical, and execution-ready.\n- JTBD depth requirement:\n  - jtbd_statement: 2-3 sentences\n  - jtbd_jobs: exactly 4 bullets, each specific and non-generic\n  - jtbd_opportunity: 2 sentences with concrete execution implication\n- No markdown, no emojis, valid JSON only.`;

    const createCompletion = () =>
      openai.chat.completions.create({
        model: "gpt-4o",
        temperature: 0.5,
        max_tokens: 1800,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      });

    const completion = await createCompletion();

    const raw = completion.choices?.[0]?.message?.content;
    if (!raw) {
      const empty = NextResponse.json({ pack: {}, enhancements: {}, remaining: rateLimit.remaining });
      applySecurityHeaders(empty);
      withRateHeaders(empty, rateLimit.remaining);
      return empty;
    }

    let parsed: unknown;
    try {
      parsed = parseModelJson(raw);
    } catch {
      const retryCompletion = await createCompletion();
      const retryRaw = retryCompletion.choices?.[0]?.message?.content ?? "{}";
      parsed = parseModelJson(retryRaw);
    }
    const pack = normalizeEnhancements(parsed);

    const ok = NextResponse.json({ pack, enhancements: pack, remaining: rateLimit.remaining });
    applySecurityHeaders(ok);
    withRateHeaders(ok, rateLimit.remaining);
    return ok;
  } catch {
    const fallback = NextResponse.json({ pack: {}, enhancements: {} }, { status: 200 });
    applySecurityHeaders(fallback);
    return fallback;
  }
}
