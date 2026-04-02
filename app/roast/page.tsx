"use client";

import { useEffect, useMemo, useState } from "react";
import { Bebas_Neue, Courier_Prime, Permanent_Marker } from "next/font/google";
import Link from "next/link";

import InputSection from "./components/InputSection";
import OutputSection from "./components/OutputSection";
import type { RoastInput, RoastResult } from "./types";
import styles from "./roast.module.css";

type Phase = "input" | "loading" | "output" | "error";

const bebasNeue = Bebas_Neue({ weight: "400", subsets: ["latin"], variable: "--font-bebas" });
const permanentMarker = Permanent_Marker({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-marker",
});
const courierPrime = Courier_Prime({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-courier",
});

const LOADING_MESSAGES = [
  "SUMMONING THE ROASTER...",
  "CONSULTING THE GRAVEYARD...",
  "SHARPENING THE QUILL...",
  "PREPARING YOUR DESTRUCTION...",
  "THE JURY IS LIVID...",
];

export default function RoastPage() {
  const [phase, setPhase] = useState<Phase>("input");
  const [result, setResult] = useState<RoastResult | null>(null);
  const [lastInput, setLastInput] = useState<RoastInput | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);

  useEffect(() => {
    if (phase !== "loading") return;
    const intervalId = setInterval(() => {
      setLoadingMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 2000);
    return () => clearInterval(intervalId);
  }, [phase]);

  const tickerText = useMemo(
    () =>
      "⚡ DAY 08 · 75 PRODUCTS 75 DAYS · ASHISH GAYAKWAR ⚡ WE ROAST. YOU LEARN. ⚡ DAY 08 · 75 PRODUCTS 75 DAYS · ASHISH GAYAKWAR ⚡ WE ROAST. YOU LEARN. ⚡ DAY 08 · 75 PRODUCTS 75 DAYS · ASHISH GAYAKWAR ⚡ WE ROAST. YOU LEARN.",
    []
  );

  async function handleSubmit(input: RoastInput) {
    setPhase("loading");
    setErrorMsg("");
    setLoadingMessageIndex(0);

    try {
      const res = await fetch("/api/roast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      const data: unknown = await res.json();
      if (!res.ok) {
        const message =
          typeof data === "object" && data !== null && "error" in data && typeof data.error === "string"
            ? data.error
            : `Request failed (${res.status})`;
        throw new Error(message);
      }

      setResult(data as RoastResult);
      setLastInput(input);
      setPhase("output");
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : "Something went wrong. Try again.");
      setLastInput(input);
      setPhase("error");
    }
  }

  const resetFlow = () => {
    setPhase("input");
    setResult(null);
    setLastInput(null);
    setErrorMsg("");
    setLoadingMessageIndex(0);
  };

  return (
    <main className={`${styles.root} ${bebasNeue.variable} ${permanentMarker.variable} ${courierPrime.variable}`}>
      <div className={styles.pageWrap}>
        <div className={styles.header}>
          <Link href="/" className={styles.homeIconLink} aria-label="Go to home">
            ⌂
          </Link>
          <div className={styles.tape}>
            <span>{tickerText}&nbsp;&nbsp;&nbsp;</span>
          </div>
          <div className={styles.headerBody}>
            <div className={styles.bigTitle}>
              ROAST
              <br />
              <span className={styles.red}>MY</span>
              <br />
              <span className={styles.yel}>IDEA</span>
            </div>
            <div className={styles.headerRight}>
              <div className={styles.bigBang}>!</div>
            </div>
          </div>
          <div className={styles.headerSubRow}>
            <div className={styles.redPill}>→ FILE FOR TRIAL</div>
            <span className={styles.subNote}>WE ROAST. YOU LEARN.</span>
          </div>
        </div>

        <div className={styles.torn} />

        {(phase === "input" || phase === "error") && (
          <InputSection
            onSubmit={handleSubmit}
            loading={false}
            errorMsg={errorMsg}
            initialIdea={lastInput?.idea ?? ""}
            initialSelection={{
              audience: lastInput?.audience ?? null,
              stage: lastInput?.stage ?? null,
              risk: lastInput?.risk ?? null,
            }}
          />
        )}

        {phase === "loading" && (
          <div className={styles.loading}>
            <div className={styles.loadSym}>⚙</div>
            <div className={styles.loadTxt}>{LOADING_MESSAGES[loadingMessageIndex]}</div>
          </div>
        )}

        {phase === "output" && result && lastInput && (
          <OutputSection result={result} input={lastInput} onReset={resetFlow} />
        )}

        <div className={styles.footer}>
          75 PRODUCTS · 75 DAYS · DAY 08 · ASHISH GAYAKWAR · ALL VERDICTS FINAL · NO REFUNDS · THE IDEA
          INQUISITOR
        </div>
      </div>
    </main>
  );
}
