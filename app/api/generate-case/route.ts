import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getServerSession } from "next-auth";
import type { Prisma } from "@prisma/client";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/* -----------------------------
Rate limiting (best-effort, in-memory)
------------------------------ */

const RATE_LIMIT_WINDOW_MS = 10 * 60_000;
const RATE_LIMIT_MAX = 1;
const RATE_LIMIT_DAILY_MAX = 5;
const MAX_BODY_BYTES = 100_000;

function startOfUtcDay(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/* -----------------------------
Allowed values
------------------------------ */

const ALLOWED_CASE_TYPES = [
  "product_design",
  "metrics",
  "strategy",
  "prioritization",
  "estimation",
  "root_cause",
  "execution",
  "improvement",
] as const;

const ALLOWED_DIFFICULTY = ["easy", "medium", "hard"] as const;

type CaseType = (typeof ALLOWED_CASE_TYPES)[number];
type Difficulty = (typeof ALLOWED_DIFFICULTY)[number];

function isAllowedCaseType(v: unknown): v is CaseType {
  return typeof v === "string" && ALLOWED_CASE_TYPES.includes(v as CaseType);
}

function isAllowedDifficulty(v: unknown): v is Difficulty {
  return typeof v === "string" && ALLOWED_DIFFICULTY.includes(v as Difficulty);
}

function pickRandom<T>(arr: readonly T[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function toCleanLower(s: string) {
  return (s || "").trim().toLowerCase();
}

/* -----------------------------
Domain realism anchors
------------------------------ */

function companyDomainAnchors(company: string, domain?: string) {
  const c = company.toLowerCase();

  if (["zepto", "blinkit", "instamart"].some((x) => c.includes(x)) || domain === "quick_commerce") {
    return `
DOMAIN: Quick commerce (India)

Use realistic metrics like:
• orders/day/store
• picker throughput/hour
• rider utilization %
• delivery SLA %
• substitution rate %
• cancellation %

Use INR (not USD).
Respect dark-store capacity constraints.
`;
  }

  if (["uber", "ola"].some((x) => c.includes(x)) || domain === "mobility") {
    return `
DOMAIN: Ride sharing / mobility

Metrics:
• request → match %
• driver online hours
• ETA
• cancellations
• supply utilization
`;
  }

  if (["amazon", "flipkart"].some((x) => c.includes(x)) || domain === "marketplace") {
    return `
DOMAIN: Marketplace / e-commerce

Metrics:
• product view → add-to-cart %
• checkout completion %
• payment success %
• return rate %
• contribution margin / order
`;
  }

  if (
    ["dhl", "fedex", "ups", "blue dart", "bluedart", "delhivery"].some((x) => c.includes(x)) ||
    domain === "logistics"
  ) {
    return `
DOMAIN: Logistics / parcel delivery

Use realistic operational metrics like:
• pickup success %
• scan compliance %
• hub sort accuracy %
• route assignment success %
• out-for-delivery %
• delivery attempt success %
• delivery success % (first-attempt vs overall)

Separate "delivery attempted" vs "delivery successful" when relevant.
Include operational constraints: hubs, linehaul, last-mile capacity, address quality.
Currency: use USD unless clearly India-specific.
`;
  }

  if (domain === "saas") {
    return `
DOMAIN: B2B SaaS

Metrics:
• activation rate
• WAU/MAU
• time-to-value
• retention
• expansion / churn
`;
  }

  return `
DOMAIN: Choose a realistic domain consistent with company.
Use plausible metrics and constraints.
`;
}

/* -----------------------------
Funnel Templates (industry-level)
------------------------------ */

type FunnelTemplate = {
  domain:
    | "quick_commerce"
    | "logistics"
    | "marketplace"
    | "mobility"
    | "saas"
    | "fintech"
    | "food_delivery"
    | "media_streaming"
    | "social"
    | "healthcare"
    | "generic_consumer"
    | "generic_operations";
  // Core lifecycle steps in canonical order
  steps: string[];
  // Optional note to guide generation
  notes?: string;
};

// 12 templates = strong coverage + robust fallbacks.
// You can extend this over time without touching UI.
const FUNNEL_TEMPLATES: Record<FunnelTemplate["domain"], FunnelTemplate> = {
  logistics: {
    domain: "logistics",
    steps: [
      "Shipment created",
      "Pickup successful",
      "Origin hub scan & sort",
      "Linehaul dispatched",
      "Destination hub scan & sort",
      "Route assignment",
      "Out for delivery",
      "Delivery attempted",
      "Delivery successful",
    ],
    notes:
      "Separate attempt vs success; root cause often sits in route assignment / out-for-delivery / attempt execution.",
  },

  quick_commerce: {
    domain: "quick_commerce",
    steps: [
      "App open / session start",
      "Product view",
      "Add to cart",
      "Checkout initiated",
      "Payment success",
      "Order confirmed",
      "Picked at dark store",
      "Out for delivery",
      "Delivered",
    ],
  },

  marketplace: {
    domain: "marketplace",
    steps: [
      "Session start",
      "Product view",
      "Add to cart",
      "Checkout started",
      "Payment success",
      "Order confirmed",
      "Shipped",
      "Delivered",
      "Return / replacement (if applicable)",
    ],
  },

  mobility: {
    domain: "mobility",
    steps: [
      "App open",
      "Ride request",
      "Driver matched",
      "Driver arrives",
      "Trip starts",
      "Trip completes",
      "Payment success",
      "Rider rating / feedback",
    ],
  },

  saas: {
    domain: "saas",
    steps: [
      "Signup / invite accepted",
      "Onboarding completed",
      "Activation (key action completed)",
      "Weekly engagement",
      "Retention (4-week)",
      "Upgrade / paid conversion",
      "Expansion / renew",
    ],
  },

  fintech: {
    domain: "fintech",
    steps: [
      "User login",
      "KYC / verification",
      "Add payment method / bank account",
      "Transaction initiated",
      "Authorization / risk check",
      "Transaction success",
      "Settlement",
      "Disputes / chargebacks (if applicable)",
    ],
  },

  food_delivery: {
    domain: "food_delivery",
    steps: [
      "App open / session start",
      "Restaurant view",
      "Menu item added",
      "Checkout started",
      "Payment success",
      "Order accepted by restaurant",
      "Food prepared",
      "Rider pickup",
      "Delivered",
    ],
  },

  media_streaming: {
    domain: "media_streaming",
    steps: [
      "App open",
      "Content browse",
      "Content selected",
      "Playback start",
      "Playback success (no buffering)",
      "Session duration",
      "Return next week",
      "Subscription / renewal",
    ],
  },

  social: {
    domain: "social",
    steps: [
      "App open",
      "Feed load success",
      "Content view",
      "Engagement (like/comment/share)",
      "Creator follow / subscribe",
      "Notifications interaction",
      "Return next day",
      "Return next week",
    ],
  },

  healthcare: {
    domain: "healthcare",
    steps: [
      "User signup / login",
      "Search provider / service",
      "View details",
      "Book appointment",
      "Payment / confirmation",
      "Visit / consultation completed",
      "Follow-up / adherence",
      "Repeat booking",
    ],
  },

  generic_consumer: {
    domain: "generic_consumer",
    steps: [
      "Discovery (landing / app open)",
      "Evaluation (browse / compare)",
      "Conversion (checkout / signup)",
      "Payment / confirmation",
      "Fulfillment / first value",
      "Retention (return usage)",
    ],
  },

  generic_operations: {
    domain: "generic_operations",
    steps: [
      "Intake created",
      "Validation / triage",
      "Assignment",
      "Execution",
      "Quality check",
      "Completion confirmed",
      "Exception handling (if any)",
    ],
  },
};

const COMPANY_DOMAIN_HINTS: Array<{ match: string[]; domain: FunnelTemplate["domain"] }> = [
  { match: ["zepto", "blinkit", "instamart"], domain: "quick_commerce" },
  { match: ["uber", "ola", "lyft", "grab"], domain: "mobility" },
  { match: ["amazon", "flipkart", "ebay", "shopify"], domain: "marketplace" },
  { match: ["dhl", "fedex", "ups", "blue dart", "bluedart", "delhivery"], domain: "logistics" },
  { match: ["salesforce", "slack", "atlassian", "hubspot", "zendesk"], domain: "saas" },
  { match: ["stripe", "paypal", "razorpay", "paytm", "phonepe"], domain: "fintech" },
  { match: ["swiggy", "zomato", "doordash", "ubereats"], domain: "food_delivery" },
  { match: ["netflix", "prime video", "hotstar", "spotify", "youtube"], domain: "media_streaming" },
  { match: ["instagram", "facebook", "x", "twitter", "tiktok", "linkedin"], domain: "social" },
];

// If company not recognized, use industry string heuristics.
// If still unknown, fall back depending on case type.
function detectDomain(company: string, industry: string, caseType: CaseType): FunnelTemplate["domain"] {
  const c = toCleanLower(company);
  const ind = toCleanLower(industry);

  for (const h of COMPANY_DOMAIN_HINTS) {
    if (h.match.some((m) => c.includes(m))) return h.domain;
  }

  // Industry text heuristics
  if (/(logistics|parcel|shipping|courier|last mile|delivery network|freight)/i.test(ind)) return "logistics";
  if (/(quick commerce|q-commerce|dark store|grocery)/i.test(ind)) return "quick_commerce";
  if (/(marketplace|e-commerce|commerce|retail)/i.test(ind)) return "marketplace";
  if (/(ride|mobility|cab|taxi)/i.test(ind)) return "mobility";
  if (/(saas|b2b|crm|helpdesk|ticketing)/i.test(ind)) return "saas";
  if (/(payments|fintech|bank|upi|wallet)/i.test(ind)) return "fintech";
  if (/(food|restaurant|delivery)/i.test(ind)) return "food_delivery";
  if (/(streaming|media|video|music)/i.test(ind)) return "media_streaming";
  if (/(social|creator|community)/i.test(ind)) return "social";
  if (/(health|hospital|clinic|care)/i.test(ind)) return "healthcare";

  // Final fallback: if it's ops-heavy case type, prefer ops funnel.
  if (caseType === "root_cause" || caseType === "execution" || caseType === "estimation") {
    return "generic_operations";
  }
  return "generic_consumer";
}

// Case-type modifier: choose which slice of the funnel is most relevant.
// We still output the full funnel, but this helps the model place the “drop” sensibly.
function caseTypeGuidance(caseType: CaseType) {
  if (caseType === "root_cause" || caseType === "metrics") {
    return `Case-type guidance: This is diagnosis-focused. Introduce a clear drop at 1–2 adjacent funnel steps. Keep earlier steps stable to isolate the failure zone.`;
  }
  if (caseType === "product_design" || caseType === "improvement") {
    return `Case-type guidance: This is design-focused. The problem should sit in a user-facing step. Ensure funnel steps include the user interaction zone and show measurable deltas there.`;
  }
  if (caseType === "strategy") {
    return `Case-type guidance: This is strategy-focused. Use funnel deltas to motivate tradeoffs (growth vs margin vs ops). Keep metrics plausible and tie to unit economics.`;
  }
  if (caseType === "prioritization") {
    return `Case-type guidance: This is prioritization-focused. Present multiple issues across funnel steps but ensure only 1–2 are dominant drivers so prioritization is meaningful.`;
  }
  if (caseType === "execution") {
    return `Case-type guidance: This is execution-focused. Funnel should show where rollout affects outcomes; include guardrails and operational constraints.`;
  }
  if (caseType === "estimation") {
    return `Case-type guidance: This is estimation-focused. Funnel steps should connect to capacity planning; include volume metrics (per day, per hub/store) and constraints.`;
  }
  return `Case-type guidance: Keep funnel coherent and realistic.`;
}

/* -----------------------------
Case type levers
------------------------------ */

const LEVERS: Record<CaseType, { slice: string[]; twist: string[]; surface: string[] }> = {
  product_design: {
    slice: ["checkout conversion", "delivery slot selection", "payment failures", "first order experience", "reorder flow"],
    twist: ["margin pressure", "ops capacity constraint", "payment provider outage"],
    surface: ["checkout", "cart", "delivery selector"],
  },

  estimation: {
    slice: ["capacity sizing", "rider/driver supply sizing", "inventory sizing"],
    twist: ["festive surge", "marketing campaign spike", "new city launch"],
    surface: ["ops planning", "capacity planning"],
  },

  strategy: {
    slice: ["pricing response", "competitor entry", "platform dependency"],
    twist: ["competitor undercuts price", "CAC spike"],
    surface: ["pricing", "distribution"],
  },

  metrics: {
    slice: ["conversion drop", "retention drop", "success-rate drop"],
    twist: ["recent release", "tracking bug"],
    surface: ["funnel"],
  },

  prioritization: {
    slice: ["roadmap prioritization"],
    twist: ["resource constraints"],
    surface: ["roadmap"],
  },

  root_cause: {
    slice: ["metric drop", "success-rate drop", "SLA breach"],
    twist: ["recent software release", "config change", "vendor dependency"],
    surface: ["funnel"],
  },

  execution: {
    slice: ["feature rollout", "policy change rollout", "operational change rollout"],
    twist: ["ops constraints", "compliance requirement"],
    surface: ["launch"],
  },

  improvement: {
    slice: ["flow improvement", "reducing cancellations", "reducing failures"],
    twist: ["constraints", "tech debt"],
    surface: ["journey"],
  },
};

/* -----------------------------
GOLD STANDARD SCHEMA
------------------------------ */

function schemaDescription(include_framework: boolean) {
  const frameworkNote = include_framework
    ? "Framework output is expected where relevant."
    : "Framework output can be concise if not required.";
  // include_framework currently kept for future extension; schema stays stable
  return `
Return ONLY valid JSON.
${frameworkNote}

{
"title":"",
"company":"",
"industry":"",
"difficulty":"",
"case_type":"",

"interviewer_prompt":"",

"problem_statement":"",

"recent_change":{
"what_changed":"",
"when":"",
"why_it_matters":""
},

"context":"",

"funnel_breakdown":[
{
"step":"",
"baseline":"",
"current":"",
"delta":"",
"notes":""
}
],

"economics_snapshot":{
"unit_economics":[
{
"metric":"",
"value":"",
"notes":""
}
],
"why_this_matters":""
},

"constraints":[
{
"constraint":"",
"why":""
}
],

"candidate_tasks":[
"",
"",
"",
""
],

"solution_space":[
{
"idea":"",
"why":"",
"metrics_impacted":["",""],
"risks":["",""]
}
],

"interviewer_followups":[
{
"question":"",
"intent":"",
"strong_answer":"",
"weak_answer":""
}
],

"mvp":{
"scope":["",""],
"out_of_scope":["",""]
},

"experiment_plan":[
{
"experiment":"",
"primary_metric":"",
"guardrails":["",""],
"duration":""
}

]
}
`;
}

/* -----------------------------
Funnel validation + normalization
------------------------------ */

function normalizeSteps(steps: string[]) {
  return steps.map((s) => s.trim().toLowerCase());
}

function validateFunnelAgainstTemplate(funnel: unknown, templateSteps: string[]) {
  if (!Array.isArray(funnel)) return false;

  const expected = normalizeSteps(templateSteps);
  const got = normalizeSteps(
    funnel
      .map((r: unknown) =>
        typeof r === "object" && r !== null && "step" in r && typeof r.step === "string"
          ? r.step
          : ""
      )
      .filter(Boolean)
  );

  // Must match count and order (exact steps)
  if (got.length !== expected.length) return false;

  for (let i = 0; i < expected.length; i++) {
    if (got[i] !== expected[i]) return false;
  }
  return true;
}

type FunnelLikeRow = {
  step?: string;
  baseline?: string;
  current?: string;
  delta?: string;
  notes?: string;
};

function coerceFunnelToTemplate(rawFunnel: unknown, templateSteps: string[]) {
  const map = new Map<string, FunnelLikeRow>();
  if (Array.isArray(rawFunnel)) {
    for (const row of rawFunnel) {
      const rowObj = typeof row === "object" && row !== null ? (row as FunnelLikeRow) : {};
      const k = typeof rowObj.step === "string" ? rowObj.step.trim().toLowerCase() : "";
      if (k) map.set(k, rowObj);
    }
  }

  return templateSteps.map((step) => {
    const k = step.trim().toLowerCase();
    const found = map.get(k) || {};
    return {
      step,
      baseline: typeof found.baseline === "string" ? found.baseline : "",
      current: typeof found.current === "string" ? found.current : "",
      delta: typeof found.delta === "string" ? found.delta : "",
      notes: typeof found.notes === "string" ? found.notes : "",
    };
  });
}

/* -----------------------------
Route
------------------------------ */

export async function POST(req: Request) {
  try {
    const contentLength = Number(req.headers.get("content-length") || 0);
    if (contentLength && contentLength > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "Request too large" }, { status: 413 });
    }

    const session = await getServerSession(authOptions);
    const email = session?.user?.email;
    if (!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    // Strict body size enforcement (even if content-length missing)
    const rawBody = await req.arrayBuffer();
    if (rawBody.byteLength > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "Request too large" }, { status: 413 });
    }
    const bodyText = new TextDecoder().decode(rawBody);
    const body = bodyText ? JSON.parse(bodyText) : {};

    // Per-user limits: 1 request / 10 minutes AND 5 requests / day (UTC)
    const now = new Date();
    const dayStart = startOfUtcDay(now);
    const windowStart = new Date(now.getTime() - RATE_LIMIT_WINDOW_MS);

    const limitResult = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const limitRecord = await tx.rateLimit.findUnique({ where: { userId: user.id } });

        const windowExpired = !limitRecord || limitRecord.window10Start < windowStart;
        const dayExpired = !limitRecord || limitRecord.dayStart < dayStart;

        const windowCount = windowExpired ? 0 : limitRecord.window10Count;
        const dayCount = dayExpired ? 0 : limitRecord.dayCount;
        const prevWindowStart = limitRecord?.window10Start ?? now;
        const prevDayStart = limitRecord?.dayStart ?? dayStart;

        if (windowCount >= RATE_LIMIT_MAX || dayCount >= RATE_LIMIT_DAILY_MAX) {
          return { allowed: false, windowCount, dayCount, prevWindowStart, prevDayStart, windowExpired, dayExpired };
        }

        await tx.rateLimit.upsert({
          where: { userId: user.id },
          create: {
            userId: user.id,
            window10Start: now,
            window10Count: 1,
            dayStart,
            dayCount: 1,
          },
          update: {
            window10Start: windowExpired ? now : prevWindowStart,
            window10Count: windowExpired ? 1 : windowCount + 1,
            dayStart: dayExpired ? dayStart : prevDayStart,
            dayCount: dayExpired ? 1 : dayCount + 1,
          },
        });

        return { allowed: true, windowCount, dayCount, prevWindowStart, prevDayStart, windowExpired, dayExpired };
      },
      { isolationLevel: "Serializable" }
    );

    if (!limitResult.allowed) {
      const res = NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        { status: 429 }
      );
      res.headers.set("x-ratelimit-limit-10m", String(RATE_LIMIT_MAX));
      res.headers.set(
        "x-ratelimit-remaining-10m",
        String(Math.max(0, RATE_LIMIT_MAX - limitResult.windowCount))
      );
      res.headers.set("x-ratelimit-limit-day", String(RATE_LIMIT_DAILY_MAX));
      res.headers.set(
        "x-ratelimit-remaining-day",
        String(Math.max(0, RATE_LIMIT_DAILY_MAX - limitResult.dayCount))
      );
      res.headers.set(
        "x-ratelimit-reset-10m",
        String(
          limitResult.windowExpired
            ? now.getTime() + RATE_LIMIT_WINDOW_MS
            : limitResult.prevWindowStart.getTime() + RATE_LIMIT_WINDOW_MS
        )
      );
      res.headers.set(
        "x-ratelimit-reset-day",
        String(
          limitResult.dayExpired
            ? dayStart.getTime() + 24 * 60 * 60 * 1000
            : limitResult.prevDayStart.getTime() + 24 * 60 * 60 * 1000
        )
      );
      return res;
    }

    const case_type = body.case_type as CaseType;
    const difficulty = body.difficulty as Difficulty;
    const company = (body.company || "Zepto") as string;
    const industry = (body.industry || "") as string;
    const include_framework = Boolean(body.include_framework ?? true);

    if (!isAllowedCaseType(case_type))
      return NextResponse.json({ error: "Invalid case type" }, { status: 400 });

    if (!isAllowedDifficulty(difficulty))
      return NextResponse.json({ error: "Invalid difficulty" }, { status: 400 });

    const levers = LEVERS[case_type];
    const slice = pickRandom(levers.slice);
    const twist = pickRandom(levers.twist);
    const surface = pickRandom(levers.surface);

    // NEW: domain + funnel template selection
    const domain = detectDomain(company, industry, case_type);
    const template = FUNNEL_TEMPLATES[domain];
    const anchor = companyDomainAnchors(company, domain);

    const funnelTemplateBlock = `
FUNNEL TEMPLATE (MUST FOLLOW EXACTLY):
Use EXACTLY these funnel steps in this exact order.
Do not add, remove, merge, or rename steps.

${template.steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}

Rules:
- funnel_breakdown must have the same number of rows as steps above.
- funnel_breakdown[i].step must exactly match the corresponding step text above.
- Baseline/current/delta must be realistic and internally consistent.
- For root_cause / metrics: keep early steps stable, introduce the main drop in 1–2 adjacent steps.
`;

    const prompt = `
You are a senior FAANG interviewer.

Create an interview-grade case packet.

CRITICAL REQUIREMENTS:

Return EXACTLY:
• 6 solution_space ideas
• 10 interviewer_followups

Followups MUST include:
• intent
• strong_answer (5–10 sentences)
• weak_answer

Solutions MUST be fundamentally different approaches.

Use realistic metrics.
Use real operational constraints.

Company: ${company}
Industry: ${industry}
Detected domain: ${domain}
Case type: ${case_type}
Difficulty: ${difficulty}

Scenario:
Slice: ${slice}
Twist: ${twist}
Surface: ${surface}

${anchor}

${caseTypeGuidance(case_type)}

${template.notes ? `Template notes: ${template.notes}` : ""}

${funnelTemplateBlock}

${schemaDescription(include_framework)}

Return JSON only.
`;

    // Attempt 1
    const completion1 = await client.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.7,
      max_tokens: 3500,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "You are a FAANG interviewer creating interview packets." },
        { role: "user", content: prompt },
      ],
    });

    const jsonText1 = completion1.choices[0].message.content || "{}";
    let result = JSON.parse(jsonText1) as Record<string, unknown>;

    // Validate funnel. If wrong, retry once with stricter instruction.
    const funnelOk = validateFunnelAgainstTemplate(result?.funnel_breakdown, template.steps);

    if (!funnelOk) {
      const stricterPrompt = `
The previous output violated the funnel template rules.

You MUST fix ONLY funnel_breakdown so that:
- It has exactly ${template.steps.length} rows.
- Each row.step exactly matches the step text below in the same order.
- Provide realistic baseline/current/delta values and brief notes.

Exact steps:
${template.steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}

Return ONLY valid JSON in the same schema. Do not remove other fields.
`;

      const completion2 = await client.chat.completions.create({
        model: "gpt-4o",
        temperature: 0.5,
        max_tokens: 3500,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "You are a FAANG interviewer creating interview packets." },
          { role: "user", content: prompt },
          { role: "user", content: stricterPrompt },
        ],
      });

      const jsonText2 = completion2.choices[0].message.content || "{}";
      result = JSON.parse(jsonText2) as Record<string, unknown>;

      // If still not ok, coerce programmatically (never break UI)
      if (!validateFunnelAgainstTemplate(result?.funnel_breakdown, template.steps)) {
        result.funnel_breakdown = coerceFunnelToTemplate(result?.funnel_breakdown, template.steps);
      }
    }

    // Ensure meta fields align with inputs even if model drifts
    result.company = result.company || company;
    result.industry = result.industry || industry || domain;
    result.case_type = result.case_type || case_type;
    result.difficulty = result.difficulty || difficulty;

    await prisma.generationLog.create({
      data: {
        userId: user.id,
        caseType: case_type,
        difficulty,
        company,
        industry,
        success: true,
      },
    });

    return NextResponse.json({ result });
  } catch (e: unknown) {
    console.error(e);
    try {
      const session = await getServerSession(authOptions);
      const email = session?.user?.email;
      if (email) {
        const user = await prisma.user.findUnique({ where: { email } });
        if (user) {
          await prisma.generationLog.create({
            data: {
              userId: user.id,
              success: false,
              error:
                String(
                  typeof e === "object" && e !== null && "message" in e
                    ? (e as { message?: string }).message
                    : "Unknown error"
                ).slice(0, 500),
            },
          });
        }
      }
    } catch {
      // ignore logging failure
    }
    return NextResponse.json(
      { error: "Generation failed" },
      { status: 500 }
    );
  }
}
