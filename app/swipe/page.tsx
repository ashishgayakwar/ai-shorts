"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { concepts } from "../../data/concepts.generated";

type Concept = (typeof concepts)[number];

type ParsedSummary = {
  whatItIs: string;
  howItWorks: string;
  whyItMatters: string;
};

/* -------------------------------
   SUMMARY SANITIZATION
--------------------------------*/
function normalizeSummary(input: string): string {
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
    } catch {}
  }

  s = s.replace(/\\n/g, "\n");
  s = s.replace(/[\s"'}`]+$/g, "").trim();

  return s;
}

/* -------------------------------
   PARSE THE 3 SECTIONS
--------------------------------*/
function parseSummary(summary: string): ParsedSummary {
  const sectionRegex = (label: string) =>
    new RegExp(`###\\s*${label}\\s*([\\s\\S]*?)(?=###|$)`, "i");

  const cleaned = summary;

  const whatMatch = cleaned.match(sectionRegex("What it is"));
  const howMatch = cleaned.match(sectionRegex("How it works"));
  const whyMatch = cleaned.match(sectionRegex("Why it matters"));

  const whatItIs = whatMatch?.[1]?.trim() ?? "";
  const howItWorks = howMatch?.[1]?.trim() ?? "";
  const whyItMatters = whyMatch?.[1]?.trim() ?? "";

  if (!whatItIs && !howItWorks && !whyItMatters) {
    return {
      whatItIs: cleaned,
      howItWorks: "",
      whyItMatters: "",
    };
  }

  return { whatItIs, howItWorks, whyItMatters };
}

/* -------------------------------
   RENDER PARAGRAPHS
--------------------------------*/
function renderParagraphs(text: string) {
  return text
    .split(/\n{2,}/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((para, i) => <p key={i}>{para}</p>);
}

/* -------------------------------
   MAIN COMPONENT
--------------------------------*/
export default function SwipePage() {
  const [index, setIndex] = useState(0);

  const total = concepts.length;
  const concept = concepts[index] as Concept | undefined;

  const handleNext = () => index < total - 1 && setIndex(index + 1);
  const handlePrev = () => index > 0 && setIndex(index - 1);

  if (!concept) {
    return (
      <main className="ai-shorts-center-text">
        <div style={{ textAlign: "center" }}>
          <div style={{ marginBottom: 6 }}>🎓 You’re all caught up.</div>
          <div style={{ fontSize: 12 }}>
            Add more topics in <code>data/concepts.generated.ts</code>
          </div>
        </div>
      </main>
    );
  }

  const normalized = normalizeSummary(concept.summary);
  const sections = parseSummary(normalized);

  // Clean unwanted suffix from titles
  const cleanTitle = concept.title.replace("· foundation topic", "").trim();

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

        <div className="ai-shorts-chip">
          <span className="ai-shorts-chip-dot" />
          <span>Live · Swipe to learn</span>
        </div>
      </header>

      {/* HERO */}
      <div className="ai-shorts-hero">
        <h1 className="ai-shorts-hero-title">AI Concepts</h1>
        <p className="ai-shorts-hero-sub">Learn one swipe at a time</p>
      </div>

      {/* PROGRESS */}
      <div className="ai-shorts-progress-row">
        <div className="progress-dots">
          {concepts.map((_, i) => (
            <div
              key={i}
              className={"progress-dot" + (i === index ? " active" : "")}
            />
          ))}
        </div>
      </div>

      {/* CARD + NAV */}
      <main className="ai-shorts-main">
        <div className="card-stack-wrapper">

          {/* CARD */}
      <AnimatePresence mode="wait">
  <motion.div
    key={index}
    className="swipe-card"
    initial={{ opacity: 0, y: 14, scale: 0.97 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, y: -14, scale: 0.97 }}
    transition={{ duration: 0.22, ease: "easeOut" }}
  >
    <div className="swipe-card-inner">
      {/* STICKY HEADER INSIDE THE SCROLL AREA */}
      <div className="swipe-card-header">
        <div className="swipe-card-meta-row">
          <span className="swipe-card-tag">Today’s concept</span>
          <span className="swipe-card-count">
            {index + 1} / {total}
          </span>
        </div>

        <div className="swipe-card-title">
          {concept.title.replace("· foundation topic", "").trim()}
        </div>
      </div>

      {/* SECTION 1 */}
      <div className="swipe-card-section">
        <div className="swipe-card-section-title">WHAT IT IS</div>
        <div className="swipe-card-summary">
          {renderParagraphs(sections.whatItIs)}
        </div>
      </div>

      {/* SECTION 2 */}
      <div className="swipe-card-section">
        <div className="swipe-card-section-title">HOW IT WORKS</div>
        <div className="swipe-card-summary">
          {renderParagraphs(sections.howItWorks)}
        </div>
      </div>

      {/* SECTION 3 */}
      <div className="swipe-card-section">
        <div className="swipe-card-section-title">WHY IT MATTERS</div>
        <div className="swipe-card-summary">
          {renderParagraphs(sections.whyItMatters)}
        </div>
      </div>
    </div>
  </motion.div>
</AnimatePresence>


          {/* FIXED NAVIGATION */}
          <div className="swipe-global-footer">
            <div className="swipe-nav">
              <button
                className="swipe-nav-btn"
                onClick={handlePrev}
                disabled={index === 0}
              >
                ← Previous
              </button>

              <button
                className="swipe-nav-btn"
                onClick={handleNext}
                disabled={index === total - 1}
              >
                Next →
              </button>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
