"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";

type Screen = "intro" | "quiz" | "result";

type Universe = "Hollywood" | "Bollywood";

type QuizOption = {
  value: string;
  label: string;
  emoji?: string;
  subLabel?: string;
};

type QuizQuestion = {
  id: keyof QuizAnswers;
  prompt: string;
  options: QuizOption[];
};

type QuizAnswers = {
  universe: Universe;
  q1: string;
  q2: string;
  q3: string;
  q4: string;
  q5: string;
};

type Reason = {
  title: string;
  explanation: string;
};

type MatchResult = {
  character: string;
  show: string;
  match_percent: number;
  accent_color: string;
  reasons: Reason[];
  iconic_quote: string;
  dark_side: {
    character: string;
    show: string;
    reason: string;
  };
};

const QUESTIONS: QuizQuestion[] = [
  {
    id: "universe",
    prompt: "Which world do you belong to?",
    options: [
      {
        value: "Hollywood",
        label: "Hollywood",
        emoji: "🎬",
        subLabel: "Western Films and TV Shows",
      },
      {
        value: "Bollywood",
        label: "Bollywood",
        emoji: "🎭",
        subLabel: "Indian Films and TV Shows",
      },
    ],
  },
  {
    id: "q1",
    prompt: "It's Friday night. You are most likely:",
    options: [
      { value: "Hosting a dinner party and controlling the playlist", label: "Hosting a dinner party and controlling the playlist" },
      { value: "Out somewhere loud and unpredictable", label: "Out somewhere loud and unpredictable" },
      { value: "Deep in a rabbit hole of something obscure", label: "Deep in a rabbit hole of something obscure" },
      { value: "Exactly where I planned to be, two weeks ago", label: "Exactly where I planned to be, two weeks ago" },
    ],
  },
  {
    id: "q2",
    prompt: "Someone wrongs you. You:",
    options: [
      { value: "Forgive them. Eventually.", label: "Forgive them. Eventually." },
      { value: "Make a mental note. Never forget.", label: "Make a mental note. Never forget." },
      { value: "Handle it immediately and directly", label: "Handle it immediately and directly" },
      { value: "Say nothing. Let karma work.", label: "Say nothing. Let karma work." },
    ],
  },
  {
    id: "q3",
    prompt: "Your superpower would be:",
    options: [
      { value: "Reading people instantly", label: "Reading people instantly" },
      { value: "Being three steps ahead always", label: "Being three steps ahead always" },
      { value: "Surviving absolutely anything", label: "Surviving absolutely anything" },
      { value: "Making everyone trust you instantly", label: "Making everyone trust you instantly" },
    ],
  },
  {
    id: "q4",
    prompt: "Pick a world:",
    options: [
      { value: "Gritty crime thriller", label: "Gritty crime thriller" },
      { value: "Mind-bending sci-fi", label: "Mind-bending sci-fi" },
      { value: "Epic fantasy", label: "Epic fantasy" },
      { value: "Sharp political drama", label: "Sharp political drama" },
    ],
  },
  {
    id: "q5",
    prompt: "What drives you most:",
    options: [
      { value: "Power", label: "Power" },
      { value: "Justice", label: "Justice" },
      { value: "Freedom", label: "Freedom" },
      { value: "Love", label: "Love" },
    ],
  },
];

const DEFAULT_ACCENT = "#ff5a36";
const LOADING_TEXT = "Scanning every character ever written...";

function toText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function safeHex(value: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value : DEFAULT_ACCENT;
}

function initials(value: string): string {
  const parts = value
    .split(" ")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 2);
  return parts.map((p) => p.charAt(0).toUpperCase()).join("") || "??";
}

function shareSummary(result: MatchResult): string {
  return `I got ${result.match_percent}% ${result.character} from ${result.show} on Which Character Are You?`;
}

export default function CharacterQuizClient() {
  const [screen, setScreen] = useState<Screen>("intro");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Partial<QuizAnswers>>({});
  const [selected, setSelected] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<MatchResult | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [imageFailed, setImageFailed] = useState(false);
  const [imageIsPortrait, setImageIsPortrait] = useState(false);
  const [copied, setCopied] = useState(false);
  const [animatedScore, setAnimatedScore] = useState(0);

  const accent = useMemo(
    () => safeHex(toText(result?.accent_color || DEFAULT_ACCENT)),
    [result?.accent_color]
  );

  useEffect(() => {
    if (!result) return;
    setAnimatedScore(0);
    const final = result.match_percent;
    const durationMs = 900;
    const start = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      setAnimatedScore(Math.round(final * progress));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [result]);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(timer);
  }, [copied]);

  async function processResult(finalAnswers: QuizAnswers) {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch("/api/character-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: finalAnswers }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { result?: MatchResult; imageUrl?: string | null; error?: string }
        | null;

      if (!response.ok || !payload?.result) {
        throw new Error(payload?.error || "Unable to generate your character match.");
      }

      const nextResult = {
        ...payload.result,
        accent_color: safeHex(payload.result.accent_color),
      };

      setResult(nextResult);
      setImageUrl(toText(payload?.imageUrl || ""));
      setImageFailed(false);
      setImageIsPortrait(false);
      setScreen("result");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to generate your character match.";
      setError(message);
      setScreen("intro");
    } finally {
      setIsLoading(false);
    }
  }

  function handleStart() {
    setError("");
    setAnswers({});
    setResult(null);
    setImageUrl("");
    setImageFailed(false);
    setImageIsPortrait(false);
    setQuestionIndex(0);
    setSelected("");
    setScreen("quiz");
  }

  function handleSelect(option: string) {
    if (selected) return;
    const question = QUESTIONS[questionIndex];
    setSelected(option);

    const next = { ...answers, [question.id]: option } as Partial<QuizAnswers>;
    setAnswers(next);

    window.setTimeout(() => {
      setSelected("");
      if (questionIndex === QUESTIONS.length - 1) {
        void processResult(next as QuizAnswers);
      } else {
        setQuestionIndex((prev) => prev + 1);
      }
    }, 260);
  }

  async function handleShare() {
    if (!result) return;
    const summary = shareSummary(result);
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
    } catch {
      setError("Could not copy automatically. Please copy manually.");
    }
  }

  function retake() {
    setScreen("intro");
    setQuestionIndex(0);
    setAnswers({});
    setResult(null);
    setImageUrl("");
    setImageFailed(false);
    setImageIsPortrait(false);
    setAnimatedScore(0);
    setSelected("");
  }

  const progress = ((questionIndex + 1) / QUESTIONS.length) * 100;
  const activeQuestion = QUESTIONS[questionIndex];

  return (
    <div className="day13-root" style={{ ["--accent" as string]: accent }}>
      <div className="grain" />

      <AnimatePresence mode="wait">
        {screen === "intro" && (
          <motion.section
            key="intro"
            className="screen intro"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.35 }}
          >
            <motion.p
              className="eyebrow"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              Day 13 · 75 Products 75 Days
            </motion.p>

            <motion.h1
              className="intro-title"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22 }}
            >
              Which Character Are You?
            </motion.h1>

            <motion.p
              className="intro-sub"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.34 }}
            >
              6 steps. Every movie. Every show. One character.
            </motion.p>

            <motion.button
              className="cta"
              type="button"
              onClick={handleStart}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.42 }}
            >
              Find Out →
            </motion.button>

            {error ? <p className="error">{error}</p> : null}
          </motion.section>
        )}

        {screen === "quiz" && (
          <motion.section
            key="quiz"
            className="screen quiz"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.3 }}
          >
            <div className="quiz-top">
              <span className="q-label">{`Question ${questionIndex + 1} of 6`}</span>
              <div className="progress-track">
                <motion.div
                  className="progress-fill"
                  initial={false}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.28 }}
                />
              </div>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeQuestion.id}
                className="question-block"
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.22 }}
              >
                <h2>{activeQuestion.prompt}</h2>
                <div className={`options ${activeQuestion.id === "universe" ? "universe-grid" : ""}`}>
                  {activeQuestion.options.map((option) => {
                    const isSelected = selected === option.value;
                    return (
                      <motion.button
                        key={option.value}
                        type="button"
                        className={`option ${isSelected ? "selected" : ""} ${
                          activeQuestion.id === "universe" ? "universe-option" : ""
                        }`}
                        onClick={() => handleSelect(option.value)}
                        whileHover={{ scale: isSelected ? 1 : 1.01 }}
                        animate={isSelected ? { scale: [1, 1.03, 1] } : { scale: 1 }}
                        transition={{ duration: 0.22 }}
                      >
                        {activeQuestion.id === "universe" ? (
                          <>
                            <span className="universe-line">
                              <span className="universe-emoji">{option.emoji}</span>
                              <span className="universe-label">{option.label}: </span>
                              <span className="universe-sub">{option.subLabel}</span>
                            </span>
                          </>
                        ) : (
                          option.label
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            </AnimatePresence>
          </motion.section>
        )}

        {screen === "result" && result && (
          <motion.section
            key="result"
            className="screen result"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.32 }}
          >
            <div className="result-card">
              <div className="media">
                {imageUrl && !imageFailed ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imageUrl}
                    alt={`${result.character} visual`}
                    className={imageIsPortrait ? "portrait" : ""}
                    onLoad={(event) => {
                      const img = event.currentTarget;
                      setImageIsPortrait(img.naturalHeight > img.naturalWidth);
                    }}
                    onError={() => {
                      setImageFailed(true);
                      setImageIsPortrait(false);
                    }}
                  />
                ) : (
                  <div className="image-fallback">{initials(result.character)}</div>
                )}
                <div className="media-overlay" />
                <p className="media-name">{result.character}</p>
              </div>

              <div className="content">
                <p className="match-eyebrow">Your Character Match</p>
                <div className="score">{animatedScore}%</div>
                <h3 className="character">{result.character}</h3>
                <p className="show">{result.show}</p>

                <div className="divider" />

                <div className="reasons">
                  {result.reasons.map((reason) => (
                    <div key={reason.title} className="reason">
                      <p className="reason-title">{reason.title}</p>
                      <p className="reason-body">{reason.explanation}</p>
                    </div>
                  ))}
                </div>

                <div className="divider" />

                <blockquote>{`"${result.iconic_quote}"`}</blockquote>

                <div className="divider" />

                <p className="dark-label">On your worst day, you&apos;re...</p>
                <p className="dark-name">
                  {result.dark_side.character} <span>· {result.dark_side.show}</span>
                </p>
                <p className="dark-reason">{result.dark_side.reason}</p>

                <div className="actions">
                  <button type="button" className="share" onClick={() => void handleShare()}>
                    Share Your Result
                  </button>
                  <button type="button" className="retake" onClick={retake}>
                    Retake Quiz
                  </button>
                </div>
                {copied ? <p className="copied">Copied to clipboard.</p> : null}
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isLoading ? (
          <motion.div
            className="loading-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="spinner" />
            <p>{LOADING_TEXT}</p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
