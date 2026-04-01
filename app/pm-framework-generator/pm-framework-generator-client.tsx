"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { FRAMEWORK_DEFINITIONS, type FrameworkKey } from "./framework-definitions";

type Effort = "S" | "M" | "L" | "XL";
type Stage = "discovery" | "build" | "launch";
type Screen = "hero" | "questions" | "loading" | "output";

type GeneratorState = {
  task: string;
  persona: string;
  metric: string;
  effort: Effort;
  stage: Stage;
};

type AIEnhancements = {
  rice_note?: string;
  rice_decision?: string;
  kano_delight?: string;
  kano_basic?: string;
  kano_performance?: string;
  kano_product_call?: string;
  kano_signal_check?: string;
  jtbd_opportunity?: string;
  okr_objective?: string;
  okr_cadence?: string;
  north_star_note?: string;
  moscow_must?: string[];
  moscow_should?: string[];
  moscow_could?: string[];
  moscow_wont?: string[];
  moscow_scope_call?: string;
  five_whys?: WhyItem[];
  jtbd_statement?: string;
  jtbd_jobs?: string[];
  stories?: Story[];
  acceptance?: Acceptance[];
  prd_out_of_scope?: string;
  prd_release_strategy?: string;
  prd_risk_register?: string[];
  okr_krs?: KR[];
  north_star_metric?: string;
  north_star_description?: string;
  north_star_inputs?: string[];
  matrix?: MatrixItem[];
  plan_30d?: string[];
};

type ApiSuccess = { enhancements?: AIEnhancements; pack?: AIEnhancements };

type WhyItem = { why: string; impact: string };
type Story = { actor: string; need: string; outcome: string; dod: string };
type Acceptance = { scenario: string; criterion: string };
type KR = { label: string; target: string; metric: string; progress: number };
type MatrixItem = { quadrant: string; intent: string; recommendation: string };

type Flags = GeneratorState & {
  isCheckout: boolean;
  isMobile: boolean;
  isCollab: boolean;
  isAI: boolean;
  isEnterprise: boolean;
};

const QUICK_STARTS = [
  "One-click reorder for returning customers at checkout",
  "Real-time collaboration mode for document editor",
  "AI-powered natural language search for enterprise docs",
  "SSO onboarding for mid-market teams",
  "Mobile app extension for web-only SaaS",
  "In-product notification center to reduce email fatigue",
] as const;

const PERSONAS = [
  "New users",
  "Returning users",
  "Power users",
  "Admins",
  "Enterprise teams",
  "External customers",
] as const;

const STAGES = [
  { value: "discovery", title: "Discovery", hint: "problem clarity + evidence" },
  { value: "build", title: "Build", hint: "execution + scope control" },
  { value: "launch", title: "Launch", hint: "adoption + impact tracking" },
] as const;

const LOAD_STEPS = [
  "Interpreting task context and user segment",
  "Estimating reach, impact, confidence, and effort assumptions",
  "Structuring root-cause and JTBD framing",
  "Generating PRD, stories, and acceptance criteria",
  "Aligning OKRs, North Star metric, and rollout plan",
  "Refining PM-ready recommendations",
] as const;

const INITIAL_STATE: GeneratorState = {
  task: "",
  persona: "",
  metric: "",
  effort: "M",
  stage: "build",
};

function clean(value: string): string {
  return value.replace(/[<>]/g, "").replace(/\u0000/g, "").trim();
}

function shorten(value: string, max = 52): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function classify(state: GeneratorState): Flags {
  const task = state.task.toLowerCase();
  const persona = state.persona.toLowerCase();
  return {
    ...state,
    isCheckout: /checkout|reorder|order|cart|purchase|buy/.test(task),
    isMobile: /mobile|ios|android|app/.test(task),
    isCollab: /collab|collaborat|real.?time|team edit|multi-user/.test(task),
    isAI: /\bai\b|ml|search|semantic|copilot|assistant/.test(task),
    isEnterprise: /enterprise|admin|it|security|team/.test(persona),
  };
}

function metricText(f: Flags): string {
  return (
    f.metric ||
    (f.isCheckout
      ? "Repeat purchase rate +15%"
      : f.isMobile
        ? "Mobile DAU +30%"
        : f.isCollab
          ? "Collaborative sessions +50%"
          : "Feature adoption >30% MAU in 30 days")
  );
}

function taskAnchor(f: Flags): string {
  return shorten(f.task || "this workflow", 90);
}

function riceModel(f: Flags) {
  const effortMap: Record<Effort, { label: string; weight: number; scorePct: number }> = {
    S: { label: "Small · 1–2 days", weight: 3.2, scorePct: 18 },
    M: { label: "Medium · 1–2 weeks", weight: 1.0, scorePct: 40 },
    L: { label: "Large · 1 month", weight: 0.5, scorePct: 68 },
    XL: { label: "XL · Quarter+", weight: 0.22, scorePct: 90 },
  };

  const reach = f.isCheckout ? 74 : f.isMobile ? 88 : f.isCollab ? 61 : f.isAI ? 69 : 63;
  const impact = f.isCheckout ? 82 : f.isMobile ? 73 : f.isCollab ? 79 : f.isAI ? 76 : 64;
  const confidence = f.isEnterprise ? 70 : f.isCheckout ? 87 : 76;

  const effort = effortMap[f.effort];
  const score = Math.round(((reach / 100) * (impact / 100) * (confidence / 100)) * effort.weight * 1000);

  return { reach, impact, confidence, effort, score };
}

function moscow(f: Flags) {
  const anchor = taskAnchor(f);
  const actor = f.persona || "core users";
  if (f.isCheckout) {
    return {
      must: [
        `One-click reorder entry directly in ${anchor}`,
        `Prefill last valid address + payment for ${actor}`,
        `Out-of-stock substitution before confirming ${anchor}`,
      ],
      should: [
        `Suggested add-ons relevant to ${anchor}`,
        "Delivery ETA shown in reorder step",
      ],
      could: [`Email deep-link back into ${anchor}`, "Loyalty points preview"],
      wont: ["Subscription engine redesign", "Payment provider migration in this release"],
    };
  }

  if (f.isMobile) {
    return {
      must: [
        `P0 feature parity for ${anchor} on mobile viewport`,
        "Fast auth and stable session recovery",
        `Error/empty/loading states optimized for ${anchor}`,
      ],
      should: [`Push deep-link routing to ${anchor}`, "Performance budget guardrails"],
      could: ["Biometric fast login", `Widget shortcut for ${anchor}`],
      wont: ["Full native rewrite in v1", "Offline-first architecture"],
    };
  }

  return {
    must: [
      `${actor} can complete "${anchor}" without blockers`,
      `Clear success + failure handling across "${anchor}"`,
      `Instrumentation for start, drop-off, and completion events in "${anchor}"`,
    ],
    should: [`Accessibility polish for "${anchor}"`, `Power-user shortcuts for "${anchor}"`],
    could: [`Contextual personalization in "${anchor}"`, `Export/reporting for "${anchor}" outcomes`],
    wont: [`Platform-wide redesign unrelated to "${anchor}"`, "Large migration dependencies in v1"],
  };
}

function fiveWhys(f: Flags): WhyItem[] {
  const anchor = taskAnchor(f);
  const actor = f.persona || "Users";
  if (f.isCheckout) {
    return [
      {
        why: `Returning users abandon before completing ${anchor}.`,
        impact: "Retention ceiling and lower LTV despite intent to buy.",
      },
      {
        why: "They must rebuild basket each time.",
        impact: "Cognitive and input friction at a high-intent moment.",
      },
      {
        why: "Flow optimized for first purchase, not repeat behavior.",
        impact: "Acquisition assumptions are still driving UX.",
      },
      {
        why: "Retention metric was not primary in roadmap scoring.",
        impact: "No dedicated owner, so fixes remained fragmented.",
      },
      {
        why: "Team lacks repeat-purchase funnel accountability.",
        impact: "Root cause is both product and operating model.",
      },
    ];
  }

  return [
    {
      why: `${actor} are not getting expected value from "${anchor}".`,
      impact: "High intent but low success creates trust decay.",
    },
    {
      why: `Current experience of "${anchor}" does not match real usage context.`,
      impact: "Users add workarounds and session drop-off rises.",
    },
    {
      why: "Discovery evidence did not deeply cover this segment.",
      impact: "Roadmap solved adjacent pain, not primary pain.",
    },
    {
      why: "Execution prioritized speed over behavior learning loops.",
      impact: "Signals arrived late and were weakly actioned.",
    },
    {
      why: "Success governance is not tightly coupled to this outcome.",
      impact: "Root cause persists until metric ownership is explicit.",
    },
  ];
}

function jobStatement(f: Flags) {
  const anchor = taskAnchor(f);
  const actor = f.persona || "core users";
  const statement = f.isCheckout
    ? "When I need to reorder essentials, help me complete purchase in under 20 seconds so I can maintain routine with near-zero friction."
    : f.isMobile
      ? "When I am away from desktop, help me complete key tasks confidently from my phone so I can keep execution momentum."
      : f.isCollab
        ? "When my team works on the same artifact, help us collaborate in real time without overwrites so we can move faster together."
        : `When ${actor.toLowerCase()} need to complete "${anchor}", help them do it with less effort and fewer decisions so they can focus on outcomes.`;

  const jobs = [
    `Functional: complete "${anchor}" with fewer steps, fewer retries, and predictable completion outcomes.`,
    `Emotional: feel confident and in control while executing "${anchor}" even under time pressure.`,
    `Social: appear dependable to stakeholders by completing "${anchor}" cleanly and on time.`,
    `Contextual: handle edge cases in "${anchor}" without abandoning flow or switching tools.`,
  ];

  return { statement, jobs };
}

function stories(f: Flags): Story[] {
  const actor = (f.persona || "user").toLowerCase();
  const anchor = taskAnchor(f).toLowerCase();

  if (f.isCheckout) {
    return [
      {
        actor,
        need: "one-tap reorder from checkout",
        outcome: "I can complete repeat purchases quickly",
        dod: "CTA appears for eligible users and populates cart in one action.",
      },
      {
        actor,
        need: "prefilled address and payment defaults",
        outcome: "I avoid repetitive entry and mistakes",
        dod: "Defaults are accurate, editable, and validated before confirm.",
      },
      {
        actor,
        need: "clear handling for unavailable items",
        outcome: "I can still complete reorder without restarting",
        dod: "OOS items are flagged with replacements before final payment.",
      },
    ];
  }

  return [
    {
      actor,
      need: `a shorter path for ${anchor} with clear progress`,
      outcome: "I complete work with less cognitive load",
      dod: "Step count reduced by at least 30% vs baseline.",
    },
    {
      actor,
      need: `contextual guidance at key points in ${anchor}`,
      outcome: "I realize value faster without docs",
      dod: "In-product prompts trigger on intent moments with dismiss memory.",
    },
    {
      actor,
      need: `reliable error recovery while using ${anchor}`,
      outcome: "I keep progress even if things fail",
      dod: "User input survives errors with one-tap retry path.",
    },
  ];
}

function acceptanceCriteria(f: Flags): Acceptance[] {
  const t = f.effort === "S" ? "1s" : "2s";
  const anchor = taskAnchor(f);
  const actor = f.persona || "user";
  return [
    {
      scenario: "Happy path",
      criterion: `Given a valid ${actor.toLowerCase()}, when they start "${anchor}", then the primary action becomes available within ${t}.`,
    },
    {
      scenario: "Validation",
      criterion: `Given invalid input in "${anchor}", when submit is attempted, then inline errors appear with actionable guidance.`,
    },
    {
      scenario: "Recovery",
      criterion: `Given transient API failure during "${anchor}", when retrying, then prior input and state are preserved.`,
    },
    {
      scenario: "Measurement",
      criterion: `Given successful completion, when event fires, then primary metric '${metricText(f)}' is traceable in analytics.`,
    },
  ];
}

function okr(f: Flags) {
  const m = metricText(f);
  const anchor = taskAnchor(f);
  const objective = f.isCheckout
    ? "Make repeat purchase behavior effortless and habitual for high-intent customers."
    : f.isMobile
      ? "Make mobile a first-class surface for core workflows and adoption growth."
      : `Increase realized user value by reducing friction in "${anchor}".`;

  const krs: KR[] = [
    {
      label: "KR1",
      target: m,
      metric: "Primary outcome metric",
      progress: 54,
    },
    {
      label: "KR2",
      target: "Reduce workflow drop-off by 35%",
      metric: "Funnel completion",
      progress: 39,
    },
    {
      label: "KR3",
      target: "Improve satisfaction by +10 points",
      metric: "CSAT post-completion",
      progress: 62,
    },
  ];

  return { objective, krs };
}

function northStar(f: Flags) {
  const anchor = taskAnchor(f);
  const ns = f.isCheckout
    ? "Reorders per Returning User / Month"
    : f.isMobile
      ? "Mobile Weekly Active Users"
      : `Weekly Active Users of "${shorten(anchor, 34)}"`;

  return {
    metric: ns,
    description: `A behavior metric that reflects adoption and sustained value delivery for "${anchor}".`,
    inputs: [
      "Activation rate to first successful completion",
      "Median time-to-value for key workflow",
      "Weekly repeat usage of the workflow",
    ],
  };
}

function impactMatrix(f: Flags): MatrixItem[] {
  const anchor = taskAnchor(f);
  return [
    {
      quadrant: "Quick Win",
      intent: "High impact · Low effort",
      recommendation: `Ship a narrow slice of "${anchor}" in sprint 1 and measure aggressively.`,
    },
    {
      quadrant: "Big Bet",
      intent: "High impact · High effort",
      recommendation: `If "${anchor}" requires high effort, prepare business case and milestone gates before commitment.`,
    },
    {
      quadrant: "Fill-In",
      intent: "Low impact · Low effort",
      recommendation: `Batch supporting improvements to "${anchor}" with quality polish work.`,
    },
    {
      quadrant: "Time Sink",
      intent: "Low impact · High effort",
      recommendation: f.isEnterprise
        ? "Defer unless tied to contractual or compliance objective."
        : "Defer until clear signal and strategic pull are present.",
    },
  ];
}

function first30Days(f: Flags): string[] {
  if (f.isCheckout) {
    return [
      "Week 1: instrument reorder funnel baseline and define rollback thresholds.",
      "Week 2: launch one-tap reorder to 10% cohort with guardrails on payment/address errors.",
      "Week 3: add substitution handling and monitor completion-time regression.",
      "Week 4: scale to 100% only if repeat-purchase lift and abandonment improve together.",
    ];
  }
  if (f.isMobile) {
    return [
      "Week 1: parity audit across top mobile journeys and classify blockers by severity.",
      "Week 2: fix P0 path breakages and enforce performance budgets on key screens.",
      "Week 3: release progressive rollout with crash and latency dashboards per version.",
      "Week 4: run usability replay on failed sessions and ship top two friction fixes.",
    ];
  }
  return [
    "Week 1: establish baseline funnel and quality metrics with event ownership.",
    "Week 2: ship narrow v1 to a controlled cohort and collect qualitative feedback.",
    "Week 3: close top defects and tighten activation/onboarding touchpoints.",
    "Week 4: decide scale-up based on KPI movement, not feature-completeness bias.",
  ];
}

function riskWatch(f: Flags): string[] {
  return [
    "Scope creep from parallel asks that do not improve the primary success metric.",
    f.isEnterprise
      ? "Security or compliance review delays caused by late architecture decisions."
      : "Reliability regressions from under-tested edge cases in the happy-path focus.",
    "Analytics blind spots where tracked events do not map cleanly to decision checkpoints.",
  ];
}

function stageBadge(stage: Stage): string {
  if (stage === "discovery") return "Discovery";
  if (stage === "launch") return "Launch";
  return "Build";
}

function FrameworkInfo({
  id,
  label,
  open,
  onOpen,
  onClose,
  onToggle,
}: {
  id: FrameworkKey;
  label: string;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  onToggle: () => void;
}) {
  return (
    <span className="info-wrap" onMouseEnter={onOpen} onMouseLeave={onClose}>
      <button
        type="button"
        className="info-dot"
        aria-label={label}
        onFocus={onOpen}
        onBlur={onClose}
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
      >
        i
      </button>
      <span className={`info-tip ${open ? "is-visible" : ""}`} role="tooltip">
        {FRAMEWORK_DEFINITIONS[id]}
      </span>
    </span>
  );
}

export default function PmFrameworkGeneratorClient() {
  const [screen, setScreen] = useState<Screen>("hero");
  const [state, setState] = useState<GeneratorState>(INITIAL_STATE);
  const [taskInput, setTaskInput] = useState("");
  const [metricInput, setMetricInput] = useState("");
  const [loadingIndex, setLoadingIndex] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [ai, setAi] = useState<AIEnhancements | null>(null);
  const [openTip, setOpenTip] = useState<FrameworkKey | null>(null);

  const flags = useMemo(() => classify(state), [state]);
  const rice = useMemo(() => riceModel(flags), [flags]);
  const moscowData = useMemo(() => moscow(flags), [flags]);
  const whys = useMemo(() => fiveWhys(flags), [flags]);
  const jtbd = useMemo(() => jobStatement(flags), [flags]);
  const userStories = useMemo(() => stories(flags), [flags]);
  const ac = useMemo(() => acceptanceCriteria(flags), [flags]);
  const okrData = useMemo(() => okr(flags), [flags]);
  const ns = useMemo(() => northStar(flags), [flags]);
  const matrix = useMemo(() => impactMatrix(flags), [flags]);
  const plan30 = useMemo(() => first30Days(flags), [flags]);
  const risks = useMemo(() => riskWatch(flags), [flags]);

  const moscowDataFinal = useMemo(
    () => ({
      must: ai?.moscow_must?.filter(Boolean).slice(0, 6) || moscowData.must,
      should: ai?.moscow_should?.filter(Boolean).slice(0, 6) || moscowData.should,
      could: ai?.moscow_could?.filter(Boolean).slice(0, 6) || moscowData.could,
      wont: ai?.moscow_wont?.filter(Boolean).slice(0, 6) || moscowData.wont,
      scope_call: ai?.moscow_scope_call || "Keep only top 2 Musts in Sprint 1, move remaining Musts into Sprint 2 planning.",
    }),
    [ai, moscowData],
  );

  const whysFinal = useMemo(() => {
    const list = ai?.five_whys?.filter((x) => x?.why && x?.impact);
    return list && list.length > 0 ? list.slice(0, 5) : whys;
  }, [ai?.five_whys, whys]);

  const jtbdFinal = useMemo(() => {
    const rawStatement = (ai?.jtbd_statement || jtbd.statement).trim();
    const statement =
      rawStatement.length < 110
        ? `${rawStatement} Success is defined by faster completion, lower drop-off, and fewer support-seeking behaviors.`
        : rawStatement;

    const rawJobs = ai?.jtbd_jobs?.filter(Boolean).slice(0, 4) || jtbd.jobs;
    const jobs = rawJobs.length < 4 ? [...rawJobs, ...jtbd.jobs].slice(0, 4) : rawJobs;

    const rawOpportunity =
      ai?.jtbd_opportunity ||
      `Opportunity: tighten the highest-friction moments in "${taskAnchor(flags)}" so ${(
        flags.persona || "users"
      ).toLowerCase()} can reach value with fewer steps and fewer retries.`;
    const opportunity =
      rawOpportunity.length < 120
        ? `${rawOpportunity} Anchor improvements to the primary metric: ${metricText(flags)}.`
        : rawOpportunity;

    return { statement, jobs, opportunity };
  }, [ai, jtbd, flags]);

  const storiesFinal = useMemo(() => {
    const list = ai?.stories?.filter((x) => x?.actor && x?.need && x?.outcome && x?.dod);
    return list && list.length > 0 ? list.slice(0, 4) : userStories;
  }, [ai?.stories, userStories]);

  const acceptanceFinal = useMemo(() => {
    const list = ai?.acceptance?.filter((x) => x?.scenario && x?.criterion);
    return list && list.length > 0 ? list.slice(0, 6) : ac;
  }, [ai?.acceptance, ac]);

  const okrKrsFinal = useMemo(() => {
    const list = ai?.okr_krs
      ?.filter((x) => x?.label && x?.target && x?.metric)
      ?.slice(0, 4)
      .map((kr, idx) => ({
        ...kr,
        progress: typeof kr.progress === "number" ? Math.max(0, Math.min(100, kr.progress)) : okrData.krs[idx]?.progress ?? 50,
      }));
    return list && list.length > 0 ? list : okrData.krs;
  }, [ai?.okr_krs, okrData.krs]);

  const nsFinal = useMemo(
    () => ({
      metric: ai?.north_star_metric || ns.metric,
      description: ai?.north_star_description || ns.description,
      inputs: ai?.north_star_inputs?.filter(Boolean).slice(0, 4) || ns.inputs,
      note: ai?.north_star_note || "Review weekly with clear owner and intervention thresholds.",
    }),
    [ai, ns],
  );

  const matrixFinal = useMemo(() => {
    const list = ai?.matrix?.filter((x) => x?.quadrant && x?.intent && x?.recommendation);
    return list && list.length > 0 ? list.slice(0, 4) : matrix;
  }, [ai?.matrix, matrix]);

  const plan30Final = useMemo(() => {
    const list = ai?.plan_30d?.filter(Boolean);
    return list && list.length > 0 ? list.slice(0, 6) : plan30;
  }, [ai?.plan_30d, plan30]);

  const risksFinal = useMemo(() => {
    const list = ai?.prd_risk_register?.filter(Boolean);
    return list && list.length > 0 ? list.slice(0, 6) : risks;
  }, [ai?.prd_risk_register, risks]);

  const okrTitle = ai?.okr_objective || okrData.objective;

  useEffect(() => {
    function handleDocClick() {
      setOpenTip(null);
    }

    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenTip(null);
    }

    document.addEventListener("click", handleDocClick);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("click", handleDocClick);
      document.removeEventListener("keydown", handleEsc);
    };
  }, []);

  function tooltipProps(id: FrameworkKey, label: string) {
    return {
      id,
      label,
      open: openTip === id,
      onOpen: () => setOpenTip(id),
      onClose: () => setOpenTip((prev) => (prev === id ? null : prev)),
      onToggle: () => setOpenTip((prev) => (prev === id ? null : id)),
    };
  }

  const riceNarrative = useMemo(() => {
    if (ai?.rice_note) return ai.rice_note;
    if (rice.score > 600) return "High-priority candidate with favorable impact-to-effort profile. Ship early and monitor scope drift.";
    if (rice.score > 350) return "Viable opportunity with moderate confidence. Keep v1 tight and gate expansion on early signal.";
    return "Low confidence for current effort profile. Validate with a bounded spike before full build.";
  }, [ai?.rice_note, rice.score]);

  const metric = metricText(flags);
  const stage = stageBadge(state.stage);
  const topWhy = whysFinal[0]?.why || "Core user value is not being realized consistently.";

  function selectPrompt(prompt: string) {
    setTaskInput(prompt);
    setError(null);
  }

  function startQuestions() {
    const task = clean(taskInput);
    if (!task) {
      setError("Please enter a PM task to continue.");
      return;
    }
    setError(null);
    setState((prev) => ({ ...prev, task }));
    setScreen("questions");
  }

  function resetAll() {
    setScreen("hero");
    setState(INITIAL_STATE);
    setTaskInput("");
    setMetricInput("");
    setAi(null);
    setError(null);
  }

  async function generateOutput() {
    const next: GeneratorState = {
      ...state,
      persona: state.persona || "core users",
      metric: clean(metricInput),
      effort: state.effort || "M",
      stage: state.stage || "build",
    };

    setState(next);
    setAi(null);
    setScreen("loading");
    setError(null);
    setLoadingIndex(0);

    let i = 0;
    const ticker = window.setInterval(() => {
      i = (i + 1) % LOAD_STEPS.length;
      setLoadingIndex(i);
    }, 820);

    const minDelay = new Promise((resolve) => window.setTimeout(resolve, 1800));

    try {
      const res = await fetch("/api/pm-framework-generator", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(next),
      });

      if (res.ok) {
        const data = (await res.json()) as ApiSuccess;
        setAi(data.pack || data.enhancements || null);
      }
    } catch {
      // Keep deterministic output if network/model fails.
    } finally {
      await minDelay;
      window.clearInterval(ticker);
      setScreen("output");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  return (
    <main className="day7-root">
      <header className="day7-topbar">
        <Link href="/" className="top-link">Back Home</Link>
        <span className="top-pill">Day 07 · PM Framework Generator</span>
      </header>

      <div className="day7-shell">
        {screen === "hero" ? (
          <section className="hero-panel">
            <p className="eyebrow">75 Hard Product Series</p>
            <h1 className="hero-title">
              Build Better PM Thinking<br />
              <span>from One Task Prompt.</span>
            </h1>
            <p className="hero-copy">
              Generate a practical PM pack: prioritization, framing, execution artifacts, and
              strategy metrics. Built for decision-making, not filler output.
            </p>

            <div className="hero-input-wrap">
              <input
                value={taskInput}
                onChange={(e) => setTaskInput(e.target.value)}
                placeholder="e.g. Reduce repeat checkout friction for returning customers"
                className="hero-input"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    startQuestions();
                  }
                }}
              />
              <button type="button" className="primary-btn" onClick={startQuestions}>
                Continue
              </button>
            </div>

            {error ? <p className="error-text">{error}</p> : null}

            <div className="hero-outcomes">
              <p className="hero-strip-label">What You Get</p>
              <div className="hero-strip-items">
                <span>RICE + MoSCoW + Kano</span>
                <span>5 Whys + JTBD</span>
                <span>PRD + Stories + Acceptance</span>
                <span>OKR + North Star + Impact-Effort</span>
              </div>
              <div className="hero-metrics">
                <div><strong>11</strong><span>Frameworks</span></div>
                <div><strong>4</strong><span>Context Inputs</span></div>
                <div><strong>&lt; 10s</strong><span>Typical Output</span></div>
                <div><strong>PM-ready</strong><span>Actionable Draft</span></div>
              </div>
            </div>
          </section>
        ) : null}

        {screen === "questions" ? (
          <section className="questions-panel">
            <button type="button" className="ghost-btn" onClick={() => setScreen("hero")}>← Edit Task</button>
            <p className="eyebrow">Context Builder</p>
            <h2 className="section-title">Configure the PM context for “{shorten(state.task)}”</h2>

            <div className="q-block">
              <p className="q-label">1. Primary user</p>
              <div className="chips-wrap">
                {PERSONAS.map((persona) => (
                  <button
                    key={persona}
                    type="button"
                    className={`chip ${state.persona === persona ? "is-active" : ""}`}
                    onClick={() => setState((prev) => ({ ...prev, persona }))}
                  >
                    {persona}
                  </button>
                ))}
              </div>
            </div>

            <div className="q-block">
              <p className="q-label">2. Success metric</p>
              <input
                value={metricInput}
                onChange={(e) => setMetricInput(e.target.value)}
                className="line-input"
                placeholder="e.g. Repeat purchase rate +15% in 8 weeks"
              />
            </div>

            <div className="q-block">
              <p className="q-label">3. Engineering effort</p>
              <div className="effort-grid">
                {(["S", "M", "L", "XL"] as const).map((size) => (
                  <button
                    key={size}
                    type="button"
                    className={`effort-tile ${state.effort === size ? "is-active" : ""}`}
                    onClick={() => setState((prev) => ({ ...prev, effort: size }))}
                  >
                    <strong>{size}</strong>
                    <span>
                      {size === "S"
                        ? "1-2 days"
                        : size === "M"
                          ? "1-2 weeks"
                          : size === "L"
                            ? "1 month"
                            : "Quarter+"}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="q-block">
              <p className="q-label">4. Work stage</p>
              <div className="chips-wrap">
                {STAGES.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    className={`chip ${state.stage === item.value ? "is-active" : ""}`}
                    onClick={() => setState((prev) => ({ ...prev, stage: item.value as Stage }))}
                  >
                    {item.title} · {item.hint}
                  </button>
                ))}
              </div>
            </div>

            <button type="button" className="primary-btn full" onClick={generateOutput}>
              Generate PM Pack
            </button>
          </section>
        ) : null}

        {screen === "loading" ? (
          <section className="loading-panel">
            <p className="eyebrow">Generating</p>
            <h2 className="section-title">Generating PM Pack</h2>
            <p key={loadingIndex} className="loading-stage" aria-live="polite">
              {LOAD_STEPS[loadingIndex]}
            </p>
            <div className="loading-rail" aria-hidden="true">
              <span
                className="loading-rail-fill"
                style={{ width: `${((loadingIndex + 1) / LOAD_STEPS.length) * 100}%` }}
              />
            </div>
            <p className="loading-meta">Calibrating analysis depth and execution detail</p>
          </section>
        ) : null}

        {screen === "output" ? (
          <section className="output-wrap">
            <div className="summary-strip">
              <div className="summary-task">
                <p className="meta">Task</p>
                <p className="task-text">{state.task}</p>
              </div>
              <div className="summary-meta">
                <p className="meta">User</p>
                <p>{state.persona || "core users"}</p>
              </div>
              <div className="summary-meta">
                <p className="meta">Effort</p>
                <p>{rice.effort.label}</p>
              </div>
              <div className="summary-meta">
                <p className="meta">Stage</p>
                <p>{stage}</p>
              </div>
              <button type="button" className="ghost-btn" onClick={resetAll}>Start Over</button>
            </div>

            <section className="artifact-block">
              <h3>01 · Prioritization</h3>
              <div className="cards-3">
                <article className="card">
                  <div className="kicker-row">
                    <p className="card-kicker">RICE</p>
                    <FrameworkInfo {...tooltipProps("rice", "RICE framework explanation")} />
                  </div>
                  <h4>{rice.score}</h4>
                  <p className="muted">Prioritization score for this proposal using reach, impact, confidence, and effort.</p>
                  <ul>
                    <li>Reach: {rice.reach}%</li>
                    <li>Impact: {rice.impact}%</li>
                    <li>Confidence: {rice.confidence}%</li>
                    <li>Effort: {rice.effort.label}</li>
                  </ul>
                  <div className="step">
                    <p><strong>Decision:</strong> {ai?.rice_decision || (rice.score > 600 ? "Ship now" : rice.score > 350 ? "Ship with tight scope" : "Run validation spike first")}.</p>
                    <p><strong>Execution note:</strong> {riceNarrative}</p>
                  </div>
                  <div className="step">
                    <p><strong>Priority test:</strong> if this does not move the primary metric in 2-3 weeks, cut scope and reallocate.</p>
                  </div>
                </article>

                <article className="card">
                  <div className="kicker-row">
                    <p className="card-kicker">MoSCoW</p>
                    <FrameworkInfo {...tooltipProps("moscow", "MoSCoW framework explanation")} />
                  </div>
                  <h4>Scope Decisions</h4>
                  <p className="mini">Must Have</p>
                  <ul>{moscowDataFinal.must.map((x) => <li key={x}>{x}</li>)}</ul>
                  <p className="mini">Should Have</p>
                  <ul>{moscowDataFinal.should.map((x) => <li key={x}>{x}</li>)}</ul>
                  <p className="mini">Could Have</p>
                  <ul>{moscowDataFinal.could.map((x) => <li key={x}>{x}</li>)}</ul>
                  <p className="mini">Won't Have (v1)</p>
                  <ul>
                    {moscowDataFinal.wont.map((x) => <li key={x}>{x}</li>)}
                  </ul>
                  <div className="step">
                    <p><strong>Scope call:</strong> {moscowDataFinal.scope_call}</p>
                  </div>
                </article>

                <article className="card">
                  <div className="kicker-row">
                    <p className="card-kicker">Kano</p>
                    <FrameworkInfo {...tooltipProps("kano", "Kano framework explanation")} />
                  </div>
                  <h4>Satisfaction Fit</h4>
                  <p><strong>Basic:</strong> {ai?.kano_basic || "Reliability and completion quality are non-negotiable."}</p>
                  <p><strong>Performance:</strong> {ai?.kano_performance || "Faster flows and clearer state handling directly increase satisfaction."}</p>
                  <p><strong>Delight:</strong> {ai?.kano_delight || (flags.isCheckout ? "Personalized reorder intelligence for frequent buyers." : "Contextual assistance that anticipates the next best action.")}</p>
                  <div className="step">
                    <p><strong>Product call:</strong> {ai?.kano_product_call || "Allocate 70% effort to basics/performance, 30% to one delight wedge."}</p>
                  </div>
                  <div className="step">
                    <p><strong>30-day signal check:</strong> {ai?.kano_signal_check || "monitor completion rate, time-to-value, and repeat usage before adding extra delight features."}</p>
                  </div>
                </article>
              </div>
            </section>

            <section className="artifact-block">
              <h3>02 · Problem Framing</h3>
              <div className="cards-2">
                <article className="card">
                  <div className="kicker-row">
                    <p className="card-kicker">5 Whys</p>
                    <FrameworkInfo {...tooltipProps("fiveWhys", "5 Whys framework explanation")} />
                  </div>
                  <h4>Root Cause Chain</h4>
                  {whysFinal.map((w, i) => (
                    <div className="step" key={`${w.why}-${i}`}>
                      <p><strong>Why {i + 1}:</strong> {w.why}</p>
                      <p className="muted">{w.impact}</p>
                    </div>
                  ))}
                  <p className="note"><strong>Root cause summary:</strong> {topWhy}</p>
                </article>

                <article className="card">
                  <div className="kicker-row">
                    <p className="card-kicker">JTBD</p>
                    <FrameworkInfo {...tooltipProps("jtbd", "JTBD framework explanation")} />
                  </div>
                  <h4>Job To Be Done</h4>
                  <p>{jtbdFinal.statement}</p>
                  <ul>{jtbdFinal.jobs.map((j) => <li key={j}>{j}</li>)}</ul>
                  <p className="note">
                    {jtbdFinal.opportunity}
                  </p>
                </article>
              </div>
            </section>

            <section className="artifact-block">
              <h3>03 · Execution</h3>
              <div className="cards-3">
                <article className="card">
                  <div className="kicker-row">
                    <p className="card-kicker">PRD Snapshot</p>
                    <FrameworkInfo {...tooltipProps("prd", "PRD framework explanation")} />
                  </div>
                  <h4>Spec Outline</h4>
                  <div className="step">
                    <p><strong>Problem:</strong> {shorten(state.task, 140)}</p>
                    <p><strong>Primary user:</strong> {state.persona || "core users"}</p>
                    <p><strong>Primary metric:</strong> {metric}</p>
                    <p><strong>Out of scope:</strong> {ai?.prd_out_of_scope || "broad platform redesign and unrelated migrations in v1."}</p>
                    <p><strong>Release strategy:</strong> {ai?.prd_release_strategy || "staged rollout (10% → 50% → 100%) with rollback trigger."}</p>
                  </div>
                  <div className="step">
                    <p><strong>Risk register:</strong></p>
                    <ul>{risksFinal.map((r) => <li key={r}>{r}</li>)}</ul>
                  </div>
                </article>

                <article className="card">
                  <div className="kicker-row">
                    <p className="card-kicker">User Stories</p>
                    <FrameworkInfo {...tooltipProps("stories", "User Stories framework explanation")} />
                  </div>
                  <h4>Build-Ready Stories</h4>
                  {storiesFinal.map((s, idx) => (
                    <div className="step" key={`${s.need}-${idx}`}>
                      <p><strong>Story {idx + 1}:</strong> As a {s.actor}, I need {s.need} so that {s.outcome}.</p>
                      <p className="muted">Definition of done: {s.dod}</p>
                    </div>
                  ))}
                </article>

                <article className="card">
                  <div className="kicker-row">
                    <p className="card-kicker">Acceptance Criteria</p>
                    <FrameworkInfo {...tooltipProps("acceptance", "Acceptance Criteria framework explanation")} />
                  </div>
                  <h4>Given / When / Then</h4>
                  {acceptanceFinal.map((a) => (
                    <div className="step" key={`${a.scenario}-${a.criterion}`}>
                      <p><strong>{a.scenario}:</strong> {a.criterion}</p>
                    </div>
                  ))}
                  <p className="note"><strong>QA gate:</strong> all criteria pass before launch candidate sign-off.</p>
                </article>
              </div>
            </section>

            <section className="artifact-block">
              <h3>04 · Strategy</h3>
              <div className="cards-3">
                <article className="card">
                  <div className="kicker-row">
                    <p className="card-kicker">OKR</p>
                    <FrameworkInfo {...tooltipProps("okr", "OKR framework explanation")} />
                  </div>
                  {okrTitle.length > 84 ? (
                    <h4 className="title-marquee" title={okrTitle}>
                      <span className="title-marquee-track">
                        <span className="title-marquee-text">{okrTitle}</span>
                        <span className="title-marquee-text" aria-hidden="true">{okrTitle}</span>
                      </span>
                    </h4>
                  ) : (
                    <h4>{okrTitle}</h4>
                  )}
                  {okrKrsFinal.map((kr) => (
                    <div className="step" key={kr.label}>
                      <p><strong>{kr.label}:</strong> {kr.target}</p>
                      <p className="muted">{kr.metric}</p>
                      <div className="bar"><span style={{ width: `${kr.progress}%` }} /></div>
                    </div>
                  ))}
                  <div className="step">
                    <p><strong>Operating cadence:</strong> {ai?.okr_cadence || "weekly KR review with PM, Eng, and Design owners."}</p>
                  </div>
                </article>

                <article className="card">
                  <div className="kicker-row">
                    <p className="card-kicker">North Star</p>
                    <FrameworkInfo {...tooltipProps("northStar", "North Star framework explanation")} />
                  </div>
                  <h4>{nsFinal.metric}</h4>
                  <p>{nsFinal.description}</p>
                  <ul>{nsFinal.inputs.map((i) => <li key={i}>{i}</li>)}</ul>
                  <p className="note">
                    {nsFinal.note}
                  </p>
                </article>

                <article className="card">
                  <div className="kicker-row">
                    <p className="card-kicker">Impact × Effort</p>
                    <FrameworkInfo {...tooltipProps("impactEffort", "Impact x Effort framework explanation")} />
                  </div>
                  <h4>Placement Guidance</h4>
                  {matrixFinal.map((m) => (
                    <div className="step" key={m.quadrant}>
                      <p><strong>{m.quadrant}:</strong> {m.intent}</p>
                      <p className="muted">{m.recommendation}</p>
                    </div>
                  ))}
                  <div className="step">
                    <p><strong>First 30-day execution plan</strong></p>
                    <ul>{plan30Final.map((p) => <li key={p}>{p}</li>)}</ul>
                  </div>
                </article>
              </div>
            </section>
          </section>
        ) : null}
      </div>

      <style jsx>{`
        .day7-root {
          min-height: 100vh;
          background:
            radial-gradient(circle at 92% -12%, rgba(66, 108, 245, 0.2), transparent 33%),
            radial-gradient(circle at 8% 0%, rgba(33, 211, 238, 0.16), transparent 28%),
            #f3f6fc;
          color: #111827;
          padding: 96px 16px 72px;
          font-family: var(--font-lexend), system-ui, -apple-system, "Segoe UI", sans-serif;
        }

        .day7-shell {
          max-width: none;
          width: 100%;
          margin: 0 auto;
        }

        .day7-topbar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 70;
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          padding: 16px 20px;
          background: linear-gradient(180deg, #0b1f47, #081735);
          border-bottom: 1px solid rgba(189, 206, 238, 0.3);
          backdrop-filter: blur(8px);
        }

        .top-link,
        .top-pill {
          border: 1px solid rgba(199, 214, 242, 0.42);
          background: rgba(255, 255, 255, 0.08);
          color: #f3f7ff;
          border-radius: 999px;
          padding: 8px 14px;
          font-size: 11px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          text-decoration: none;
        }

        .top-link:hover {
          border-color: #d7e4ff;
          color: #ffffff;
        }

        .hero-panel,
        .questions-panel,
        .loading-panel {
          background: rgba(255, 255, 255, 0.9);
          border: 1px solid #d9e2f1;
          border-radius: 20px;
          box-shadow:
            0 12px 30px rgba(15, 23, 42, 0.06),
            0 2px 0 rgba(255, 255, 255, 0.9) inset;
          padding: 28px 24px;
        }

        .hero-panel {
          text-align: center;
          min-height: calc(100vh - 170px);
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .eyebrow {
          margin: 0 0 14px;
          font-size: 11px;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: #4f46e5;
        }

        .hero-title {
          margin: 0;
          font-family: var(--font-lexend), system-ui, sans-serif;
          font-size: clamp(40px, 8vw, 76px);
          line-height: 1.02;
          letter-spacing: -0.02em;
          font-weight: 800;
        }

        .hero-title span {
          color: #1d4ed8;
          font-style: normal;
        }

        .hero-copy {
          margin: 18px auto 24px;
          max-width: 760px;
          color: #4b5563;
          font-size: 15px;
          line-height: 1.72;
        }

        .hero-input-wrap {
          width: min(1120px, 92%);
          margin: 0 auto;
          display: flex;
          gap: 8px;
          background: #ffffff;
          border: 1px solid #d5dfef;
          border-radius: 999px;
          padding: 7px;
        }

        .hero-input,
        .line-input {
          width: 100%;
          min-width: 0;
          border: none;
          outline: none;
          background: transparent;
          color: #111827;
          padding: 13px 16px;
          font-size: 18px;
        }

        .hero-input::placeholder,
        .line-input::placeholder {
          color: #94a3b8;
        }

        .line-input {
          border-bottom: 1px solid #d5dfef;
          border-radius: 0;
          padding-left: 0;
        }

        .primary-btn {
          border: none;
          border-radius: 999px;
          background: linear-gradient(135deg, #2563eb, #1d4ed8);
          color: #f8fbff;
          padding: 13px 24px;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          cursor: pointer;
          flex-shrink: 0;
        }

        .primary-btn:hover {
          background: linear-gradient(135deg, #1d4ed8, #1e40af);
        }

        .primary-btn.full {
          width: 100%;
          margin-top: 14px;
          padding: 14px 16px;
        }

        @media (max-width: 1090px) {
          .hero-input,
          .line-input {
            font-size: 16px;
            padding: 11px 14px;
          }

          .primary-btn {
            padding: 11px 18px;
            font-size: 12px;
          }
        }

        .chips-wrap {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .hero-outcomes {
          margin: 22px auto 0;
          width: 100%;
          max-width: 980px;
          border-top: 1px solid #dbe5f5;
          padding-top: 16px;
        }

        .hero-strip-label {
          margin: 0 0 10px;
          color: #64748b;
          font-size: 10px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .hero-strip-items {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 8px;
          margin-bottom: 12px;
        }

        .hero-strip-items span {
          border: 1px solid #d8e2f1;
          border-radius: 999px;
          background: #f8fbff;
          color: #334155;
          font-size: 12px;
          padding: 7px 12px;
        }

        .hero-metrics {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }

        .hero-metrics div {
          border: 1px solid #e1e8f5;
          border-radius: 10px;
          background: #fcfdff;
          padding: 8px 10px;
        }

        .hero-metrics strong {
          display: block;
          color: #0f172a;
          font-size: 17px;
          line-height: 1.2;
        }

        .hero-metrics span {
          color: #64748b;
          font-size: 11px;
        }

        .quick-pill,
        .chip {
          border: 1px solid #d6e0f0;
          border-radius: 999px;
          background: #ffffff;
          color: #334155;
          font-size: 12px;
          padding: 8px 12px;
          text-align: left;
          cursor: pointer;
        }

        .quick-pill:hover,
        .chip:hover,
        .chip.is-active {
          border-color: #8fb0ea;
          background: #edf3ff;
          color: #0f172a;
        }

        .error-text {
          margin: 10px 0 0;
          color: #ba3a2b;
          font-size: 13px;
        }

        .questions-panel {
          margin: 0 auto;
        }

        .ghost-btn {
          border: 1px solid #d6e0f0;
          border-radius: 999px;
          background: transparent;
          color: #475569;
          font-size: 11px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          padding: 7px 12px;
          cursor: pointer;
          width: fit-content;
        }

        .section-title {
          margin: 10px 0 20px;
          font-family: var(--font-lexend), system-ui, sans-serif;
          font-size: clamp(28px, 5vw, 46px);
          line-height: 1.12;
          letter-spacing: -0.01em;
          font-weight: 780;
        }

        .q-block {
          border-top: 1px solid #e1e8f5;
          padding: 22px 0;
        }

        .q-label {
          margin: 0 0 12px;
          color: #64748b;
          font-size: 11px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .effort-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .effort-tile {
          border: 1px solid #d6e0f0;
          background: #ffffff;
          border-radius: 12px;
          color: #334155;
          padding: 12px;
          text-align: center;
          cursor: pointer;
        }

        .effort-tile strong {
          display: block;
          font-family: var(--font-lexend), system-ui, sans-serif;
          font-size: 27px;
          color: #1d4ed8;
          line-height: 1;
          margin-bottom: 5px;
        }

        .effort-tile span {
          font-size: 11px;
          color: #64748b;
        }

        .effort-tile.is-active,
        .effort-tile:hover {
          border-color: #90b0e9;
          background: #edf3ff;
        }

        .loading-panel {
          text-align: center;
          padding: 34px 24px;
        }

        .loading-panel .section-title {
          margin-bottom: 8px;
        }

        .loading-stage {
          margin: 0 auto 12px;
          max-width: 860px;
          color: #334155;
          font-size: 16px;
          line-height: 1.45;
          animation: stage-fade 0.26s ease;
        }

        .loading-rail {
          max-width: 860px;
          margin: 0 auto;
          height: 6px;
          border-radius: 99px;
          background: #dde6f6;
          overflow: hidden;
        }

        .loading-rail-fill {
          display: block;
          height: 100%;
          background: linear-gradient(90deg, #2563eb, #1e40af);
          border-radius: 99px;
          transition: width 0.32s ease;
        }

        .loading-meta {
          margin: 10px 0 0;
          color: #6b7280;
          font-size: 12px;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        @keyframes stage-fade {
          from {
            opacity: 0.3;
            transform: translateY(2px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .output-wrap {
          display: grid;
          gap: 24px;
          padding: 0;
          border: none;
          border-radius: 0;
          box-shadow: none;
          background: transparent;
        }

        .summary-strip {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
          border: 1px solid #d7e0f0;
          border-radius: 14px;
          background: linear-gradient(180deg, #0c204a, #0a1a3c);
          padding: 16px;
        }

        .meta {
          margin: 0;
          color: #c8d7f6;
          font-size: 10px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .summary-strip p {
          margin: 2px 0 0;
          color: #f5f8ff;
          font-size: 13px;
          line-height: 1.55;
        }

        .summary-task {
          grid-column: 1 / -1;
          padding-bottom: 10px;
          border-bottom: 1px solid rgba(205, 220, 246, 0.3);
        }

        .task-text {
          font-size: clamp(18px, 2.5vw, 28px) !important;
          line-height: 1.24 !important;
          letter-spacing: -0.01em;
          font-weight: 700;
          color: #ffffff !important;
          margin-top: 6px !important;
          word-break: break-word;
        }

        .summary-meta p:last-child {
          font-size: 16px;
          line-height: 1.4;
          font-weight: 600;
        }

        .artifact-block h3 {
          margin: 0 0 10px;
          color: #4f46e5;
          font-size: 12px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .artifact-block {
          border-top: 1px solid #e1e8f5;
          padding-top: 12px;
        }

        .cards-3,
        .cards-2 {
          display: grid;
          gap: 16px;
        }

        .card {
          border: 1px solid #d8e2f1;
          border-radius: 12px;
          background: linear-gradient(180deg, #ffffff, #f8fbff);
          box-shadow: 0 1px 0 rgba(255, 255, 255, 0.95) inset;
          padding: 22px;
          min-width: 0;
          transform: translateY(0);
          transition: box-shadow 0.18s ease, border-color 0.18s ease, background 0.18s ease;
        }

        .card:hover {
          transform: translateY(0);
          border-color: #9db8e8;
          background: linear-gradient(180deg, #ffffff, #f1f6ff);
          box-shadow: 0 1px 0 rgba(255, 255, 255, 1) inset;
        }

        .card-kicker {
          margin: 0 0 6px;
          color: #64748b;
          font-size: 10px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .kicker-row {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 6px;
        }

        .kicker-row .card-kicker {
          margin: 0;
        }

        :global(.info-wrap) {
          position: relative;
          display: inline-flex;
          align-items: center;
        }

        :global(.info-dot) {
          width: 16px;
          height: 16px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #9eb6e1;
          color: #1f4aa8;
          background: #f4f8ff;
          font-size: 10px;
          font-weight: 700;
          line-height: 1;
          cursor: help;
          user-select: none;
          flex-shrink: 0;
          padding: 0;
        }

        :global(.info-tip) {
          position: absolute;
          left: 50%;
          top: calc(100% + 8px);
          transform: translateX(-50%);
          min-width: 220px;
          max-width: 280px;
          border: 1px solid #c9d7ef;
          background: #ffffff;
          color: #334155;
          border-radius: 10px;
          box-shadow: 0 10px 24px rgba(15, 23, 42, 0.12);
          padding: 8px 10px;
          font-size: 12px;
          line-height: 1.45;
          letter-spacing: 0;
          text-transform: none;
          opacity: 0;
          visibility: hidden;
          pointer-events: none;
          transition: opacity 0.15s ease, transform 0.15s ease, visibility 0.15s ease;
          z-index: 50;
        }

        :global(.info-tip.is-visible) {
          opacity: 1;
          visibility: visible;
          transform: translateX(-50%) translateY(0);
        }

        :global(.info-wrap:hover .info-dot),
        :global(.info-wrap:focus-within .info-dot) {
          border-color: #6f9add;
          background: #eaf1ff;
          color: #133a8d;
        }

        .card h4 {
          margin: 0 0 10px;
          color: #0f172a;
          font-family: var(--font-lexend), system-ui, sans-serif;
          font-size: clamp(20px, 1.8vw, 30px);
          line-height: 1.18;
          letter-spacing: -0.01em;
          font-weight: 740;
          text-wrap: balance;
        }

        .title-marquee {
          overflow: hidden;
          white-space: nowrap;
          text-wrap: nowrap;
        }

        .title-marquee-track {
          display: inline-flex;
          gap: 30px;
          min-width: max-content;
          animation: title-marquee-slide 20s linear infinite;
          will-change: transform;
        }

        .title-marquee:hover .title-marquee-track {
          animation-play-state: paused;
        }

        .title-marquee-text {
          white-space: nowrap;
        }

        @keyframes title-marquee-slide {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(calc(-50% - 15px));
          }
        }

        .card p,
        .card li {
          color: #1f2937;
          font-size: 14px;
          line-height: 1.68;
        }

        .card ul {
          margin: 0;
          padding-left: 18px;
          display: grid;
          gap: 6px;
        }

        .mini {
          margin: 12px 0 4px;
          color: #475569;
          font-size: 10px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .step {
          border-top: 1px solid #e2e9f6;
          margin-top: 10px;
          padding-top: 10px;
        }

        .step p {
          margin: 0 0 6px;
        }

        .muted {
          color: #475569;
        }

        .note {
          border: 1px solid #d3e0f4;
          border-radius: 10px;
          background: #eef5ff;
          padding: 10px;
          margin-top: 10px;
        }

        .bar {
          height: 6px;
          border-radius: 99px;
          background: #dce5f4;
          overflow: hidden;
        }

        .bar span {
          display: block;
          height: 100%;
          background: linear-gradient(90deg, #2563eb, #06b6d4);
          border-radius: 99px;
        }

        @media (min-width: 780px) {
          .day7-root {
            padding: 94px 24px 88px;
          }

          .day7-topbar {
            padding: 18px 24px;
          }

          .summary-strip {
            grid-template-columns: repeat(4, minmax(0, 1fr)) auto;
            align-items: end;
            gap: 14px;
          }

          .summary-task {
            grid-column: 1 / -1;
            margin-bottom: 4px;
            padding-bottom: 14px;
          }

          .cards-2 {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .cards-3 {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .cards-3 > :last-child {
            grid-column: 1 / -1;
          }

          .effort-grid {
            grid-template-columns: repeat(4, minmax(0, 1fr));
          }

          .hero-metrics {
            grid-template-columns: repeat(4, minmax(0, 1fr));
          }
        }

        @media (max-width: 779px) {
          .day7-root {
            padding: 86px 10px 32px;
          }

          .day7-shell {
            padding: 0 2px;
          }

          .day7-topbar {
            padding: 12px 10px;
            gap: 8px;
          }

          .hero-panel,
          .questions-panel,
          .loading-panel {
            border-radius: 12px;
            box-shadow: 0 6px 16px rgba(15, 23, 42, 0.06);
            padding: 18px 14px;
          }

          .hero-input-wrap {
            max-width: none;
            gap: 6px;
            padding: 4px;
          }

          .hero-input {
            font-size: 16px;
            padding: 11px 12px;
          }

          .primary-btn {
            padding: 10px 14px;
            font-size: 11px;
            letter-spacing: 0.06em;
          }

          .output-wrap {
            gap: 12px;
            padding: 0 2px;
          }

          .artifact-block {
            border-top: 1px solid #e4eaf6;
            padding-top: 8px;
          }

          .artifact-block h3 {
            margin: 2px 2px 8px;
          }

          .cards-2,
          .cards-3 {
            gap: 12px;
          }

          .card {
            border-radius: 10px;
            box-shadow: 0 1px 0 rgba(255, 255, 255, 0.94) inset;
            border-color: #dfe6f3;
            padding: 14px 12px;
          }

          .card h4 {
            font-size: 20px;
          }

          .summary-strip {
            gap: 8px;
            padding: 12px;
            border-radius: 12px;
          }

          .summary-meta p:last-child {
            font-size: 14px;
          }

          .hero-panel {
            min-height: calc(100vh - 120px);
          }

          .hero-strip-items {
            justify-content: flex-start;
          }

          .hero-strip-items span:nth-child(n + 3) {
            display: none;
          }

          .ghost-btn {
            grid-column: 1 / -1;
            width: 100%;
            text-align: center;
            color: #eaf0ff;
            border-color: rgba(210, 224, 248, 0.4);
          }
        }

        @media (max-width: 540px) {
          .top-link,
          .top-pill {
            font-size: 10px;
            padding: 7px 10px;
            letter-spacing: 0.06em;
          }

          .hero-title {
            font-size: clamp(34px, 11vw, 48px);
          }

          .hero-input-wrap {
            gap: 4px;
            padding: 4px;
          }

          .hero-input {
            padding: 10px 10px;
          }

          .primary-btn {
            padding: 10px 12px;
            font-size: 10px;
          }
        }

        @media (min-width: 1500px) {
          .cards-3 {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .cards-3 > :last-child {
            grid-column: auto;
          }
        }

        @media (min-width: 1500px) {
          .day7-root {
            padding-left: 32px;
            padding-right: 32px;
          }
        }
      `}</style>
    </main>
  );
}
