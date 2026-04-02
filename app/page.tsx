import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";

export const metadata: Metadata = {
  title: "AI PM World — Learn AI Product Management",
  description:
    "Free AI PM learning platform. Practice interview questions, run case studies, screen your resume, and download the MAANG prep guide. Built for execution-minded builders.",
  alternates: { canonical: "https://www.aipmworld.com" },
  openGraph: { url: "https://www.aipmworld.com" },
};

type Entry = {
  num: string;
  label: string;
  title: string;
  desc: string;
  href: string;
  labelTone?: "default" | "teal" | "red";
};

const headerLinkGroups = [
  {
    group: "Learn",
    links: [
      { label: "Cards", href: "/swipe" },
      { label: "Quiz", href: "/swipe?mode=quiz" },
      { label: "Visualize", href: "/swipe?mode=visualize" },
      { label: "Compare", href: "/compare" },
    ],
  },
  {
    group: "Build",
    links: [
      { label: "City", href: "/city-guide" },
      { label: "Compete", href: "/competitor-analysis" },
      { label: "Metrics", href: "/metrics-intelligence" },
      { label: "Frameworks", href: "/pm-framework-generator" },
    ],
  },
  {
    group: "Prepare",
    links: [
      { label: "Interview", href: "/interview" },
      { label: "Stories", href: "/user-story-generator" },
      { label: "Resume", href: "/pm-resume-screener" },
    ],
  },
  {
    group: "Core",
    links: [{ label: "Home", href: "/" }],
  },
];

type ChallengeDay = {
  num: string;
  title: string;
  href: string;
};

const challengeDays: ChallengeDay[] = [
  { num: "01", title: "PM Resume Screener", href: "/pm-resume-screener" },
  { num: "02", title: "User Story Generator", href: "/user-story-generator" },
  { num: "03", title: "Book Summarizer", href: "/book-summarizer" },
  { num: "04", title: "Competitor Analysis Summarizer", href: "/competitor-analysis" },
  { num: "05", title: "AI City Guide", href: "/city-guide" },
  { num: "06", title: "Metrics Intelligence", href: "/metrics-intelligence" },
  { num: "07", title: "PM Framework Generator", href: "/pm-framework-generator" },
  { num: "08", title: "Roast My Idea", href: "/roast" },
];

const CHALLENGE_TOTAL = 75;

const section01Entries: Entry[] = [
  {
    num: "01",
    label: "READER MODE",
    title: "Basics Track",
    desc: "Day Zero foundations, explained without jargon.",
    href: "/basics",
  },
  {
    num: "02",
    label: "INTERACTIVE",
    title: "Concept Swipe",
    desc: "Card-based learning with next/prev concept journeys.",
    href: "/swipe",
  },
];

const section02Entries: Entry[] = [
  {
    num: "01",
    label: "QUIZ",
    title: "AI Quiz",
    desc: "Level-based checks to test concept clarity fast.",
    href: "/swipe?mode=quiz",
  },
  {
    num: "02",
    label: "PRACTICE",
    title: "Case Studio",
    desc: "Generate interview-ready AI PM case simulations.",
    href: "/case-study-generator",
  },
  {
    num: "03",
    label: "QNA",
    title: "Topic QnA",
    desc: "Browse AI PM interview questions by topic.",
    href: "/qna",
  },
];

const section03Entries: Entry[] = [
  {
    num: "01",
    label: "PDF GUIDE",
    title: "M-A-A-N-G Interview Series",
    desc: "Download the MAANG prep PDF. Structured for Meta, Apple, Amazon, Netflix, Google.",
    href: "/maang-interview-series",
    labelTone: "red",
  },
];

function EntryRows({ entries, dark = false }: { entries: Entry[]; dark?: boolean }) {
  return (
    <div className="entry-list">
      {entries.map((entry, idx) => (
        <Link
          key={`${entry.num}-${entry.title}`}
          href={entry.href}
          className={`entry-row ${dark ? "entry-row-dark" : ""} ${
            idx === entries.length - 1 ? "entry-row-last" : ""
          }`}
        >
          <span className="enum">{entry.num}</span>
          <div className="ec">
            <div className="et">{entry.title}</div>
            <div className="ed">{entry.desc}</div>
          </div>
          <span
            className={`el ${entry.labelTone === "teal" ? "el-teal" : ""} ${
              entry.labelTone === "red" ? "el-red" : ""
            }`}
          >
            {entry.label}
          </span>
          <span className="ea-circle">→</span>
        </Link>
      ))}
    </div>
  );
}

export default async function Home() {
  const session = await getServerSession(authOptions);
  const userLabel = session?.user?.name || session?.user?.email;
  const adminEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const isAdmin = !!session?.user?.email && adminEmails.includes(session.user.email.toLowerCase());

  return (
    <>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;500;600;700;800;900&display=swap"
      />

      <main className="home-root">
        <div className="home-container">
          <header className="home-nav-wrap">
            <div className="home-brand">
              <p className="home-brand-name">AI PM World</p>
              <p className="home-brand-sub">Practical intelligence for product builders</p>
            </div>

            <nav className="home-nav-desktop">
              {headerLinkGroups.map((group) => (
                <div key={group.group} className="home-nav-group home-nav-dropdown">
                  <span className="home-nav-group-trigger">
                    <span className="home-nav-group-label">{group.group}</span>
                    <span className="home-nav-group-caret">▾</span>
                  </span>
                  <div className="home-nav-group-menu">
                    {group.links.map((item) => (
                      <Link key={item.href} href={item.href} className="home-nav-menu-link">
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </nav>

            <details className="home-nav-mobile">
              <summary className="home-hamburger">☰</summary>
              <div className="home-mobile-menu">
                {headerLinkGroups.map((group) => (
                  <div key={group.group} className="home-mobile-group">
                    <p className="home-mobile-group-label">{group.group}</p>
                    {group.links.map((item) => (
                      <Link key={item.href} href={item.href} className="home-mobile-link">
                        {item.label}
                      </Link>
                    ))}
                  </div>
                ))}
              </div>
            </details>
          </header>

          <div className="home-user-row">
            {userLabel ? <span className="home-user-pill">{userLabel}</span> : null}
            {isAdmin ? (
              <Link href="/admin/users" className="home-user-link">
                Admin
              </Link>
            ) : null}
            {userLabel ? (
              <Link href="/auth/signout?callbackUrl=/" className="home-user-link">
                Sign out
              </Link>
            ) : null}
          </div>

          <section className="hero">
            <p className="hero-eyebrow">PRODUCT INTELLIGENCE JOURNAL</p>
            <h1 className="hero-title">
              Learn AI PM Through <span className="hero-title-accent">Systems, Signals,</span> and
              Practice.
            </h1>
            <p className="hero-copy">
              AI PM World is a focused learning platform for execution-minded builders. Move from
              first principles to applied interviews, case drills, and high-leverage product
              thinking.
            </p>
          </section>

          <section className="challenge-block">
            <div className="challenge-head">
              <div className="challenge-head-top">
                <div className="challenge-counter">
                  <span className="challenge-num">{String(challengeDays.length).padStart(2, "0")}</span>
                  <span className="challenge-sep"> / </span>
                  <span className="challenge-total">{CHALLENGE_TOTAL}</span>
                </div>
                <p className="challenge-eyebrow">
                  <span className="challenge-eyebrow-badge">75 PRODUCTS · 75 DAYS</span>
                  <span className="challenge-eyebrow-live">● LIVE</span>
                </p>
              </div>
              <div className="challenge-bar-track">
                <div
                  className="challenge-bar-fill"
                  style={{ width: `${(challengeDays.length / CHALLENGE_TOTAL) * 100}%` }}
                />
              </div>
            </div>
            <div className="challenge-list">
              {challengeDays.map((day) => (
                <Link key={day.num} href={day.href} className="challenge-row">
                  <span className="challenge-day-num">{day.num}</span>
                  <span className="challenge-day-title">{day.title}</span>
                  <span className="challenge-day-arrow">→</span>
                </Link>
              ))}
            </div>
          </section>

          <section className="home-section">
            <p className="section-eyebrow">SECTION 01</p>
            <div className="section-rule" />
            <div className="section-one-grid">
              <div>
                <h2 className="section-title">Core Curriculum</h2>
                <p className="section-desc">
                  Start from first principles. These modules build your mental models for AI
                  product thinking - no jargon, no fluff, just structured clarity that compounds.
                </p>
                <p className="section-quote">
                  The fundamentals don&apos;t change. The vocabulary does.
                </p>
              </div>
              <EntryRows entries={section01Entries} />
            </div>
          </section>

          <section className="home-section">
            <div className="section-two-head">
              <p className="section-eyebrow">SECTION 02</p>
              <div className="section-rule" />
              <h2 className="section-title">Applied Practice</h2>
              <p className="section-desc">
                Knowing is not enough. These tools put you in the chair - quizzes that
                pressure-test recall, case simulations that mirror real PM interviews, and topic
                drills that build muscle memory.
              </p>
            </div>
            <EntryRows entries={section02Entries} />
          </section>

          <section className="home-dark-block">
            <p className="section-eyebrow">SECTION 03</p>
            <div className="section-rule" />
            <h2 className="section-title section-title-dark">Interview Readiness</h2>
            <p className="section-desc section-desc-dark">
              The final stretch. Screen your resume against real JDs, download the MAANG prep
              guide, and walk into interviews knowing exactly where you stand.
            </p>
            <EntryRows entries={section03Entries} dark />
          </section>
        </div>

        <style>{`
          /* ---- 75-day challenge block ---- */
          .challenge-block {
            margin: 0 0 48px 0;
            border: 1px solid var(--border);
            border-radius: 16px;
            overflow: hidden;
          }
          .challenge-head {
            padding: 24px 28px 20px;
            background: var(--bg-dark);
          }
          .challenge-head-top {
            display: flex;
            align-items: flex-start;
            flex-direction: column;
            gap: 10px;
            margin-bottom: 14px;
          }
          @media (min-width: 480px) {
            .challenge-head-top {
              flex-direction: row;
              align-items: flex-end;
              justify-content: space-between;
              gap: 0;
            }
          }
          .challenge-eyebrow {
            display: flex;
            align-items: center;
            gap: 10px;
            margin: 0;
          }
          .challenge-eyebrow-badge {
            font-size: 12px;
            font-weight: 900;
            letter-spacing: 0.12em;
            color: #f5f0e8;
            background: var(--accent-red);
            padding: 4px 10px;
            border-radius: 6px;
            white-space: nowrap;
          }
          @media (min-width: 480px) {
            .challenge-eyebrow-badge {
              font-size: 15px;
              padding: 5px 14px;
            }
          }
          .challenge-eyebrow-live {
            font-size: 13px;
            font-weight: 800;
            letter-spacing: 0.1em;
            color: #4ade80;
          }
          .challenge-counter {
            display: flex;
            align-items: baseline;
            gap: 2px;
          }
          .challenge-num {
            font-size: 52px;
            font-weight: 900;
            color: #f5f0e8;
            line-height: 1;
            letter-spacing: -0.04em;
          }
          .challenge-sep {
            font-size: 28px;
            font-weight: 300;
            color: #555550;
            margin: 0 4px;
          }
          .challenge-total {
            font-size: 28px;
            font-weight: 400;
            color: #555550;
          }
          .challenge-bar-track {
            width: 100%;
            height: 4px;
            background: rgba(255,255,255,0.08);
            border-radius: 99px;
            overflow: hidden;
          }
          .challenge-bar-fill {
            height: 100%;
            background: #b84a2a;
            border-radius: 99px;
            transition: width 0.4s ease;
          }
          .challenge-list {
            background: #f7f4ef;
          }
          .challenge-row {
            display: flex;
            align-items: center;
            gap: 16px;
            padding: 14px 28px;
            border-bottom: 1px solid var(--border-light);
            text-decoration: none;
            transition: background 0.15s;
          }
          .challenge-row:last-child {
            border-bottom: none;
          }
          .challenge-row:hover {
            background: #ede8df;
          }
          .challenge-day-num {
            font-size: 11px;
            font-weight: 700;
            color: var(--num-color);
            letter-spacing: 0.08em;
            min-width: 24px;
          }
          .challenge-day-title {
            flex: 1;
            font-size: 14px;
            font-weight: 600;
            color: var(--text-primary);
          }
          .challenge-day-arrow {
            font-size: 14px;
            color: var(--text-hint);
          }
          .challenge-row:hover .challenge-day-arrow {
            color: var(--accent-red);
          }
          /* ---- end challenge block ---- */

          .home-root {
            --bg: #ede8df;
            --text-primary: #1a1a1a;
            --text-muted: #777777;
            --text-hint: #aaaaaa;
            --accent-red: #b84a2a;
            --accent-teal: #2a7b7b;
            --border: #c8bfb0;
            --border-light: #c8c0b4;
            --num-color: #d0c8bc;
            --bg-dark: #1c1c1a;
            background: var(--bg);
            min-height: 100vh;
            color: var(--text-primary);
            padding-bottom: 80px;
            font-family: "Lexend", sans-serif;
          }
          .home-container {
            width: 100%;
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 16px;
          }

          .home-nav-wrap {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 20px;
            border-bottom: 1px solid #cec8bc;
            padding: 20px 0;
            margin-bottom: 40px;
          }
          .home-brand {
            flex: 0 0 auto;
            max-width: 250px;
          }
          .home-brand-name {
            margin: 0;
            font-family: "Lexend", sans-serif;
            font-weight: 700;
            font-size: 15px;
            line-height: 1.2;
          }
          .home-brand-sub {
            margin: 4px 0 0;
            font-family: "Lexend", sans-serif;
            font-weight: 400;
            font-size: 11px;
            color: #999999;
          }
          .home-nav-desktop {
            display: none;
            flex-wrap: nowrap;
            align-items: stretch;
            gap: 0;
            margin-left: auto;
            border: 1px solid #d2c8b8;
            border-radius: 0;
            background: rgba(255, 255, 255, 0.36);
            overflow: visible;
          }
          .home-nav-group {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 12px;
            border-left: 1px solid #d6ccbe;
            position: relative;
            border-radius: 0;
          }
          .home-nav-group:first-child {
            border-left: none;
          }
          .home-nav-group-trigger {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            cursor: pointer;
            user-select: none;
          }
          .home-nav-group-label {
            margin: 0;
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            color: #8a8075;
          }
          .home-nav-group-caret {
            font-size: 12px;
            color: #8a8075;
            transition: transform 0.15s ease;
          }
          .home-nav-group-menu {
            position: absolute;
            top: calc(100% + 8px);
            left: 10px;
            min-width: 170px;
            border: 1px solid #d7ccbe;
            border-radius: 18px;
            background: #f5efe6;
            padding: 8px;
            display: grid;
            gap: 6px;
            box-shadow: 0 20px 36px rgba(40, 32, 24, 0.14);
            opacity: 0;
            pointer-events: none;
            transform: translateY(-4px);
            transition: opacity 0.15s ease, transform 0.15s ease;
            z-index: 40;
          }
          .home-nav-group-menu::before {
            content: "";
            position: absolute;
            left: 0;
            right: 0;
            top: -10px;
            height: 10px;
          }
          .home-nav-dropdown:hover .home-nav-group-menu,
          .home-nav-dropdown:focus-within .home-nav-group-menu {
            opacity: 1;
            pointer-events: auto;
            transform: translateY(0);
          }
          .home-nav-dropdown:hover .home-nav-group-caret,
          .home-nav-dropdown:focus-within .home-nav-group-caret {
            transform: rotate(180deg);
          }
          .home-nav-menu-link {
            font-family: "Lexend", sans-serif;
            font-weight: 500;
            font-size: 12px;
            border: 1px solid #bfb5a8;
            border-radius: 999px;
            padding: 8px 14px;
            color: #444444;
            background: rgba(255, 255, 255, 0.48);
            text-decoration: none;
            transition: all 0.15s ease;
            white-space: nowrap;
          }
          .home-nav-menu-link:hover {
            background: #1a1a1a;
            color: #f2ede4;
            border-color: #1a1a1a;
          }

          .home-nav-mobile {
            display: block;
            position: relative;
            z-index: 20;
          }
          .home-hamburger {
            list-style: none;
            cursor: pointer;
            font-family: "Lexend", sans-serif;
            font-weight: 600;
            font-size: 20px;
            line-height: 1;
            color: #333333;
            user-select: none;
          }
          .home-hamburger::-webkit-details-marker {
            display: none;
          }
          .home-mobile-menu {
            position: absolute;
            top: calc(100% + 8px);
            right: 0;
            min-width: 250px;
            border: 1px solid var(--border);
            border-radius: 10px;
            overflow: hidden;
            background: var(--bg);
            padding: 8px 0;
          }
          .home-mobile-group {
            padding: 0 0 8px;
            border-bottom: 1px solid var(--border);
            margin-bottom: 8px;
          }
          .home-mobile-group:last-child {
            padding-bottom: 0;
            border-bottom: none;
            margin-bottom: 0;
          }
          .home-mobile-group-label {
            margin: 0;
            padding: 0 16px 6px;
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            color: #8a8075;
          }
          .home-mobile-link {
            display: block;
            width: 100%;
            padding: 10px 16px;
            font-family: "Lexend", sans-serif;
            font-weight: 500;
            font-size: 12px;
            color: #333333;
            text-decoration: none;
          }
          .home-mobile-link:hover {
            background: #e6dfd2;
          }

          .home-user-row {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-bottom: 22px;
          }
          .home-user-pill,
          .home-user-link {
            border: 1px solid var(--border);
            border-radius: 20px;
            padding: 5px 12px;
            font-family: "Lexend", sans-serif;
            font-weight: 500;
            font-size: 12px;
            color: #4a4a4a;
            text-decoration: none;
          }

          .hero {
            margin-bottom: 48px;
          }
          .hero-eyebrow {
            margin: 0 0 20px;
            font-family: "Lexend", sans-serif;
            font-weight: 600;
            font-size: 11px;
            letter-spacing: 2.5px;
            text-transform: uppercase;
            color: var(--accent-red);
          }
          .hero-title {
            margin: 0 0 24px;
            max-width: 680px;
            font-family: "Lexend", sans-serif;
            font-weight: 800;
            font-size: 36px;
            line-height: 1.1;
            letter-spacing: -1px;
          }
          .hero-title-accent {
            color: var(--accent-teal);
          }
          .hero-copy {
            margin: 0;
            max-width: 480px;
            font-family: "Lexend", sans-serif;
            font-weight: 400;
            font-size: 15px;
            line-height: 1.8;
            color: #666666;
          }

          .home-section {
            border-top: 1px solid var(--border-light);
            padding-top: 36px;
            margin-bottom: 48px;
          }
          .section-eyebrow {
            margin: 0 0 6px;
            font-family: "Lexend", sans-serif;
            font-weight: 600;
            font-size: 10px;
            letter-spacing: 3px;
            text-transform: uppercase;
            color: var(--accent-red);
          }
          .section-rule {
            width: 32px;
            height: 2.5px;
            border-radius: 2px;
            background: var(--accent-red);
            margin-bottom: 20px;
          }
          .section-title {
            margin: 0 0 14px;
            font-family: "Lexend", sans-serif;
            font-weight: 800;
            font-size: 28px;
            line-height: 1.1;
            letter-spacing: -0.5px;
            color: var(--text-primary);
          }
          .section-desc {
            margin: 0;
            font-family: "Lexend", sans-serif;
            font-weight: 400;
            font-size: 14px;
            color: var(--text-muted);
            line-height: 1.85;
          }

          .section-one-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 32px;
          }
          .section-quote {
            margin: 22px 0 0;
            border-left: 2px solid var(--accent-red);
            padding-left: 14px;
            font-family: "Lexend", sans-serif;
            font-weight: 300;
            font-style: italic;
            font-size: 16px;
            line-height: 1.55;
            color: var(--accent-red);
          }

          .section-two-head {
            border-left: 3px solid var(--accent-teal);
            padding-left: 22px;
            margin-bottom: 32px;
          }

          .home-dark-block {
            background: var(--bg-dark);
            border-radius: 16px;
            padding: 32px 24px;
            margin-bottom: 64px;
          }
          .section-title-dark {
            color: #f2ede4;
          }
          .section-desc-dark {
            color: #888888;
            margin-bottom: 28px;
          }

          .entry-list {
            width: 100%;
          }
          .entry-row {
            display: grid;
            grid-template-columns: 36px 1fr auto;
            align-items: center;
            gap: 20px;
            padding: 20px 0;
            border-bottom: 1px solid var(--border);
            text-decoration: none;
            color: inherit;
            cursor: pointer;
            transition: all 0.15s ease;
          }
          .entry-row-last {
            border-bottom: 0;
          }

          .enum {
            font-family: "Lexend", sans-serif;
            font-weight: 800;
            font-size: 22px;
            line-height: 1;
            color: var(--num-color);
            transition: color 0.2s ease;
          }
          .ec {
            min-width: 0;
          }
          .et {
            margin: 0 0 3px;
            font-family: "Lexend", sans-serif;
            font-weight: 700;
            font-size: 16px;
            color: var(--text-primary);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            transition: color 0.15s ease;
          }
          .ed {
            margin: 0;
            font-family: "Lexend", sans-serif;
            font-weight: 400;
            font-size: 12px;
            color: var(--text-hint);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .el {
            display: none;
            border: 1px solid var(--border);
            border-radius: 20px;
            padding: 5px 12px;
            font-family: "Lexend", sans-serif;
            font-weight: 600;
            font-size: 9px;
            letter-spacing: 1.5px;
            text-transform: uppercase;
            white-space: nowrap;
            color: var(--text-hint);
          }
          .el-teal {
            border-color: var(--accent-teal);
            color: var(--accent-teal);
          }
          .el-red {
            border-color: var(--accent-red);
            color: var(--accent-red);
          }

          .ea-circle {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: var(--accent-red);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            font-family: "Lexend", sans-serif;
            font-weight: 400;
            font-size: 14px;
            flex-shrink: 0;
            transition: transform 0.15s ease;
          }

          .entry-row:hover .enum,
          .entry-row:active .enum,
          .entry-row:hover .et,
          .entry-row:active .et {
            color: var(--accent-red);
          }
          .entry-row:hover .ea-circle,
          .entry-row:active .ea-circle {
            transform: scale(1.1);
          }

          .entry-row-dark {
            border-bottom-color: #2e2e2c;
          }
          .entry-row-dark .enum {
            color: #3a3a38;
          }
          .entry-row-dark .et {
            color: #f0ebe0;
          }
          .entry-row-dark .ed {
            color: #555555;
          }
          .entry-row-dark .el {
            border-color: #333333;
            color: #555555;
          }

          .entry-row-dark:hover .enum,
          .entry-row-dark:active .enum,
          .entry-row-dark:hover .et,
          .entry-row-dark:active .et {
            color: var(--accent-red);
          }

          @media (min-width: 1024px) {
            .home-container {
              padding: 0 28px;
            }
            .home-nav-wrap {
              margin-bottom: 72px;
            }
            .home-nav-desktop {
              display: flex;
            }
            .home-nav-mobile {
              display: none;
            }

            .hero {
              margin-bottom: 80px;
            }
            .hero-title {
              font-size: 56px;
              line-height: 1.05;
              letter-spacing: -2px;
            }

            .home-section {
              padding-top: 52px;
              margin-bottom: 64px;
            }
            .section-title {
              font-size: 36px;
            }
            .section-one-grid {
              grid-template-columns: 1fr 1fr;
              gap: 52px;
              align-items: start;
            }

            .home-dark-block {
              padding: 52px 44px;
            }

            .entry-row {
              grid-template-columns: 44px 1fr auto auto;
            }
            .enum {
              font-size: 32px;
            }
            .el {
              display: inline-flex;
            }
          }
        `}</style>
      </main>
    </>
  );
}
