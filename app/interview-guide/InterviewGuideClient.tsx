"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

type Provider = "anthropic" | "openai" | "deepseek" | "gemini";

type CompanyBrief = {
  company: string;
  tagline: string;
  domain: string;
  overview: string;
  tag1: string;
  tag2: string;
  tag3: string;
  tag4: string;
  tag5: string;
  founded: string;
  hq: string;
  model: string;
  stage: string;
  strat_title: string;
  strat_p1: string;
  strat_p2: string;
  strat_p3: string;
};

type QuestionPayload = {
  q_cat: string;
  q_question: string;
  q_p1: string;
  q_p2: string;
  q_p3: string;
  q_pull: string;
  q_steps_intro: string;
  q_s1t: string;
  q_s1b: string;
  q_s2t: string;
  q_s2b: string;
  q_s3t: string;
  q_s3b: string;
  q_after: string;
  q_m1: string;
  q_m2: string;
  q_m3: string;
  q_verdict: string;
};

type QuestionCard = QuestionPayload & {
  id: number;
  open: boolean;
};

const PROVIDER: Provider = "openai"; // 'openai' | 'deepseek' | 'gemini' | 'anthropic'

const LOADING_STEPS = [
  "Compiling company brief...",
  "Researching the product...",
  "Writing the model answer...",
  "Almost ready...",
] as const;

const CATEGORIES = [
  "Product Sense",
  "Metrics & Execution",
  "Product Improvement",
  "Strategy & Vision",
  "Behavioural",
  "Guesstimate",
] as const;

const FOOTER_LINKS = [
  { href: "/", label: "Home" },
  { href: "/basics", label: "Basics" },
  { href: "/swipe", label: "Cards" },
  { href: "/swipe?mode=quiz", label: "Quiz" },
  { href: "/swipe?mode=visualize", label: "Visualize" },
  { href: "/compare", label: "Compare" },
  { href: "/interview", label: "Interview" },
  { href: "/qna", label: "QnA" },
  { href: "/case-study-generator", label: "Case Studio" },
  { href: "/user-story-generator", label: "User Stories" },
  { href: "/pm-framework-generator", label: "Frameworks" },
  { href: "/competitor-analysis", label: "Competitor Analysis" },
  { href: "/interview-guide", label: "Interview Guide" },
  { href: "/pm-resume-screener", label: "Resume Screener" },
  { href: "/maang-interview-series", label: "MAANG" },
] as const;

function cleanSingleLine(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim();
}

function safeParseJSON(raw: string): unknown {
  const clean = raw
    .replace(/^```[a-z]*\n?/i, "")
    .replace(/\n?```$/i, "")
    .trim();
  return JSON.parse(clean);
}

function normalizeCompany(raw: unknown, fallbackCompany: string): CompanyBrief {
  const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};

  return {
    company: cleanSingleLine(obj.company) || fallbackCompany,
    tagline: cleanSingleLine(obj.tagline),
    domain: cleanSingleLine(obj.domain),
    overview: cleanSingleLine(obj.overview),
    tag1: cleanSingleLine(obj.tag1),
    tag2: cleanSingleLine(obj.tag2),
    tag3: cleanSingleLine(obj.tag3),
    tag4: cleanSingleLine(obj.tag4),
    tag5: cleanSingleLine(obj.tag5),
    founded: cleanSingleLine(obj.founded),
    hq: cleanSingleLine(obj.hq),
    model: cleanSingleLine(obj.model),
    stage: cleanSingleLine(obj.stage),
    strat_title: cleanSingleLine(obj.strat_title),
    strat_p1: cleanSingleLine(obj.strat_p1),
    strat_p2: cleanSingleLine(obj.strat_p2),
    strat_p3: cleanSingleLine(obj.strat_p3),
  };
}

function normalizeQuestion(raw: unknown, fallbackCategory: string): QuestionPayload {
  const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};

  return {
    q_cat: cleanSingleLine(obj.q_cat) || fallbackCategory,
    q_question: cleanSingleLine(obj.q_question),
    q_p1: cleanSingleLine(obj.q_p1),
    q_p2: cleanSingleLine(obj.q_p2),
    q_p3: cleanSingleLine(obj.q_p3),
    q_pull: cleanSingleLine(obj.q_pull),
    q_steps_intro: cleanSingleLine(obj.q_steps_intro),
    q_s1t: cleanSingleLine(obj.q_s1t),
    q_s1b: cleanSingleLine(obj.q_s1b),
    q_s2t: cleanSingleLine(obj.q_s2t),
    q_s2b: cleanSingleLine(obj.q_s2b),
    q_s3t: cleanSingleLine(obj.q_s3t),
    q_s3b: cleanSingleLine(obj.q_s3b),
    q_after: cleanSingleLine(obj.q_after),
    q_m1: cleanSingleLine(obj.q_m1),
    q_m2: cleanSingleLine(obj.q_m2),
    q_m3: cleanSingleLine(obj.q_m3),
    q_verdict: cleanSingleLine(obj.q_verdict),
  };
}

function buildQuestionPrompt(company: string, category: string): string {
  return `You are a PM interview coach. A candidate is preparing for a PM interview at "${company}".

Return ONLY a JSON object. No markdown. No backticks. No text outside braces.
All string values must be single-line with no newlines or unescaped quotes.

Answer style:
- 800-1000 words total across all fields
- Flowing confident prose, like a senior PM talking in a room
- No bullet dumps. Paragraphs carry the argument.
- pull_quote must be one sharp, memorable insight.
- steps should be used only when sequence genuinely matters.
- verdict must be a crisp, specific decision.
- Be specific to ${company}. Reference real products, features, and known challenges.

Category for this question: ${category}

{
  "q_cat": "${category}",
  "q_question": "A specific realistic ${category} PM interview question about a ${company} product or feature",
  "q_p1": "First paragraph: frame the problem without jumping to solutions. 3-4 sentences of confident senior PM thinking about ${company}.",
  "q_p2": "Second paragraph: who are the specific users and what do they actually need. 3-4 sentences grounded in ${company} context.",
  "q_p3": "Third paragraph: what most product teams get wrong about this. Be specific to ${company}. 3-4 sentences.",
  "q_pull": "The single sharpest most quotable insight from this answer. One punchy sentence.",
  "q_steps_intro": "One sentence introducing the three solutions or steps below.",
  "q_s1t": "Step or solution 1 short name",
  "q_s1b": "2-3 sentences explaining this specifically for ${company}.",
  "q_s2t": "Step or solution 2 short name",
  "q_s2b": "2-3 sentences explaining this.",
  "q_s3t": "Step or solution 3 short name",
  "q_s3b": "2-3 sentences explaining this.",
  "q_after": "2 sentences: sequencing rationale and what you would not build yet.",
  "q_m1": "Primary metric: what it is and why it is the north star here.",
  "q_m2": "Secondary metric to watch alongside the primary.",
  "q_m3": "Guardrail metric: what must not break and why.",
  "q_verdict": "3-4 sentences: what to ship first, rough timeline, and the one risk to watch."
}`;
}

function buildCompanyPrompt(company: string): string {
  return `You are a PM interview coach.
Return ONLY a JSON object. No markdown. No backticks. No text outside braces.
All string values must be single-line with no newlines or unescaped quotes.

{
  "company": "${company}",
  "tagline": "short one-line positioning for ${company}",
  "domain": "3 word domain label",
  "overview": "3 sentences covering what they do, key products, business model, growth stage",
  "tag1": "product or feature tag",
  "tag2": "product or feature tag",
  "tag3": "product or feature tag",
  "tag4": "product or feature tag",
  "tag5": "product or feature tag",
  "founded": "year",
  "hq": "city",
  "model": "business model type",
  "stage": "company stage",
  "strat_title": "4-5 word title: what separates strong from weak PM candidates at ${company}",
  "strat_p1": "2-3 sentences: what ${company} interviewers look for that most candidates miss.",
  "strat_p2": "2-3 sentences: the product insight that signals genuine preparation for ${company}.",
  "strat_p3": "2-3 sentences: contrast between a weak and a strong answer at ${company}."
}`;
}

async function callAPI(prompt: string, maxTokens: number): Promise<string> {
  const response = await fetch("/api/interview-guide", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt,
      maxTokens,
      provider: PROVIDER,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | {
        text?: unknown;
        error?: unknown;
      }
    | null;

  const text = cleanSingleLine(payload?.text);
  if (!response.ok || !text) {
    const message = cleanSingleLine(payload?.error) || `API request failed (${response.status})`;
    throw new Error(message);
  }

  return text;
}

export default function InterviewGuideClient() {
  const [companyInput, setCompanyInput] = useState("");
  const [currentCompany, setCurrentCompany] = useState("");
  const [questionCount, setQuestionCount] = useState(0);
  const [usedCategories, setUsedCategories] = useState<string[]>([]);
  const [companyBrief, setCompanyBrief] = useState<CompanyBrief | null>(null);
  const [questions, setQuestions] = useState<QuestionCard[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [loadingIndex, setLoadingIndex] = useState(0);
  const [newQuestionId, setNewQuestionId] = useState<number | null>(null);

  const resultsVisible = Boolean(companyBrief && questions.length > 0);
  const qCounter = useMemo(
    () => String(Math.max(1, questionCount || questions.length)).padStart(2, "0"),
    [questionCount, questions.length]
  );

  const searchRef = useRef<HTMLDivElement | null>(null);
  const resultsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isLoading) return;

    setLoadingIndex(0);
    const timer = setInterval(() => {
      setLoadingIndex((prev) => (prev + 1) % LOADING_STEPS.length);
    }, 2500);

    return () => clearInterval(timer);
  }, [isLoading]);

  useEffect(() => {
    if (newQuestionId === null) return;
    const card = document.getElementById(`qcard${newQuestionId}`);
    card?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [newQuestionId]);

  async function runAnalysis() {
    const company = cleanSingleLine(companyInput);
    if (!company || isLoading) return;

    setCurrentCompany(company);
    setQuestionCount(0);
    setUsedCategories([]);
    setCompanyBrief(null);
    setQuestions([]);
    setError("");
    setNewQuestionId(null);
    setIsLoading(true);

    try {
      const companyRaw = await callAPI(buildCompanyPrompt(company), 1500);
      const companyData = normalizeCompany(safeParseJSON(companyRaw), company);
      setCompanyBrief(companyData);

      const firstCategory = CATEGORIES[0];
      const questionRaw = await callAPI(buildQuestionPrompt(company, firstCategory), 2500);
      const questionData = normalizeQuestion(safeParseJSON(questionRaw), firstCategory);

      setUsedCategories([firstCategory]);
      setQuestionCount(1);
      setQuestions([{ ...questionData, id: 1, open: true }]);
      setNewQuestionId(1);

      requestAnimationFrame(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to generate brief right now.";
      setError(`Error: ${message}`);
    } finally {
      setIsLoading(false);
    }
  }

  async function generateNewQ() {
    if (!currentCompany || isGenerating) return;

    setIsGenerating(true);
    setError("");

    const unused = CATEGORIES.filter((category) => !usedCategories.includes(category));
    const category =
      unused.length > 0 ? unused[0] : CATEGORIES[questionCount % CATEGORIES.length];

    try {
      const raw = await callAPI(buildQuestionPrompt(currentCompany, category), 2500);
      const data = normalizeQuestion(safeParseJSON(raw), category);
      const nextId = questionCount + 1;

      setUsedCategories((prev) => [...prev, category]);
      setQuestionCount(nextId);
      setQuestions((prev) => [...prev, { ...data, id: nextId, open: true }]);
      setNewQuestionId(nextId);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to generate question right now.";
      setError(`Error: ${message}`);
    } finally {
      setIsGenerating(false);
    }
  }

  function toggleQ(id: number) {
    setQuestions((prev) =>
      prev.map((question) =>
        question.id === id ? { ...question, open: !question.open } : question
      )
    );
  }

  function resetSearch() {
    setCompanyInput("");
    setCurrentCompany("");
    setQuestionCount(0);
    setUsedCategories([]);
    setCompanyBrief(null);
    setQuestions([]);
    setError("");
    setIsLoading(false);
    setIsGenerating(false);
    setLoadingIndex(0);
    setNewQuestionId(null);
    searchRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@300;400;500;600;700&family=Lora:ital,wght@0,400;0,500;1,400&family=JetBrains+Mono:wght@400;500&display=swap"
        rel="stylesheet"
      />

      <div className="interview-guide-root">
        <nav>
          <Link className="nav-logo" href="/">
            AI<span>PM</span>WORLD
          </Link>
          <div className="nav-right">
            <ul className="nav-links">
              <li>
                <Link href="/pm-resume-screener">Resume</Link>
              </li>
              <li>
                <Link href="/user-story-generator">Stories</Link>
              </li>
              <li>
                <Link href="/book-summarizer">Books</Link>
              </li>
              <li>
                <Link href="/">Home</Link>
              </li>
            </ul>
            <div className="nav-tag">12 / 75</div>
          </div>
        </nav>

        <div className="hero">
          <div className="hero-eyebrow">PM Interview Brief</div>
          <h1 className="hero-title">
            Company<em>Interview</em>Guide
          </h1>
          <p className="hero-sub">
            Enter any company. Get a full PM prep brief - company profile, competitive context, and
            interview questions with senior-level model answers.
          </p>
        </div>

        <div className="search-section" id="searchBox" ref={searchRef}>
          <div className="search-label">Target Company</div>
          <div className="search-row">
            <input
              type="text"
              className="search-input"
              id="companyInput"
              placeholder="Swiggy, Razorpay, Meesho, PhonePe..."
              autoComplete="off"
              value={companyInput}
              onChange={(event) => setCompanyInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void runAnalysis();
                }
              }}
            />
            <button
              className="search-btn"
              id="analyzeBtn"
              type="button"
              onClick={() => void runAnalysis()}
              disabled={isLoading}
            >
              Generate Brief →
            </button>
          </div>
        </div>

        <div className="error-msg" id="errorMsg" style={{ display: error ? "block" : "none" }}>
          {error}
        </div>

        <div id="loading" style={{ display: isLoading ? "block" : "none" }}>
          <div className="loading-bar" />
          <div className="loading-text" id="loadingText">
            {LOADING_STEPS[loadingIndex]}
          </div>
        </div>

        <div id="results" ref={resultsRef} style={{ display: resultsVisible ? "block" : "none" }}>
          <div className="company-strip">
            <div>
              <div className="cs-label">Interview Target</div>
              <div className="cs-name" id="displayCompanyName">
                {cleanSingleLine(companyBrief?.company || currentCompany).toUpperCase()}
              </div>
              <div className="cs-tagline" id="displayTagline">
                {cleanSingleLine(companyBrief?.tagline)}
              </div>
            </div>
            <button className="new-search-btn" type="button" onClick={resetSearch}>
              ← New Search
            </button>
          </div>

          <div className="overview-section">
            <div className="overview-main">
              <div className="ov-section-label">Company Overview</div>
              <div className="ov-title" id="sectionDomain">
                {cleanSingleLine(companyBrief?.domain).toUpperCase()}
              </div>
              <div className="ov-text" id="companyOverview">
                {cleanSingleLine(companyBrief?.overview)}
              </div>
              <div className="ov-tags" id="companyTags">
                {[
                  companyBrief?.tag1,
                  companyBrief?.tag2,
                  companyBrief?.tag3,
                  companyBrief?.tag4,
                  companyBrief?.tag5,
                ]
                  .map((tag) => cleanSingleLine(tag))
                  .filter(Boolean)
                  .map((tag) => (
                    <span className="ov-tag" key={tag}>
                      {tag}
                    </span>
                  ))}
              </div>
            </div>

            <div className="overview-aside" id="companyMeta">
              {[
                ["Founded", companyBrief?.founded || ""],
                ["Headquartered", companyBrief?.hq || ""],
                ["Business Model", companyBrief?.model || ""],
                ["Stage", companyBrief?.stage || ""],
              ].map(([label, value]) => (
                <div className="aside-block" key={label}>
                  <div className="aside-label">{label}</div>
                  <div className="aside-value">{cleanSingleLine(value)}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="questions-header">
            <div className="qh-left">
              <div className="qh-label">PM Interview Prep</div>
              <div className="qh-title">Questions &amp; Answers</div>
            </div>
            <div className="qh-counter" id="qCounter">
              {qCounter}
            </div>
          </div>

          <div id="questionsContainer">
            {questions.map((question) => {
              const id = String(question.id).padStart(2, "0");
              return (
                <div
                  className={`q-card ${question.open ? "" : "collapsed"}`.trim()}
                  id={`qcard${question.id}`}
                  key={question.id}
                >
                  <button
                    className="q-header"
                    type="button"
                    onClick={() => toggleQ(question.id)}
                    aria-expanded={question.open}
                  >
                    <div className="q-index">{id}</div>
                    <div className="q-head-main">
                      <div className="q-cat">{question.q_cat || "Product Sense"}</div>
                      <div className="q-question">{question.q_question}</div>
                    </div>
                    <div className="q-chevron">{question.open ? "−" : "+"}</div>
                  </button>

                  <div
                    className="q-answer"
                    id={`qans${question.id}`}
                    style={{ display: question.open ? "block" : "none" }}
                  >
                    <div className="ans-body">
                      <p>{question.q_p1}</p>
                      <p>{question.q_p2}</p>
                      <p>{question.q_p3}</p>

                      <div className="pull">
                        <p>{question.q_pull}</p>
                      </div>

                      <div className="ans-h">Solutions</div>
                      <p>{question.q_steps_intro}</p>

                      <div className="steps">
                        <div className="step">
                          <div className="step-n">1</div>
                          <div className="step-body">
                            <div className="step-title">{question.q_s1t}</div>
                            <div className="step-text">{question.q_s1b}</div>
                          </div>
                        </div>
                        <div className="step">
                          <div className="step-n">2</div>
                          <div className="step-body">
                            <div className="step-title">{question.q_s2t}</div>
                            <div className="step-text">{question.q_s2b}</div>
                          </div>
                        </div>
                        <div className="step">
                          <div className="step-n">3</div>
                          <div className="step-body">
                            <div className="step-title">{question.q_s3t}</div>
                            <div className="step-text">{question.q_s3b}</div>
                          </div>
                        </div>
                      </div>

                      <p>{question.q_after}</p>

                      <div className="ans-h">Measurement</div>
                      <div className="metrics">
                        <div className="met">
                          <div className="met-label">Primary</div>
                          <div className="met-text">{question.q_m1}</div>
                        </div>
                        <div className="met">
                          <div className="met-label">Secondary</div>
                          <div className="met-text">{question.q_m2}</div>
                        </div>
                        <div className="met">
                          <div className="met-label">Guardrail</div>
                          <div className="met-text">{question.q_m3}</div>
                        </div>
                      </div>

                      <div className="verdict">
                        <div className="verdict-label">Recommendation</div>
                        <p>{question.q_verdict}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="gen-q-bar" id="genQBar">
            <div className="gen-q-left">
              <div className="gen-q-label">Want more?</div>
              <div className="gen-q-title">
                Generate another question for{" "}
                <strong id="genQCompany">{cleanSingleLine(currentCompany)}</strong>
              </div>
            </div>
            <button
              className="gen-q-btn"
              id="genQBtn"
              type="button"
              onClick={() => void generateNewQ()}
              disabled={isGenerating}
            >
              <span id="genQBtnText">
                {isGenerating ? (
                  <>
                    <span className="spin">↻</span> Generating...
                  </>
                ) : (
                  "↻ New Question"
                )}
              </span>
            </button>
          </div>

          <div className="strategy-section">
            <div className="strategy-left">
              <div className="strat-label">Interview Strategy</div>
              <div className="strat-title" id="winTitle">
                {cleanSingleLine(companyBrief?.strat_title)}
              </div>
            </div>
            <div className="strategy-right strat-body" id="winBody">
              <p>{cleanSingleLine(companyBrief?.strat_p1)}</p>
              <p>{cleanSingleLine(companyBrief?.strat_p2)}</p>
              <p>{cleanSingleLine(companyBrief?.strat_p3)}</p>
            </div>
          </div>
        </div>

        <div className="footer-nav">
          {FOOTER_LINKS.map((item) => (
            <Link key={item.label} href={item.href}>
              {item.label}
            </Link>
          ))}
        </div>

        <footer>
          <div className="foot-copy">© 2026 Ashish Gayakwar · AIPMWORLD</div>
          <div className="foot-badge">75 Products · 75 Days</div>
        </footer>
      </div>

      <style jsx global>{`
        *,
        *::before,
        *::after {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        :root {
          --bg: #0f0f0f;
          --surface: #171717;
          --surface2: #1e1e1e;
          --border: #2a2a2a;
          --border2: #333;
          --text: #e8e4dc;
          --muted: #666;
          --muted2: #888;
          --amber: #d4a843;
          --amber-dim: #8a6a24;
          --white: #f0ece4;
          --body-text: #b8b4ac;
          --font-display: "Barlow Condensed", sans-serif;
          --font-body: "Lora", Georgia, serif;
          --font-mono: "JetBrains Mono", monospace;
        }

        html {
          scroll-behavior: smooth;
        }

        body {
          background: var(--bg);
          color: var(--text);
          font-family: var(--font-body);
          font-size: 15px;
          line-height: 1.7;
          min-height: 100vh;
        }

        ::-webkit-scrollbar {
          width: 4px;
        }

        ::-webkit-scrollbar-track {
          background: var(--bg);
        }

        ::-webkit-scrollbar-thumb {
          background: var(--border2);
        }
      `}</style>

      <style jsx>{`
        .interview-guide-root {
          background: var(--bg);
          color: var(--text);
          width: 100%;
          min-height: 100vh;
        }

        nav {
          position: sticky;
          top: 0;
          z-index: 200;
          background: var(--bg);
          border-bottom: 1px solid var(--border);
          padding: 0 48px;
          height: 52px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .nav-logo {
          font-family: var(--font-display);
          font-weight: 700;
          font-size: 15px;
          letter-spacing: 0.2em;
          color: var(--white);
          text-decoration: none;
          text-transform: uppercase;
        }

        .nav-logo span {
          color: var(--amber);
        }

        .nav-right {
          display: flex;
          align-items: center;
          gap: 32px;
        }

        .nav-links {
          display: flex;
          gap: 24px;
          list-style: none;
        }

        .nav-links :global(a) {
          font-family: var(--font-mono);
          font-size: 10px;
          letter-spacing: 0.08em;
          color: var(--muted);
          text-decoration: none;
          text-transform: uppercase;
          transition: color 0.2s;
        }

        .nav-links :global(a):hover {
          color: var(--text);
        }

        .nav-tag {
          font-family: var(--font-mono);
          font-size: 10px;
          color: var(--amber);
          border: 1px solid var(--amber-dim);
          padding: 3px 10px;
          border-radius: 2px;
          letter-spacing: 0.06em;
        }

        .hero {
          padding: 80px 48px 64px;
          border-bottom: 1px solid var(--border);
          position: relative;
          overflow: hidden;
        }

        .hero::before {
          content: "";
          position: absolute;
          top: 0;
          right: 0;
          width: 40%;
          height: 100%;
          background: radial-gradient(
            ellipse at 80% 50%,
            rgba(212, 168, 67, 0.06) 0%,
            transparent 70%
          );
          pointer-events: none;
        }

        .hero-eyebrow {
          font-family: var(--font-mono);
          font-size: 11px;
          letter-spacing: 0.14em;
          color: var(--amber);
          text-transform: uppercase;
          margin-bottom: 24px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .hero-eyebrow::before {
          content: "";
          display: block;
          width: 32px;
          height: 1px;
          background: var(--amber);
        }

        .hero-title {
          font-family: var(--font-display);
          font-weight: 700;
          font-size: clamp(52px, 7vw, 88px);
          line-height: 0.95;
          letter-spacing: -0.01em;
          color: var(--white);
          text-transform: uppercase;
          margin-bottom: 28px;
          max-width: 700px;
        }

        .hero-title em {
          font-style: normal;
          color: var(--amber);
          display: block;
        }

        .hero-sub {
          font-family: var(--font-body);
          font-size: 15px;
          color: var(--muted2);
          max-width: 440px;
          line-height: 1.7;
        }

        .search-section {
          padding: 48px;
          border-bottom: 1px solid var(--border);
        }

        .search-label {
          font-family: var(--font-mono);
          font-size: 10px;
          letter-spacing: 0.12em;
          color: var(--muted);
          text-transform: uppercase;
          margin-bottom: 12px;
        }

        .search-row {
          display: flex;
          max-width: 720px;
        }

        .search-input {
          flex: 1;
          background: var(--surface);
          border: 1px solid var(--border2);
          border-right: none;
          border-radius: 2px 0 0 2px;
          padding: 16px 20px;
          font-family: var(--font-display);
          font-size: 18px;
          color: var(--white);
          outline: none;
          transition: border-color 0.2s;
        }

        .search-input::placeholder {
          color: var(--muted);
        }

        .search-input:focus {
          border-color: var(--amber-dim);
        }

        .search-btn {
          background: var(--amber);
          color: #0f0f0f;
          border: none;
          padding: 16px 28px;
          font-family: var(--font-mono);
          font-size: 11px;
          letter-spacing: 0.12em;
          font-weight: 500;
          text-transform: uppercase;
          cursor: pointer;
          border-radius: 0 2px 2px 0;
          transition: background 0.2s;
          white-space: nowrap;
        }

        .search-btn:hover {
          background: #e0b84e;
        }

        .search-btn:disabled {
          background: var(--muted);
          cursor: not-allowed;
          color: var(--bg);
        }

        #loading {
          padding: 80px 48px;
          text-align: center;
        }

        .loading-bar {
          width: 200px;
          height: 1px;
          background: var(--border2);
          margin: 0 auto 24px;
          position: relative;
          overflow: hidden;
        }

        .loading-bar::after {
          content: "";
          position: absolute;
          top: 0;
          left: -40%;
          width: 40%;
          height: 100%;
          background: var(--amber);
          animation: slide 1.4s ease-in-out infinite;
        }

        .loading-text {
          font-family: var(--font-mono);
          font-size: 11px;
          letter-spacing: 0.1em;
          color: var(--muted);
          text-transform: uppercase;
        }

        .error-msg {
          background: rgba(180, 40, 40, 0.1);
          border: 1px solid rgba(180, 40, 40, 0.3);
          border-radius: 2px;
          padding: 14px 20px;
          margin: 24px 48px;
          font-family: var(--font-mono);
          font-size: 11px;
          color: #e07070;
          letter-spacing: 0.04em;
        }

        #results {
          display: none;
        }

        .company-strip {
          border-bottom: 1px solid var(--border);
          padding: 40px 48px;
          display: grid;
          grid-template-columns: 1fr auto;
          align-items: end;
          gap: 32px;
        }

        .cs-label {
          font-family: var(--font-mono);
          font-size: 10px;
          letter-spacing: 0.14em;
          color: var(--muted);
          text-transform: uppercase;
          margin-bottom: 8px;
        }

        .cs-name {
          font-family: var(--font-display);
          font-weight: 700;
          font-size: clamp(40px, 6vw, 72px);
          line-height: 0.95;
          letter-spacing: -0.01em;
          color: var(--white);
          text-transform: uppercase;
        }

        .cs-tagline {
          font-family: var(--font-body);
          font-style: italic;
          font-size: 15px;
          color: var(--muted2);
          margin-top: 10px;
        }

        .new-search-btn {
          font-family: var(--font-mono);
          font-size: 10px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--muted);
          background: transparent;
          border: 1px solid var(--border2);
          padding: 10px 18px;
          border-radius: 2px;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .new-search-btn:hover {
          color: var(--text);
          border-color: var(--muted);
        }

        .overview-section {
          display: grid;
          grid-template-columns: 1fr 280px;
          border-bottom: 1px solid var(--border);
        }

        .overview-main {
          padding: 48px;
          border-right: 1px solid var(--border);
        }

        .overview-aside {
          padding: 48px 40px;
        }

        .ov-section-label {
          font-family: var(--font-mono);
          font-size: 10px;
          letter-spacing: 0.14em;
          color: var(--amber);
          text-transform: uppercase;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .ov-section-label::after {
          content: "";
          flex: 1;
          height: 1px;
          background: var(--border);
        }

        .ov-title {
          font-family: var(--font-display);
          font-weight: 600;
          font-size: 28px;
          color: var(--white);
          margin-bottom: 20px;
          text-transform: uppercase;
          letter-spacing: 0.02em;
        }

        .ov-text {
          font-size: 15px;
          line-height: 1.8;
          color: var(--muted2);
        }

        .ov-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 24px;
        }

        .ov-tag {
          font-family: var(--font-mono);
          font-size: 10px;
          letter-spacing: 0.06em;
          color: var(--muted2);
          border: 1px solid var(--border2);
          padding: 5px 12px;
          border-radius: 2px;
        }

        .aside-block {
          margin-bottom: 32px;
        }

        .aside-block:last-child {
          margin-bottom: 0;
        }

        .aside-label {
          font-family: var(--font-mono);
          font-size: 9px;
          letter-spacing: 0.12em;
          color: var(--muted);
          text-transform: uppercase;
          border-bottom: 1px solid var(--border);
          padding-bottom: 6px;
        }

        .aside-value {
          font-family: var(--font-display);
          font-size: 16px;
          font-weight: 500;
          color: var(--text);
          letter-spacing: 0.02em;
          margin-top: 8px;
        }

        .questions-header {
          padding: 40px 48px 28px;
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: baseline;
          justify-content: space-between;
        }

        .qh-label {
          font-family: var(--font-mono);
          font-size: 10px;
          letter-spacing: 0.14em;
          color: var(--amber);
          text-transform: uppercase;
          margin-bottom: 8px;
        }

        .qh-title {
          font-family: var(--font-display);
          font-weight: 700;
          font-size: 36px;
          color: var(--white);
          text-transform: uppercase;
          letter-spacing: 0.01em;
        }

        .qh-counter {
          font-family: var(--font-display);
          font-size: 72px;
          font-weight: 700;
          color: var(--border2);
          line-height: 1;
          letter-spacing: -0.02em;
        }

        .q-card {
          border-bottom: 1px solid var(--border);
          background: var(--surface);
        }

        .q-header {
          width: 100%;
          padding: 32px 48px;
          display: grid;
          grid-template-columns: 60px 1fr 40px;
          gap: 24px;
          align-items: start;
          cursor: pointer;
          border: none;
          background: transparent;
          color: inherit;
          text-align: left;
        }

        .q-index {
          font-family: var(--font-display);
          font-weight: 700;
          font-size: 48px;
          color: var(--amber);
          line-height: 1;
          letter-spacing: -0.02em;
          padding-top: 4px;
        }

        .q-cat {
          font-family: var(--font-mono);
          font-size: 10px;
          letter-spacing: 0.1em;
          color: var(--amber);
          text-transform: uppercase;
          margin-bottom: 10px;
        }

        .q-question {
          font-family: var(--font-display);
          font-weight: 600;
          font-size: 20px;
          line-height: 1.3;
          color: var(--white);
          text-transform: uppercase;
          letter-spacing: 0.01em;
        }

        .q-chevron {
          font-family: var(--font-mono);
          font-size: 22px;
          color: var(--muted);
          text-align: right;
          padding-top: 6px;
          transition: transform 0.3s;
        }

        .q-card.collapsed .q-chevron {
          transform: rotate(45deg);
        }

        .q-answer {
          border-top: 1px solid var(--border);
        }

        .ans-body {
          padding: 40px 48px 48px 132px;
        }

        .ans-body p {
          font-size: 15px;
          line-height: 1.9;
          color: var(--body-text);
          margin-bottom: 22px;
        }

        .ans-body p strong {
          font-weight: 500;
          color: var(--text);
        }

        .pull {
          border-left: 2px solid var(--amber);
          padding: 16px 24px;
          margin: 28px 0;
          background: rgba(212, 168, 67, 0.04);
        }

        .pull p {
          font-family: var(--font-display);
          font-weight: 400;
          font-size: 19px;
          font-style: italic;
          line-height: 1.5;
          color: var(--text);
          margin: 0;
        }

        .ans-h {
          font-family: var(--font-mono);
          font-size: 10px;
          letter-spacing: 0.12em;
          color: var(--muted);
          text-transform: uppercase;
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 32px 0 14px;
        }

        .ans-h::after {
          content: "";
          flex: 1;
          height: 1px;
          background: var(--border);
        }

        .steps {
          display: flex;
          flex-direction: column;
          margin: 4px 0 24px;
          border: 1px solid var(--border);
          border-radius: 2px;
          overflow: hidden;
        }

        .step {
          display: grid;
          grid-template-columns: 48px 1fr;
          border-bottom: 1px solid var(--border);
        }

        .step:last-child {
          border-bottom: none;
        }

        .step-n {
          background: var(--surface2);
          font-family: var(--font-display);
          font-weight: 700;
          font-size: 18px;
          color: var(--muted);
          display: flex;
          align-items: center;
          justify-content: center;
          border-right: 1px solid var(--border);
          min-height: 72px;
        }

        .step-body {
          padding: 16px 20px;
        }

        .step-title {
          font-family: var(--font-display);
          font-weight: 600;
          font-size: 14px;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: var(--text);
          margin-bottom: 6px;
        }

        .step-text {
          font-size: 14px;
          line-height: 1.75;
          color: #888;
        }

        .metrics {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          margin: 4px 0 24px;
          border: 1px solid var(--border);
          border-radius: 2px;
          overflow: hidden;
        }

        .met {
          padding: 18px 20px;
          border-right: 1px solid var(--border);
          background: var(--surface2);
        }

        .met:last-child {
          border-right: none;
        }

        .met-label {
          font-family: var(--font-mono);
          font-size: 9px;
          letter-spacing: 0.1em;
          color: var(--muted);
          text-transform: uppercase;
          margin-bottom: 8px;
        }

        .met-text {
          font-size: 13px;
          line-height: 1.6;
          color: var(--muted2);
        }

        .verdict {
          margin-top: 28px;
          padding: 24px 28px;
          background: var(--surface2);
          border: 1px solid var(--border);
          border-left: 2px solid var(--amber);
        }

        .verdict-label {
          font-family: var(--font-mono);
          font-size: 9px;
          letter-spacing: 0.12em;
          color: var(--amber);
          text-transform: uppercase;
          margin-bottom: 10px;
        }

        .verdict p {
          font-size: 14px;
          line-height: 1.85;
          color: var(--text);
          margin: 0;
        }

        .gen-q-bar {
          padding: 32px 48px;
          border-bottom: 1px solid var(--border);
          border-top: 1px solid var(--border);
          background: var(--surface);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
        }

        .gen-q-label {
          font-family: var(--font-mono);
          font-size: 10px;
          letter-spacing: 0.12em;
          color: var(--muted);
          text-transform: uppercase;
          margin-bottom: 4px;
        }

        .gen-q-title {
          font-family: var(--font-display);
          font-size: 18px;
          font-weight: 500;
          color: var(--muted2);
        }

        .gen-q-title strong {
          color: var(--white);
          font-weight: 600;
        }

        .gen-q-btn {
          background: transparent;
          border: 1px solid var(--amber-dim);
          color: var(--amber);
          font-family: var(--font-mono);
          font-size: 11px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          padding: 14px 28px;
          border-radius: 2px;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .gen-q-btn:hover {
          background: var(--amber);
          color: #0f0f0f;
          border-color: var(--amber);
        }

        .gen-q-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .spin {
          display: inline-block;
          animation: spin 1s linear infinite;
        }

        .strategy-section {
          border-top: 1px solid var(--border);
          display: grid;
          grid-template-columns: 280px 1fr;
        }

        .strategy-left {
          padding: 48px 40px;
          border-right: 1px solid var(--border);
          background: var(--surface);
        }

        .strategy-right {
          padding: 48px;
        }

        .strat-label {
          font-family: var(--font-mono);
          font-size: 10px;
          letter-spacing: 0.14em;
          color: var(--amber);
          text-transform: uppercase;
          margin-bottom: 16px;
        }

        .strat-title {
          font-family: var(--font-display);
          font-weight: 700;
          font-size: 26px;
          color: var(--white);
          text-transform: uppercase;
          line-height: 1.15;
        }

        .strat-body p {
          font-size: 14px;
          line-height: 1.85;
          color: var(--muted2);
          margin-bottom: 18px;
        }

        .strat-body p:last-child {
          margin-bottom: 0;
        }

        .strat-body p strong {
          color: var(--text);
          font-weight: 500;
        }

        .footer-nav {
          border-top: 1px solid var(--border);
          padding: 20px 48px;
          display: flex;
          flex-wrap: wrap;
          gap: 20px;
        }

        .footer-nav :global(a) {
          font-family: var(--font-mono);
          font-size: 10px;
          letter-spacing: 0.06em;
          color: var(--muted);
          text-decoration: none;
          text-transform: uppercase;
          transition: color 0.2s;
        }

        .footer-nav :global(a):hover {
          color: var(--text);
        }

        footer {
          border-top: 1px solid var(--border);
          padding: 20px 48px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .foot-copy {
          font-family: var(--font-mono);
          font-size: 10px;
          letter-spacing: 0.06em;
          color: var(--muted);
        }

        .foot-badge {
          font-family: var(--font-display);
          font-weight: 600;
          font-size: 13px;
          letter-spacing: 0.1em;
          color: var(--amber);
          text-transform: uppercase;
        }

        @keyframes slide {
          0% {
            left: -40%;
          }
          100% {
            left: 100%;
          }
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 768px) {
          nav,
          .hero,
          .search-section,
          .overview-main,
          .overview-aside,
          .questions-header,
          .q-header,
          .strategy-left,
          .strategy-right,
          .footer-nav,
          footer,
          .gen-q-bar {
            padding-left: 20px;
            padding-right: 20px;
          }

          .hero-title {
            font-size: 44px;
          }

          .overview-section,
          .strategy-section {
            grid-template-columns: 1fr;
          }

          .overview-main,
          .strategy-left {
            border-right: none;
            border-bottom: 1px solid var(--border);
          }

          .metrics {
            grid-template-columns: 1fr;
          }

          .met {
            border-right: none;
            border-bottom: 1px solid var(--border);
          }

          .met:last-child {
            border-bottom: none;
          }

          .q-header {
            grid-template-columns: 40px 1fr 32px;
            padding: 24px 20px;
          }

          .ans-body {
            padding: 28px 20px 36px;
          }

          .company-strip {
            grid-template-columns: 1fr;
            padding: 28px 20px;
          }

          .gen-q-bar {
            flex-direction: column;
            align-items: flex-start;
            gap: 16px;
          }
        }
      `}</style>
    </>
  );
}
