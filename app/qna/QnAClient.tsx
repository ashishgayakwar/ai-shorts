"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { QnATopicWithSlug } from "@/interview_prep/lib/qna";
import TopicSidebar from "./components/TopicSidebar";
import TopicDropdown from "./components/TopicDropdown";
import QuestionCard from "./components/QuestionCard";

const LAST_TOPIC_KEY = "qna:last-topic-slug";

type Props = {
  title: string;
  topics: QnATopicWithSlug[];
  selectedSlug?: string;
  restoreLastTopic?: boolean;
};

export default function QnAClient({ title, topics, selectedSlug, restoreLastTopic = false }: Props) {
  const router = useRouter();

  const active = topics.find((topic) => topic.slug === selectedSlug) ?? topics[0] ?? null;

  const goToTopic = (slug: string) => {
    router.push(`/qna/${slug}`);
  };

  useEffect(() => {
    if (!active) return;
    window.localStorage.setItem(LAST_TOPIC_KEY, active.slug);
  }, [active]);

  useEffect(() => {
    if (!restoreLastTopic || !topics.length) return;
    const savedSlug = window.localStorage.getItem(LAST_TOPIC_KEY)?.trim();
    if (!savedSlug) return;
    const exists = topics.some((topic) => topic.slug === savedSlug);
    if (!exists || savedSlug === active?.slug) return;
    router.replace(`/qna/${savedSlug}`);
  }, [restoreLastTopic, topics, active?.slug, router]);

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
          <Link href="/interview" className="ai-header-pill">Interview</Link>
          <span className="ai-header-pill ai-header-pill-active">QnA</span>
          <Link href="/" className="ai-header-pill">Home</Link>
        </div>
      </header>

      <div className="ai-shorts-hero qna-hero">
        <h1 className="ai-shorts-hero-title">{title || "Topic QnA"}</h1>
        <p className="ai-shorts-hero-sub">Explore topic-wise interview questions and answers.</p>
      </div>

      <main className="ai-shorts-main">
        {!active ? (
          <div className="mx-auto w-full max-w-6xl rounded-2xl border border-white/12 bg-white/[0.03] p-6 text-slate-200">
            No topics found in <code>interview_prep/data/ai_interview_questions.json</code>.
          </div>
        ) : (
          <div className="w-full px-4 sm:px-6 lg:px-8">
            <div className="qna-layout">
              <aside className="qna-sidebar hidden lg:block" aria-label="QnA topics">
                <TopicSidebar topics={topics} activeSlug={active.slug} />
              </aside>

              <section className="qna-content min-w-0">
                <TopicDropdown
                  value={active.slug}
                  options={topics}
                  onChange={goToTopic}
                />

                <div className="mb-6 mt-4 md:mt-0">
                  <h2 className="text-2xl font-semibold text-white sm:text-3xl md:text-4xl">{active.topic}</h2>
                  <p className="mt-2 text-sm text-slate-300 sm:text-base">
                    {active.questions.length} questions. Answers will appear as they are added.
                  </p>
                </div>

                <div className="grid max-w-[900px] gap-3 sm:gap-4">
                  {active.qas.map((item, index) => (
                    <QuestionCard
                      key={`${active.id}-${index}`}
                      index={index}
                      question={item.q}
                      answer={item.a}
                    />
                  ))}
                </div>
              </section>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
