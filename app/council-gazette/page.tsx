"use client";

import {
  Kalam,
  Caveat,
  Cormorant_Garamond,
  Libre_Baskerville,
  Playfair_Display,
  Special_Elite,
  UnifrakturMaguntia,
} from "next/font/google";
import { useEffect, useMemo, useState } from "react";

import styles from "./council-gazette.module.css";
import { BroadsheetOutput } from "./components/BroadsheetOutput";
import { InputSection } from "./components/InputSection";
import { LoadingSection } from "./components/LoadingSection";
import type { BodyFontOption, BodySizeOption, CouncilResponse } from "./types";

type Phase = "input" | "loading" | "output" | "error";

const unifraktur = UnifrakturMaguntia({ subsets: ["latin"], weight: "400", variable: "--font-unifraktur" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair" });
const libre = Libre_Baskerville({ subsets: ["latin"], weight: ["400", "700"], style: ["normal", "italic"], variable: "--font-libre" });
const specialElite = Special_Elite({ subsets: ["latin"], weight: "400", variable: "--font-special-elite" });
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
});
const caveat = Caveat({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-caveat",
});
const kalam = Kalam({
  subsets: ["latin"],
  weight: ["300", "400", "700"],
  variable: "--font-kalam",
});

const LOADING_MESSAGES = [
  "The council is in session...",
  "Dispatches being received...",
  "GPT-4o is composing its report...",
  "DeepSeek is weighing the evidence...",
  "Gemini is filing from Mountain View...",
  "The editor is reading all three...",
  "Verdict being prepared...",
];

function createTodayLabel() {
  return new Date()
    .toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
    .toUpperCase();
}

export default function CouncilGazettePage() {
  const [phase, setPhase] = useState<Phase>("input");
  const [question, setQuestion] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [result, setResult] = useState<CouncilResponse | null>(null);
  const [lastQuestion, setLastQuestion] = useState("");
  const [loadingIndex, setLoadingIndex] = useState(0);
  const [todayLabel, setTodayLabel] = useState("");
  const [bodyFontOption, setBodyFontOption] = useState<BodyFontOption>("libre");
  const [bodySizeOption, setBodySizeOption] = useState<BodySizeOption>(18);

  useEffect(() => {
    setTodayLabel(createTodayLabel());
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlBg = html.style.background;
    const prevBodyBg = body.style.background;
    const prevBodyMinHeight = body.style.minHeight;

    html.style.background = "#f2e8d0";
    body.style.background = "#f2e8d0";
    body.style.minHeight = "100vh";

    return () => {
      html.style.background = prevHtmlBg;
      body.style.background = prevBodyBg;
      body.style.minHeight = prevBodyMinHeight;
    };
  }, []);

  useEffect(() => {
    if (phase !== "loading") return;

    const interval = window.setInterval(() => {
      setLoadingIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 1800);

    return () => window.clearInterval(interval);
  }, [phase]);

  const dotStates = useMemo(() => {
    if (phase === "loading") {
      return { gpt: "active", deepseek: "active", gemini: "active", synthesis: "idle" } as const;
    }

    if (phase === "output" && result) {
      const lookup = Object.fromEntries(result.answers.map((answer) => [answer.model, answer.status]));
      return {
        gpt: lookup.gpt === "done" ? "done" : "idle",
        deepseek: lookup.deepseek === "done" ? "done" : "idle",
        gemini: lookup.gemini === "done" ? "done" : "idle",
        synthesis: "done",
      } as const;
    }

    return { gpt: "idle", deepseek: "idle", gemini: "idle", synthesis: "idle" } as const;
  }, [phase, result]);

  async function handleSubmit() {
    const trimmed = question.trim();
    if (!trimmed) {
      setErrorMsg("Question is required.");
      setPhase("error");
      return;
    }
    if (trimmed.length < 10) {
      setErrorMsg("Question is too short. Min 10 characters.");
      setPhase("error");
      return;
    }
    if (trimmed.length > 500) {
      setErrorMsg("Question is too long. Max 500 characters.");
      setPhase("error");
      return;
    }

    setErrorMsg("");
    setPhase("loading");
    setLoadingIndex(0);
    setLastQuestion(trimmed);

    try {
      const response = await fetch("/api/council-gazette", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed }),
      });

      const data: unknown = await response.json();
      if (!response.ok) {
        const message =
          typeof data === "object" && data !== null && "error" in data && typeof data.error === "string"
            ? data.error
            : `Error ${response.status}`;
        throw new Error(message);
      }

      setResult(data as CouncilResponse);
      setPhase("output");
    } catch (error) {
      setPhase("error");
      setErrorMsg(error instanceof Error ? error.message : "Something went wrong.");
      setQuestion(trimmed);
    }
  }

  function resetSession() {
    setPhase("input");
    setResult(null);
    setErrorMsg("");
    setQuestion(lastQuestion);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const showInput = phase === "input" || phase === "error";

  return (
    <main
      className={`${styles.routeRoot} ${styles.pageShell} ${unifraktur.variable} ${playfair.variable} ${libre.variable} ${specialElite.variable} ${cormorant.variable} ${caveat.variable} ${kalam.variable}`}
    >
      <div className={styles.pageWrap}>
        <header className={styles.masthead}>
          <div className={styles.mastheadTop}>
            <span>Est. Day 10 · 75 Products Series</span>
            <span className={styles.mastheadTopCenter}>Three Correspondents · One Verdict</span>
            <span>{todayLabel}</span>
          </div>

          <h1 className={styles.paperName}>The Council Gazette</h1>

          <div className={styles.mastheadRule}>
            <div className={styles.mastheadRuleLine} />
            <div className={styles.mastheadRuleDiamond} />
            <div className={styles.mastheadRuleLine} />
          </div>

          <p className={styles.mastheadTagline}>Dispatches from the three great minds of our age</p>

          <div className={styles.mastheadMeta}>
            <span>Ashish Gayakwar · aipmworld.com</span>
            <span>Vol. I · No. 10 · One question. Three answers. One truth.</span>
            <span>75 Products · 75 Days</span>
          </div>
        </header>

        {showInput ? (
          <InputSection
            question={question}
            errorMsg={errorMsg}
            disabled={question.trim().length < 10}
            onQuestionChange={setQuestion}
            onSubmit={handleSubmit}
            dotStates={dotStates}
          />
        ) : null}

        {phase === "loading" ? <LoadingSection message={LOADING_MESSAGES[loadingIndex]} /> : null}

        {phase === "output" && result ? (
          <BroadsheetOutput
            result={result}
            onReset={resetSession}
            bodyFontOption={bodyFontOption}
            bodySizeOption={bodySizeOption}
            onSetBodyFontOption={setBodyFontOption}
            onSetBodySizeOption={setBodySizeOption}
          />
        ) : null}
      </div>
    </main>
  );
}
