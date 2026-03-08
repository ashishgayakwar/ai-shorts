import { NextResponse } from "next/server";

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

type LeadPayload = {
  name?: unknown;
  phone?: unknown;
  email?: unknown;
  role?: unknown;
};

function toCleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizePhone(raw: string): string {
  return raw.replace(/[^\d]/g, "");
}

function getClientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}

function checkRateLimit(ip: string): boolean {
  const globalState = globalThis as unknown as {
    maangLeadRateLimit?: Map<string, { count: number; windowStart: number }>;
  };

  if (!globalState.maangLeadRateLimit) {
    globalState.maangLeadRateLimit = new Map();
  }

  const now = Date.now();
  const current = globalState.maangLeadRateLimit.get(ip);

  if (!current || now - current.windowStart > RATE_LIMIT_WINDOW_MS) {
    globalState.maangLeadRateLimit.set(ip, { count: 1, windowStart: now });
    return true;
  }

  if (current.count >= RATE_LIMIT_MAX) {
    return false;
  }

  current.count += 1;
  globalState.maangLeadRateLimit.set(ip, current);
  return true;
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { ok: false, error: "Too many requests. Please try again shortly." },
        { status: 429 }
      );
    }

    const body = (await request.json()) as LeadPayload;

    const name = toCleanString(body.name);
    const email = toCleanString(body.email).toLowerCase();
    const role = toCleanString(body.role);
    const phoneRaw = toCleanString(body.phone);
    const phone = normalizePhone(phoneRaw);

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

    if (phone.length < 10 || phone.length > 15) {
      return NextResponse.json(
        { ok: false, error: "Please enter a valid mobile number." },
        { status: 400 }
      );
    }

    if (!ALLOWED_ROLES.has(role)) {
      return NextResponse.json(
        { ok: false, error: "Please select a valid role." },
        { status: 400 }
      );
    }

    const clientWithLead = prisma as unknown as {
      maangLead?: {
        create: (args: {
          data: {
            name: string;
            email: string;
            phone: string;
            role: string;
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
          role,
          source: "maang_interview_series",
        },
      });
    } else {
      const id = crypto.randomUUID();
      await prisma.$executeRaw`
        INSERT INTO "MaangLead" ("id", "name", "phone", "email", "role", "source", "createdAt")
        VALUES (${id}, ${name}, ${phone}, ${email}, ${role}, 'maang_interview_series', NOW())
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
