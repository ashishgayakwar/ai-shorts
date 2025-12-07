"use client";

import { useEffect, useState } from "react";
import TinderCard from "react-tinder-card";
import { concepts } from "../../data/concepts";

type CardData = {
  title: string;
  summary: string;
};

export default function SwipePage() {
  const [index, setIndex] = useState(0);
  const [card, setCard] = useState<CardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const topic = concepts[index]?.topic;
  const total = concepts.length;

  useEffect(() => {
    const fetchConcept = async () => {
      if (!topic) return;
      setLoading(true);
      setError(null);
      setCard(null);

      try {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to fetch concept");
        }
        setCard({ title: data.title, summary: data.summary });
      } catch (err: any) {
        setError(err.message || "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchConcept();
  }, [topic]);

  const handleSwipe = () => {
    setIndex((prev) => prev + 1);
  };

  if (!topic) {
    return (
      <main className="ai-shorts-center-text">
        <div style={{ textAlign: "center" }}>
          <div style={{ marginBottom: 6 }}>🎓 You’re all caught up.</div>
          <div style={{ fontSize: 12 }}>
            Add more topics in <code>data/concepts.ts</code> to keep going.
          </div>
        </div>
      </main>
    );
  }

  if (loading || !card) {
    return (
      <main className="ai-shorts-center-text">
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 13, marginBottom: 6, color: "#9ca3af" }}>
            Preparing your next AI short…
          </div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>{topic}</div>
        </div>
      </main>
    );
  }

  return (
    <div className="ai-shorts-shell">
      {/* Top bar */}
      <header className="ai-shorts-topbar">
        <div className="ai-shorts-brand">
          <div className="ai-shorts-brand-title">AI SHORTS</div>
          <div className="ai-shorts-brand-subtitle">
            80-word primers for busy PMs
          </div>
        </div>
        <div className="ai-shorts-chip">
          <span className="ai-shorts-chip-dot" />
          <span>Live · Swipe to learn</span>
        </div>
      </header>

{/* Hero Heading */}
<div className="ai-shorts-hero">
  <h1 className="ai-shorts-hero-title">AI Concepts</h1>
  <p className="ai-shorts-hero-sub">Learn one swipe at a time</p>
</div>


      {/* Progress */}
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

      {/* Main swipe card */}
      <main className="ai-shorts-main">
        <div className="card-stack-wrapper">
          <TinderCard
            onSwipe={handleSwipe}
            preventSwipe={["up", "down"]}
            className="absolute w-full h-full"
          >
            <div className="swipe-card">
              <div>
                <div className="swipe-card-meta-row">
                  <span className="swipe-card-tag">Today’s concept</span>
                  <span className="swipe-card-count">
                    {index + 1} / {total}
                  </span>
                </div>

                <div className="swipe-card-title">{card.title}</div>
                <div className="swipe-card-topic">
                  {topic} · foundation topic
                </div>

                <div className="swipe-card-summary">{card.summary}</div>
              </div>

              <div className="swipe-card-footer">
                <div className="swipe-chip">Generated with OpenAI</div>
                <div>Swipe ⟶ next concept</div>
              </div>
            </div>
          </TinderCard>
        </div>
      </main>
    </div>
  );
}
