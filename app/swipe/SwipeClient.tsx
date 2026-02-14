"use client";

import React, { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";

import { concepts as baseConcepts } from "@/data/concepts";
import { concepts as generatedConcepts } from "@/data/concepts.generated";
import { MODULE_META } from "@/data/modules";
import { quizLevels } from "@/data/quizLevels";
import { visualTopics } from "@/data/visualTopics";
import type { VisualTopic } from "@/data/visualTopics";

const SWIPE_THRESHOLD = 80; // px left/right to trigger card change

// ✅ TS-safe wrapper so we can index with a number
const MODULE_META_TYPED: Record<number, string> = MODULE_META as Record<
  number,
  string
>;

type BaseConcept = (typeof baseConcepts)[number];
type Concept = {
  topic: string;
  title?: string;
  summary?: string;
  module?: BaseConcept["module"];
};

type ParsedSummary = {
  whatItIs: string;
  howItWorks: string;
  whyItMatters: string;
};
type SwipeMode = "cards" | "quiz" | "visualize";

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/* -------------------------------------------------------
   MERGE GENERATED + BASE (to bring module onto concepts)
------------------------------------------------------- */

const generatedByTopic: Record<string, Concept> = Object.fromEntries(
  generatedConcepts.map((c) => [c.topic, c as Concept])
);

// Ordered list driven by data/concepts.ts but merged with module
const orderedConcepts: Concept[] = baseConcepts
  .map((base) => {
    const gen = generatedByTopic[base.topic];
    if (!gen) return undefined;
    return {
      ...gen,
      module: base.module,
    };
  })
  .filter(Boolean) as Concept[];

const orderedConceptSlugs = orderedConcepts.map((c) => slugify(c.topic));
const indexBySlug: Record<string, number> = Object.fromEntries(
  orderedConceptSlugs.map((slug, idx) => [slug, idx])
);

// Build module options (1, 2, 3...) with names
const moduleOptions = Array.from(
  new Set(
    baseConcepts
      .map((c) => c.module)
      .filter((m): m is number => typeof m === "number")
  )
)
  .sort((a, b) => a - b)
  .map((m) => ({
    value: m,
    label: MODULE_META_TYPED[m]
      ? `Module ${m}: ${MODULE_META_TYPED[m]}`
      : `Module ${m}`,
  }));

/* -------------------------------------------------------
   NORMALIZE SUMMARY
------------------------------------------------------- */
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

/* -------------------------------------------------------
   PARSE SUMMARY (WHAT / HOW / WHY)
------------------------------------------------------- */
function parseSummary(summary: string): ParsedSummary {
  const sectionRegex = (label: string) =>
    new RegExp(`###\\s*${label}\\s*([\\s\\S]*?)(?=###|$)`, "i");

  const whatMatch = summary.match(sectionRegex("What it is"));
  const howMatch = summary.match(sectionRegex("How it works"));
  const whyMatch = summary.match(sectionRegex("Why it matters"));

  const whatItIs = whatMatch?.[1]?.trim() ?? "";
  const howItWorks = howMatch?.[1]?.trim() ?? "";
  const whyItMatters = whyMatch?.[1]?.trim() ?? "";

  // If parsing fails, fall back to single block
  if (!whatItIs && !howItWorks && !whyItMatters) {
    return {
      whatItIs: summary,
      howItWorks: "",
      whyItMatters: "",
    };
  }

  return { whatItIs, howItWorks, whyItMatters };
}

/* -------------------------------------------------------
   RENDER PARAGRAPHS
------------------------------------------------------- */
function renderParagraphs(text: string) {
  if (!text) return null;
  return text
    .split(/\n{2,}/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((para, i) => <p key={i}>{para}</p>);
}

/* -------------------------------------------------------
   MAIN COMPONENT
------------------------------------------------------- */
export default function SwipeClient(
  { initialSlug, initialMode = "cards" }: { initialSlug?: string; initialMode?: SwipeMode }
) {
  const router = useRouter();
  const [mode, setMode] = useState<SwipeMode>(initialMode);
  const initialIndex = useMemo(() => {
    if (!initialSlug) return 0;
    return indexBySlug[initialSlug] ?? 0;
  }, [initialSlug]);

  /* CARD MODE STATE */
  const [index, setIndex] = useState(initialIndex);
  const total = orderedConcepts.length;
  const concept: Concept | undefined = orderedConcepts[index];
  const selectedModule: "all" | number =
    typeof concept?.module === "number" ? concept.module : "all";

  /* TOUCH SWIPE STATE (for cards) */
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);

  /* QUIZ MODE STATE */
  const [currentLevel, setCurrentLevel] =
    useState<"level1" | "level2" | "level3">("level1");
  const [quizIndex, setQuizIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [score, setScore] = useState(0);

  const questions = quizLevels[currentLevel];
  const totalQuestions = questions.length;
  const currentQuestion = questions[quizIndex];

  /* VISUALIZE MODE STATE */
  const [visualIndex, setVisualIndex] = useState(0);
  const visualTotal = visualTopics.length;
  const visualTopic: VisualTopic | undefined = visualTopics[visualIndex];

  /* ---------------------------------
     QUIZ HANDLERS
  --------------------------------- */
  function selectLevel(level: "level1" | "level2" | "level3") {
    setCurrentLevel(level);
    setQuizIndex(0);
    setSelectedOption(null);
    setShowAnswer(false);
    setScore(0);
  }

  function handleSubmitAnswer() {
    if (selectedOption === null) return;

    if (selectedOption === currentQuestion.correctIndex) {
      setScore((s) => s + 1);
    }
    setShowAnswer(true);
  }

  function handleNextQuestion() {
    if (quizIndex < totalQuestions - 1) {
      setQuizIndex((i) => i + 1);
      setSelectedOption(null);
      setShowAnswer(false);
    }
  }

  function handleRestartQuiz() {
    setQuizIndex(0);
    setScore(0);
    setSelectedOption(null);
    setShowAnswer(false);
  }

  /* ---------------------------------
     VISUALIZE HANDLERS
  --------------------------------- */
  const handleNextVisual = () =>
    visualIndex < visualTotal - 1 && setVisualIndex(visualIndex + 1);

  const handlePrevVisual = () =>
    visualIndex > 0 && setVisualIndex(visualIndex - 1);

  const goToCard = useCallback(
    (nextIndex: number) => {
      if (nextIndex < 0 || nextIndex >= total) return;
      const slug = orderedConceptSlugs[nextIndex];
      if (!slug) return;

      setIndex(nextIndex);
      router.push(`/swipe/${slug}`, { scroll: false });
    },
    [router, total]
  );

  /* ---------------------------------
     CARD NAV HANDLERS
  --------------------------------- */
  const handleNextCard = () => {
    if (index < total - 1) {
      goToCard(index + 1);
    }
  };

  const handlePrevCard = () => {
    if (index > 0) {
      goToCard(index - 1);
    }
  };

  /* ---------------------------------
     MODULE DROPDOWN HANDLER
  --------------------------------- */
  function handleModuleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value;
    if (value === "all") {
      goToCard(0);
      return;
    }

    const moduleNumber = Number(value);

    const firstIndex = orderedConcepts.findIndex(
      (c) => c.module === moduleNumber
    );

    if (firstIndex !== -1) {
      goToCard(firstIndex);
    }
  }

  /* ---------------------------------
     TOUCH HANDLERS FOR CARD SWIPE
  --------------------------------- */
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 1) {
      setTouchStartX(e.touches[0].clientX);
      setTouchEndX(null);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 1) {
      setTouchEndX(e.touches[0].clientX);
    }
  };

  const handleTouchEnd = () => {
    if (touchStartX === null || touchEndX === null) {
      setTouchStartX(null);
      setTouchEndX(null);
      return;
    }

    const deltaX = touchEndX - touchStartX;

    if (deltaX < -SWIPE_THRESHOLD) {
      handleNextCard();
    } else if (deltaX > SWIPE_THRESHOLD) {
      handlePrevCard();
    }

    setTouchStartX(null);
    setTouchEndX(null);
  };

  /* =======================================================
     QUIZ MODE UI
  ======================================================= */
  if (mode === "quiz") {
    const explanation = currentQuestion.explanation?.trim() ?? "";
    const progressPercent = ((quizIndex + 1) / totalQuestions) * 100;

    return (
      <div className="ai-shorts-shell">
        {/* HEADER */}
        <header className="ai-shorts-topbar relative">
          <div className="absolute right-4 top-4 flex items-center gap-3 text-xs">
            <button
              className="text-zinc-400 hover:text-zinc-200"
              onClick={() => setMode("cards")}
            >
              Cards
            </button>
            <Link href="/" className="text-zinc-400 hover:text-zinc-200">
              Home
            </Link>
          </div>

          <div className="ai-shorts-brand">
            <div className="ai-shorts-brand-title">AI SHORTS</div>
            <div className="ai-shorts-brand-subtitle">
              150-word primers for busy PMs
            </div>
          </div>

        </header>

        {/* QUIZ AREA */}
        <main className="ai-shorts-main">
          <div className="quiz-container">
            {/* LEVEL SELECTOR */}
            <div className="quiz-level-selector">
              <button
                className={currentLevel === "level1" ? "active" : ""}
                onClick={() => selectLevel("level1")}
              >
                Level 1
              </button>
              <button
                className={currentLevel === "level2" ? "active" : ""}
                onClick={() => selectLevel("level2")}
              >
                Level 2
              </button>
              <button
                className={currentLevel === "level3" ? "active" : ""}
                onClick={() => selectLevel("level3")}
              >
                Level 3
              </button>
            </div>

            {/* QUIZ CARD */}
            <div className="quiz-card">
              <div className="quiz-meta-row">
                <div className="quiz-qcount">
                  Question {quizIndex + 1} / {totalQuestions}
                </div>
                <div className="quiz-live-score">Score: {score}</div>
              </div>
              <div className="quiz-progress-track" aria-hidden="true">
                <div
                  className="quiz-progress-fill"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <div className="quiz-question">{currentQuestion.question}</div>

              <div className="quiz-options">
                {currentQuestion.options.map((opt, i) => {
                  const isCorrect = currentQuestion.correctIndex === i;
                  const isSelected = selectedOption === i;

                  let cls = "quiz-option";
                  if (showAnswer) {
                    if (isCorrect) cls += " correct";
                    else if (isSelected) cls += " wrong";
                  } else if (isSelected) {
                    cls += " selected";
                  }

                  const optionLetter = String.fromCharCode(65 + i);

                  return (
                    <button
                      key={i}
                      className={cls}
                      onClick={() => !showAnswer && setSelectedOption(i)}
                      disabled={showAnswer}
                      aria-pressed={isSelected}
                    >
                      <span className="quiz-option-label">{optionLetter}</span>
                      <span className="quiz-option-text">{opt}</span>
                      {showAnswer && isCorrect && (
                        <span className="quiz-option-state">✓</span>
                      )}
                      {showAnswer && !isCorrect && isSelected && (
                        <span className="quiz-option-state">✕</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* EXPLANATION */}
              {showAnswer && explanation && (
                <div className="quiz-explanation">{explanation}</div>
              )}

              {/* FOOTER BUTTONS */}
              <div className="quiz-footer-row">
                <button
                  className="quiz-secondary-btn"
                  onClick={handleRestartQuiz}
                >
                  Restart quiz
                </button>

                {!showAnswer ? (
                  <button
                    className="quiz-primary-btn"
                    disabled={selectedOption === null}
                    onClick={handleSubmitAnswer}
                  >
                    Check answer
                  </button>
                ) : quizIndex < totalQuestions - 1 ? (
                  <button
                    className="quiz-primary-btn"
                    onClick={handleNextQuestion}
                  >
                    Next question →
                  </button>
                ) : (
                  <button
                    className="quiz-primary-btn"
                    onClick={handleRestartQuiz}
                  >
                    Restart
                  </button>
                )}
              </div>

              {/* FINAL SCORE */}
              {showAnswer && quizIndex === totalQuestions - 1 && (
                <div className="quiz-score">
                  Score: {score} / {totalQuestions}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  /* =======================================================
     VISUALIZE MODE UI
  ======================================================= */
  if (mode === "visualize" && visualTopic) {
    return (
      <div className="ai-shorts-shell">
        {/* HEADER */}
        <header className="ai-shorts-topbar relative">
          <div className="absolute right-4 top-4 flex items-center gap-3 text-xs">
            <button
              className="text-zinc-400 hover:text-zinc-200"
              onClick={() => setMode("cards")}
            >
              Cards
            </button>
            <Link href="/" className="text-zinc-400 hover:text-zinc-200">
              Home
            </Link>
          </div>

          <div className="ai-shorts-brand">
            <div className="ai-shorts-brand-title">AI SHORTS</div>
            <div className="ai-shorts-brand-subtitle">
              150-word primers for busy PMs
            </div>
          </div>

        </header>

        {/* HERO */}
        <div className="ai-shorts-hero">
          <h1 className="ai-shorts-hero-title">Visualize Concepts</h1>
          <p className="ai-shorts-hero-sub">Understand AI with diagrams</p>
        </div>

        {/* CARD + NAV */}
        <main className="ai-shorts-main">
          <div className="card-stack-wrapper">
            <AnimatePresence mode="wait">
              <motion.div
                key={visualTopic.id + visualIndex}
                className="swipe-card"
                initial={{ opacity: 0, y: 14, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -14, scale: 0.97 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
              >
                <div className="swipe-card-inner">
                  <div className="swipe-card-header">
                    <div className="swipe-card-meta-row">
                      <span className="swipe-card-tag">Today’s visual</span>
                      <span className="swipe-card-count">
                        {visualIndex + 1} / {visualTotal}
                      </span>
                    </div>

                    <div className="swipe-card-title">{visualTopic.title}</div>
                  </div>

                  {/* HERO + DETAIL WITH LABELS */}
                  <div className="swipe-card-section">
                    <div className="visual-label">Concept Overview</div>

                    <div className="visual-image-wrapper">
                      <img
                        src={visualTopic.heroImage}
                        alt={visualTopic.title + " overview"}
                        className="visual-image-hero"
                      />
                    </div>

                    <div className="swipe-card-summary">
                      <p className="visual-text">{visualTopic.summary}</p>
                    </div>

                    <div className="visual-label">Deep Dive</div>

                    <div className="visual-image-wrapper secondary">
                      <img
                        src={visualTopic.detailImage}
                        alt={visualTopic.title + " detail"}
                        className="visual-image-detail"
                      />
                    </div>

                    {visualTopic.note && (
                      <div className="swipe-card-summary">
                        <p className="visual-text">{visualTopic.note}</p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* NAV UNDER CARD */}
            <div className="swipe-global-footer">
              <div className="swipe-nav">
                <button
                  className="swipe-nav-btn"
                  onClick={handlePrevVisual}
                  disabled={visualIndex === 0}
                >
                  ← Previous
                </button>

                <button
                  className="swipe-nav-btn"
                  onClick={handleNextVisual}
                  disabled={visualIndex === visualTotal - 1}
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

  /* =======================================================
     CARD MODE UI
  ======================================================= */

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

  const normalized = normalizeSummary(concept.summary ?? "");
  const sections = parseSummary(normalized);

  const conceptData: Concept = concept;
  const cleanTitle = (conceptData.title ?? conceptData.topic ?? "")
    .replace("· foundation topic", "")
    .trim();

  const currentModule = conceptData.module;
  const currentModuleName =
    currentModule && MODULE_META_TYPED[currentModule]
      ? MODULE_META_TYPED[currentModule]
      : undefined;

  return (
    <div className="ai-shorts-shell">
      {/* HEADER */}
      <header className="ai-shorts-topbar relative">
        <Link
          href="/"
          className="absolute right-4 top-4 text-xs text-zinc-400 hover:text-zinc-200"
        >
          Home
        </Link>

        <div className="ai-shorts-brand">
          <div className="ai-shorts-brand-title">AI SHORTS</div>
          <div className="ai-shorts-brand-subtitle">
            150-word primers for busy PMs
          </div>
        </div>

      </header>

      {/* HERO */}
      <div className="ai-shorts-hero">
        <h1 className="ai-shorts-hero-title">AI Concepts</h1>
        <p className="ai-shorts-hero-sub">Learn one swipe at a time</p>
      </div>

      {/* MODULE DROPDOWN */}
      {moduleOptions.length > 0 && (
        <div className="ai-shorts-main">
          <div className="module-filter-bar">
            <label className="module-filter-label">
              Jump to module:
              <div className="module-filter-wrapper">
                <select
                  className="module-filter-select"
                  value={selectedModule === "all" ? "all" : String(selectedModule)}
                  onChange={handleModuleChange}
                >
                  <option value="all">All modules</option>
                  {moduleOptions.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
            </label>
          </div>
        </div>
      )}

      {/* CARD + NAV */}
      <main className="ai-shorts-main">
        <div className="card-stack-wrapper">
          <AnimatePresence mode="wait">
            <motion.div
              key={index}
              className="swipe-card"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              initial={{ opacity: 0, y: 14, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -14, scale: 0.97 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              <div className="swipe-card-inner">
                <div className="swipe-card-header">
                  <div className="flex justify-between">
                    {/* MODULE PILL */}
                    {currentModule && (
                      <div className="swipe-card-meta-row">
                        <span className="ai-shorts-chip">
                          <span className="ai-shorts-chip-dot" />
                          <span>
                            Module {currentModule}
                            {currentModuleName ? `: ${currentModuleName}` : ""}
                          </span>
                        </span>
                      </div>
                    )}

                    <div className="swipe-card-meta-row">
                      <span className="swipe-card-count">
                        {index + 1} / {total}
                      </span>
                    </div>
                  </div>

                  <div className="swipe-card-title">{cleanTitle}</div>
                </div>

                {/* WHAT IT IS */}
                <div className="swipe-card-section">
                  <div className="swipe-card-section-title">WHAT IT IS</div>
                  <div className="swipe-card-summary">
                    {renderParagraphs(sections.whatItIs)}
                  </div>
                </div>

                {/* HOW IT WORKS */}
                <div className="swipe-card-section">
                  <div className="swipe-card-section-title">HOW IT WORKS</div>
                  <div className="swipe-card-summary">
                    {renderParagraphs(sections.howItWorks)}
                  </div>
                </div>

                {/* WHY IT MATTERS */}
                <div className="swipe-card-section">
                  <div className="swipe-card-section-title">WHY IT MATTERS</div>
                  <div className="swipe-card-summary">
                    {renderParagraphs(sections.whyItMatters)}
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* GLOBAL NAV UNDER CARD */}
          <div className="swipe-global-footer">
            <div className="swipe-nav">
              <button
                className="swipe-nav-btn"
                onClick={handlePrevCard}
                disabled={index === 0}
              >
                ← Previous
              </button>

              <button
                className="swipe-nav-btn"
                onClick={handleNextCard}
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
