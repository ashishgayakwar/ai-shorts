"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { ReactElement } from "react";
import questionsData from "../../../interview_prep/data/questions.json";
import answersData from "../../../interview_prep/data/answers_master.json";

type InterviewQuestion = {
  question_id: string;
  category: string;
  question: string;
};

type InterviewAnswer = {
  question_id: string;
  spoken_answer?: string;
  answer_md?: string;
  written_answer_md?: string;
  followups?: {
    clarification?: string[];
    depth?: string[];
  };
};

function toTitleCase(value: string): string {
  return value
    .replaceAll("_", " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function deriveSpokenText(markdownLike: string): string {
  const plain = markdownLike
    .replace(/#+\s?/g, "")
    .replace(/\*\*/g, "")
    .replace(/`/g, "")
    .replace(/\n+/g, " ")
    .trim();
  const words = plain.split(/\s+/).filter(Boolean);
  if (words.length <= 150) return plain || "Answer not generated yet";
  return `${words.slice(0, 150).join(" ")}...`;
}

function renderMarkdownLike(markdown: string): ReactElement {
  const lines = markdown.split("\n");
  return (
    <div className="space-y-2">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={`sp-${idx}`} className="h-2" />;
        if (trimmed.startsWith("## ")) {
          return (
            <h3 key={idx} className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">
              {trimmed.slice(3)}
            </h3>
          );
        }
        if (trimmed.startsWith("- ")) {
          return (
            <div key={idx} className="pl-4 text-sm leading-7 text-slate-100">
              • {trimmed.slice(2)}
            </div>
          );
        }
        return (
          <p key={idx} className="text-sm leading-7 text-slate-100">
            {trimmed}
          </p>
        );
      })}
    </div>
  );
}

function defaultFollowups(question: string): { clarification: string[]; depth: string[] } {
  return {
    clarification: [
      `What user segment would you prioritize first for: "${question}"?`,
      "What exact success criteria define a strong first release?"
    ],
    depth: [
      "How would you instrument this end to end to detect regressions?",
      "What rollout guardrails would you apply before scaling broadly?"
    ]
  };
}

export default function InterviewDetailPage() {
  const router = useRouter();
  const { questionId } = useParams() as { questionId: string };
  const id = decodeURIComponent(String(questionId || "")).trim();

  const questions = Array.isArray((questionsData as any).questions)
    ? ((questionsData as any).questions as InterviewQuestion[])
    : [];
  const answers = Array.isArray((answersData as any).answers)
    ? ((answersData as any).answers as InterviewAnswer[])
    : [];

  const categories = useMemo(
    () => Array.from(new Set(questions.map((q) => q.category))),
    [questions]
  );

  const currentQuestion = questions.find((q) => q.question_id === id);
  const currentAnswer = answers.find((a) => a.question_id === id);
  const currentIndex = currentQuestion
    ? questions.findIndex((q) => q.question_id === currentQuestion.question_id)
    : -1;

  const prevQuestion = currentIndex > 0 ? questions[currentIndex - 1] : null;
  const nextQuestion =
    currentIndex >= 0 && currentIndex < questions.length - 1 ? questions[currentIndex + 1] : null;

  const [selectedCategory, setSelectedCategory] = useState(currentQuestion?.category ?? "all");
  const [answerMode, setAnswerMode] = useState<"spoken" | "written">("written");

  useEffect(() => {
    if (currentQuestion) setSelectedCategory(currentQuestion.category);
  }, [currentQuestion?.question_id]);

  const writtenRaw =
    currentAnswer?.written_answer_md ?? currentAnswer?.answer_md ?? "Answer not generated yet";
  const spokenRaw = currentAnswer?.spoken_answer ?? deriveSpokenText(writtenRaw);
  const followups = currentAnswer?.followups ?? defaultFollowups(currentQuestion?.question ?? "");

  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value);
    const source = value === "all" ? questions : questions.filter((q) => q.category === value);
    if (source.length > 0) {
      router.push(`/interview/${source[0].question_id}`);
    }
  };

  if (!currentQuestion) {
    return (
      <div className="ai-shorts-shell">
        <main className="ai-shorts-main">
          <div className="swipe-card">
            <div className="swipe-card-inner">
              <div className="swipe-card-header">
                <div className="swipe-card-title">Question not found</div>
              </div>
              <div className="swipe-card-section">
                <Link href="/interview" className="ai-header-pill">
                  Back to Interview Prep
                </Link>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="ai-shorts-shell">
      <header className="ai-shorts-topbar ai-shorts-topbar-full">
        <div className="ai-shorts-brand">
          <div className="ai-shorts-brand-title">AI SHORTS</div>
          <div className="ai-shorts-brand-subtitle">150-word primers for busy PMs</div>
        </div>

        <div className="ai-shorts-desktop-actions">
          <Link href="/swipe" className="ai-header-pill">Cards</Link>
          <Link href="/swipe?mode=visualize" className="ai-header-pill">Visualize</Link>
          <Link href="/compare" className="ai-header-pill">Compare</Link>
          <span className="ai-header-pill ai-header-pill-active">Interview</span>
          <Link href="/" className="ai-header-pill">Home</Link>
        </div>
      </header>

      <main className="ai-shorts-main">
        <div className="mx-auto w-full max-w-5xl">
          <h1 className="text-2xl font-semibold leading-tight text-slate-100 md:text-4xl">
            {currentQuestion.question}
          </h1>

          <div className="mt-6 w-full flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="w-full md:w-[280px]">
              <div className="swipe-card-section-title !mb-1">FILTER BY CATEGORY</div>
              <select
                className="w-full rounded-full border border-white/20 bg-white/[0.04] px-3 py-2 text-sm text-slate-100 outline-none"
                value={selectedCategory}
                onChange={(e) => handleCategoryChange(e.target.value)}
              >
                <option value="all">All categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {toTitleCase(category)}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-full md:w-auto md:text-right">
              <div className="swipe-card-section-title !mb-1">ANSWER MODE</div>
              <div className="flex gap-2 md:justify-end">
                <button
                  type="button"
                  onClick={() => setAnswerMode("spoken")}
                  className={`ai-header-pill ${answerMode === "spoken" ? "ai-header-pill-active" : ""}`}
                >
                  Spoken
                </button>
                <button
                  type="button"
                  onClick={() => setAnswerMode("written")}
                  className={`ai-header-pill ${answerMode === "written" ? "ai-header-pill-active" : ""}`}
                >
                  Written
                </button>
              </div>
            </div>
          </div>

          <section className="mt-8 rounded-2xl border border-white/12 bg-white/[0.03] p-4 md:p-6">
            <div className="mb-1 flex items-center justify-between gap-4">
              <div className="swipe-card-section-title !mb-0">
                {answerMode === "spoken" ? "SPOKEN ANSWER" : "WRITTEN ANSWER"}
              </div>
              <div className="flex items-center gap-2">
                {prevQuestion ? (
                  <Link
                    href={`/interview/${prevQuestion.question_id}`}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-white/[0.04] text-sm text-slate-200 transition hover:border-cyan-300/50 hover:text-cyan-100"
                    aria-label="Previous question"
                  >
                    &larr;
                  </Link>
                ) : (
                  <span
                    className="inline-flex h-8 w-8 cursor-not-allowed items-center justify-center rounded-full border border-white/20 bg-white/[0.04] text-sm text-slate-200 opacity-40"
                    aria-label="Previous question disabled"
                  >
                    &larr;
                  </span>
                )}
                {nextQuestion ? (
                  <Link
                    href={`/interview/${nextQuestion.question_id}`}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-white/[0.04] text-sm text-slate-200 transition hover:border-cyan-300/50 hover:text-cyan-100"
                    aria-label="Next question"
                  >
                    &rarr;
                  </Link>
                ) : (
                  <span
                    className="inline-flex h-8 w-8 cursor-not-allowed items-center justify-center rounded-full border border-white/20 bg-white/[0.04] text-sm text-slate-200 opacity-40"
                    aria-label="Next question disabled"
                  >
                    &rarr;
                  </span>
                )}
              </div>
            </div>
            {answerMode === "spoken" ? (
              <p className="swipe-card-body">{spokenRaw}</p>
            ) : (
              renderMarkdownLike(writtenRaw)
            )}

            <div className="mt-5">
              <div className="swipe-card-section-title">FOLLOW-UPS</div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-white/12 bg-white/[0.03] p-4">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200">
                    Clarification
                  </div>
                  <ul className="list-disc space-y-1 pl-4 text-sm text-slate-100">
                    {(followups.clarification ?? []).slice(0, 2).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-2xl border border-white/12 bg-white/[0.03] p-4">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200">
                    Depth
                  </div>
                  <ul className="list-disc space-y-1 pl-4 text-sm text-slate-100">
                    {(followups.depth ?? []).slice(0, 2).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link href="/interview" className="ai-header-pill">
                Back to Interview Prep
              </Link>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
