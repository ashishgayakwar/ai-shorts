"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import ConnectorLayer from "./components/ConnectorLayer";
import Hero from "./components/Hero";
import Masthead from "./components/Masthead";
import MethodNotes from "./components/MethodNotes";
import NowAnalyzingBar from "./components/NowAnalyzingBar";
import ResultPanel from "./components/ResultPanel";
import SpecimenInput from "./components/SpecimenInput";
import TryAnotherCTA from "./components/TryAnotherCTA";
import VerdictCard from "./components/VerdictCard";
import { SAMPLES, type SampleKey } from "./lib/samples";
import { tokenizeAll, type Token } from "./lib/tokenizers";
import "./styles.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400", "600", "900"],
  style: ["normal", "italic"],
  variable: "--font-tl-display",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-tl-body",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-tl-mono",
});

interface HoveredToken {
  key: string;
  start: number;
  end: number;
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return aStart < bEnd && bStart < aEnd;
}

export default function TokenLab() {
  const prefersReducedMotion = useReducedMotion();

  const [inputText, setInputText] = useState("");
  const [analyzedText, setAnalyzedText] = useState<string | null>(null);
  const [firstAnalyze, setFirstAnalyze] = useState(true);
  const [isDissecting, setIsDissecting] = useState(false);
  const [isPulsing, setIsPulsing] = useState(false);
  const [isAnalyzeFiring, setIsAnalyzeFiring] = useState(false);
  const [activeSample, setActiveSample] = useState<SampleKey | null>(null);
  const [charFlip, setCharFlip] = useState(false);
  const [hoveredToken, setHoveredToken] = useState<HoveredToken | null>(null);

  const specimenRef = useRef<HTMLElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const resultsRef = useRef<HTMLElement | null>(null);
  const sampleRafRef = useRef<number | null>(null);
  const charFlipRafRef = useRef<number | null>(null);
  const tokenRefs = useRef<Map<string, HTMLSpanElement>>(new Map());
  const timersRef = useRef<number[]>([]);

  const hasResults = Boolean(analyzedText);
  const results = useMemo(() => tokenizeAll(analyzedText ?? ""), [analyzedText]);

  const highlightedKeys = useMemo(() => {
    if (!hoveredToken || !hasResults) {
      return new Set<string>();
    }

    const next = new Set<string>();
    for (const result of results) {
      result.tokens.forEach((token, tokenIndex) => {
        if (overlaps(hoveredToken.start, hoveredToken.end, token.start, token.end)) {
          next.add(`${result.method.key}-${tokenIndex}`);
        }
      });
    }
    return next;
  }, [hasResults, hoveredToken, results]);

  const highlightedKeyArray = useMemo(() => [...highlightedKeys], [highlightedKeys]);

  const maxCount = useMemo(() => Math.max(...results.map((result) => result.count), 0), [results]);
  const verdictItems = useMemo(
    () =>
      results.map((result, index) => ({
        method: result.method.key,
        label: result.method.label,
        count: result.count,
        max: maxCount,
        index,
      })),
    [maxCount, results],
  );

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
  }, []);

  useEffect(
    () => () => {
      clearTimers();
      if (sampleRafRef.current) {
        window.cancelAnimationFrame(sampleRafRef.current);
      }
      if (charFlipRafRef.current) {
        window.cancelAnimationFrame(charFlipRafRef.current);
      }
    },
    [clearTimers],
  );

  useEffect(() => {
    tokenRefs.current.clear();
  }, [analyzedText]);

  const triggerCharFlip = useCallback(() => {
    setCharFlip(false);
    const raf = window.requestAnimationFrame(() => {
      setCharFlip(true);
      const timeout = window.setTimeout(() => setCharFlip(false), 220);
      timersRef.current.push(timeout);
    });
    charFlipRafRef.current = raf;
  }, []);

  const setInputValue = useCallback(
    (value: string) => {
      setInputText(value);
      triggerCharFlip();
    },
    [triggerCharFlip],
  );

  const stopSampleAnimation = useCallback(() => {
    if (sampleRafRef.current) {
      window.cancelAnimationFrame(sampleRafRef.current);
      sampleRafRef.current = null;
    }
  }, []);

  const handleInputChange = useCallback(
    (value: string) => {
      stopSampleAnimation();
      setActiveSample(null);
      setInputValue(value);
    },
    [setInputValue, stopSampleAnimation],
  );

  const registerTokenRef = useCallback((key: string, node: HTMLSpanElement | null) => {
    if (node) {
      tokenRefs.current.set(key, node);
      return;
    }
    tokenRefs.current.delete(key);
  }, []);

  const getElementByKey = useCallback((key: string) => tokenRefs.current.get(key) ?? null, []);

  const handleSampleClick = useCallback(
    (key: SampleKey) => {
      const sampleText = SAMPLES[key];
      setActiveSample(key);
      setAnalyzedText(null);
      setHoveredToken(null);
      stopSampleAnimation();

      let index = 0;
      const stepChars = Math.max(2, Math.min(3, Math.ceil(sampleText.length / 24)));
      setInputValue("");

      const tick = () => {
        index += stepChars;
        const next = sampleText.slice(0, Math.min(index, sampleText.length));
        setInputValue(next);
        if (index < sampleText.length) {
          sampleRafRef.current = window.requestAnimationFrame(tick);
        } else {
          sampleRafRef.current = null;
        }
      };

      sampleRafRef.current = window.requestAnimationFrame(tick);
      const timeout = window.setTimeout(() => setActiveSample(null), 360);
      timersRef.current.push(timeout);
    },
    [setInputValue, stopSampleAnimation],
  );

  const scrollToInput = useCallback(
    (clearText: boolean) => {
      setAnalyzedText(null);
      setHoveredToken(null);
      if (clearText) {
        setInputValue("");
      }
      specimenRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      const timeout = window.setTimeout(() => textareaRef.current?.focus(), 500);
      timersRef.current.push(timeout);
    },
    [setInputValue],
  );

  const handleAnalyze = useCallback(() => {
    const text = inputText.trim();
    if (!text) return;

    clearTimers();
    setIsAnalyzeFiring(true);
    setAnalyzedText(null);
    setHoveredToken(null);
    setIsDissecting(true);

    const firingTimeout = window.setTimeout(() => setIsAnalyzeFiring(false), 400);
    timersRef.current.push(firingTimeout);

    const processDelay = firstAnalyze ? 1400 : 600;
    const processTimeout = window.setTimeout(() => {
      setIsDissecting(false);
      setIsPulsing(true);
      const pulseTimeout = window.setTimeout(() => setIsPulsing(false), 650);
      timersRef.current.push(pulseTimeout);

      setAnalyzedText(text);
      const scrollTimeout = window.setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 200);
      timersRef.current.push(scrollTimeout);
      setFirstAnalyze(false);
    }, processDelay);

    timersRef.current.push(processTimeout);
  }, [clearTimers, firstAnalyze, inputText]);

  const handleTokenHoverStart = useCallback((token: Token, tokenKey: string) => {
    setHoveredToken({ key: tokenKey, start: token.start, end: token.end });
  }, []);

  const handleTokenHoverEnd = useCallback(() => {
    setHoveredToken(null);
  }, []);

  return (
    <main className={`tl-root ${fraunces.variable} ${inter.variable} ${jetbrainsMono.variable}`}>
      <div className="tl-wrap">
        <Masthead />
        <Hero />

        <SpecimenInput
          inputText={inputText}
          isDissecting={isDissecting}
          isPulsing={isPulsing}
          charFlip={charFlip}
          activeSample={activeSample}
          isAnalyzeFiring={isAnalyzeFiring}
          onInputChange={handleInputChange}
          onSampleClick={handleSampleClick}
          onAnalyze={handleAnalyze}
          specimenRef={specimenRef}
          textareaRef={textareaRef}
        />

        <AnimatePresence mode="wait">
          {hasResults ? (
            <motion.section
              key="results"
              className="tl-results"
              ref={resultsRef}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: prefersReducedMotion ? 0 : 0 }}
              transition={{ duration: prefersReducedMotion ? 0.01 : 0.15 }}
            >
              <NowAnalyzingBar text={analyzedText ?? ""} onEdit={() => scrollToInput(false)} />

              <header className="tl-results-header">
                <h2>Four cuts of the same text.</h2>
                <div className="tl-hint">HOVER TOKENS TO TRACE ACROSS METHODS</div>
              </header>

              <div>
                {results.map((result, index) => (
                  <ResultPanel
                    key={result.method.key}
                    methodNumber={index + 1}
                    method={result.method.key}
                    title={result.method.label}
                    subtitle={result.method.subtitle}
                    tokens={result.tokens}
                    panelIndex={index}
                    unique={result.unique}
                    charsPerToken={result.charsPerToken}
                    highlightedKeys={highlightedKeys}
                    hasHover={Boolean(hoveredToken)}
                    onHoverStart={handleTokenHoverStart}
                    onHoverEnd={handleTokenHoverEnd}
                    registerRef={registerTokenRef}
                  />
                ))}
              </div>

              <VerdictCard show={hasResults} items={verdictItems} />
              <MethodNotes />
              <TryAnotherCTA show={hasResults} onTryAnother={() => scrollToInput(true)} />
            </motion.section>
          ) : null}
        </AnimatePresence>

        <footer className="tl-foot">
          <div>DAY 14 · TOKENLAB · 75 PRODUCTS 75 DAYS</div>
          <div>BUILT FOR THE CURIOUS · 2026</div>
        </footer>
      </div>

      <ConnectorLayer
        sourceKey={hoveredToken?.key ?? null}
        targetKeys={highlightedKeyArray}
        getElementByKey={getElementByKey}
      />
    </main>
  );
}
