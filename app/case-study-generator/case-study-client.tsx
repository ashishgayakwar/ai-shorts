"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { useGlobalLoading } from "@/lib/global-loading";

/* -----------------------------
Constants + Types
------------------------------ */

const CASE_TYPES = [
  "product_design",
  "metrics",
  "strategy",
  "prioritization",
  "estimation",
  "root_cause",
  "execution",
  "improvement",
] as const;

const DIFFICULTY = ["easy", "medium", "hard"] as const;

type CaseType = (typeof CASE_TYPES)[number];
type Difficulty = (typeof DIFFICULTY)[number];

type FunnelRow = {
  step: string;
  baseline: string;
  current: string;
  delta: string;
  notes?: string;
};

type EconomicsMetric = { metric: string; value: string; notes?: string };

type ConstraintRow = { constraint: string; why: string };

type SolutionIdea = {
  idea: string;
  why: string;
  metrics_impacted: string[];
  risks: string[];
};

type Followup = {
  question: string;
  intent: string;
  strong_answer: string;
  weak_answer: string;
};

type MVP = { scope: string[]; out_of_scope: string[] };

type Experiment = {
  experiment: string;
  primary_metric: string;
  guardrails: string[];
  duration: string;
};

type RecentChange = { what_changed: string; when: string; why_it_matters: string };

type CasePacket = {
  title: string;
  company: string;
  industry: string;
  difficulty: Difficulty;
  case_type: CaseType;

  interviewer_prompt: string;
  problem_statement: string;

  recent_change: RecentChange;
  context: string;

  funnel_breakdown: FunnelRow[];

  economics_snapshot: {
    unit_economics: EconomicsMetric[];
    why_this_matters: string;
  };

  constraints: ConstraintRow[];
  candidate_tasks: string[];

  solution_space: SolutionIdea[];
  interviewer_followups: Followup[];

  mvp: MVP;
  experiment_plan: Experiment[];
};

type ApiOk = { result: unknown };
type ApiErr = { error?: string; details?: string };

/* -----------------------------
Utils
------------------------------ */

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function safeStr(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function safeArr<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

function isCaseType(v: any): v is CaseType {
  return CASE_TYPES.includes(v);
}

function isDifficulty(v: any): v is Difficulty {
  return DIFFICULTY.includes(v);
}

// snake_case -> CamelCase (for dropdown display)
function toCamelCaseLabel(value: string) {
  return value
    .split("_")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");
}

// Best-effort “schema” normalization so the UI doesn’t crash if LLM returns odd shapes.
function normalizePacket(raw: any): CasePacket | null {
  if (!raw || typeof raw !== "object") return null;

  const difficulty = isDifficulty(raw.difficulty) ? raw.difficulty : "medium";
  const case_type = isCaseType(raw.case_type) ? raw.case_type : "product_design";

  const packet: CasePacket = {
    title: safeStr(raw.title),
    company: safeStr(raw.company),
    industry: safeStr(raw.industry),
    difficulty,
    case_type,

    interviewer_prompt: safeStr(raw.interviewer_prompt),
    problem_statement: safeStr(raw.problem_statement),

    recent_change: {
      what_changed: safeStr(raw?.recent_change?.what_changed),
      when: safeStr(raw?.recent_change?.when),
      why_it_matters: safeStr(raw?.recent_change?.why_it_matters),
    },

    context: safeStr(raw.context),

    funnel_breakdown: safeArr<FunnelRow>(raw.funnel_breakdown).map((r: any) => ({
      step: safeStr(r?.step),
      baseline: safeStr(r?.baseline),
      current: safeStr(r?.current),
      delta: safeStr(r?.delta),
      notes: safeStr(r?.notes),
    })),

    economics_snapshot: {
      unit_economics: safeArr<EconomicsMetric>(raw?.economics_snapshot?.unit_economics).map(
        (u: any) => ({
          metric: safeStr(u?.metric),
          value: safeStr(u?.value),
          notes: safeStr(u?.notes),
        })
      ),
      why_this_matters: safeStr(raw?.economics_snapshot?.why_this_matters),
    },

    constraints: safeArr<ConstraintRow>(raw.constraints).map((c: any) => ({
      constraint: safeStr(c?.constraint),
      why: safeStr(c?.why),
    })),

    candidate_tasks: safeArr<string>(raw.candidate_tasks)
      .map((x: any) => safeStr(x))
      .filter(Boolean),

    solution_space: safeArr<SolutionIdea>(raw.solution_space).map((s: any) => ({
      idea: safeStr(s?.idea),
      why: safeStr(s?.why),
      metrics_impacted: safeArr<string>(s?.metrics_impacted)
        .map((m: any) => safeStr(m))
        .filter(Boolean),
      risks: safeArr<string>(s?.risks)
        .map((r: any) => safeStr(r))
        .filter(Boolean),
    })),

    interviewer_followups: safeArr<Followup>(raw.interviewer_followups).map((f: any) => ({
      question: safeStr(f?.question),
      intent: safeStr(f?.intent),
      strong_answer: safeStr(f?.strong_answer),
      weak_answer: safeStr(f?.weak_answer),
    })),

    mvp: {
      scope: safeArr<string>(raw?.mvp?.scope)
        .map((x: any) => safeStr(x))
        .filter(Boolean),
      out_of_scope: safeArr<string>(raw?.mvp?.out_of_scope)
        .map((x: any) => safeStr(x))
        .filter(Boolean),
    },

    experiment_plan: safeArr<Experiment>(raw.experiment_plan).map((e: any) => ({
      experiment: safeStr(e?.experiment),
      primary_metric: safeStr(e?.primary_metric),
      guardrails: safeArr<string>(e?.guardrails)
        .map((g: any) => safeStr(g))
        .filter(Boolean),
      duration: safeStr(e?.duration),
    })),
  };

  // Hard minimums for “interviewer-grade packet”
  const hasCore =
    packet.title ||
    packet.interviewer_prompt ||
    packet.problem_statement ||
    packet.context ||
    packet.solution_space.length > 0 ||
    packet.interviewer_followups.length > 0;

  return hasCore ? packet : null;
}

async function safeReadJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/* -----------------------------
UI atoms
------------------------------ */

function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "green" | "amber" | "red" | "blue" | "violet";
}) {
  const toneCls =
    tone === "green"
      ? "bg-emerald-500/10 text-emerald-200 ring-emerald-500/20"
      : tone === "amber"
      ? "bg-amber-500/10 text-amber-200 ring-amber-500/20"
      : tone === "red"
      ? "bg-rose-500/10 text-rose-200 ring-rose-500/20"
      : tone === "blue"
      ? "bg-sky-500/10 text-sky-200 ring-sky-500/20"
      : tone === "violet"
      ? "bg-violet-500/10 text-violet-200 ring-violet-500/20"
      : "bg-white/5 text-white/80 ring-white/10";

  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1",
        toneCls
      )}
    >
      {children}
    </span>
  );
}

function Card({
  title,
  subtitle,
  right,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cx(
        "rounded-2xl border border-white/10 bg-white/[0.03]",
        "shadow-[0_0_0_1px_rgba(255,255,255,0.03)] backdrop-blur",
        "p-4 md:p-5",
        className
      )}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-white/90">{title}</div>
          {subtitle ? <div className="mt-0.5 text-xs text-white/50">{subtitle}</div> : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </header>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Kpi({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
      <div className="text-[11px] uppercase tracking-wide text-white/50">{label}</div>
      <div className="mt-1 text-sm font-semibold text-white/90">{value}</div>
      {note ? <div className="mt-1 text-xs text-white/45">{note}</div> : null}
    </div>
  );
}

function DividerLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-px flex-1 bg-white/10" />
      <div className="text-[11px] uppercase tracking-wide text-white/45">{children}</div>
      <div className="h-px flex-1 bg-white/10" />
    </div>
  );
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cx("animate-pulse rounded-xl border border-white/10 bg-white/[0.02]", className)} />;
}

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 900);
    } catch {
      // ignore
    }
  }

  return (
    <button
      onClick={onCopy}
      className={cx(
        "inline-flex items-center justify-center rounded-xl px-3 py-2 text-xs font-semibold",
        "border border-white/10 bg-white/[0.03] text-white/80 hover:bg-white/[0.06]"
      )}
      type="button"
    >
      {copied ? "Copied" : label || "Copy"}
    </button>
  );
}

/* -----------------------------
Claude-style shimmering AI button loader
------------------------------ */

function ClaudeShimmerButtonLoader({ text = "Generating..." }: { text?: string }) {
  return (
    <span className="relative inline-flex items-center gap-2">
      {/* Spinner (subtle) */}
      <span className="relative h-4 w-4">
        <span className="absolute inset-0 rounded-full bg-black/10 opacity-40 blur-[1px]" />
        <span className="absolute inset-0 animate-spin rounded-full border-2 border-black/25 border-t-black/80" />
      </span>

      {/* Shimmering text pill */}
      <span className="relative -my-1 inline-flex items-center overflow-hidden rounded-lg px-2 py-1">
        {/* shimmer layer */}
        <span className="absolute inset-0 opacity-60 [background:linear-gradient(110deg,rgba(0,0,0,0.06),rgba(0,0,0,0.18),rgba(0,0,0,0.06))] bg-[length:200%_100%] animate-[shimmer_1.15s_ease-in-out_infinite]" />
        {/* mask layer */}
        <span className="absolute inset-0 rounded-lg ring-1 ring-black/10" />
        <span className="relative text-black/90">{text}</span>
      </span>

      {/* Keyframes */}
      <style jsx global>{`
        @keyframes shimmer {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }
      `}</style>
    </span>
  );
}

/* -----------------------------
Main Page
------------------------------ */

export default function CaseStudyClient() {
  const { data: session } = useSession();
  const globalLoading = useGlobalLoading();
  const [caseType, setCaseType] = useState<CaseType>("product_design");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [company, setCompany] = useState<string>("Zepto");
  const [industry, setIndustry] = useState<string>("");
  const [includeFramework, setIncludeFramework] = useState<boolean>(true);

  const [loading, setLoading] = useState<boolean>(false);
  const [packet, setPacket] = useState<CasePacket | null>(null);
  const [rawJson, setRawJson] = useState<string>("");
  const [error, setError] = useState<string>("");

  const metaBadges = useMemo(() => {
    const tones: Record<string, any> = { easy: "green", medium: "amber", hard: "red" };
    const c = packet?.company || company || "Company";
    const ind = packet?.industry || industry || "Industry";
    const d = packet?.difficulty || difficulty;
    const t = packet?.case_type || caseType;

    return (
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="blue">{c}</Badge>
        <Badge>{ind}</Badge>
        <Badge tone={tones[d] || "neutral"}>{String(d).toUpperCase()}</Badge>
        {/* changed: display in CamelCase, keep value as snake_case */}
        <Badge tone="violet">{toCamelCaseLabel(t)}</Badge>
      </div>
    );
  }, [packet, company, industry, difficulty, caseType]);

  const completeness = useMemo(() => {
    if (!packet) return 0;
    const checks = [
      !!packet.title,
      !!packet.interviewer_prompt,
      !!packet.problem_statement,
      !!packet.context,
      packet.funnel_breakdown.length > 0,
      packet.economics_snapshot.unit_economics.length > 0,
      packet.constraints.length > 0,
      packet.candidate_tasks.length > 0,
      packet.solution_space.length >= 6,
      packet.interviewer_followups.length >= 10,
      packet.experiment_plan.length > 0,
    ];
    const score = Math.round((checks.filter(Boolean).length / checks.length) * 100);
    return clamp(score, 0, 100);
  }, [packet]);

  async function generateCase() {
    globalLoading.start();
    setLoading(true);
    setError("");
    setPacket(null);
    setRawJson("");

    try {
      const res = await fetch("/api/generate-case", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          case_type: caseType,
          difficulty,
          company,
          industry,
          include_framework: includeFramework,
        }),
      });

      const data = (await safeReadJson(res)) as (ApiOk & ApiErr) | null;

      if (!res.ok) {
        const msg = data?.error || data?.details || `Request failed (${res.status})`;
        throw new Error(msg);
      }

      const raw = data?.result ?? null;
      const normalized = normalizePacket(raw);

      if (!normalized) {
        // Keep raw for debugging
        setRawJson(JSON.stringify(raw ?? {}, null, 2));
        throw new Error(
          "API returned JSON, but it didn’t match the expected packet shape. (Check schema keys: interviewer_followups, solution_space, recent_change.why_it_matters, etc.)"
        );
      }

      setPacket(normalized);
      setRawJson(JSON.stringify(raw, null, 2));
    } catch (err: any) {
      setError(err?.message || "Something went wrong");
    } finally {
      setLoading(false);
      globalLoading.stop();
    }
  }

  const isReady =
    !!packet &&
    packet.solution_space.length >= 6 &&
    packet.interviewer_followups.length >= 10 &&
    packet.funnel_breakdown.length > 0;

  return (
    <div className="min-h-screen bg-[#060B17]">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -top-48 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-r from-sky-500/15 via-indigo-500/10 to-fuchsia-500/10 blur-3xl" />
        <div className="absolute bottom-[-220px] right-[-120px] h-[520px] w-[520px] rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.06),transparent_52%)]" />
      </div>

      <header className="ai-shorts-topbar ai-shorts-topbar-full">
        <div className="ai-shorts-brand">
          <div className="ai-shorts-brand-title">AI SHORTS</div>
          <div className="ai-shorts-brand-subtitle">150-word primers for busy PMs</div>
        </div>

        <div className="ai-shorts-desktop-actions">
          <Link href="/swipe" className="ai-header-pill">
            Cards
          </Link>
          <Link href="/swipe?mode=visualize" className="ai-header-pill">
            Visualize
          </Link>
          <Link href="/compare" className="ai-header-pill">
            Compare
          </Link>
          <span className="ai-header-pill ai-header-pill-active">Case Study</span>
          <Link href="/" className="ai-header-pill">
            Home
          </Link>
        </div>

        <details className="ai-shorts-mobile-menu">
          <summary>Menu</summary>
          <div className="ai-shorts-mobile-menu-panel">
            <Link href="/swipe" className="ai-header-pill">Cards</Link>
            <Link href="/swipe?mode=visualize" className="ai-header-pill">Visualize</Link>
            <Link href="/compare" className="ai-header-pill">Compare</Link>
            <span className="ai-header-pill ai-header-pill-active">Case Study</span>
            <Link href="/" className="ai-header-pill">Home</Link>
          </div>
        </details>
      </header>

      <div className="relative mx-auto max-w-6xl px-4 py-10 md:px-6 md:py-14">
        {/* Header */}
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">
                Case Study Generator
              </h1>
              <Badge>AI PM</Badge>
              {packet ? (
                <Badge tone={completeness >= 85 ? "green" : "amber"}>{completeness}% complete</Badge>
              ) : null}
            </div>
            <p className="mt-1 max-w-2xl text-sm text-white/55">
              Interview-grade PM case packets: prompt → data → tradeoffs → evaluation pressure-tests.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={generateCase}
              disabled={loading}
              className={cx(
                "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold",
                "bg-white text-black hover:bg-white/90 disabled:opacity-60 disabled:cursor-not-allowed",
                "min-w-[170px]" // prevents width jump between Generate and loader
              )}
              type="button"
            >
              {loading ? <ClaudeShimmerButtonLoader text="Generating..." /> : "Generate"}
            </button>

            {rawJson ? <CopyButton text={rawJson} label="Copy JSON" /> : null}

            {session?.user ? (
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/[0.06]"
                type="button"
              >
                Sign out
              </button>
            ) : null}
          </div>
        </div>

        {/* Bento */}
        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-12">
          {/* Inputs */}
          <Card
            title="Inputs"
            subtitle="Leave Industry blank when Company is known (best realism)."
            className="md:col-span-5"
            right={<Badge>API: /api/generate-case</Badge>}
          >
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="text-xs font-medium text-white/70">Case Type</label>
                <select
                  className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] p-2.5 text-sm text-white outline-none focus:border-white/20"
                  value={caseType}
                  onChange={(e) => setCaseType(e.target.value as CaseType)}
                >
                  {CASE_TYPES.map((t) => (
                    <option key={t} value={t} className="bg-[#0B1224]">
                      {toCamelCaseLabel(t)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-white/70">Difficulty</label>
                <select
                  className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] p-2.5 text-sm text-white outline-none focus:border-white/20"
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                >
                  {DIFFICULTY.map((d) => (
                    <option key={d} value={d} className="bg-[#0B1224]">
                      {toCamelCaseLabel(d)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-white/70">Company</label>
                <input
                  className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] p-2.5 text-sm text-white placeholder:text-white/35 outline-none focus:border-white/20"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Zepto, Uber, Amazon…"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-white/70">Industry (optional)</label>
                <input
                  className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] p-2.5 text-sm text-white placeholder:text-white/35 outline-none focus:border-white/20"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  placeholder="Quick commerce, mobility, marketplace…"
                />
              </div>

              <div className="mt-1 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={includeFramework}
                  onChange={(e) => setIncludeFramework(e.target.checked)}
                  className="h-4 w-4 rounded border-white/20 bg-white/10"
                />
                <span className="text-sm text-white/70">Include framework (if supported)</span>
              </div>

              {error ? (
                <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-200">
                  <div className="font-semibold">Generation failed</div>
                  <div className="mt-1 text-rose-200/90">{error}</div>
                  <div className="mt-2 text-xs text-rose-200/70">
                    Tip: Ensure your API returns keys exactly: <b>interviewer_followups</b> (not interviewer_questions),
                    and <b>recent_change.why_it_matters</b> (not why_it_might_matter).
                  </div>
                </div>
              ) : null}

              {!packet && !loading ? (
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-xs text-white/55">
                  Output is rendered as a full interviewer packet: Funnel + Economics + Constraints + Tasks + 6 Solutions
                  + 10 Followups (with strong/weak answers) + MVP + Experiment plan.
                </div>
              ) : null}
            </div>
          </Card>

          {/* Packet header */}
          <Card
            title={packet?.title ? "Interviewer Packet" : "Packet Preview"}
            subtitle={packet?.title ? "Use this like the interviewer’s handout." : "Generate to render the full packet."}
            className="md:col-span-7"
            right={metaBadges}
          >
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-20" />
                <Skeleton className="h-16" />
                <Skeleton className="h-12" />
              </div>
            ) : packet ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={isReady ? "green" : "amber"}>{isReady ? "Interview-ready" : "Partial packet"}</Badge>
                  <Badge>6 solution cards</Badge>
                  <Badge>10 followups</Badge>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                  <div className="text-[11px] uppercase tracking-wide text-white/50">Title</div>
                  <div className="mt-1 text-base font-semibold text-white/90">{packet.title || "Untitled case"}</div>
                </div>

                {packet.interviewer_prompt ? (
                  <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                    <div className="text-[11px] uppercase tracking-wide text-white/50">
                      Interviewer Prompt (read aloud)
                    </div>
                    <div className="mt-2 whitespace-pre-wrap text-sm text-white/85">{packet.interviewer_prompt}</div>
                  </div>
                ) : null}

                {packet.problem_statement ? (
                  <div>
                    <div className="text-xs font-semibold text-white/75">Problem Statement</div>
                    <div className="mt-1 whitespace-pre-wrap text-sm text-white/80">{packet.problem_statement}</div>
                  </div>
                ) : null}

                {packet.context ? (
                  <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                    <div className="text-[11px] uppercase tracking-wide text-white/50">Context</div>
                    <div className="mt-2 whitespace-pre-wrap text-sm text-white/80">{packet.context}</div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <Kpi label="What you get" value="Full interviewer packet" note="Not a generic template" />
                <Kpi label="Output" value="Typed UI + JSON" note="Copyable for practice" />
                <Kpi label="Best use" value="Mock interviews" note="30–45 min sessions" />
              </div>
            )}
          </Card>

          {/* Recent change */}
          <Card
            title="What Changed Recently"
            subtitle="The hook that makes the case solvable."
            className="md:col-span-6"
            right={<Badge tone="amber">Signal</Badge>}
          >
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
              </div>
            ) : packet ? (
              <div className="space-y-2 text-sm text-white/80">
                <div>
                  <span className="text-white/55">What:</span>{" "}
                  <span className="text-white/90">{packet.recent_change.what_changed || "—"}</span>
                </div>
                <div>
                  <span className="text-white/55">When:</span>{" "}
                  <span className="text-white/90">{packet.recent_change.when || "—"}</span>
                </div>
                <div>
                  <span className="text-white/55">Why it matters:</span>{" "}
                  <span className="text-white/90">{packet.recent_change.why_it_matters || "—"}</span>
                </div>
              </div>
            ) : (
              <div className="text-sm text-white/45">Generate a case to see the change event.</div>
            )}
          </Card>

          {/* Expected approach (derived, not from JSON) */}
          <Card
            title="Expected Approach"
            subtitle="A clean interview path you can follow (derived from packet)."
            className="md:col-span-6"
            right={<Badge tone="violet">Guide</Badge>}
          >
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
              </div>
            ) : packet ? (
              <ol className="space-y-2 text-sm text-white/80">
                <li className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                  <div className="font-semibold text-white/90">1) Clarify goal + define success</div>
                  <div className="mt-1 text-white/60">
                    Restate objective, user segment, timeframe, and the single primary metric.
                  </div>
                </li>
                <li className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                  <div className="font-semibold text-white/90">2) Diagnose using the funnel + constraints</div>
                  <div className="mt-1 text-white/60">
                    Locate where the delta happens, then filter solutions through ops/econ constraints.
                  </div>
                </li>
                <li className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                  <div className="font-semibold text-white/90">3) Propose 2–3 directions → pick MVP → experiment</div>
                  <div className="mt-1 text-white/60">
                    Compare tradeoffs, call a decision, define MVP scope/out-of-scope, then design an experiment with
                    guardrails.
                  </div>
                </li>
              </ol>
            ) : (
              <div className="text-sm text-white/45">Generate a case to see the suggested approach.</div>
            )}
          </Card>

          {/* Funnel */}
          <Card
            title="Funnel Breakdown"
            subtitle="Baseline → current → delta per step."
            className="md:col-span-12"
            right={<Badge tone="blue">Data</Badge>}
          >
            {loading ? (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
              </div>
            ) : packet?.funnel_breakdown?.length ? (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {packet.funnel_breakdown.map((f, i) => (
                  <div key={i} className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-white/90">{f.step || `Step ${i + 1}`}</div>
                        {f.notes ? <div className="mt-1 text-xs text-white/45">{f.notes}</div> : null}
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="flex items-center gap-2">
                          <Badge>{f.baseline || "—"}</Badge>
                          <span className="text-white/40">→</span>
                          <Badge tone="amber">{f.current || "—"}</Badge>
                        </div>
                        <div className="mt-2">
                          <Badge tone="red">{f.delta || "—"}</Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : packet ? (
              <div className="text-sm text-white/45">No funnel steps returned.</div>
            ) : (
              <div className="text-sm text-white/45">Generate a case to render the funnel.</div>
            )}
          </Card>

          {/* Economics */}
          <Card
            title="Economics Snapshot"
            subtitle="Unit economics + why it matters."
            className="md:col-span-5"
            right={<Badge tone="green">Business</Badge>}
          >
            {loading ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
              </div>
            ) : packet ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {packet.economics_snapshot.unit_economics.map((u, i) => (
                    <Kpi key={i} label={u.metric || `Metric ${i + 1}`} value={u.value || "—"} note={u.notes} />
                  ))}
                </div>
                {packet.economics_snapshot.why_this_matters ? (
                  <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-sm text-white/75">
                    {packet.economics_snapshot.why_this_matters}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="text-sm text-white/45">Generate a case to see economics.</div>
            )}
          </Card>

          {/* Constraints */}
          <Card
            title="Constraints"
            subtitle="Non-negotiables that force tradeoffs."
            className="md:col-span-7"
            right={<Badge tone="red">Hard</Badge>}
          >
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
              </div>
            ) : packet?.constraints?.length ? (
              <ul className="space-y-2 text-sm text-white/80">
                {packet.constraints.map((c, i) => (
                  <li key={i} className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                    <div className="font-semibold text-white/90">{c.constraint || `Constraint ${i + 1}`}</div>
                    <div className="mt-1 text-white/60">{c.why || "—"}</div>
                  </li>
                ))}
              </ul>
            ) : packet ? (
              <div className="text-sm text-white/45">No constraints returned.</div>
            ) : (
              <div className="text-sm text-white/45">Generate a case to see constraints.</div>
            )}
          </Card>

          {/* Candidate tasks */}
          <Card
            title="Candidate Tasks"
            subtitle="What the interviewer expects you to do."
            className="md:col-span-12"
            right={<Badge tone="amber">Practice</Badge>}
          >
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
              </div>
            ) : packet?.candidate_tasks?.length ? (
              <ol className="list-decimal space-y-2 pl-5 text-sm text-white/80">
                {packet.candidate_tasks.map((t, i) => (
                  <li key={i} className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                    {t}
                  </li>
                ))}
              </ol>
            ) : packet ? (
              <div className="text-sm text-white/45">No candidate tasks returned.</div>
            ) : (
              <div className="text-sm text-white/45">Generate a case to see tasks.</div>
            )}
          </Card>

          {/* Solutions — 6 cards */}
          <Card
            title="Solution Space"
            subtitle="6 fundamentally different approaches."
            className="md:col-span-12"
            right={<Badge tone="blue">6 cards</Badge>}
          >
            {loading ? (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-44" />
                ))}
              </div>
            ) : packet?.solution_space?.length ? (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                {packet.solution_space.slice(0, 6).map((s, i) => (
                  <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-sm font-semibold text-white/90">{s.idea || `Idea ${i + 1}`}</div>
                      <Badge tone="violet">#{i + 1}</Badge>
                    </div>

                    {s.why ? <div className="mt-2 text-xs text-white/60">{s.why}</div> : null}

                    {s.metrics_impacted?.length ? (
                      <div className="mt-3">
                        <div className="text-[11px] uppercase tracking-wide text-white/50">Metrics impacted</div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {s.metrics_impacted.slice(0, 6).map((m, j) => (
                            <Badge key={j}>{m}</Badge>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {s.risks?.length ? (
                      <div className="mt-3">
                        <div className="text-[11px] uppercase tracking-wide text-white/50">Risks</div>
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-white/65">
                          {s.risks.slice(0, 3).map((r, j) => (
                            <li key={j}>{r}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : packet ? (
              <div className="text-sm text-white/45">No solution ideas returned.</div>
            ) : (
              <div className="text-sm text-white/45">Generate a case to see the 6 solution cards.</div>
            )}
          </Card>

          {/* MVP + Experiment */}
          <Card
            title="MVP + Experiment Plan"
            subtitle="What you’d ship first + how you’d measure."
            className="md:col-span-12"
            right={<Badge tone="green">Ship</Badge>}
          >
            {loading ? (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Skeleton className="h-44" />
                <Skeleton className="h-44" />
              </div>
            ) : packet ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
                <div className="md:col-span-5">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-white/90">MVP scope</div>
                      <Badge>Scope</Badge>
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                        <div className="text-[11px] uppercase tracking-wide text-white/50">In scope</div>
                        {packet.mvp.scope?.length ? (
                          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-white/80">
                            {packet.mvp.scope.map((x, i) => (
                              <li key={i}>{x}</li>
                            ))}
                          </ul>
                        ) : (
                          <div className="mt-2 text-sm text-white/45">—</div>
                        )}
                      </div>

                      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                        <div className="text-[11px] uppercase tracking-wide text-white/50">Out of scope</div>
                        {packet.mvp.out_of_scope?.length ? (
                          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-white/80">
                            {packet.mvp.out_of_scope.map((x, i) => (
                              <li key={i}>{x}</li>
                            ))}
                          </ul>
                        ) : (
                          <div className="mt-2 text-sm text-white/45">—</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-7">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-white/90">Experiment plan</div>
                      <Badge tone="amber">{packet.experiment_plan.length || 0} experiments</Badge>
                    </div>

                    <div className="mt-3 space-y-3">
                      {packet.experiment_plan?.length ? (
                        packet.experiment_plan.map((e, i) => (
                          <div key={i} className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="text-sm font-semibold text-white/90">
                                  {e.experiment || `Experiment ${i + 1}`}
                                </div>
                                <div className="mt-1 text-sm text-white/75">
                                  <span className="text-white/55">Primary metric:</span> {e.primary_metric || "—"}
                                </div>
                                {e.guardrails?.length ? (
                                  <div className="mt-1 text-sm text-white/75">
                                    <span className="text-white/55">Guardrails:</span> {e.guardrails.join(" · ")}
                                  </div>
                                ) : null}
                              </div>
                              {e.duration ? <Badge tone="blue">{e.duration}</Badge> : <Badge>—</Badge>}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-sm text-white/45">No experiments returned.</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-white/45">Generate a case to see MVP + experiment plan.</div>
            )}
          </Card>

          {/* Followups — 10, with strong/weak answers */}
          <Card
            title="Interviewer Follow-ups"
            subtitle="10 pressure-test questions, each with strong + weak answers."
            className="md:col-span-12"
            right={<Badge tone="amber">10 followups</Badge>}
          >
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-20" />
                ))}
              </div>
            ) : packet?.interviewer_followups?.length ? (
              <div className="space-y-3">
                {packet.interviewer_followups.slice(0, 10).map((f, i) => (
                  <details key={i} className="group rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                    <summary className="flex cursor-pointer list-none items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone="violet">Q{i + 1}</Badge>
                          {f.intent ? <Badge>{f.intent}</Badge> : null}
                        </div>
                        <div className="mt-2 text-sm font-semibold text-white/90">{f.question || "—"}</div>
                        <div className="mt-1 text-xs text-white/50">Click to reveal strong vs weak answer patterns.</div>
                      </div>
                      <div className="shrink-0 text-white/60 transition group-open:rotate-180">⌄</div>
                    </summary>

                    <div className="mt-4 space-y-4">
                      <DividerLabel>Strong answer</DividerLabel>
                      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-50/90">
                        <div className="whitespace-pre-wrap">{f.strong_answer || "—"}</div>
                      </div>

                      <DividerLabel>Weak answer</DividerLabel>
                      <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-50/90">
                        <div className="whitespace-pre-wrap">{f.weak_answer || "—"}</div>
                      </div>
                    </div>
                  </details>
                ))}
              </div>
            ) : packet ? (
              <div className="text-sm text-white/45">
                No followups returned. Ensure API returns <b>interviewer_followups</b> with 10 items.
              </div>
            ) : (
              <div className="text-sm text-white/45">Generate a case to see the full followups section.</div>
            )}
          </Card>

          {/* Debug (only if exists) */}
          {rawJson && !packet ? (
            <Card
              title="Raw JSON (debug)"
              subtitle="Your API responded, but the packet didn’t normalize cleanly."
              className="md:col-span-12"
              right={<Badge tone="red">Fix schema</Badge>}
            >
              <pre className="max-h-[420px] overflow-auto rounded-xl border border-white/10 bg-black/30 p-3 text-xs text-white/80">
                {rawJson}
              </pre>
            </Card>
          ) : null}
        </div>

        <div className="mt-10 text-center text-xs text-white/35">
          aipmworld.com-style UI · typed packet rendering · resilient to messy LLM JSON
        </div>
      </div>
    </div>
  );
}
