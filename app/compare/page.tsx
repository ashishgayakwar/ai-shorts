"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

import { concepts as baseConcepts } from "../../data/concepts";
import { concepts as generatedConcepts } from "../../data/concepts.generated";
import { getComparison } from "../../lib/getComparison";

type ParsedSummary = {
  whatItIs: string;
  howItWorks: string;
  whyItMatters: string;
};

type GeneratedConcept = (typeof generatedConcepts)[number];

function normalizeSummary(input: string): string {
  if (!input) return "";
  let s = input.trim();

  if (s.startsWith("```")) {
    s = s.replace(/^```[a-zA-Z0-9]*\s*/m, "");
    s = s.replace(/```$/m, "");
    s = s.trim();
  }

  if (s.startsWith("{") && s.endsWith("}")) {
    try {
      const obj = JSON.parse(s);
      if (obj && typeof obj.summary === "string") {
        s = obj.summary;
      }
    } catch {
      // ignore parse errors and keep original summary
    }
  }

  return s.replace(/\\n/g, "\n").trim();
}

function parseSummary(summary: string): ParsedSummary {
  const sectionRegex = (label: string) =>
    new RegExp(`###\\s*${label}\\s*([\\s\\S]*?)(?=###|$)`, "i");

  const whatMatch = summary.match(sectionRegex("What it is"));
  const howMatch = summary.match(sectionRegex("How it works"));
  const whyMatch = summary.match(sectionRegex("Why it matters"));

  const whatItIs = whatMatch?.[1]?.trim() ?? "";
  const howItWorks = howMatch?.[1]?.trim() ?? "";
  const whyItMatters = whyMatch?.[1]?.trim() ?? "";

  if (!whatItIs && !howItWorks && !whyItMatters) {
    return { whatItIs: summary, howItWorks: "", whyItMatters: "" };
  }

  return { whatItIs, howItWorks, whyItMatters };
}

function renderParagraphs(text: string) {
  if (!text) return null;
  return text
    .split(/\n{2,}/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((para, i) => <p key={i}>{para}</p>);
}

const generatedByTopic: Record<string, GeneratedConcept> = Object.fromEntries(
  generatedConcepts.map((c) => [c.topic, c])
);

type ConceptSearchSelectProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  topics: string[];
  placeholder?: string;
};

function ConceptSearchSelect({
  label,
  value,
  onChange,
  topics,
  placeholder = "Search concept...",
}: ConceptSearchSelectProps) {
  const [query, setQuery] = useState(value || "");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const lowerQuery = query.toLowerCase();
  const filtered =
    lowerQuery.length === 0
      ? topics.slice(0, 60)
      : topics
          .filter((t) => t.toLowerCase().includes(lowerQuery))
          .slice(0, 60);

  return (
    <div ref={rootRef} className="block text-xs font-medium text-gray-300">
      <div className="mb-1.5 uppercase tracking-[0.1em] text-[10px] text-slate-400">
        {label}
      </div>

      <div className="relative">
        <input
          value={query}
          onChange={(e) => {
            const next = e.target.value;
            setQuery(next);
            setOpen(true);

            if (next.trim().length === 0 && value) {
              onChange("");
            }
          }}
          onFocus={() => setOpen(true)}
          className="w-full rounded-xl border border-white/20 bg-white/[0.06] px-3 py-2.5 pr-9 text-sm text-white outline-none transition focus:border-cyan-300/70 focus:bg-white/[0.09]"
          placeholder={placeholder}
        />

        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              onChange("");
              setOpen(false);
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-1.5 py-0.5 text-[11px] text-slate-400 transition hover:bg-white/10 hover:text-slate-200"
            aria-label={`Clear ${label}`}
          >
            Clear
          </button>
        )}

        {open && (
          <div className="absolute z-20 mt-1.5 max-h-64 w-full overflow-y-auto rounded-xl border border-white/15 bg-black/90 p-1 backdrop-blur-md">
            {filtered.length === 0 && (
              <div className="px-3 py-2 text-xs text-gray-400">
                No concepts match &quot;{query}&quot;.
              </div>
            )}

            {filtered.map((topic) => (
              <button
                key={topic}
                type="button"
                onClick={() => {
                  onChange(topic);
                  setQuery(topic);
                  setOpen(false);
                }}
                className="block w-full rounded-lg px-3 py-2 text-left text-xs text-gray-100 transition hover:bg-white/10"
              >
                {topic}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

type SectionColumnsProps = {
  title: string;
  topicA: string;
  topicB: string;
  textA: string;
  textB: string;
};

function SectionColumns({ title, topicA, topicB, textA, textB }: SectionColumnsProps) {
  return (
    <div className="swipe-card-section">
      <div className="swipe-card-section-title">{title}</div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
        <div className="rounded-2xl border border-cyan-300/20 bg-cyan-400/[0.06] px-4 py-3.5 text-sm text-gray-100 backdrop-blur-sm">
          <div className="mb-2 inline-flex rounded-full border border-cyan-300/35 bg-cyan-400/15 px-2.5 py-0.5 text-[11px] font-semibold text-cyan-100">
            {topicA}
          </div>
          <div className="space-y-2 text-[13px] leading-6 text-slate-100/95">
            {renderParagraphs(textA || "No summary available for this concept yet.")}
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-300/20 bg-emerald-400/[0.06] px-4 py-3.5 text-sm text-gray-100 backdrop-blur-sm">
          <div className="mb-2 inline-flex rounded-full border border-emerald-300/35 bg-emerald-400/15 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-100">
            {topicB}
          </div>
          <div className="space-y-2 text-[13px] leading-6 text-slate-100/95">
            {renderParagraphs(textB || "No summary available for this concept yet.")}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ComparePage() {
  const [topicA, setTopicA] = useState<string>("");
  const [topicB, setTopicB] = useState<string>("");

  const topicOptions = useMemo(
    () => baseConcepts.map((c) => c.topic).sort((a, b) => a.localeCompare(b)),
    []
  );

  const comparison = topicA && topicB ? getComparison(topicA, topicB) : undefined;
  const relationText = comparison?.relation;

  const conceptA = topicA ? generatedByTopic[topicA] : undefined;
  const conceptB = topicB ? generatedByTopic[topicB] : undefined;

  const parsedA: ParsedSummary | null = conceptA
    ? parseSummary(normalizeSummary(conceptA.summary ?? ""))
    : null;

  const parsedB: ParsedSummary | null = conceptB
    ? parseSummary(normalizeSummary(conceptB.summary ?? ""))
    : null;

  const hasSelection = Boolean(topicA && topicB);

  return (
    <div className="ai-shorts-shell">
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
          <span className="ai-header-pill ai-header-pill-active">Compare</span>
          <Link href="/interview" className="ai-header-pill">
            Interview
          </Link>
          <Link href="/" className="ai-header-pill">
            Home
          </Link>
        </div>

        <details className="ai-shorts-mobile-menu">
          <summary>Menu</summary>
          <div className="ai-shorts-mobile-menu-panel">
            <Link href="/swipe" className="ai-header-pill">Cards</Link>
            <Link href="/swipe?mode=visualize" className="ai-header-pill">Visualize</Link>
            <span className="ai-header-pill ai-header-pill-active">Compare</span>
            <Link href="/interview" className="ai-header-pill">Interview</Link>
            <Link href="/" className="ai-header-pill">Home</Link>
          </div>
        </details>
      </header>

      <div className="ai-shorts-hero">
        <h1 className="ai-shorts-hero-title">Compare Concepts</h1>
        <p className="ai-shorts-hero-sub">
          Pick two AI topics and review them side-by-side with a clean relational summary.
        </p>
      </div>

      <main className="ai-shorts-main">
        <div className="card-stack-wrapper">
          <div className="swipe-card">
            <div className="swipe-card-inner">
              <div className="swipe-card-header">
                <div className="swipe-card-meta-row">
                  <span className="swipe-card-tag">Concept comparison</span>
                  {hasSelection && (
                    <span className="swipe-card-count">{topicA} vs {topicB}</span>
                  )}
                </div>

                <div className="swipe-card-title text-xl md:text-2xl">
                  {hasSelection ? "Side-by-side concept breakdown" : "Pick two concepts to compare"}
                </div>
              </div>

              <div className="swipe-card-section">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="swipe-card-section-title !mb-0">SELECT CONCEPTS</div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setTopicA("");
                        setTopicB("");
                      }}
                      disabled={!topicA && !topicB}
                      className="rounded-full border border-white/20 bg-white/5 px-3 py-1 text-[11px] font-medium text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Clear all
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <ConceptSearchSelect
                    label="Concept A"
                    value={topicA}
                    onChange={setTopicA}
                    topics={topicOptions.filter((t) => t !== topicB)}
                    placeholder="Search concept A..."
                  />

                  <ConceptSearchSelect
                    label="Concept B"
                    value={topicB}
                    onChange={setTopicB}
                    topics={topicOptions.filter((t) => t !== topicA)}
                    placeholder="Search concept B..."
                  />
                </div>
              </div>

              {!hasSelection && (
                <div className="swipe-card-section">
                  <div className="rounded-xl border border-white/12 bg-white/[0.04] px-4 py-3 text-sm leading-6 text-slate-300">
                    Choose two concepts to unlock side-by-side comparison in three layers:
                    <span className="text-slate-100"> what it is, how it works, and why it matters.</span>
                  </div>
                </div>
              )}

              {hasSelection && (
                <>
                  <SectionColumns
                    title="WHAT IT IS"
                    topicA={topicA}
                    topicB={topicB}
                    textA={parsedA?.whatItIs ?? ""}
                    textB={parsedB?.whatItIs ?? ""}
                  />

                  <SectionColumns
                    title="HOW IT WORKS"
                    topicA={topicA}
                    topicB={topicB}
                    textA={parsedA?.howItWorks ?? ""}
                    textB={parsedB?.howItWorks ?? ""}
                  />

                  <SectionColumns
                    title="WHY IT MATTERS"
                    topicA={topicA}
                    topicB={topicB}
                    textA={parsedA?.whyItMatters ?? ""}
                    textB={parsedB?.whyItMatters ?? ""}
                  />

                  <div className="swipe-card-section">
                    <div className="swipe-card-section-title">HOW THEY RELATE</div>

                    {relationText ? (
                      <div className="rounded-2xl border border-blue-400/25 bg-blue-500/15 px-4 py-3 text-sm leading-relaxed text-blue-50 backdrop-blur-sm">
                        {relationText}
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-white/12 bg-white/5 px-4 py-3 text-xs leading-relaxed text-gray-300 backdrop-blur-sm">
                        No curated relation exists for this pair yet. You still get a full side-by-side
                        concept comparison from the generated summaries.
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
