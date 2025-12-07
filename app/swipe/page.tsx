"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { concepts } from "../../data/concepts.generated";

export default function SwipePage() {
  const [index, setIndex] = useState(0);
  const total = concepts.length;
  const concept = concepts[index];

  const goNext = () => {
    if (index < total - 1) {
      setIndex((prev) => prev + 1);
    } else {
      // move into "all caught up" state
      setIndex(total);
    }
  };

  const goPrev = () => {
    if (index === total) {
      // if you're on the "caught up" screen, go back to last card
      setIndex(total - 1);
    } else if (index > 0) {
      setIndex((prev) => prev - 1);
    }
  };

  // click handler: left half = previous, right half = next
  const handleCardClick = (
    e: React.MouseEvent<HTMLDivElement, MouseEvent>
  ) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;

    if (x < rect.width / 2) {
      goPrev();
    } else {
      goNext();
    }
  };

  // no more topics left
  if (!concept) {
    return (
      <main className="ai-shorts-center-text">
        <div style={{ textAlign: "center" }}>
          <div style={{ marginBottom: 6 }}>🎓 You’re all caught up.</div>
          <div style={{ fontSize: 12 }}>
            You’ve finished all {total} AI concepts. To add more,
            edit <code>data/concepts.js</code> and re-run the generator.
          </div>
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

      {/* Hero */}
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

      {/* Main card with smooth transition */}
      <main className="ai-shorts-main">
        <div className="card-stack-wrapper">
          <AnimatePresence mode="wait">
            <motion.div
              key={index}
              className="swipe-card"
              initial={{ opacity: 0, y: 14, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -14, scale: 0.97 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              onClick={handleCardClick}
            >
              <div>
                <div className="swipe-card-meta-row">
                  <span className="swipe-card-tag">Today’s concept</span>
                  <span className="swipe-card-count">
                    {index + 1} / {total}
                  </span>
                </div>

                <div className="swipe-card-title">{concept.title}</div>
                <div className="swipe-card-topic">
                  {concept.topic} · foundation topic
                </div>

                <div className="swipe-card-summary">{concept.summary}</div>
              </div>

              <div className="swipe-card-footer">
                <div className="swipe-chip">Pre-generated with OpenAI</div>
                <div>Tap left for previous · right for next →</div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
