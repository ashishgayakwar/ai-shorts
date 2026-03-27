"use client";

import { FormEvent, useMemo, useState } from "react";
import Image from "next/image";
import { Cormorant_Garamond, Instrument_Sans } from "next/font/google";

type Idea = {
  headline: string;
  summary: string;
};

type Quote = {
  text: string;
  context: string;
};

type SummaryResponse = {
  essence: string;
  publishedYear: number;
  author: string;
  ideas: Idea[];
  quotes: Quote[];
  whoShouldRead: string;
  coverUrl: string | null;
};

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
});

const instrument = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-instrument",
});

const MAX_USES = 5;

function normalizeWhitespace(text: string): string {
  return text.replace(/\u0000/g, "").replace(/\s+/g, " ").trim();
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function sha256Hex(input: string): Promise<string> {
  if (typeof window === "undefined" || !window.crypto?.subtle) return input;

  const data = new TextEncoder().encode(input);
  const digest = await window.crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function buildFingerprint(): Promise<string> {
  if (typeof window === "undefined") return "server";

  const raw = [
    navigator.language || "",
    navigator.platform || "",
    String(window.screen?.width || 0),
    String(window.screen?.height || 0),
    String(window.screen?.colorDepth || 0),
    String(new Date().getTimezoneOffset()),
  ].join("|");

  return sha256Hex(raw);
}

function SkeletonLines({ rows = 3 }: { rows?: number }) {
  return (
    <div className="sk-stack" aria-hidden="true">
      {Array.from({ length: rows }).map((_, idx) => (
        <span key={idx} className="sk-line" />
      ))}
    </div>
  );
}

export default function BookSummarizerPage() {
  const [titleInput, setTitleInput] = useState("");
  const [resultTitle, setResultTitle] = useState("");
  const [result, setResult] = useState<SummaryResponse | null>(null);
  const [usesLeft, setUsesLeft] = useState(MAX_USES);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coverFailed, setCoverFailed] = useState(false);
  const [animKey, setAnimKey] = useState(0);
  const showSkeleton = isLoading || !result;

  const canSubmit = !isLoading && normalizeWhitespace(titleInput).length >= 2;

  const ideaSlots = useMemo(() => {
    const fallback: Idea[] = [
      { headline: "Core Idea", summary: "Key concept extracted from the book." },
      { headline: "Mental Model", summary: "A decision lens from the book." },
      { headline: "Behavior Signal", summary: "What changes in how people think or act." },
      { headline: "Execution Angle", summary: "How to apply this in real decisions." },
      { headline: "Long-term Shift", summary: "What this changes over time." },
    ];

    return Array.from({ length: 5 }).map((_, idx) => result?.ideas[idx] || fallback[idx]);
  }, [result]);

  const quoteSlots = useMemo(() => {
    const fallback: Quote[] = [
      { text: "Strong signal from the book appears here.", context: "Context not available" },
      { text: "A second notable line appears here.", context: "Context not available" },
      { text: "A third notable line appears here.", context: "Context not available" },
    ];

    return Array.from({ length: 3 }).map((_, idx) => result?.quotes[idx] || fallback[idx]);
  }, [result]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedTitle = normalizeWhitespace(titleInput);

    if (normalizedTitle.length < 2) {
      setError("Please enter a valid book title.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const fingerprint = await buildFingerprint();
      const response = await fetch("/api/summarize", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-fingerprint": fingerprint,
        },
        body: JSON.stringify({ title: normalizedTitle }),
      });

      const remainingHeader = Number(response.headers.get("x-ratelimit-remaining"));
      if (Number.isFinite(remainingHeader)) {
        setUsesLeft(clamp(Math.floor(remainingHeader), 0, MAX_USES));
      }

      const payload = (await response.json().catch(() => null)) as
        | (SummaryResponse & {
            error?: string;
          })
        | null;

      if (!response.ok || !payload) {
        setError(payload?.error || "Unable to summarize right now. Please try again.");
        return;
      }

      setResult(payload as SummaryResponse);
      setResultTitle(normalizedTitle);
      setCoverFailed(!payload.coverUrl);
      setAnimKey((prev) => prev + 1);

      if (!Number.isFinite(remainingHeader)) {
        setUsesLeft((prev) => Math.max(0, prev - 1));
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleDownloadPdf() {
    if (typeof window === "undefined" || !result) return;

    const printWindow = window.open("", "_blank", "noopener,noreferrer");
    if (!printWindow) return;

    const ideasHtml = result.ideas
      .map(
        (idea, idx) => `
          <section class="block">
            <h3>${idx + 1}. ${escapeHtml(idea.headline)}</h3>
            <p>${escapeHtml(idea.summary)}</p>
          </section>
        `
      )
      .join("");

    const quotesHtml = result.quotes
      .map(
        (quote) => `
          <section class="block quote">
            <p>“${escapeHtml(quote.text)}”</p>
            <small>${escapeHtml(quote.context)}</small>
          </section>
        `
      )
      .join("");

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(resultTitle)} — Summary</title>
          <style>
            body {
              margin: 0;
              font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
              background: #101010;
              color: #f5f0e8;
              padding: 32px;
              line-height: 1.7;
            }
            h1 {
              font-size: 28px;
              margin: 0 0 12px;
            }
            h2 {
              font-size: 13px;
              margin: 26px 0 10px;
              text-transform: uppercase;
              letter-spacing: 1.6px;
              color: #c4533a;
            }
            h3 {
              font-size: 17px;
              margin: 0 0 8px;
            }
            p { margin: 0; }
            .meta { opacity: 0.65; margin-bottom: 20px; font-size: 13px; }
            .block {
              background: #1a1a1a;
              border: 1px solid rgba(255,255,255,0.1);
              border-radius: 10px;
              padding: 14px 16px;
              margin-bottom: 12px;
            }
            .quote p { font-style: italic; }
            .quote small { opacity: 0.6; display: block; margin-top: 8px; }
          </style>
        </head>
        <body>
          <h1>${escapeHtml(resultTitle)}</h1>
          <p class="meta">Published: ${result.publishedYear} · ${escapeHtml(result.author)}</p>

          <h2>Essence</h2>
          <section class="block"><p>${escapeHtml(result.essence)}</p></section>

          <h2>Ideas</h2>
          ${ideasHtml}

          <h2>Quotes</h2>
          ${quotesHtml}

          <h2>Who Should Read</h2>
          <section class="block"><p>${escapeHtml(result.whoShouldRead)}</p></section>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    window.setTimeout(() => printWindow.print(), 250);
  }

  if (!result) {
    return (
      <div className={`page ${cormorant.variable} ${instrument.variable}`}>
        <nav>
          <a className="nav-logo" href="/">
            aipmworld
          </a>
          <span className="nav-center">75 Products · 75 Days</span>
          <div className="nav-pill">
            <span className="nav-dot" /> Day 03
          </div>
        </nav>

        <div className="page-head">
          <div>
            <p className="eyebrow">Book Intelligence</p>
            <h1 className="page-title">
              Every book
              <strong>distilled.</strong>
            </h1>
          </div>
          <div>
            <p className="head-sub">
              Enter a book title. Get the core thesis, key ideas, notable quotes, and who should read it — in a bento
              grid you can download.
            </p>
            <form className="input-wrap" onSubmit={handleSubmit}>
              <div className="input-field">
                <span className="field-label">Book Title</span>
                <input
                  className="field-input"
                  type="text"
                  value={titleInput}
                  onChange={(event) => setTitleInput(event.target.value)}
                  placeholder="e.g. Atomic Habits"
                />
              </div>
              <div className="input-action">
                <span className="uses-text">{usesLeft} of 5 free summaries left</span>
                <button type="submit" className="btn-go" disabled={!canSubmit}>
                  {isLoading ? "Summarizing..." : "Summarize →"}
                </button>
              </div>
              {error ? <p className="error">{error}</p> : null}
            </form>
          </div>
        </div>

        <div className="bento-section">
          <div className="result-bar">
            <div className="result-meta">
              <span className="result-title">&nbsp;</span>
              <span className="result-author">&nbsp;</span>
            </div>
            <button className="btn-dl" type="button" disabled>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path
                  d="M6 1v7M3 6l3 3 3-3M1 11h10"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Download PDF
            </button>
          </div>

          <div className="bento loading">
            <div className="b-cover">
              <div className="sk-block sk-cover" />
            </div>
            <div className="b-hero">
              <SkeletonLines rows={4} />
            </div>
            <div className="b-stat">
              <SkeletonLines rows={3} />
            </div>
            <div className="b-idea-a">
              <SkeletonLines rows={4} />
            </div>
            <div className="b-idea-b">
              <SkeletonLines rows={4} />
            </div>
            <div className="b-idea-c">
              <SkeletonLines rows={3} />
            </div>
            <div className="b-idea-d">
              <SkeletonLines rows={3} />
            </div>
            <div className="b-idea-e">
              <SkeletonLines rows={3} />
            </div>
            <div className="b-quote-a">
              <SkeletonLines rows={4} />
            </div>
            <div className="b-quote-b">
              <SkeletonLines rows={4} />
            </div>
            <div className="b-reader">
              <SkeletonLines rows={4} />
            </div>
          </div>
        </div>

        <div className="foot">aipmworld.com · 75 Products in 75 Days · Day 03 of 75</div>
        <style jsx>{styles}</style>
      </div>
    );
  }

  const coverLetter = resultTitle.charAt(0).toUpperCase() || "B";

  return (
    <div className={`page ${cormorant.variable} ${instrument.variable}`}>
      <nav>
        <a className="nav-logo" href="/">
          aipmworld
        </a>
        <span className="nav-center">75 Products · 75 Days</span>
        <div className="nav-pill">
          <span className="nav-dot" /> Day 03
        </div>
      </nav>

      <div className="page-head">
        <div>
          <p className="eyebrow">Book Intelligence</p>
          <h1 className="page-title">
            Every book
            <strong>distilled.</strong>
          </h1>
        </div>
        <div>
          <p className="head-sub">
            Enter a book title. Get the core thesis, key ideas, notable quotes, and who should read it — in a bento
            grid you can download.
          </p>
          <form className="input-wrap" onSubmit={handleSubmit}>
            <div className="input-field">
              <span className="field-label">Book Title</span>
              <input
                className="field-input"
                type="text"
                value={titleInput}
                onChange={(event) => setTitleInput(event.target.value)}
                placeholder="e.g. Atomic Habits"
              />
            </div>
            <div className="input-action">
              <span className="uses-text">{usesLeft} of 5 free summaries left</span>
              <button type="submit" className="btn-go" disabled={!canSubmit}>
                {isLoading ? "Summarizing..." : "Summarize →"}
              </button>
            </div>
            {error ? <p className="error">{error}</p> : null}
          </form>
        </div>
      </div>

      <div className="bento-section">
        <div className="result-bar">
          <div className="result-meta">
            <span className="result-title">{showSkeleton ? "\u00A0" : resultTitle}</span>
            <span className="result-author">{showSkeleton ? "\u00A0" : `by ${result.author}`}</span>
          </div>
          <button className="btn-dl" type="button" onClick={handleDownloadPdf} disabled={showSkeleton}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path
                d="M6 1v7M3 6l3 3 3-3M1 11h10"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Download PDF
          </button>
        </div>

        <div key={animKey} className={`bento ${showSkeleton ? "loading" : "animate-grid"}`}>
          <div className="b-cover" style={!showSkeleton ? { animationDelay: "0ms" } : undefined}>
            {showSkeleton ? (
              <div className="sk-block sk-cover" />
            ) : (
              <>
                {!coverFailed && !!result.coverUrl ? (
                  <Image
                    src={result.coverUrl}
                    alt={`${resultTitle} cover`}
                    className="cover-img"
                    fill
                    unoptimized
                    sizes="(max-width: 768px) calc(100vw - 32px), (max-width: 960px) 50vw, 30vw"
                    onError={() => setCoverFailed(true)}
                  />
                ) : null}
                {coverFailed || !result.coverUrl ? (
                  <div className="cover-fallback">{coverLetter}</div>
                ) : null}
                <div className="cover-overlay">
                  <p className="cover-book-name">{resultTitle}</p>
                </div>
              </>
            )}
          </div>

          <div className="b-hero" style={!showSkeleton ? { animationDelay: "50ms" } : undefined}>
            {showSkeleton ? (
              <SkeletonLines rows={4} />
            ) : (
              <>
                <p className="chip">Core Thesis</p>
                <p className="hero-text">{result.essence}</p>
              </>
            )}
          </div>

          <div className="b-stat" style={!showSkeleton ? { animationDelay: "100ms" } : undefined}>
            {showSkeleton ? (
              <SkeletonLines rows={3} />
            ) : (
              <>
                <span className="s-label">First Published</span>
                <span className="s-num">{result.publishedYear}</span>
                <span className="s-desc">{result.author}</span>
              </>
            )}
          </div>

          <div className="b-idea-a" style={!showSkeleton ? { animationDelay: "150ms" } : undefined}>
            {showSkeleton ? (
              <SkeletonLines rows={4} />
            ) : (
              <>
                <span className="i-num">01</span>
                <div className="idea-bar" />
                <h3 className="idea-hl">{ideaSlots[0].headline}</h3>
                <p className="idea-body">{ideaSlots[0].summary}</p>
              </>
            )}
          </div>

          <div className="b-idea-b" style={!showSkeleton ? { animationDelay: "200ms" } : undefined}>
            {showSkeleton ? (
              <SkeletonLines rows={4} />
            ) : (
              <>
                <span className="i-num">02</span>
                <div className="idea-bar" />
                <h3 className="idea-hl">{ideaSlots[1].headline}</h3>
                <p className="idea-body">{ideaSlots[1].summary}</p>
              </>
            )}
          </div>

          <div className="b-idea-c" style={!showSkeleton ? { animationDelay: "250ms" } : undefined}>
            {showSkeleton ? (
              <SkeletonLines rows={3} />
            ) : (
              <>
                <span className="i-num">03</span>
                <div className="idea-bar" />
                <h3 className="idea-hl">{ideaSlots[2].headline}</h3>
                <p className="idea-body">{ideaSlots[2].summary}</p>
              </>
            )}
          </div>

          <div className="b-idea-d" style={!showSkeleton ? { animationDelay: "300ms" } : undefined}>
            {showSkeleton ? (
              <SkeletonLines rows={3} />
            ) : (
              <>
                <span className="i-num">04</span>
                <div className="idea-bar" />
                <h3 className="idea-hl">{ideaSlots[3].headline}</h3>
                <p className="idea-body">{ideaSlots[3].summary}</p>
              </>
            )}
          </div>

          <div className="b-idea-e" style={!showSkeleton ? { animationDelay: "350ms" } : undefined}>
            {showSkeleton ? (
              <SkeletonLines rows={3} />
            ) : (
              <>
                <span className="i-num">05</span>
                <div className="idea-bar" />
                <h3 className="idea-hl">{ideaSlots[4].headline}</h3>
                <p className="idea-body">{ideaSlots[4].summary}</p>
              </>
            )}
          </div>

          <div className="b-quote-a" style={!showSkeleton ? { animationDelay: "400ms" } : undefined}>
            {showSkeleton ? (
              <SkeletonLines rows={4} />
            ) : (
              <>
                <div>
                  <div className="q-mark">&quot;</div>
                  <p className="q-text">{quoteSlots[0].text}</p>
                </div>
                <p className="q-ctx">{quoteSlots[0].context}</p>
              </>
            )}
          </div>

          <div className="b-quote-b" style={!showSkeleton ? { animationDelay: "450ms" } : undefined}>
            {showSkeleton ? (
              <SkeletonLines rows={4} />
            ) : (
              <>
                <div>
                  <div className="q-mark">&quot;</div>
                  <p className="q-text">{quoteSlots[1].text}</p>
                </div>
                <p className="q-ctx">{quoteSlots[1].context}</p>
              </>
            )}
          </div>

          <div className="b-reader" style={!showSkeleton ? { animationDelay: "500ms" } : undefined}>
            {showSkeleton ? (
              <SkeletonLines rows={4} />
            ) : (
              <>
                <div>
                  <p className="reader-label">Who Should Read This</p>
                  <h3 className="reader-head">Built for decision-makers.</h3>
                </div>
                <p className="reader-body">{result.whoShouldRead}</p>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="foot">aipmworld.com · 75 Products in 75 Days · Day 03 of 75</div>

      <style jsx>{styles}</style>
    </div>
  );
}

const styles = `
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :global(html) { font-size: 16px; }

        .page {
          --parchment: #f5f0e8;
          --parchment2: #ede6d9;
          --parchment3: #e4dac9;
          --paper: #fdfaf5;
          --ink: #1c1510;
          --ink2: #2e271e;
          --ink3: #4a3f33;
          --terra: #c4533a;
          --terra2: #9e3f2a;
          --terra-pale: #f2e8e4;
          --rule: rgba(28, 21, 16, 0.08);
          --shadow: 0 1px 3px rgba(28, 21, 16, 0.06), 0 4px 16px rgba(28, 21, 16, 0.06);
          --shadow-md: 0 2px 8px rgba(28, 21, 16, 0.08), 0 8px 32px rgba(28, 21, 16, 0.08);

          --display: var(--font-cormorant), Georgia, serif;
          --sans: var(--font-instrument), system-ui, sans-serif;

          font-family: var(--sans);
          background: var(--parchment);
          color: var(--ink);
          min-height: 100vh;
          overflow-x: hidden;
          position: relative;
        }

        .page::before {
          content: "";
          position: fixed;
          inset: 0;
          z-index: 999;
          pointer-events: none;
          opacity: 0.025;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          background-size: 200px;
        }

        nav {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 5vw;
          border-bottom: 1px solid var(--rule);
          background: var(--paper);
          position: relative;
        }

        .nav-logo {
          font-family: var(--display);
          font-size: 18px;
          font-weight: 600;
          color: var(--ink);
          text-decoration: none;
          letter-spacing: 0.01em;
        }

        .nav-center {
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          font-size: 10px;
          letter-spacing: 4px;
          text-transform: uppercase;
          color: var(--ink3);
          opacity: 0.4;
        }

        .nav-pill {
          display: flex;
          align-items: center;
          gap: 7px;
          border: 1px solid var(--rule);
          border-radius: 99px;
          padding: 6px 14px;
          font-size: 11px;
          color: var(--ink3);
          background: var(--parchment);
        }

        .nav-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: var(--terra);
          flex-shrink: 0;
        }

        .page-head {
          width: 100%;
          padding: 72px 5vw 60px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 80px;
          align-items: end;
          border-bottom: 1px solid var(--rule);
          background: var(--paper);
        }

        .eyebrow {
          font-size: 10px;
          letter-spacing: 4px;
          text-transform: uppercase;
          color: var(--terra);
          margin-bottom: 20px;
        }

        .page-title {
          font-family: var(--display);
          font-size: clamp(52px, 5.5vw, 84px);
          font-weight: 300;
          line-height: 0.95;
          letter-spacing: -0.01em;
          color: var(--ink);
        }

        .page-title strong {
          display: block;
          font-weight: 700;
          font-style: italic;
          color: var(--ink);
        }

        .head-sub {
          font-size: 14px;
          line-height: 1.8;
          color: var(--ink3);
          opacity: 0.7;
          margin-bottom: 28px;
          max-width: 380px;
        }

        .input-wrap {
          border: 1px solid var(--rule);
          border-radius: 12px;
          overflow: hidden;
          background: var(--parchment);
          box-shadow: var(--shadow);
        }

        .input-field {
          padding: 18px 22px;
          border-bottom: 1px solid var(--rule);
        }

        .field-label {
          font-size: 9px;
          letter-spacing: 3px;
          text-transform: uppercase;
          color: var(--ink3);
          opacity: 0.5;
          margin-bottom: 8px;
          display: block;
        }

        .field-input {
          width: 100%;
          background: transparent;
          border: none;
          outline: none;
          font-family: var(--display);
          font-size: 18px;
          color: var(--ink);
        }

        .field-input::placeholder {
          color: rgba(28, 21, 16, 0.25);
        }

        .input-action {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 13px 20px;
        }

        .uses-text {
          font-size: 11px;
          color: var(--ink3);
          opacity: 0.45;
        }

        .btn-go {
          font-family: var(--sans);
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          background: var(--ink);
          color: var(--parchment);
          border: none;
          border-radius: 6px;
          padding: 10px 24px;
          cursor: pointer;
          transition: background 0.2s;
        }

        .btn-go:hover {
          background: var(--ink2);
        }

        .btn-go:disabled,
        .btn-dl:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .error {
          color: #9e3f2a;
          font-size: 12px;
          padding: 0 20px 14px;
        }

        .bento-section {
          width: 100%;
          padding: 52px 5vw 100px;
          background: var(--parchment);
        }

        .result-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 28px;
          gap: 12px;
          flex-wrap: wrap;
        }

        .result-meta {
          display: flex;
          align-items: baseline;
          gap: 12px;
          min-width: 0;
        }

        .result-title {
          font-family: var(--display);
          font-size: 32px;
          font-weight: 700;
          font-style: italic;
          color: var(--ink);
        }

        .result-author {
          font-size: 13px;
          opacity: 0.45;
          margin-left: 12px;
          font-style: normal;
          color: var(--ink3);
        }

        .btn-dl {
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: var(--sans);
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: var(--ink2);
          background: var(--paper);
          border: 1px solid var(--rule);
          border-radius: 6px;
          padding: 10px 20px;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: var(--shadow);
        }

        .btn-dl:hover {
          border-color: var(--ink3);
          background: var(--parchment2);
        }

        .bento {
          display: grid;
          grid-template-columns: repeat(12, 1fr);
          grid-template-rows: 300px 230px 230px 180px;
          gap: 12px;
          width: 100%;
        }

        .animate-grid > * {
          animation: fadeUp 0.45s ease both;
        }

        .b-cover {
          grid-column: 1 / 5;
          grid-row: 1 / 4;
          border-radius: 14px;
          overflow: hidden;
          position: relative;
          box-shadow: var(--shadow-md);
        }

        .cover-img {
          object-fit: cover;
          object-position: center top;
        }

        .cover-fallback {
          width: 100%;
          height: 100%;
          background: linear-gradient(160deg, var(--terra) 0%, var(--terra2) 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--display);
          font-size: 100px;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.2);
        }

        .cover-overlay {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: linear-gradient(transparent, rgba(28, 21, 16, 0.75));
          padding: 28px 18px 18px;
          z-index: 2;
        }

        .cover-book-name {
          font-family: var(--display);
          font-size: 13px;
          font-weight: 600;
          font-style: italic;
          color: #fff;
          line-height: 1.3;
        }

        .b-hero {
          grid-column: 5 / 10;
          grid-row: 1 / 2;
          background: var(--ink);
          border-radius: 14px;
          padding: 40px 44px;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          position: relative;
          overflow: hidden;
          box-shadow: var(--shadow-md);
        }

        .b-hero::before {
          content: '"';
          font-family: var(--display);
          font-size: 320px;
          font-weight: 700;
          color: var(--terra);
          opacity: 0.06;
          position: absolute;
          top: -70px;
          left: 24px;
          line-height: 1;
          pointer-events: none;
        }

        .chip {
          font-size: 9px;
          letter-spacing: 4px;
          text-transform: uppercase;
          color: var(--terra);
          margin-bottom: 14px;
        }

        .hero-text {
          font-family: var(--display);
          font-size: clamp(17px, 1.75vw, 22px);
          font-style: italic;
          font-weight: 400;
          line-height: 1.55;
          color: #f5f0e8;
          position: relative;
          z-index: 1;
        }

        .b-stat {
          grid-column: 10 / 13;
          grid-row: 1 / 2;
          background: var(--terra);
          border-radius: 14px;
          padding: 28px 28px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          box-shadow: var(--shadow-md);
        }

        .s-label {
          font-size: 9px;
          letter-spacing: 3px;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.65);
        }

        .s-num {
          font-family: var(--display);
          font-size: 110px;
          font-weight: 700;
          line-height: 0.85;
          color: #fff;
          opacity: 0.92;
        }

        .s-desc {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.6);
        }

        .b-idea-a,
        .b-idea-b,
        .b-idea-c,
        .b-idea-d,
        .b-idea-e {
          border-radius: 14px;
          display: flex;
          flex-direction: column;
          position: relative;
          overflow: hidden;
          box-shadow: var(--shadow);
          transition: box-shadow 0.25s;
        }

        .b-idea-a:hover,
        .b-idea-b:hover,
        .b-idea-c:hover,
        .b-idea-d:hover,
        .b-idea-e:hover {
          box-shadow: var(--shadow-md);
        }

        .b-idea-a {
          grid-column: 5 / 9;
          grid-row: 2 / 3;
          background: var(--paper);
          border: 1px solid var(--rule);
          padding: 28px 32px;
          gap: 13px;
        }

        .b-idea-b {
          grid-column: 9 / 12;
          grid-row: 2 / 3;
          background: var(--parchment2);
          border: 1px solid var(--rule);
          padding: 28px 28px;
          gap: 13px;
        }

        .b-idea-c {
          grid-column: 12 / 13;
          grid-row: 2 / 3;
          background: var(--terra-pale);
          border: 1px solid rgba(196, 83, 58, 0.12);
          padding: 20px 16px;
          gap: 13px;
          overflow: hidden;
        }

        .b-idea-d {
          grid-column: 5 / 8;
          grid-row: 3 / 4;
          background: var(--parchment3);
          border: 1px solid var(--rule);
          padding: 24px 26px;
          gap: 11px;
        }

        .b-idea-e {
          grid-column: 8 / 10;
          grid-row: 3 / 4;
          background: var(--paper);
          border: 1px solid var(--rule);
          padding: 24px 22px;
          gap: 11px;
        }

        .b-quote-a {
          grid-column: 10 / 12;
          grid-row: 3 / 4;
          background: var(--ink2);
          border-radius: 14px;
          padding: 24px 26px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 12px;
          box-shadow: var(--shadow-md);
        }

        .b-quote-b {
          grid-column: 12 / 13;
          grid-row: 3 / 4;
          background: var(--parchment2);
          border: 1px solid var(--rule);
          border-radius: 14px;
          padding: 20px 16px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 12px;
          box-shadow: var(--shadow);
          overflow: hidden;
        }

        .b-reader {
          grid-column: 1 / 13;
          grid-row: 4 / 5;
          background: var(--ink);
          border-radius: 14px;
          padding: 34px 48px;
          display: grid;
          grid-template-columns: 200px 1fr;
          gap: 52px;
          align-items: center;
          position: relative;
          overflow: hidden;
          box-shadow: var(--shadow-md);
        }

        .b-reader::before {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(110deg, rgba(196, 83, 58, 0.12) 0%, transparent 50%);
          pointer-events: none;
        }

        .b-reader::after {
          content: "→";
          font-family: var(--display);
          font-size: 150px;
          font-weight: 300;
          color: var(--terra);
          opacity: 0.06;
          position: absolute;
          right: 44px;
          top: 50%;
          transform: translateY(-50%);
          pointer-events: none;
        }

        .reader-label {
          font-size: 9px;
          letter-spacing: 4px;
          text-transform: uppercase;
          color: var(--terra);
          margin-bottom: 8px;
        }

        .reader-head {
          font-family: var(--display);
          font-size: 24px;
          font-weight: 600;
          font-style: italic;
          color: var(--parchment);
          line-height: 1.2;
        }

        .reader-body {
          font-size: 14px;
          line-height: 1.85;
          color: var(--parchment2);
          opacity: 0.8;
          position: relative;
          z-index: 1;
        }

        .idea-bar {
          width: 24px;
          height: 2px;
          background: var(--terra);
          border-radius: 99px;
          flex-shrink: 0;
        }

        .i-num {
          font-family: var(--display);
          font-size: 60px;
          font-weight: 700;
          color: var(--ink);
          opacity: 0.04;
          position: absolute;
          top: -6px;
          right: 12px;
          line-height: 1;
          pointer-events: none;
        }

        .idea-hl {
          font-family: var(--display);
          font-weight: 600;
          line-height: 1.25;
          color: var(--ink);
        }

        .b-idea-a .idea-hl { font-size: 22px; }
        .b-idea-b .idea-hl { font-size: 17px; }
        .b-idea-c .idea-hl { font-size: 13px; }
        .b-idea-d .idea-hl { font-size: 19px; }
        .b-idea-e .idea-hl { font-size: 15px; }

        .idea-body {
          line-height: 1.75;
          color: var(--ink3);
          opacity: 0.75;
        }

        .b-idea-a .idea-body { font-size: 13.5px; }
        .b-idea-b .idea-body { font-size: 12.5px; }
        .b-idea-c .idea-body { font-size: 11px; line-height: 1.6; }
        .b-idea-d .idea-body { font-size: 12.5px; }
        .b-idea-e .idea-body { font-size: 12px; }

        .q-mark {
          font-family: var(--display);
          font-size: 50px;
          font-weight: 300;
          line-height: 0.7;
          margin-bottom: -4px;
        }

        .b-quote-a .q-mark { color: var(--terra); opacity: 0.7; }
        .b-quote-b .q-mark { color: var(--terra); opacity: 0.4; }

        .q-text {
          font-family: var(--display);
          font-style: italic;
          line-height: 1.7;
          flex: 1;
        }

        .b-quote-a .q-text { font-size: 15px; color: var(--parchment); }
        .b-quote-b .q-text { font-size: 11px; line-height: 1.6; color: var(--ink); }

        .q-ctx {
          font-size: 9px;
          letter-spacing: 2px;
          text-transform: uppercase;
          padding-top: 10px;
        }

        .b-quote-a .q-ctx {
          color: rgba(245, 240, 232, 0.4);
          border-top: 1px solid rgba(245, 240, 232, 0.1);
        }

        .b-quote-b .q-ctx {
          color: var(--ink3);
          opacity: 0.4;
          border-top: 1px solid var(--rule);
        }

        .foot {
          text-align: center;
          padding: 24px;
          font-size: 10px;
          letter-spacing: 3px;
          text-transform: uppercase;
          color: var(--ink3);
          opacity: 0.3;
          border-top: 1px solid var(--rule);
          background: var(--paper);
        }

        .loading > * {
          animation: none !important;
        }

        .sk-stack {
          width: 100%;
          display: grid;
          gap: 8px;
        }

        .sk-line,
        .sk-block {
          position: relative;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.12);
          border-radius: 8px;
        }

        .sk-line {
          height: 12px;
        }

        .sk-line:nth-child(2n) {
          width: 85%;
        }

        .sk-line:nth-child(3n) {
          width: 65%;
        }

        .sk-cover {
          width: 100%;
          height: 100%;
          border-radius: 0;
        }

        .sk-line::after,
        .sk-block::after {
          content: "";
          position: absolute;
          inset: 0;
          transform: translateX(-100%);
          background: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0) 0%,
            rgba(255, 255, 255, 0.34) 50%,
            rgba(255, 255, 255, 0) 100%
          );
          animation: shimmer 1.1s ease-in-out infinite;
        }

        @keyframes shimmer {
          100% {
            transform: translateX(100%);
          }
        }

        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(14px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (max-width: 960px) {
          .bento {
            grid-template-columns: repeat(6, 1fr);
            grid-template-rows: auto;
          }

          .b-cover {
            grid-column: 1 / 3;
            grid-row: 1 / 3;
            min-height: 280px;
          }

          .b-hero {
            grid-column: 3 / 7;
            grid-row: 1;
          }

          .b-stat {
            grid-column: 3 / 5;
            grid-row: 2;
          }

          .b-idea-a {
            grid-column: 1 / 4;
            grid-row: auto;
          }

          .b-idea-b {
            grid-column: 4 / 7;
            grid-row: auto;
          }

          .b-idea-c,
          .b-idea-d,
          .b-idea-e {
            grid-column: span 2;
            grid-row: auto;
          }

          .b-quote-a {
            grid-column: 1 / 4;
            grid-row: auto;
          }

          .b-quote-b {
            grid-column: 4 / 7;
            grid-row: auto;
          }

          .b-reader {
            grid-column: 1 / 7;
            grid-template-columns: 1fr;
            gap: 16px;
          }

          .page-head {
            grid-template-columns: 1fr;
            gap: 36px;
            padding: 48px 5vw 36px;
          }
        }

        @media (max-width: 768px) {
          .bento-section {
            padding: 36px 16px 72px;
          }

          .result-bar {
            flex-direction: column;
            align-items: flex-start;
            gap: 10px;
          }

          .result-meta {
            width: 100%;
            flex-wrap: wrap;
            gap: 8px;
          }

          .result-title {
            font-size: 27px;
            line-height: 1.1;
          }

          .result-author {
            margin-left: 0;
            font-size: 12px;
          }

          .btn-dl {
            width: 100%;
            justify-content: center;
          }

          .bento {
            grid-template-columns: 1fr;
            grid-template-rows: auto;
            gap: 10px;
          }

          .b-cover,
          .b-hero,
          .b-stat,
          .b-idea-a,
          .b-idea-b,
          .b-idea-c,
          .b-idea-d,
          .b-idea-e,
          .b-quote-a,
          .b-quote-b,
          .b-reader {
            grid-column: 1 / -1;
            grid-row: auto;
          }

          .b-cover {
            min-height: 260px;
          }

          .b-hero {
            padding: 26px 22px;
          }

          .b-stat {
            padding: 22px 20px;
            gap: 16px;
          }

          .s-num {
            font-size: 72px;
          }

          .b-idea-a {
            padding: 22px 20px;
          }

          .b-idea-b {
            padding: 22px 20px;
          }

          .b-idea-c {
            padding: 20px 16px;
          }

          .b-idea-d {
            padding: 22px 20px;
          }

          .b-idea-e {
            padding: 20px 18px;
          }

          .b-quote-a {
            padding: 22px 20px;
          }

          .b-quote-b {
            padding: 20px 16px;
          }

          .b-reader {
            padding: 24px 20px;
            grid-template-columns: 1fr;
            gap: 16px;
          }
        }

        @media (max-width: 480px) {
          .page-head {
            padding: 40px 16px 30px;
          }

          .page-title {
            font-size: 58px;
            line-height: 0.95;
          }

          .result-title {
            font-size: 24px;
          }

          .b-cover {
            min-height: 220px;
          }

          .hero-text {
            font-size: 18px;
          }

          .s-num {
            font-size: 62px;
          }
        }
`;
