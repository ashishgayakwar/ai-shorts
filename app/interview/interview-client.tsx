"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";

import answers from "@/interview_prep/data/answers.json";

type ScoreBreakdown = {
  total: number;
};

type CriticScores = {
  spoken_score: number;
  written_score: number;
  score_breakdown?: {
    spoken?: ScoreBreakdown;
    written?: ScoreBreakdown;
  };
};

type InterviewRecord = {
  question_id: string;
  category: string;
  question: string;
  spoken_markdown: string;
  spoken_full_script: string;
  written_markdown: string;
  followups: {
    clarification: string[];
    depth: string[];
    challenge: string[];
  };
  interviewer_signals: {
    primary: string;
    secondary: string[];
    red_flags: string[];
  };
  passed: boolean;
  critic_scores?: CriticScores;
};

type AnswerMode = "spoken" | "written";
type SpokenViewMode = "structured" | "script";

const records = (answers as InterviewRecord[]).filter((item) => item.passed);
const PAGE_SIZE = 5;

function toCategoryLabel(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function InterviewClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [category, setCategory] = useState<string>("all");
  const [mode, setMode] = useState<AnswerMode>("spoken");
  const [spokenViewMode, setSpokenViewMode] = useState<SpokenViewMode>("structured");

  const categories = useMemo(() => {
    return Array.from(new Set(records.map((item) => item.category))).sort((a, b) =>
      a.localeCompare(b)
    );
  }, []);

  const filteredRecords = useMemo(() => {
    return records.filter((item) => {
      const matchCategory = category === "all" || item.category === category;
      return matchCategory;
    });
  }, [category]);

  const rawPage = Number(searchParams.get("page") ?? "1");
  const parsedPage = Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1;
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / PAGE_SIZE));
  const currentPage = Math.min(parsedPage, totalPages);

  const pageRecords = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredRecords.slice(start, start + PAGE_SIZE);
  }, [currentPage, filteredRecords]);

  const pageNumbers = useMemo(
    () => Array.from({ length: totalPages }, (_, idx) => idx + 1),
    [totalPages]
  );

  useEffect(() => {
    const paramPage = searchParams.get("page");
    const normalized = String(currentPage);
    if (paramPage !== normalized) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("page", normalized);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
  }, [currentPage, pathname, router, searchParams]);

  function updatePage(nextPage: number) {
    const safePage = Math.min(Math.max(nextPage, 1), totalPages);
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(safePage));
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

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
          <Link href="/compare" className="ai-header-pill">
            Compare
          </Link>
          <span className="ai-header-pill ai-header-pill-active">Interview</span>
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
            <span className="ai-header-pill ai-header-pill-active">Interview</span>
            <Link href="/" className="ai-header-pill">Home</Link>
          </div>
        </details>
      </header>

      <div className="ai-shorts-hero">
        <h1 className="ai-shorts-hero-title">Interview Preparation</h1>
        <p className="ai-shorts-hero-sub">
          Search high-quality answers and switch between spoken and written formats.
        </p>
      </div>

      <main className="ai-shorts-main">
        <div className="interview-layout">
          <section className="interview-filters">
            <label className="interview-filter-label" htmlFor="interview-category">
              Filter by category
            </label>
            <select
              id="interview-category"
              className="interview-filter-select"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                if (currentPage !== 1) updatePage(1);
              }}
            >
              <option value="all">All categories</option>
              {categories.map((item) => (
                <option key={item} value={item}>
                  {toCategoryLabel(item)}
                </option>
              ))}
            </select>

            <div className="interview-filter-label">Answer mode</div>
            <div className="interview-mode-toggle">
              <button
                type="button"
                className={mode === "spoken" ? "active" : ""}
                onClick={() => {
                  setMode("spoken");
                }}
              >
                Spoken
              </button>
              <button
                type="button"
                className={mode === "written" ? "active" : ""}
                onClick={() => {
                  setMode("written");
                }}
              >
                Written
              </button>
            </div>

            {mode === "spoken" && (
              <>
                <div className="interview-filter-label" style={{ marginTop: "10px" }}>
                  Spoken display
                </div>
                <div className="interview-mode-toggle">
                  <button
                    type="button"
                    className={spokenViewMode === "structured" ? "active" : ""}
                    onClick={() => setSpokenViewMode("structured")}
                  >
                    Structured Spoken
                  </button>
                  <button
                    type="button"
                    className={spokenViewMode === "script" ? "active" : ""}
                    onClick={() => setSpokenViewMode("script")}
                  >
                    Speak Out Loud
                  </button>
                </div>
              </>
            )}
          </section>

          <section className="interview-results" aria-live="polite">
            {filteredRecords.length === 0 ? (
              <div className="interview-empty-state">
                No passed interview answers match your current filter.
              </div>
            ) : (
              pageRecords.map((item) => {
                const spokenScore = item.critic_scores?.spoken_score;
                const writtenScore = item.critic_scores?.written_score;
                const markdown =
                  mode === "spoken"
                    ? spokenViewMode === "structured"
                      ? item.spoken_markdown
                      : item.spoken_full_script
                    : item.written_markdown;

                return (
                  <article key={item.question_id} className="interview-card w-full p-4 sm:p-6 md:p-8">
                    <header className="mb-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="interview-category-chip">{toCategoryLabel(item.category)}</div>
                        <div className="interview-critic-badge shrink-0">
                          <span className="interview-critic-pass">Passed</span>
                          <span>S {spokenScore ?? "-"}</span>
                          <span>W {writtenScore ?? "-"}</span>
                        </div>
                      </div>

                      <h1 className="
  mt-3
  text-base sm:text-lg md:text-xl lg:text-2xl
  font-semibold
  leading-tight
  break-words
  w-full
  max-w-full
">
  {item.question}
</h1>

                      <div className="mt-1 text-xs opacity-70 tracking-wider">
                        {item.question_id}
                      </div>
                    </header>

                    {mode === "spoken" && spokenViewMode === "script" ? (
                      <div className="interview-script-block">{markdown}</div>
                    ) : (
                      <div className="interview-markdown">
                        <ReactMarkdown>{markdown}</ReactMarkdown>
                      </div>
                    )}

                    <div className="interview-followups">
                      <h3 className="interview-followups-title">Follow-ups</h3>

                      <div className="interview-followups-group">
                        <div className="interview-followups-label">Clarification</div>
                        <ul>
                          {item.followups.clarification.map((entry, idx) => (
                            <li key={`${item.question_id}-clarification-${idx}`}>{entry}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="interview-followups-group">
                        <div className="interview-followups-label">Depth</div>
                        <ul>
                          {item.followups.depth.map((entry, idx) => (
                            <li key={`${item.question_id}-depth-${idx}`}>{entry}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="interview-followups-group">
                        <div className="interview-followups-label">Challenge</div>
                        <ul>
                          {item.followups.challenge.map((entry, idx) => (
                            <li key={`${item.question_id}-challenge-${idx}`}>{entry}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="interview-followups">
                      <h3 className="interview-followups-title">Interviewer Signals</h3>

                      <div className="interview-followups-group">
                        <div className="interview-followups-label">Primary</div>
                        <p>{item.interviewer_signals.primary}</p>
                      </div>

                      <div className="interview-followups-group">
                        <div className="interview-followups-label">Secondary</div>
                        <ul>
                          {item.interviewer_signals.secondary.map((entry, idx) => (
                            <li key={`${item.question_id}-secondary-${idx}`}>{entry}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="interview-followups-group">
                        <div className="interview-followups-label">Red Flags</div>
                        <ul>
                          {item.interviewer_signals.red_flags.map((entry, idx) => (
                            <li key={`${item.question_id}-redflags-${idx}`}>{entry}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </article>
                );
              })
            )}

            {filteredRecords.length > 0 && (
              <div className="interview-pagination">
                <button
                  type="button"
                  className="interview-page-btn"
                  disabled={currentPage === 1}
                  onClick={() => updatePage(currentPage - 1)}
                >
                  Previous
                </button>

                <div className="interview-page-numbers">
                  {pageNumbers.map((pageNum) => (
                    <button
                      key={pageNum}
                      type="button"
                      className={
                        pageNum === currentPage
                          ? "interview-page-btn interview-page-btn-active"
                          : "interview-page-btn"
                      }
                      onClick={() => updatePage(pageNum)}
                    >
                      {pageNum}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  className="interview-page-btn"
                  disabled={currentPage === totalPages}
                  onClick={() => updatePage(currentPage + 1)}
                >
                  Next
                </button>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
