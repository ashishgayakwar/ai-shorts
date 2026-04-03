"use client";

import { AnimatePresence, motion } from "framer-motion";
import { DM_Sans, DM_Serif_Display } from "next/font/google";
import { useEffect, useMemo, useState } from "react";

import styles from "./pm-interview-coach.module.css";
import type { AnswerRoute, InterviewAnswer } from "./types";

type Phase = "input" | "loading" | "output" | "error";
type Theme = "dark" | "light" | "ambient";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
});
const dmSerif = DM_Serif_Display({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-dm-serif",
});

const LOADING_MESSAGES = [
  "Analysing the question...",
  "Identifying strategic angles...",
  "Building model answers...",
  "Stress-testing the logic...",
  "Almost done...",
];

function buildCopyText(question: string, questionType: string, route: AnswerRoute): string {
  const clarifying = route.clarifyingQuestions.map((q) => `${q.number}. ${q.text}`).join("\n");
  const actions = route.action
    .map((a) => `${a.number} · ${a.priority}\n${a.title}\n${a.body}`)
    .join("\n\n");
  const stats = route.resultStats.map((s) => `${s.label}: ${s.value}`).join("\n");

  return `QUESTION:
${question}

QUESTION TYPE:
${questionType}

ANGLE:
${route.tabLabel}

CLARIFYING QUESTIONS:
${clarifying}

HOOK:
${route.hook}

SITUATION:
${route.situation}

COMPLICATION:
${route.complication}

ACTION:
${actions}

RESULT:
${stats}
${route.resultBody}

INSIGHT:
${route.insight}

TOTAL SPEAK TIME:
${route.speakTime}`;
}

export default function PMInterviewCoachPage() {
  const [phase, setPhase] = useState<Phase>("input");
  const [answer, setAnswer] = useState<InterviewAnswer | null>(null);
  const [lastQuestion, setLastQuestion] = useState("");
  const [draftQuestion, setDraftQuestion] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [activeTab, setActiveTab] = useState(0);
  const [hasTabbed, setHasTabbed] = useState(false);
  const [theme, setTheme] = useState<Theme>("dark");
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [copiedLabel, setCopiedLabel] = useState("Copy answer");

  useEffect(() => {
    const saved = window.localStorage.getItem("pmcoach-theme");
    if (saved === "dark" || saved === "light" || saved === "ambient") {
      setTheme(saved);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("pmcoach-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (phase !== "loading") return;
    const intervalId = window.setInterval(() => {
      setLoadingMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 2000);
    return () => window.clearInterval(intervalId);
  }, [phase]);

  const activeRoute = useMemo(() => answer?.routes[activeTab] ?? null, [answer, activeTab]);

  async function handleSubmit(question: string) {
    const trimmed = question.trim();
    if (trimmed.length < 10) {
      setErrorMsg("Question is too short. Min 10 characters.");
      setPhase("error");
      setLastQuestion(trimmed);
      setDraftQuestion(trimmed);
      return;
    }

    setPhase("loading");
    setErrorMsg("");
    setActiveTab(0);
    setHasTabbed(false);
    setCopiedLabel("Copy answer");
    setLoadingMessageIndex(0);

    try {
      const res = await fetch("/api/pm-interview-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed }),
      });
      const data: unknown = await res.json();
      if (!res.ok) {
        const message =
          typeof data === "object" && data !== null && "error" in data && typeof data.error === "string"
            ? data.error
            : `Error ${res.status}`;
        throw new Error(message);
      }

      setAnswer(data as InterviewAnswer);
      setLastQuestion(trimmed);
      setDraftQuestion(trimmed);
      setPhase("output");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Something went wrong.");
      setLastQuestion(trimmed);
      setDraftQuestion(trimmed);
      setPhase("error");
    }
  }

  const onClickTab = (index: number) => {
    setActiveTab(index);
    setHasTabbed(true);
    setCopiedLabel("Copy answer");
  };

  const onCopy = async () => {
    if (!answer || !activeRoute) return;
    const text = buildCopyText(lastQuestion, answer.questionType, activeRoute);
    try {
      await navigator.clipboard.writeText(text);
      setCopiedLabel("Copied ✓");
      window.setTimeout(() => setCopiedLabel("Copy answer"), 2000);
    } catch {
      setCopiedLabel("Copy failed");
      window.setTimeout(() => setCopiedLabel("Copy answer"), 2000);
    }
  };

  const reset = () => {
    setPhase("input");
    setAnswer(null);
    setActiveTab(0);
    setHasTabbed(false);
    setErrorMsg("");
    setCopiedLabel("Copy answer");
  };

  const showInput = phase === "input" || phase === "error";

  return (
    <main className={`${styles.pageShell} ${dmSans.variable} ${dmSerif.variable}`}>
      <div className={styles.pageWrap} data-theme={theme}>
        <header className={styles.header}>
          <div className={styles.headerTop}>
            <span className={styles.seriesTag}>PM Interview Coach · Day 09</span>
            <div className={styles.modeGroup}>
              {(["dark", "light", "ambient"] as Theme[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`${styles.modeBtn} ${theme === t ? styles.modeBtnActive : ""}`}
                  onClick={() => setTheme(t)}
                >
                  {t}
                </button>
              ))}
            </div>
            <span className={styles.dayBadge}>75 Products · 75 Days</span>
          </div>

          <p className={styles.questionLabel}>Your question</p>
          <p className={styles.questionText}>
            {showInput
              ? "Think Like a PM. Answer Like a Leader."
              : lastQuestion}
          </p>
          <div className={styles.questionType}>
            Question type →
            <span>{answer?.questionType ?? "Will be detected automatically"}</span>
          </div>
        </header>

        {showInput ? (
          <section className={styles.inputSection}>
            <div className={styles.inputCard}>
              <textarea
                value={draftQuestion}
                onChange={(event) => setDraftQuestion(event.target.value)}
                className={styles.questionInput}
                placeholder="e.g. How would you improve retention for Spotify Premium in India?"
              />
              <div className={styles.inputActions}>
                <button type="button" className={styles.submitBtn} onClick={() => handleSubmit(draftQuestion)}>
                  Generate Answers
                </button>
                <span className={styles.charMeta}>{draftQuestion.trim().length}/500</span>
              </div>
              {errorMsg ? <div className={styles.errorLine}>{errorMsg}</div> : null}
            </div>
          </section>
        ) : null}

        {phase === "loading" ? (
          <section className={styles.loading}>
            <div className={styles.loadSym}>⚙</div>
            <div className={styles.loadTxt}>{LOADING_MESSAGES[loadingMessageIndex]}</div>
          </section>
        ) : null}

        {phase === "output" && answer && activeRoute ? (
          <>
            <div className={styles.tabsWrap}>
              {!hasTabbed ? <span className={styles.tabsHint}>Select an angle</span> : null}
              {answer.routes.map((route, idx) => (
                <button
                  key={`${route.tabLabel}-${idx}`}
                  type="button"
                  className={`${styles.tab} ${activeTab === idx ? styles.tabActive : ""}`}
                  onClick={() => onClickTab(idx)}
                >
                  <span className={styles.tabArrow}>→</span>
                  {route.tabLabel}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.section
                key={`${activeRoute.tabLabel}-${activeTab}`}
                className={styles.answerPanel}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
              >
                <div className={styles.content}>
                  <div className={styles.rail}>
                    <div className={styles.railLine} />
                    <div className={styles.railSpacer} />
                    <div className={styles.railSection}>
                      <div className={`${styles.railDot} ${styles.railDotAmber}`} />
                    </div>
                    <div className={styles.railSection}>
                      <div className={`${styles.railDot} ${styles.railDotActive}`} />
                    </div>
                    <div className={styles.railSection}>
                      <div className={`${styles.railDot} ${styles.railDotActive}`} />
                    </div>
                    <div className={styles.railSection}>
                      <div className={`${styles.railDot} ${styles.railDotActive}`} />
                    </div>
                    <div className={styles.railSection}>
                      <div className={`${styles.railDot} ${styles.railDotActive}`} />
                    </div>
                    <div className={styles.railSection}>
                      <div className={`${styles.railDot} ${styles.railDotActive}`} />
                    </div>
                    <div className={styles.railSection}>
                      <div className={`${styles.railDot} ${styles.railDotRed}`} />
                    </div>
                  </div>

                  <div className={styles.sections}>
                    <section className={styles.section}>
                      <div className={styles.sectionMeta}>
                        <span className={`${styles.sectionLabel} ${styles.sectionLabelAmber}`}>
                          Clarifying questions to ask
                        </span>
                        <span className={styles.timeBadge}>ask first</span>
                      </div>
                      <div className={styles.cqList}>
                        {activeRoute.clarifyingQuestions.map((q) => (
                          <div key={`${q.number}-${q.text}`} className={styles.cqItem}>
                            <span className={styles.cqNum}>{q.number}</span>
                            <span className={styles.cqText}>{q.text}</span>
                          </div>
                        ))}
                      </div>
                    </section>

                    <section className={styles.section}>
                      <div className={styles.sectionMeta}>
                        <span className={styles.sectionLabel}>Hook</span>
                        <span className={styles.timeBadge}>5 sec</span>
                      </div>
                      <div className={styles.calloutHook}>
                        <p>{activeRoute.hook}</p>
                      </div>
                    </section>

                    <section className={styles.section}>
                      <div className={styles.sectionMeta}>
                        <span className={styles.sectionLabel}>Situation</span>
                        <span className={styles.timeBadge}>10 sec</span>
                      </div>
                      <p className={styles.bodyText}>{activeRoute.situation}</p>
                    </section>

                    <section className={styles.section}>
                      <div className={styles.sectionMeta}>
                        <span className={styles.sectionLabel}>Complication</span>
                        <span className={styles.timeBadge}>10 sec</span>
                      </div>
                      <p className={styles.bodyText}>{activeRoute.complication}</p>
                    </section>

                    <section className={styles.section}>
                      <div className={styles.sectionMeta}>
                        <span className={styles.sectionLabel}>Action</span>
                        <span className={styles.timeBadge}>30 sec</span>
                      </div>
                      <div className={styles.actionList}>
                        {activeRoute.action.map((action) => (
                          <div key={`${action.number}-${action.title}`} className={styles.actionItem}>
                            <div className={styles.actionArrowCol}>
                              <span className={styles.actionArrow}>→</span>
                              <div className={styles.actionLine} />
                            </div>
                            <div className={styles.actionContent}>
                              <p className={styles.actionNum}>
                                {action.number} · {action.priority}
                              </p>
                              <p className={styles.actionTitle}>{action.title}</p>
                              <p className={styles.actionBody}>{action.body}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>

                    <section className={styles.section}>
                      <div className={styles.sectionMeta}>
                        <span className={`${styles.sectionLabel} ${styles.sectionLabelGreen}`}>
                          Result · Expected impact
                        </span>
                        <span className={styles.timeBadge}>10 sec</span>
                      </div>
                      <div className={styles.resultStat}>
                        {activeRoute.resultStats.map((stat) => (
                          <div key={`${stat.label}-${stat.value}`} className={styles.statCard}>
                            <p className={styles.statLabel}>{stat.label}</p>
                            <p className={styles.statValue}>{stat.value}</p>
                          </div>
                        ))}
                      </div>
                      <p className={`${styles.bodyText} ${styles.resultBody}`}>{activeRoute.resultBody}</p>
                    </section>

                    <section className={`${styles.section} ${styles.sectionNoBorder}`}>
                      <div className={styles.sectionMeta}>
                        <span className={`${styles.sectionLabel} ${styles.sectionLabelRed}`}>Insight</span>
                        <span className={styles.timeBadge}>10 sec</span>
                      </div>
                      <div className={styles.calloutInsight}>
                        <p>{activeRoute.insight}</p>
                      </div>
                    </section>
                  </div>
                </div>

                <div className={styles.answerFooter}>
                  <span className={styles.totalTime}>
                    Total speak time · <strong>{activeRoute.speakTime}</strong>
                  </span>
                  <div className={styles.footerActions}>
                    <button type="button" className={styles.copyBtn} onClick={onCopy}>
                      {copiedLabel}
                    </button>
                    <button type="button" className={styles.copyBtn} onClick={reset}>
                      New question
                    </button>
                  </div>
                </div>
              </motion.section>
            </AnimatePresence>
          </>
        ) : null}

        <footer className={styles.pageFooter}>
          PM Interview Coach · Day 09 · 75 Products 75 Days · Ashish Gayakwar
        </footer>
      </div>
    </main>
  );
}
