"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { concepts as baseConcepts } from "../../data/concepts";
import { concepts as generatedConcepts } from "../../data/concepts.generated";
import { getComparison } from "../../lib/getComparison";

/* -------------------------------------------------------
   SUMMARY HELPERS (same logic as swipe page)
------------------------------------------------------- */

type ParsedSummary = {
  whatItIs: string;
  howItWorks: string;
  whyItMatters: string;
};

function normalizeSummary(input: string): string {
  if (!input) return "";
  let s = input.trim();

  // Strip ``` fences if present
  if (s.startsWith("```")) {
    s = s.replace(/^```[a-zA-Z0-9]*\s*/m, "");
    s = s.replace(/```$/m, "");
    s = s.trim();
  }

  // If it's a JSON-wrapped object with { summary: ... }
  if (s.startsWith("{") && s.endsWith("}")) {
    try {
      const obj = JSON.parse(s);
      if (obj && typeof obj.summary === "string") {
        s = obj.summary;
      }
    } catch {
      // ignore JSON parse error and keep original
    }
  }

  // Replace escaped newlines and trim again
  s = s.replace(/\\n/g, "\n").trim();

  return s;
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
    return {
      whatItIs: summary,
      howItWorks: "",
      whyItMatters: "",
    };
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

/* -------------------------------------------------------
   MAP TOPIC -> GENERATED CONCEPT
------------------------------------------------------- */

const generatedByTopic: Record<string, any> = Object.fromEntries(
  generatedConcepts.map((c: any) => [c.topic, c])
);

/* -------------------------------------------------------
   SEARCHABLE DROPDOWN COMPONENT
------------------------------------------------------- */

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
  placeholder = "Search concept…",
}: ConceptSearchSelectProps) {
  const [query, setQuery] = useState(value || "");
  const [open, setOpen] = useState(false);

  // Keep local query in sync with external value
  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  const lowerQuery = query.toLowerCase();
  const filtered =
    lowerQuery.length === 0
      ? topics
      : topics.filter((t) => t.toLowerCase().includes(lowerQuery));

  return (
    <div className="block text-xs font-medium text-gray-300">
      {label}
      <div className="mt-1 relative">
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/70"
          placeholder={placeholder}
        />
        {open && (
          <div className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-white/10 bg-black/90 backdrop-blur-sm">
            {filtered.length === 0 && (
              <div className="px-3 py-2 text-xs text-gray-400">
                No concepts match “{query}”.
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
                className="block w-full text-left px-3 py-2 text-xs text-gray-100 hover:bg-white/10"
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

/* -------------------------------------------------------
   MAIN PAGE
------------------------------------------------------- */

export default function ComparePage() {
  const [topicA, setTopicA] = useState<string>("");
  const [topicB, setTopicB] = useState<string>("");

  const comparison =
    topicA && topicB ? getComparison(topicA, topicB) : undefined;
  const relationText = comparison?.relation;

  // Per-topic summaries (one-time content)
  const conceptA = topicA ? generatedByTopic[topicA] : undefined;
  const conceptB = topicB ? generatedByTopic[topicB] : undefined;

  const parsedA: ParsedSummary | null = conceptA
    ? parseSummary(normalizeSummary(conceptA.summary ?? ""))
    : null;

  const parsedB: ParsedSummary | null = conceptB
    ? parseSummary(normalizeSummary(conceptB.summary ?? ""))
    : null;

  const hasSelection = topicA && topicB;

  const topicOptions = baseConcepts.map((c: any) => c.topic);

  return (
    <div className="ai-shorts-shell">
      {/* HEADER */}
      <header className="ai-shorts-topbar">
        <div className="ai-shorts-brand">
          <div className="ai-shorts-brand-title">AI SHORTS</div>
          <div className="ai-shorts-brand-subtitle">
            150-word primers for busy PMs
          </div>
        </div>

        <div className="ai-shorts-header-actions-row">
          {/* <div className="ai-shorts-chip">
            <span className="ai-shorts-chip-dot" />
            <span>Live · Compare mode</span>
          </div> */}

          <Link href="/swipe" className="mode-toggle-btn">
            ← Back to swipe
          </Link>
        </div>
      </header>

      {/* HERO */}
      <div className="ai-shorts-hero">
        <h1 className="ai-shorts-hero-title">Compare Concepts</h1>
        <p className="ai-shorts-hero-sub">
          One-time explainer per concept, plus an optional relational layer.
        </p>
      </div>

      {/* MAIN */}
      <main className="ai-shorts-main">
        <div className="card-stack-wrapper">
          <div className="swipe-card">
            <div className="swipe-card-inner">
              {/* CARD HEADER */}
              <div className="swipe-card-header">
                <div className="swipe-card-meta-row">
                  <span className="swipe-card-tag">Concept comparison</span>
                </div>

                <div className="swipe-card-title text-xl md:text-2xl">
                  {hasSelection
                    ? `${topicA} vs ${topicB}`
                    : "Pick two concepts to compare"}
                </div>
              </div>

              {/* SELECTORS */}
              <div className="swipe-card-section">
                <div className="swipe-card-section-title">SELECT CONCEPTS</div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ConceptSearchSelect
                    label="Choose Concept A"
                    value={topicA}
                    onChange={setTopicA}
                    topics={topicOptions}
                    placeholder="Search Concept A…"
                  />

                  <ConceptSearchSelect
                    label="Choose Concept B"
                    value={topicB}
                    onChange={setTopicB}
                    topics={topicOptions}
                    placeholder="Search Concept B…"
                  />
                </div>
              </div>

              {/* EMPTY STATE */}
              {!hasSelection && (
                <div className="swipe-card-section">
                  <div className="swipe-card-summary text-sm text-gray-300">
                    Choose any two topics above. The left and right columns reuse
                    the same one-time “What / How / Why it matters” explainer
                    you already generated, and we optionally add a relational
                    layer if it exists.
                  </div>
                </div>
              )}

              {/* AUTO COMPARISON FROM PER-TOPIC SUMMARIES */}
              {hasSelection && (
                <>
                  {/* WHAT IT IS */}
                  <div className="swipe-card-section">
                    <div className="swipe-card-section-title">WHAT IT IS</div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                      <div className="rounded-xl border border-white/12 bg-white/5 px-4 py-3 text-sm text-gray-100 backdrop-blur-sm">
                        <div className="font-semibold mb-1 text-gray-50">
                          {topicA}
                        </div>
                        <div className="space-y-2">
                          {parsedA
                            ? renderParagraphs(parsedA.whatItIs)
                            : "No summary available for this concept yet."}
                        </div>
                      </div>

                      <div className="rounded-xl border border-white/12 bg-white/5 px-4 py-3 text-sm text-gray-100 backdrop-blur-sm">
                        <div className="font-semibold mb-1 text-gray-50">
                          {topicB}
                        </div>
                        <div className="space-y-2">
                          {parsedB
                            ? renderParagraphs(parsedB.whatItIs)
                            : "No summary available for this concept yet."}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* HOW IT WORKS */}
                  <div className="swipe-card-section">
                    <div className="swipe-card-section-title">HOW IT WORKS</div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                      <div className="rounded-xl border border-white/12 bg-white/5 px-4 py-3 text-sm text-gray-100 backdrop-blur-sm">
                        <div className="font-semibold mb-1 text-gray-50">
                          {topicA}
                        </div>
                        <div className="space-y-2">
                          {parsedA
                            ? renderParagraphs(parsedA.howItWorks)
                            : "No summary available for this concept yet."}
                        </div>
                      </div>

                      <div className="rounded-xl border border-white/12 bg-white/5 px-4 py-3 text-sm text-gray-100 backdrop-blur-sm">
                        <div className="font-semibold mb-1 text-gray-50">
                          {topicB}
                        </div>
                        <div className="space-y-2">
                          {parsedB
                            ? renderParagraphs(parsedB.howItWorks)
                            : "No summary available for this concept yet."}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* WHY IT MATTERS */}
                  <div className="swipe-card-section">
                    <div className="swipe-card-section-title">
                      WHY IT MATTERS
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                      <div className="rounded-xl border border-white/12 bg-white/5 px-4 py-3 text-sm text-gray-100 backdrop-blur-sm">
                        <div className="font-semibold mb-1 text-gray-50">
                          {topicA}
                        </div>
                        <div className="space-y-2">
                          {parsedA
                            ? renderParagraphs(parsedA.whyItMatters)
                            : "No summary available for this concept yet."}
                        </div>
                      </div>

                      <div className="rounded-xl border border-white/12 bg-white/5 px-4 py-3 text-sm text-gray-100 backdrop-blur-sm">
                        <div className="font-semibold mb-1 text-gray-50">
                          {topicB}
                        </div>
                        <div className="space-y-2">
                          {parsedB
                            ? renderParagraphs(parsedB.whyItMatters)
                            : "No summary available for this concept yet."}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* RELATION LAYER */}
                  <div className="swipe-card-section">
                    <div className="swipe-card-section-title">
                      HOW THEY RELATE
                    </div>

                    {relationText ? (
                      <div className="mt-3 rounded-xl border border-blue-400/25 bg-blue-500/15 px-4 py-3 text-sm leading-relaxed text-blue-50 backdrop-blur-sm">
                        {relationText}
                      </div>
                    ) : (
                      <div className="mt-3 rounded-xl border border-white/12 bg-white/5 px-4 py-3 text-xs leading-relaxed text-gray-300 backdrop-blur-sm">
                        No curated relation for this pair yet. You’re still
                        seeing a clean A vs B comparison using each concept’s
                        own “What / How / Why”, but the relational narrative
                        hasn’t been authored or generated for this pair.
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
