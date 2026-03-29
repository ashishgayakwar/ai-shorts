"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

type Competitor = {
  name: string;
  domain: string;
  tagline: string;
  pricing: string;
  description: string;
  target_audience: string;
  key_features: string[];
  weaknesses: string[];
  strength: string;
};

type Opportunity = {
  title: string;
  summary: string;
  gaps: string[];
};

type CompetitorResponse = {
  industry: string;
  competitors: Competitor[];
  opportunity: Opportunity;
  error?: string;
};

const STEPS = [
  "Identifying top competitors",
  "Analyzing pricing & positioning",
  "Mapping features & weaknesses",
  "Finding market gaps",
  "Compiling report",
];

async function sha256Hex(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const digest = await window.crypto.subtle.digest("SHA-256", data);
  const bytes = Array.from(new Uint8Array(digest));
  return bytes.map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function buildFingerprint(): Promise<string> {
  if (typeof window === "undefined") return "server";

  const nav = window.navigator;
  const screenInfo = window.screen;
  const raw = [
    nav.language || "unknown",
    nav.platform || "unknown",
    `${screenInfo?.width ?? 0}x${screenInfo?.height ?? 0}`,
    String(screenInfo?.colorDepth ?? 0),
    String(new Date().getTimezoneOffset()),
  ].join("|");

  try {
    return await sha256Hex(raw);
  } catch {
    return "fingerprint-unavailable";
  }
}

export default function CompetitorAnalysisPage() {
  const [industryInput, setIndustryInput] = useState("");
  const [searchedQuery, setSearchedQuery] = useState("");
  const [isSearchEditMode, setIsSearchEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<CompetitorResponse | null>(null);
  const [visibleSteps, setVisibleSteps] = useState<number>(0);
  const [doneSteps, setDoneSteps] = useState<number>(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!loading) return;

    const timers: number[] = [];
    STEPS.forEach((_, index) => {
      timers.push(
        window.setTimeout(() => {
          setVisibleSteps((prev) => Math.max(prev, index + 1));
        }, index * 1300)
      );
      timers.push(
        window.setTimeout(() => {
          setDoneSteps((prev) => Math.max(prev, index + 1));
        }, index * 1300 + 800)
      );
    });

    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [loading]);

  const canAnalyze = useMemo(() => industryInput.trim().length >= 2 && !loading, [industryInput, loading]);

  async function analyze() {
    const industry = industryInput.trim();
    if (industry.length < 2 || loading) return;

    setError("");
    setResult(null);
    setVisibleSteps(0);
    setDoneSteps(0);
    setLoading(true);

    try {
      const fingerprint = await buildFingerprint();
      const response = await fetch("/api/competitor-analysis", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-fingerprint": fingerprint,
        },
        body: JSON.stringify({ industry }),
      });

      const payload = (await response.json().catch(() => null)) as CompetitorResponse | null;

      if (!response.ok || !payload) {
        setError(payload?.error || "Unable to analyze competitors right now. Please try again.");
        return;
      }

      setResult(payload);
      setSearchedQuery(industry);
      setIsSearchEditMode(false);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function resetSearch() {
    setIndustryInput("");
    setSearchedQuery("");
    setIsSearchEditMode(false);
    setError("");
    setResult(null);
    setVisibleSteps(0);
    setDoneSteps(0);
  }

  function activateSearchEditMode() {
    setIsSearchEditMode(true);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }

  return (
    <main className="comp-page font-lexend">
      <nav className="comp-nav shell">
        <Link href="/" className="comp-nav-logo">
          AIPMWORLD
        </Link>
        <div className="comp-nav-links">
          <Link href="/pm-resume-screener">Resume</Link>
          <Link href="/user-story-generator">Stories</Link>
          <Link href="/book-summarizer">Books</Link>
          <Link href="/">Home</Link>
        </div>
      </nav>

      <header className="comp-header shell">
        <p className="eyebrow">Product 04 / 75</p>
        <h1 className="page-title">Competitor Analysis</h1>
        <p className="page-desc">
          Enter an industry or product space. Get the top 5 competitors mapped with pricing,
          audience, features, weaknesses, and where you can win.
        </p>
      </header>

      <section className="container shell">
        {result && !isSearchEditMode ? (
          <div className="query-focus-bar">
            <div className="query-focus-inner">
              <span className="query-focus-label">Search Context</span>
              <span className="query-focus-value">{(searchedQuery || industryInput).toUpperCase()}</span>
            </div>
            <button type="button" className="query-focus-action" onClick={activateSearchEditMode}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16Zm10 2-4.35-4.35"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Search more
            </button>
          </div>
        ) : (
          <div className="input-block">
            <label className="input-label" htmlFor="industryInput">
              Industry or product space
            </label>
            <div className="input-row">
              <input
                ref={inputRef}
                id="industryInput"
                type="text"
                value={industryInput}
                onChange={(e) => setIndustryInput(e.target.value)}
                placeholder="e.g. AI note-taking, online fitness coaching, B2B invoicing..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") analyze();
                }}
              />
              <button type="button" onClick={analyze} disabled={!canAnalyze}>
                Analyze →
              </button>
            </div>
          </div>
        )}

        {error ? <div className="error">{error}</div> : null}

        {loading ? (
          <div className="loading">
            <p className="loading-label">
              Researching market <span className="pulse" />
            </p>
            <div className="lsteps">
              {STEPS.map((step, idx) => {
                const isVisible = visibleSteps > idx;
                const isDone = doneSteps > idx;
                return (
                  <div key={step} className={`lstep ${isVisible ? "show" : ""} ${isDone ? "done" : ""}`}>
                    <span className="ldot" />
                    <span>{step}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {result ? (
          <section className="results">
            <div className="results-meta">
              <div>
                <p className="results-eyebrow">Competitor landscape</p>
                <p className="results-industry">{result.industry}</p>
              </div>
              <button type="button" className="reset-btn" onClick={resetSearch}>
                ← New search
              </button>
            </div>

            <div className="cards-grid">
              {result.competitors.map((c, i) => {
                const wide = i === 4;
                return (
                  <article key={`${c.name}-${i}`} className={`comp-card visible ${wide ? "comp-card-wide" : ""}`}>
                    <div className="card-main">
                      <div className="card-header-row">
                        <div className="card-header-left">
                          <span className="card-rank">{String(i + 1).padStart(2, "0")}</span>
                          <div className="card-title-wrap">
                            <div className="card-name">{c.name}</div>
                            <div className="card-tagline">{c.tagline || ""}</div>
                          </div>
                        </div>
                        <div className="card-logo" aria-label={`${c.name} logo`}>
                          <img
                            src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(c.domain)}&sz=128`}
                            alt={`${c.name} logo`}
                            loading="lazy"
                            onError={(event) => (event.currentTarget.style.display = "none")}
                          />
                        </div>
                      </div>

                      <div className="card-divider" />

                      <p className="card-description">{c.description || ""}</p>

                      <div className="card-audience-row">
                        <span className="field-label">Target Audience</span>
                        <span className="field-value">{c.target_audience || ""}</span>
                      </div>
                    </div>

                    <div className="card-features-weaknesses">
                      <div className="card-features">
                        <span className="field-label">Key Features</span>
                        <div className="feature-tags">
                          {c.key_features.slice(0, 5).map((feature) => (
                            <span key={feature} className="ftag">
                              {feature}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="card-weaknesses">
                        <span className="field-label">Weaknesses</span>
                        <div className="weakness-list">
                          {c.weaknesses.map((weakness) => (
                            <div key={weakness} className="wrow">
                              <span className="wdash">—</span>
                              <span>{weakness}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="card-strength">
                        <span className="field-label">Why They&apos;re Strong</span>
                        <p className="strength-text">{c.strength}</p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="opp-block visible">
              <div className="opp-inner">
                <div className="opp-left">
                  <p className="opp-eyebrow">Market Opportunity</p>
                  <p className="opp-title">{result.opportunity.title}</p>
                  <p className="opp-summary">{result.opportunity.summary}</p>
                </div>
                <div className="opp-right">
                  <p className="opp-gaps-label">Where you can win</p>
                  <div className="opp-gaps">
                    {result.opportunity.gaps.map((g, i) => (
                      <div key={g} className="gap-row">
                        <span className="gap-num">{String(i + 1).padStart(2, "0")}</span>
                        <span className="gap-text">{g}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        ) : null}
      </section>

      <footer className="comp-footer shell">
        <span className="footer-copy">© 2026 Ashish Gayakwar · AIPMWORLD</span>
        <span className="footer-badge">75 Products · 75 Days</span>
      </footer>

      <style>{`
        :root {
          --bg: #f5f0e8;
          --card: #ffffff;
          --border: #ddd8ce;
          --text: #1a1612;
          --muted: #8a8278;
          --accent: #c0392b;
          --rank: #e0d9d0;
          --radius-sm: 10px;
          --radius-md: 14px;
          --radius-lg: 18px;
          --radius-xl: 22px;
        }
        * { box-sizing: border-box; }

        .comp-page {
          min-height: 100vh;
          background: var(--bg);
          color: var(--text);
          font-family: "Lexend", sans-serif;
        }
        .shell {
          width: 100%;
          max-width: 1400px;
          margin: 0 auto;
          padding-left: 64px;
          padding-right: 64px;
        }

        .comp-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid var(--border);
          padding-top: 18px;
          padding-bottom: 18px;
        }
        .comp-nav-logo {
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--text);
          text-decoration: none;
        }
        .comp-nav-links {
          display: flex;
          gap: 22px;
        }
        .comp-nav-links a {
          font-size: 10px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--muted);
          text-decoration: none;
          border: 1px solid transparent;
          border-radius: 999px;
          padding: 6px 10px;
          transition: border-color 0.2s ease, background 0.2s ease, color 0.2s ease;
        }
        .comp-nav-links a:hover {
          border-color: var(--border);
          background: rgba(255, 255, 255, 0.55);
          color: var(--text);
        }

        .comp-header {
          padding-top: 44px;
          padding-bottom: 30px;
          border-bottom: 1px solid var(--border);
        }
        .eyebrow,
        .input-label,
        .loading-label,
        .results-eyebrow,
        .field-label,
        .opp-eyebrow,
        .opp-gaps-label {
          font-size: 10px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #b0a898;
          font-weight: 600;
        }
        .eyebrow {
          color: var(--accent);
          margin: 0 0 12px;
        }
        .page-title {
          margin: 0 0 12px;
          font-size: 38px;
          line-height: 1.05;
          letter-spacing: -0.03em;
          font-weight: 800;
        }
        .page-desc {
          margin: 0;
          max-width: 620px;
          font-size: 12px;
          line-height: 1.7;
          color: var(--muted);
        }

        .container {
          padding-top: 36px;
          padding-bottom: 72px;
        }

        .input-block {
          background: var(--card);
          border: 1px solid var(--border);
          padding: 24px;
          margin-bottom: 28px;
          border-radius: var(--radius-lg);
        }
        .query-focus-bar {
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          margin-bottom: 28px;
          padding: 22px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
        }
        .query-focus-inner {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .query-focus-label {
          font-size: 10px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #b0a898;
          font-weight: 600;
        }
        .query-focus-value {
          font-size: clamp(32px, 4.2vw, 56px);
          line-height: 1;
          letter-spacing: -0.03em;
          font-weight: 800;
          color: var(--text);
          word-break: break-word;
        }
        .query-focus-action {
          border: 1px solid var(--border);
          background: #fff;
          color: var(--muted);
          border-radius: 999px;
          padding: 10px 14px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-family: "Lexend", sans-serif;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          cursor: pointer;
          flex-shrink: 0;
          transition: border-color 0.2s ease, color 0.2s ease, background 0.2s ease;
        }
        .query-focus-action:hover {
          border-color: var(--accent);
          color: var(--accent);
          background: #fff8f5;
        }
        .input-label { margin-bottom: 10px; display: block; }
        .input-row {
          display: flex;
          border-radius: var(--radius-md);
          overflow: hidden;
        }
        .input-row input {
          flex: 1;
          border: 1px solid var(--border);
          border-right: none;
          padding: 12px 14px;
          font-size: 13px;
          color: var(--text);
          outline: none;
          background: #fff;
          font-family: "Lexend", sans-serif;
        }
        .input-row input::placeholder { color: var(--muted); }
        .input-row input:focus { border-color: var(--accent); }
        .input-row button {
          border: 1px solid var(--accent);
          background: var(--accent);
          color: #fff;
          padding: 0 20px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          cursor: pointer;
          font-family: "Lexend", sans-serif;
          flex-shrink: 0;
        }
        .input-row button:disabled {
          cursor: not-allowed;
          border-color: var(--border);
          background: #f0ebe3;
          color: var(--muted);
        }

        .error {
          border: 1px solid rgba(192, 57, 43, 0.25);
          background: rgba(192, 57, 43, 0.07);
          color: #a8453a;
          padding: 12px 14px;
          font-size: 12px;
          margin-bottom: 18px;
          border-radius: var(--radius-sm);
        }

        .loading {
          padding: 16px 18px 20px;
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          background: rgba(255, 255, 255, 0.7);
          margin-bottom: 10px;
        }
        .loading-label { margin: 0 0 14px; }
        .lsteps { display: flex; flex-direction: column; gap: 8px; }
        .lstep {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 12px;
          color: var(--muted);
          opacity: 0;
          transition: opacity 0.25s;
        }
        .lstep.show { opacity: 1; }
        .lstep.done { color: var(--text); }
        .ldot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #cfc7bc;
          flex-shrink: 0;
        }
        .lstep.done .ldot { background: var(--accent); }
        .pulse {
          display: inline-block;
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: var(--accent);
          margin-left: 4px;
          animation: pulse 1s ease-in-out infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.35; transform: scale(0.55); }
        }

        .results-meta {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 14px;
          border-bottom: 1px solid var(--border);
          padding-bottom: 14px;
          margin-bottom: 18px;
        }
        .results-eyebrow { margin: 0 0 6px; }
        .results-industry {
          margin: 0;
          font-size: 24px;
          font-weight: 700;
          line-height: 1.2;
          letter-spacing: -0.02em;
        }
        .reset-btn {
          border: 1px solid var(--border);
          background: #fff;
          color: var(--muted);
          font-size: 10px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          padding: 7px 12px;
          cursor: pointer;
          flex-shrink: 0;
          font-family: "Lexend", sans-serif;
          border-radius: 999px;
        }

        .cards-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 12px;
        }
        .comp-card {
          background: var(--card);
          border: 1px solid var(--border);
          padding: 32px 36px;
          border-radius: var(--radius-lg);
          display: flex;
          flex-direction: column;
          gap: 20px;
          opacity: 0;
          transform: translateY(8px);
          transition: opacity 0.3s ease, transform 0.3s ease;
        }
        .comp-card.visible {
          opacity: 1;
          transform: translateY(0);
        }

        .comp-card-wide {
          grid-column: 1 / -1;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 28px;
          align-items: start;
        }

        .card-main,
        .card-features-weaknesses {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .card-header-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
        }
        .card-header-left {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          min-width: 0;
          flex: 1;
        }
        .card-rank {
          font-size: 48px;
          line-height: 1;
          font-weight: 800;
          color: var(--rank);
          letter-spacing: -0.04em;
          width: 56px;
          flex-shrink: 0;
          user-select: none;
        }
        .card-title-wrap {
          min-width: 0;
        }
        .card-name {
          font-size: 20px;
          line-height: 1.2;
          font-weight: 700;
          color: var(--text);
        }
        .card-tagline {
          margin-top: 2px;
          font-size: 12px;
          line-height: 1.6;
          color: var(--muted);
          font-style: italic;
        }
        .card-logo {
          width: 56px;
          height: 56px;
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          background: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          overflow: hidden;
        }
        .card-logo img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          background: #fff;
        }

        .card-divider {
          height: 1px;
          background: #ede8df;
        }
        .card-audience-row {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .card-description {
          margin: 0;
          font-size: 13px;
          color: #4a453f;
          line-height: 1.75;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .field-value,
        .gap-text,
        .opp-summary,
        .wrow {
          font-size: 12px;
          line-height: 1.7;
          color: var(--text);
        }

        .feature-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .ftag {
          border: 1px solid var(--border);
          background: #f5f0e8;
          color: #6f675c;
          font-size: 10px;
          padding: 3px 8px;
          border-radius: 999px;
        }

        .weakness-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .wrow {
          display: flex;
          align-items: flex-start;
          gap: 8px;
        }
        .wdash {
          color: var(--accent);
          flex-shrink: 0;
        }
        .card-strength {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .strength-text {
          margin: 0;
          font-size: 12px;
          line-height: 1.7;
          color: var(--muted);
          font-style: italic;
        }

        .opp-block {
          width: 100%;
          border: 1px solid #302925;
          border-left: 3px solid #27ae60;
          background: #1a1612;
          padding: 30px 32px;
          margin-top: 4px;
          border-radius: var(--radius-xl);
          opacity: 0;
          transform: translateY(8px);
          transition: opacity 0.4s ease, transform 0.4s ease;
        }
        .opp-block.visible {
          opacity: 1;
          transform: translateY(0);
        }
        .opp-inner {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 30px;
        }
        .opp-eyebrow { color: #6fd692; margin: 0 0 10px; }
        .opp-title {
          margin: 0 0 10px;
          color: #fff;
          font-size: 24px;
          line-height: 1.2;
          letter-spacing: -0.02em;
          font-weight: 700;
        }
        .opp-summary {
          margin: 0;
          color: #efe7db;
        }
        .opp-gaps-label {
          margin: 0 0 12px;
          color: #a99f92;
          border-bottom: 1px solid #322b26;
          padding-bottom: 8px;
        }
        .opp-gaps {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .gap-row {
          display: flex;
          align-items: flex-start;
          gap: 10px;
        }
        .gap-num {
          flex-shrink: 0;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.08em;
          color: #6fd692;
          border: 1px solid rgba(111, 214, 146, 0.35);
          background: rgba(39, 174, 96, 0.12);
          border-radius: 999px;
          padding: 3px 8px;
        }
        .gap-text {
          color: #efe7db;
        }

        .comp-footer {
          border-top: 1px solid var(--border);
          padding-top: 24px;
          padding-bottom: 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .footer-copy {
          font-size: 10px;
          color: var(--muted);
          letter-spacing: 0.04em;
        }
        .footer-badge {
          font-size: 10px;
          color: var(--accent);
          letter-spacing: 0.12em;
          text-transform: uppercase;
          font-weight: 600;
        }

        @media (max-width: 900px) {
          .shell {
            padding-left: 32px;
            padding-right: 32px;
          }
          .cards-grid {
            grid-template-columns: 1fr;
          }
          .comp-card-wide {
            grid-template-columns: 1fr;
            gap: 18px;
          }
          .opp-inner {
            grid-template-columns: 1fr;
            gap: 18px;
          }
        }

        @media (max-width: 640px) {
          .comp-nav-links {
            display: none;
          }
          .page-title {
            font-size: 30px;
          }
          .input-row {
            flex-direction: column;
            gap: 10px;
            border-radius: 0;
            overflow: visible;
          }
          .query-focus-bar {
            flex-direction: column;
            align-items: flex-start;
            padding: 18px 16px;
          }
          .query-focus-value {
            font-size: 32px;
          }
          .query-focus-action {
            width: 100%;
            justify-content: center;
          }
          .input-row input {
            border-right: 1px solid var(--border);
            border-radius: var(--radius-sm);
          }
          .input-row button {
            height: 42px;
            border-radius: var(--radius-sm);
          }
          .results-meta {
            flex-direction: column;
            align-items: flex-start;
          }
          .card-header-left {
            gap: 10px;
          }
          .card-rank {
            font-size: 40px;
            width: 48px;
          }
        }

        @media (max-width: 520px) {
          .shell {
            padding-left: 20px;
            padding-right: 20px;
          }
          .comp-card {
            padding: 24px 20px;
            gap: 10px;
          }
          .comp-footer {
            flex-direction: column;
            gap: 8px;
            text-align: center;
          }
        }
      `}</style>
    </main>
  );
}
