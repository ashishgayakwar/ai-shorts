"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { concepts } from "../../data/concepts.generated";
import { quizLevels } from "../../data/quizLevels";
import { visualTopics } from "../../data/visualTopics";
import type { VisualTopic } from "../../data/visualTopics";

type Concept = (typeof concepts)[number];

type ParsedSummary = {
  whatItIs: string;
  howItWorks: string;
  whyItMatters: string;
};

/* -------------------------------------------------------
   SWIPE CONFIG
------------------------------------------------------- */
const SWIPE_THRESHOLD = 120; // px left/right to trigger card change

/* -------------------------------------------------------
   NORMALIZE SUMMARY
------------------------------------------------------- */
function normalizeSummary(input: string): string {
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
  return text
    .split(/\n{2,}/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((para, i) => <p key={i}>{para}</p>);
}

/* -------------------------------------------------------
   MAIN COMPONENT
------------------------------------------------------- */
export default function SwipePage() {
  const [mode, setMode] = useState<"cards" | "quiz" | "visualize">("cards");

  /* CARD MODE STATE */
  const [index, setIndex] = useState(0);
  const total = concepts.length;
  const concept = concepts[index] as Concept | undefined;

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

  /* QUIZ HANDLERS */
  function switchToQuiz() {
    setMode("quiz");
    setQuizIndex(0);
    setSelectedOption(null);
    setShowAnswer(false);
    setScore(0);
  }

  function switchToCards() {
    setMode("cards");
  }

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

  /* VISUALIZE HANDLERS */
  function switchToVisualize() {
    setMode("visualize");
    setVisualIndex(0);
  }

  const handleNextVisual = () =>
    visualIndex < visualTotal - 1 && setVisualIndex(visualIndex + 1);

  const handlePrevVisual = () =>
    visualIndex > 0 && setVisualIndex(visualIndex - 1);

  /* CARD NAV HANDLERS */
  const handleNextCard = () => index < total - 1 && setIndex(index + 1);
  const handlePrevCard = () => index > 0 && setIndex(index - 1);

  /* =======================================================
     QUIZ MODE UI
  ======================================================= */
  if (mode === "quiz") {
    const explanation = currentQuestion.explanation?.trim() ?? "";

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
            <div className="ai-shorts-chip">
              <span className="ai-shorts-chip-dot" />
              <span>Live · Quiz mode</span>
            </div>

            <button className="mode-toggle-btn" onClick={switchToCards}>
              ← Back to cards
            </button>
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
              <div className="quiz-qcount">
                Q {quizIndex + 1} / {totalQuestions}
              </div>

              <div className="quiz-question">
                {currentQuestion.question}
              </div>

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

                  const optionLetter = String.fromCharCode(65 + i); // A, B, C, D

                  return (
                    <button
                      key={i}
                      className={cls}
                      onClick={() =>
                        !showAnswer && setSelectedOption(i)
                      }
                    >
                      <span className="quiz-option-label">
                        {optionLetter}
                      </span>
                      <span className="quiz-option-text">{opt}</span>
                    </button>
                  );
                })}
              </div>

              {/* EXPLANATION (only if provided) */}
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
                    Submit
                  </button>
                ) : quizIndex < totalQuestions - 1 ? (
                  <button
                    className="quiz-primary-btn"
                    onClick={handleNextQuestion}
                  >
                    Next →
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
        <header className="ai-shorts-topbar">
          <div className="ai-shorts-brand">
            <div className="ai-shorts-brand-title">AI SHORTS</div>
            <div className="ai-shorts-brand-subtitle">
              150-word primers for busy PMs
            </div>
          </div>

          <div className="ai-shorts-header-actions-row">
            <div className="ai-shorts-chip">
              <span className="ai-shorts-chip-dot" />
              <span>Live · Visual mode</span>
            </div>

            <button className="mode-toggle-btn" onClick={switchToCards}>
              ← Back to cards
            </button>
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

                    <div className="swipe-card-title">
                      {visualTopic.title}
                    </div>
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

  const normalized = normalizeSummary(concept.summary);
  const sections = parseSummary(normalized);
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

          <div className="ai-shorts-header-actions-row">
            <div className="ai-shorts-chip">
              <span className="ai-shorts-chip-dot" />
              <span>Live · Swipe to learn</span>
            </div>

            <button className="mode-toggle-btn" onClick={switchToQuiz}>
              🎯 Quiz mode
            </button>

            <button className="mode-toggle-btn" onClick={switchToVisualize}>
              👁 Visualize
            </button>
          </div>
        </div>
      </header>

      {/* HERO */}
      <div className="ai-shorts-hero">
        <h1 className="ai-shorts-hero-title">AI Concepts</h1>
        <p className="ai-shorts-hero-sub">Learn one swipe at a time</p>
      </div>

      {/* PROGRESS DOTS */}
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
          <AnimatePresence mode="wait">
            <motion.div
              key={index}
              className="swipe-card"
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.15}
              onDragEnd={(_, info) => {
                if (info.offset.x < -SWIPE_THRESHOLD) {
                  handleNextCard();
                } else if (info.offset.x > SWIPE_THRESHOLD) {
                  handlePrevCard();
                }
              }}
              initial={{ opacity: 0, y: 14, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -14, scale: 0.97 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              <div className="swipe-card-inner">
                <div className="swipe-card-header">
                  <div className="swipe-card-meta-row">
                    <span className="swipe-card-tag">Today’s concept</span>
                    <span className="swipe-card-count">
                      {index + 1} / {total}
                    </span>
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
                  <div className="swipe-card-section-title">
                    WHY IT MATTERS
                  </div>
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
