import { NextResponse } from "next/server";
import OpenAI from "openai";

import { parseModelJson } from "@/lib/model-json";

export const runtime = "nodejs";

const cityGuideApiKey = process.env.CITY_GUIDE_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
const openai = cityGuideApiKey
  ? new OpenAI({
      apiKey: cityGuideApiKey,
    })
  : null;
const deepseek = process.env.DEEPSEEK_API_KEY
  ? new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: "https://api.deepseek.com/v1",
    })
  : null;

const PROJECT_RATE_LIMIT_MAX = 120;
const PROJECT_RATE_LIMIT_WINDOW_MS = 60_000;
const OPENAI_TIMEOUT_MS = 60_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getErrorStatus(error: unknown): number | undefined {
  if (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof (error as { status?: unknown }).status === "number"
  ) {
    return (error as { status: number }).status;
  }
  return undefined;
}

function shouldRetryOrFallback(error: unknown): boolean {
  const status = getErrorStatus(error);
  if (status === 429) return true;
  if (typeof status === "number" && status >= 500) return true;
  if (error instanceof Error && error.name === "AbortError") return true;
  return false;
}

type ProjectRateEntry = {
  count: number;
  resetAt: number;
};

type RateDecision =
  | { allowed: true; remaining: number }
  | { allowed: false; remaining: number; retryAfterSeconds: number; reason: "project_cap" };

function getProjectRateState(): ProjectRateEntry {
  const globalState = globalThis as unknown as {
    cityGuideProjectRate?: ProjectRateEntry;
  };
  if (!globalState.cityGuideProjectRate) {
    globalState.cityGuideProjectRate = {
      count: 0,
      resetAt: Date.now() + PROJECT_RATE_LIMIT_WINDOW_MS,
    };
  }
  return globalState.cityGuideProjectRate;
}

function setProjectRateState(next: ProjectRateEntry): void {
  const globalState = globalThis as unknown as {
    cityGuideProjectRate?: ProjectRateEntry;
  };
  globalState.cityGuideProjectRate = next;
}

function checkAndConsumeLimit(): RateDecision {
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

type CityGuidePayload = {
  accentColor: string;
  accentColorLight: string;
  visaBg: string;
  hero: {
    title: string;
    tagline: string;
    region: string;
    timezone: string;
    language: string;
  };
  vibe: {
    summary: string;
    tags: string[];
  };
  bestTime: {
    season: string;
    why: string;
    avoid: string;
  };
  visa: {
    headline: string;
    details: string[];
  };
  stats: {
    population: string;
    avgTemp: string;
  };
  history: {
    summary: string;
    sites: string[];
  };
  food: {
    dishes: string[];
    tags: string[];
  };
  budget: {
    backpacker: string;
    mid: string;
    premium: string;
  };
  flights: {
    fromMumbai: string;
    fromDelhi: string;
    fromBengaluru: string;
    fromHyderabad: string;
  };
  neighbourhoods: {
    stay: string[];
    explore: string[];
  };
  intercity: {
    nearby: string[];
    localTransport: string[];
  };
  gems: string[];
  customs: string[];
  photoSpots: string[];
  tips: Array<{ icon: string; text: string }>;
  carouselSearchTerms: string[];
};

const INDIA_CITY_HINTS = new Set([
  "amritsar",
  "agra",
  "ahmedabad",
  "bengaluru",
  "bangalore",
  "bhopal",
  "chandigarh",
  "chennai",
  "coimbatore",
  "dehradun",
  "delhi",
  "goa",
  "gurugram",
  "guwahati",
  "hyderabad",
  "indore",
  "jaipur",
  "kochi",
  "kolkata",
  "lucknow",
  "mumbai",
  "mysuru",
  "nagpur",
  "nashik",
  "new delhi",
  "noida",
  "patna",
  "pune",
  "rishikesh",
  "shimla",
  "srinagar",
  "surat",
  "thane",
  "trivandrum",
  "udaipur",
  "varanasi",
  "visakhapatnam",
]);

function isLikelyIndianDestination(city: string, guide: CityGuidePayload): boolean {
  const cityKey = city.trim().toLowerCase();
  if (INDIA_CITY_HINTS.has(cityKey)) return true;

  const region = guide.hero.region.toLowerCase();
  const timezone = guide.hero.timezone.toLowerCase();
  const language = guide.hero.language.toLowerCase();

  return (
    region.includes("india") ||
    timezone.includes("ist") ||
    timezone.includes("utc+5:30") ||
    language.includes("hindi")
  );
}

function buildEntryCard(city: string, guide: CityGuidePayload): { label: string; title: string; body: string } {
  if (isLikelyIndianDestination(city, guide)) {
    return {
      label: "Travel Docs",
      title: "Domestic Travel",
      body:
        "• No visa needed for Indian citizens. • Carry a valid government photo ID for flights, hotels, and verification checks. • Check permit requirements for restricted/protected areas before travel.",
    };
  }

  return {
    label: "Entry",
    title: guide.visa.headline,
    body: guide.visa.details.map((d) => `• ${d}`).join(" "),
  };
}

function parseBudgetMax(text: string): number {
  const parts = text.match(/\d[\d,]*/g);
  if (!parts?.length) return 0;
  const num = Number(parts[parts.length - 1].replace(/,/g, ""));
  return Number.isFinite(num) ? num : 0;
}

function toLegacyGuide(city: string, guide: CityGuidePayload) {
  const entryCard = buildEntryCard(city, guide);
  const b = parseBudgetMax(guide.budget.backpacker);
  const m = parseBudgetMax(guide.budget.mid);
  const p = parseBudgetMax(guide.budget.premium);
  const max = Math.max(b, m, p, 1);

  return {
    accentColor: guide.accentColor,
    accentColorLight: guide.accentColorLight,
    visaBg: guide.visaBg,
    hero: {
      tagline: guide.hero.tagline,
      code: city.slice(0, 3).toUpperCase(),
      pills: [
        { emoji: "🌏", text: guide.hero.region },
        { emoji: "🗣", text: guide.hero.language },
        { emoji: "⏰", text: guide.hero.timezone },
      ],
    },
    vibe: {
      title: `${city} Pulse`,
      body: guide.vibe.summary,
      tags: guide.vibe.tags.map((label, idx) => ({ label, type: idx % 3 === 0 ? "a" : "" })),
    },
    bestTime: {
      period: guide.bestTime.season,
      note: `${guide.bestTime.why} <strong>Avoid:</strong> ${guide.bestTime.avoid}`,
    },
    visa: {
      label: entryCard.label,
      title: entryCard.title,
      body: entryCard.body,
    },
    stats: guide.stats,
    history: {
      title: `${city} Through Time`,
      body: guide.history.summary,
      sites: guide.history.sites.map((s) => `<strong>${s}</strong>`),
    },
    food: {
      title: `Must-eat in ${city}`,
      items: guide.food.dishes.map((d) => `<strong>${d}</strong> — Local favorite`),
      tags: guide.food.tags.map((label) => ({ label, type: "a" })),
    },
    budget: {
      title: `Daily spend in ${city}`,
      tiers: [
        { label: "Budget", pct: Math.max(15, Math.round((b / max) * 100)), price: guide.budget.backpacker },
        { label: "Mid", pct: Math.max(20, Math.round((m / max) * 100)), price: guide.budget.mid },
        { label: "Luxury", pct: Math.max(25, Math.round((p / max) * 100)), price: guide.budget.premium },
      ],
      warning: "⚠️ <strong>Costly traps:</strong> Airport transfers, impulse tours, and convenience-location stays.",
    },
    flights: {
      routes: [
        { from: "Mumbai", time: guide.flights.fromMumbai, note: "Check direct options" },
        { from: "Delhi", time: guide.flights.fromDelhi, note: "Early flights save cost" },
        { from: "Bangalore", time: guide.flights.fromBengaluru, note: "Compare layovers" },
        { from: "Chennai", time: guide.flights.fromHyderabad, note: "Closest viable hub" },
      ],
      note: "Best airlines vary seasonally. <strong>Book early</strong> for best fares.",
    },
    neighbourhoods: {
      stay: guide.neighbourhoods.stay.map((x) => `<strong>${x}</strong> — Good base`),
      explore: guide.neighbourhoods.explore.map((x) => `<strong>${x}</strong> — High local signal`),
    },
    intercity: {
      title: "Nearby Cities & Day Trips",
      destinations: [
        ...guide.intercity.nearby.map((x) => ({ city: x, detail: "Day trip / quick transfer" })),
        { city: "In-City", detail: guide.intercity.localTransport.join(" · ") || "Metro · Bus · Taxi" },
      ].slice(0, 6),
    },
    gems: guide.gems.map((g) => `<strong>${g}</strong> — Worth the detour`),
    customs: guide.customs.map((c) => `<strong>${c}</strong>`),
    photoSpots: guide.photoSpots.map((p) => `<strong>${p}</strong> — Golden hour recommended`),
    tips: guide.tips,
    carouselSearchTerms: guide.carouselSearchTerms,
  };
}

function toStr(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function toStrList(value: unknown, max = 8): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => toStr(v))
    .filter(Boolean)
    .slice(0, max);
}

function normalizePayload(raw: unknown, city: string): CityGuidePayload {
  const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const heroObj = (obj.hero ?? {}) as Record<string, unknown>;
  const bestObj = (obj.bestTime ?? {}) as Record<string, unknown>;
  const visaObj = (obj.visa ?? {}) as Record<string, unknown>;
  const statsObj = (obj.stats ?? {}) as Record<string, unknown>;
  const historyObj = (obj.history ?? {}) as Record<string, unknown>;
  const foodObj = (obj.food ?? {}) as Record<string, unknown>;
  const budgetObj = (obj.budget ?? {}) as Record<string, unknown>;
  const flightsObj = (obj.flights ?? {}) as Record<string, unknown>;
  const hoodObj = (obj.neighbourhoods ?? {}) as Record<string, unknown>;
  const intercityObj = (obj.intercity ?? {}) as Record<string, unknown>;
  const vibeObj = (obj.vibe ?? {}) as Record<string, unknown>;

  return {
    accentColor: toStr(obj.accentColor, "#C9963A"),
    accentColorLight: toStr(obj.accentColorLight, "#E8B95A"),
    visaBg: toStr(obj.visaBg, "#18263A"),
    hero: {
      title: toStr(heroObj.title, city),
      tagline: toStr(heroObj.tagline, "A city guide crafted for your next trip."),
      region: toStr(heroObj.region, "Global"),
      timezone: toStr(heroObj.timezone, "Local time"),
      language: toStr(heroObj.language, "Local language"),
    },
    vibe: {
      summary: toStr(
        vibeObj.summary,
        `${city} blends culture, food, and neighborhoods with a strong local rhythm.`
      ),
      tags: toStrList(vibeObj.tags, 5),
    },
    bestTime: {
      season: toStr(bestObj.season, "Best in Spring and Autumn"),
      why: toStr(bestObj.why, "Pleasant weather and manageable crowds."),
      avoid: toStr(bestObj.avoid, "Peak holiday weeks if you prefer calmer travel."),
    },
    visa: {
      headline: toStr(visaObj.headline, "Check latest visa policy before booking."),
      details: toStrList(visaObj.details, 4),
    },
    stats: {
      population: toStr(statsObj.population, "N/A"),
      avgTemp: toStr(statsObj.avgTemp, "N/A"),
    },
    history: {
      summary: toStr(historyObj.summary, `${city} has a layered historical arc worth exploring.`),
      sites: toStrList(historyObj.sites, 4),
    },
    food: {
      dishes: toStrList(foodObj.dishes, 5),
      tags: toStrList(foodObj.tags, 5),
    },
    budget: {
      backpacker: toStr(budgetObj.backpacker, "INR 3,000-5,000/day"),
      mid: toStr(budgetObj.mid, "INR 7,000-12,000/day"),
      premium: toStr(budgetObj.premium, "INR 18,000+/day"),
    },
    flights: {
      fromMumbai: toStr(flightsObj.fromMumbai, "N/A"),
      fromDelhi: toStr(flightsObj.fromDelhi, "N/A"),
      fromBengaluru: toStr(flightsObj.fromBengaluru, "N/A"),
      fromHyderabad: toStr(flightsObj.fromHyderabad, "N/A"),
    },
    neighbourhoods: {
      stay: toStrList(hoodObj.stay, 3),
      explore: toStrList(hoodObj.explore, 3),
    },
    intercity: {
      nearby: toStrList(intercityObj.nearby, 5),
      localTransport: toStrList(intercityObj.localTransport, 5),
    },
    gems: toStrList(obj.gems, 4),
    customs: toStrList(obj.customs, 5),
    photoSpots: toStrList(obj.photoSpots, 4),
    tips: Array.isArray(obj.tips)
      ? obj.tips
          .map((tip) => {
            const t = tip && typeof tip === "object" ? (tip as Record<string, unknown>) : {};
            return {
              icon: toStr(t.icon, "•"),
              text: toStr(t.text),
            };
          })
          .filter((t) => t.text)
          .slice(0, 4)
      : [],
    carouselSearchTerms: toStrList(obj.carouselSearchTerms, 6),
  };
}

async function fetchGuideFromOpenAI(city: string): Promise<CityGuidePayload> {
  const prompt = `Generate a concise, practical city guide for "${city}" as strict JSON only.

Top-level keys required:
accentColor, accentColorLight, visaBg,
hero, vibe, bestTime, visa, stats,
history, food, budget, flights,
neighbourhoods, intercity,
gems, customs, photoSpots, tips,
carouselSearchTerms

Schema:
{
  "accentColor": "hex",
  "accentColorLight": "hex",
  "visaBg": "hex",
  "hero": { "title": "string", "tagline": "string", "region": "string", "timezone": "string", "language": "string" },
  "vibe": { "summary": "string", "tags": ["string"] },
  "bestTime": { "season": "string", "why": "string", "avoid": "string" },
  "visa": { "headline": "string", "details": ["string"] },
  "stats": { "population": "string", "avgTemp": "string" },
  "history": { "summary": "string", "sites": ["string", "string", "string", "string"] },
  "food": { "dishes": ["string", "string", "string", "string", "string"], "tags": ["string"] },
  "budget": { "backpacker": "string", "mid": "string", "premium": "string" },
  "flights": { "fromMumbai": "string", "fromDelhi": "string", "fromBengaluru": "string", "fromHyderabad": "string" },
  "neighbourhoods": { "stay": ["string"], "explore": ["string"] },
  "intercity": { "nearby": ["string"], "localTransport": ["string"] },
  "gems": ["string", "string", "string", "string"],
  "customs": ["string", "string", "string", "string", "string"],
  "photoSpots": ["string", "string", "string", "string"],
  "tips": [{ "icon": "emoji", "text": "string" }],
  "carouselSearchTerms": ["string", "string", "string", "string", "string"]
}

Rules:
- Keep text skimmable and practical.
- Focus on travelers from India for visa and flights.
- No markdown. No prose. JSON only.`;

  async function runOpenAiModel() {
    if (!openai) {
      throw new Error("OPENAI_API_KEY is not configured.");
    }
    return openai.chat.completions.create(
      {
        model: "gpt-4o-mini",
        temperature: 0.5,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: prompt }],
        max_tokens: 2500,
      },
      { signal: AbortSignal.timeout(OPENAI_TIMEOUT_MS) }
    );
  }

  async function runDeepSeekModel() {
    if (!deepseek) {
      throw new Error("DEEPSEEK_API_KEY is not configured.");
    }
    return deepseek.chat.completions.create(
      {
        model: "deepseek-chat",
        temperature: 0.5,
        max_tokens: 2500,
        messages: [{ role: "user", content: prompt }],
      },
      { signal: AbortSignal.timeout(OPENAI_TIMEOUT_MS) }
    );
  }

  let content = "{}";
  try {
    const completion = await runOpenAiModel();
    content = completion.choices[0]?.message?.content || "{}";
  } catch (firstError) {
    if (!shouldRetryOrFallback(firstError)) {
      throw firstError;
    }

    try {
      await sleep(1200);
      const retry = await runOpenAiModel();
      content = retry.choices[0]?.message?.content || "{}";
    } catch (retryError) {
      if (!shouldRetryOrFallback(retryError) || !deepseek) {
        throw retryError;
      }
      const fallback = await runDeepSeekModel();
      content = fallback.choices[0]?.message?.content || "{}";
    }
  }

  let parsed: unknown;
  try {
    parsed = parseModelJson(content);
  } catch {
    if (!deepseek) throw new Error("Invalid model output and no fallback provider available.");
    const fallback = await runDeepSeekModel();
    parsed = parseModelJson(fallback.choices[0]?.message?.content || "{}");
  }
  return normalizePayload(parsed, city);
}

function mapUpstreamError(error: unknown): { status: number; message: string } {
  if (error instanceof Error && error.name === "AbortError") {
    return { status: 504, message: "City guide request timed out. Please try again." };
  }

  const status =
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof (error as { status?: unknown }).status === "number"
      ? (error as { status: number }).status
      : undefined;

  const message =
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
      ? (error as { message: string }).message
      : "Unable to generate guide right now. Please try again.";

  if (status === 401) {
    return { status: 500, message: "City Guide API authentication failed on server." };
  }
  if (status === 429) {
    if (message.toLowerCase().includes("insufficient_quota")) {
      return {
        status: 429,
        message: "OpenAI quota is exhausted for City Guide. Please recharge or rotate key.",
      };
    }
    return { status: 429, message: "OpenAI rate limit hit. Please retry in a minute." };
  }
  if (typeof status === "number" && status >= 500) {
    return { status: 502, message: "OpenAI is temporarily unavailable. Please try again." };
  }
  if (typeof status === "number" && status >= 400) {
    return { status: 400, message };
  }

  return { status: 500, message };
}

export async function POST(request: Request) {
  try {
    if (!cityGuideApiKey && !process.env.DEEPSEEK_API_KEY) {
      return NextResponse.json(
        { error: "Server missing CITY_GUIDE_OPENAI_API_KEY / OPENAI_API_KEY and DEEPSEEK_API_KEY." },
        { status: 500 }
      );
    }

    const body = (await request.json().catch(() => null)) as { city?: unknown } | null;
    const city = toStr(body?.city).slice(0, 80);

    if (city.length < 2) {
      return NextResponse.json({ error: "Please enter a valid city name." }, { status: 400 });
    }

    const rateLimit = checkAndConsumeLimit();
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: `City Guide is at full project capacity right now. Retry in ${rateLimit.retryAfterSeconds}s.`,
          remaining: rateLimit.remaining,
          retryAfterSeconds: rateLimit.retryAfterSeconds,
          reason: rateLimit.reason,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.retryAfterSeconds),
          },
        }
      );
    }

    const guide = await fetchGuideFromOpenAI(city);
    const data = toLegacyGuide(city, guide);
    return NextResponse.json({ city, data, remaining: rateLimit.remaining });
  } catch (error) {
    console.error("/api/city-guide failed", error);
    const mapped = mapUpstreamError(error);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }
}
