"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import questionsData from "@/interview_prep/data/questions.json";

type InterviewQuestion = {
  question_id: string;
  category: string;
  question: string;
};

export default function InterviewPage() {
  const questions = useMemo(
    () => (Array.isArray(questionsData.questions) ? (questionsData.questions as InterviewQuestion[]) : []),
    []
  );
  const pageSize = 10;

  const categories = useMemo(
    () => Array.from(new Set(questions.map((q) => q.category))),
    [questions]
  );

  const [selectedCategory, setSelectedCategory] = useState("all");
  const [page, setPage] = useState(1);

  const filteredQuestions = useMemo(() => {
    if (selectedCategory === "all") return questions;
    return questions.filter((q) => q.category === selectedCategory);
  }, [questions, selectedCategory]);

  const totalPages = Math.max(1, Math.ceil(filteredQuestions.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const pagedQuestions = filteredQuestions.slice(start, start + pageSize);

  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value);
    setPage(1);
  };

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

        <details className="ai-shorts-mobile-menu">
          <summary>Menu</summary>
          <div className="ai-shorts-mobile-menu-panel">
            <Link href="/swipe" className="ai-header-pill">Cards</Link>
            <Link href="/swipe?mode=visualize" className="ai-header-pill">Visualize</Link>
            <Link href="/compare" className="ai-header-pill">Compare</Link>
            <span className="ai-header-pill ai-header-pill-active">Interview</span>
            <Link href="/" className="ai-header-pill">Home</Link>
          </div>
        </details>
      </header>

      <div className="ai-shorts-hero">
        <h1 className="ai-shorts-hero-title">AI PM Interview Guide</h1>
        <p className="ai-shorts-hero-sub">
          Pick a question to open its full interview answer page.
        </p>
      </div>

      <main className="ai-shorts-main">
        <div className="mx-auto w-full max-w-5xl">
          <div className="rounded-2xl border border-white/12 bg-white/[0.03] p-4 sm:p-5">
            <div className="w-full flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <label className="text-cyan-200/80 tracking-[0.25em] text-sm font-semibold">
                FILTER BY CATEGORY
              </label>
              <div className="w-full md:w-auto md:min-w-[320px] lg:min-w-[360px]">
                <select
                  className="w-full rounded-full border border-white/20 bg-white/[0.04] px-3 py-2 text-sm text-slate-100 outline-none"
                  value={selectedCategory}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                >
                  <option value="all">All categories</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            {pagedQuestions.map((question, index) => {
              const serial = String(start + index + 1).padStart(2, "0");
              return (
                <Link
                  key={question.question_id}
                  href={`/interview/${question.question_id}`}
                  className="block w-full cursor-pointer rounded-2xl border border-white/12 bg-white/[0.03] p-4 transition hover:border-cyan-300/45 hover:bg-cyan-300/10 sm:p-5"
                >
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className="w-8 pt-[2px] text-sm font-semibold tabular-nums tracking-[0.12em] text-white/60 sm:w-10">
                      {serial}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base font-medium leading-relaxed text-white sm:text-lg">
                        {question.question}
                      </h3>
                    </div>
                    <div className="pt-[2px] text-white/50">&rsaquo;</div>
                  </div>
                </Link>
              );
            })}
          </div>

          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="ai-header-pill disabled:opacity-40"
            >
              Prev
            </button>

            <div className="text-sm text-slate-300">
              Page {currentPage} of {totalPages}
            </div>

            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="ai-header-pill disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
