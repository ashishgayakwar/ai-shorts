"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { concepts } from "../../data/concepts.generated";

export default function SwipePage() {
  const [index, setIndex] = useState(0);
  const total = concepts.length;
  const concept = concepts[index];

  const handleNext = () => {
    if (index < total - 1) {
      setIndex((prev) => prev + 1);
    } else {
      // go to "all caught up" state
      setIndex(total);
    }
  };

  // no more topics left
  if (!concept) {
    return (
      <main className="ai-shorts-center-text">
        <div style={{ textAlign: "center" }}>
          <div style={{ marginBottom: 6 }}>🎓 You’re all caught up.</div>
          <div style={{ fontSize: 12 }}>
            You’ve finished all {total} AI concepts.
            To add more, edit <code>data/concepts.js</code> and
            re-run the generator script.
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
          <span>Static · Instant · No API calls</span>
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
              onClick={handleNext}
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
                <div>Tap → next concept</div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
