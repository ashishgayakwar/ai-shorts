import { NextResponse } from "next/server";
import { createHash } from "crypto";

import { checkApiRateLimit, ipRateLimitKey } from "@/lib/api-rate-limit";
import { createMaangDownloadToken } from "@/lib/maang-download-token";
import { prisma } from "@/lib/prisma";

const ALLOWED_ROLES = new Set([
  "Product",
  "Engineering",
  "Data",
  "AI/ML",
  "Design",
  "Marketing",
  "Sales",
  "Customer Success",
  "Operations",
  "Business Strategy",
  "Consulting",
  "Finance",
  "Human Resources",
  "Founders Office",
  "Student",
  "Recruitment/Talent",
  "Quality Assurance",
  "Legal/Compliance",
  "Software Engineer",
  "Other",
]);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 20;
const MIN_FORM_FILL_MS = 1500;
const MAX_FORM_AGE_MS = 60 * 60 * 1000;
const DB_IP_15_MIN_MAX = 6;
const DB_EMAIL_DAY_MAX = 4;
const DB_PHONE_DAY_MAX = 4;
const DB_DUP_24H_MAX = 1;

const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com",
  "tempmail.com",
  "10minutemail.com",
  "guerrillamail.com",
  "yopmail.com",
  "sharklasers.com",
  "dispostable.com",
  "throwawaymail.com",
  "trashmail.com",
  "getnada.com",
  "maildrop.cc",
  "moakt.com",
  "temp-mail.org",
  "emailondeck.com",
  "fakeinbox.com",
]);

type LeadPayload = {
  name?: unknown;
  phone?: unknown;
  email?: unknown;
  country?: unknown;
  role?: unknown;
  website?: unknown;
  formStartedAt?: unknown;
};

function toCleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizePhone(raw: string): string {
  return raw.replace(/[^\d]/g, "");
}

function getEmailDomain(email: string): string {
  const at = email.lastIndexOf("@");
  return at >= 0 ? email.slice(at + 1).toLowerCase() : "";
}

function hashIp(ip: string): string {
  const secret = process.env.NEXTAUTH_SECRET || "maang-ip-fallback-secret";
  return createHash("sha256").update(`${ip}|${secret}`).digest("hex");
}

function getClientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rateLimit = await checkApiRateLimit({
      key: ipRateLimitKey(request, "maang-leads"),
      route: "maang-leads",
      limit: RATE_LIMIT_MAX,
      windowMs: RATE_LIMIT_WINDOW_MS,
    });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { ok: false, error: "Too many requests. Please try again shortly." },
        { status: 429 }
      );
    }

    const body = (await request.json()) as LeadPayload;

    const name = toCleanString(body.name);
    const email = toCleanString(body.email).toLowerCase();
    const country = toCleanString(body.country);
    const role = toCleanString(body.role);
    const phoneRaw = toCleanString(body.phone);
    const phone = normalizePhone(phoneRaw);
    const website = toCleanString(body.website);
    const formStartedAt = Number(body.formStartedAt);

    // Honeypot: bots usually fill this hidden field.
    if (website) {
      return NextResponse.json({ ok: false, error: "Invalid submission." }, { status: 400 });
    }

    // Timing check: reject unrealistically fast or stale submissions.
    if (!Number.isFinite(formStartedAt)) {
      return NextResponse.json({ ok: false, error: "Invalid submission timing." }, { status: 400 });
    }
    const fillMs = Date.now() - formStartedAt;
    if (fillMs < MIN_FORM_FILL_MS || fillMs > MAX_FORM_AGE_MS) {
      return NextResponse.json({ ok: false, error: "Please retry and submit again." }, { status: 400 });
    }

    if (name.length < 2 || name.length > 80) {
      return NextResponse.json(
        { ok: false, error: "Please enter a valid name." },
        { status: 400 }
      );
    }

    if (!EMAIL_RE.test(email) || email.length > 255) {
      return NextResponse.json(
        { ok: false, error: "Please enter a valid email." },
        { status: 400 }
      );
    }

    const domain = getEmailDomain(email);
    if (DISPOSABLE_DOMAINS.has(domain)) {
      return NextResponse.json(
        { ok: false, error: "Please use your primary email address." },
        { status: 400 }
      );
    }

    if (phone.length < 10 || phone.length > 15) {
      return NextResponse.json(
        { ok: false, error: "Please enter a valid mobile number." },
        { status: 400 }
      );
    }

    if (country.length < 2 || country.length > 80) {
      return NextResponse.json(
        { ok: false, error: "Please enter a valid country." },
        { status: 400 }
      );
    }

    if (!ALLOWED_ROLES.has(role)) {
      return NextResponse.json(
        { ok: false, error: "Please select a valid role." },
        { status: 400 }
      );
    }

    const now = new Date();
    const fifteenMinAgo = new Date(now.getTime() - 15 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const ipHash = hashIp(ip);
    const userAgent = toCleanString(request.headers.get("user-agent"));

    const [ipRecentCount, emailDayCount, phoneDayCount, dup24hCount] = await prisma.$transaction([
      prisma.maangLead.count({
        where: {
          ipHash,
          createdAt: { gte: fifteenMinAgo },
        },
      }),
      prisma.maangLead.count({
        where: {
          email,
          createdAt: { gte: oneDayAgo },
        },
      }),
      prisma.maangLead.count({
        where: {
          phone,
          createdAt: { gte: oneDayAgo },
        },
      }),
      prisma.maangLead.count({
        where: {
          email,
          phone,
          role,
          createdAt: { gte: oneDayAgo },
        },
      }),
    ]);

    if (ipRecentCount >= DB_IP_15_MIN_MAX) {
      return NextResponse.json(
        { ok: false, error: "Too many attempts. Please try again later." },
        { status: 429 }
      );
    }
    if (emailDayCount >= DB_EMAIL_DAY_MAX || phoneDayCount >= DB_PHONE_DAY_MAX) {
      return NextResponse.json(
        { ok: false, error: "Daily submission limit reached." },
        { status: 429 }
      );
    }
    if (dup24hCount >= DB_DUP_24H_MAX) {
      return NextResponse.json(
        { ok: false, error: "You have already downloaded this guide recently." },
        { status: 429 }
      );
    }

    const clientWithLead = prisma as unknown as {
      maangLead?: {
        create: (args: {
          data: {
            name: string;
            email: string;
            phone: string;
            country: string;
            role: string;
            ipHash?: string;
            userAgent?: string;
            source: string;
          };
        }) => Promise<unknown>;
      };
    };

    if (clientWithLead.maangLead) {
      await clientWithLead.maangLead.create({
        data: {
          name,
          email,
          phone,
          country,
          role,
          ipHash,
          userAgent: userAgent.slice(0, 500),
          source: "maang_interview_series",
        },
      });
    } else {
      const id = crypto.randomUUID();
      await prisma.$executeRaw`
        INSERT INTO "MaangLead" ("id", "name", "phone", "email", "country", "role", "source", "createdAt")
        VALUES (${id}, ${name}, ${phone}, ${email}, ${country}, ${role}, 'maang_interview_series', NOW())
      `;
    }

    const downloadToken = createMaangDownloadToken();
    const response = NextResponse.json({ ok: true, downloadUrl: "/api/maang-download" });
    response.cookies.set({
      name: "maang_dl_token",
      value: downloadToken,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 10 * 60,
    });

    return response;
  } catch (error) {
    console.error("Failed to save MAANG lead:", error);
    return NextResponse.json(
      { ok: false, error: "Unable to save details right now. Please try again." },
      { status: 500 }
    );
  }
}
