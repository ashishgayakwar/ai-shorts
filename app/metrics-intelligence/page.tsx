"use client";

import Link from "next/link";
import { useState } from "react";

import ResultMemo from "./components/ResultMemo";

import type { AnalysisState, MetricsResult } from "@/lib/metrics-intelligence/types";

const REASONING_STEPS = [
  "Researching the company",
  "Analyzing the business model",
  "Deriving the metric system",
  "Finalizing the memo",
];
const EXAMPLE_COMPANIES = [
  "Uber",
  "Airbnb",
  "Notion",
  "Stripe",
  "Netflix",
  "Duolingo",
  "Swiggy",
  "Practo",
] as const;

async function sha256Hex(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const digest = await window.crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
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

export default function MetricsIntelligencePage() {
  const [company, setCompany] = useState("");
  const [state, setState] = useState<AnalysisState>("idle");
  const [result, setResult] = useState<MetricsResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);

  async function handleSubmit() {
    const trimmed = company.trim();
    if (trimmed.length < 2) return;

    setState("loading");
    setCurrentStep(0);
    setError(null);
    setResult(null);

    const interval = window.setInterval(() => {
      setCurrentStep((prev) => Math.min(prev + 1, REASONING_STEPS.length - 1));
    }, 3500);

    try {
      const fingerprint = await buildFingerprint();
      const response = await fetch("/api/metrics-intelligence", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-fingerprint": fingerprint,
        },
        body: JSON.stringify({ company: trimmed }),
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(errorData?.error || "Analysis failed");
      }

      const data = (await response.json()) as MetricsResult;
      setResult(data);
      setState("success");
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Something went wrong"
      );
      setState("error");
    } finally {
      window.clearInterval(interval);
    }
  }

  function resetToIdle() {
    setState("idle");
    setResult(null);
    setError(null);
    setCurrentStep(0);
  }

  const isDarkStage = state === "idle" || state === "loading";

  return (
    <main
      className={`min-h-screen transition-colors duration-700 ${
        isDarkStage ? "bg-[#0c1220] text-white" : "bg-[#edf1f5] text-[#111827]"
      }`}
    >
      <section className="mx-auto w-full max-w-[1480px] px-4 pb-20 pt-8 sm:px-8 sm:pt-12">
        <nav className="mb-6 flex items-center justify-between">
          <Link
            href="/"
            className={`text-[15px] font-[800] tracking-[0.08em] ${
              isDarkStage ? "text-white" : "text-[#233149]"
            }`}
          >
            AIPMWORLD
          </Link>
          <Link
            href="/"
            className={`rounded-full px-3 py-1.5 text-xs font-[700] uppercase tracking-[0.1em] transition ${
              isDarkStage
                ? "border border-white/20 text-white/70 hover:bg-white/10 hover:text-white"
                : "border border-[#cbd4e1] bg-[#f3f7fb] text-[#556277] hover:bg-[#e8eef6]"
            }`}
          >
            Home
          </Link>
        </nav>

        {state === "idle" ? (
          <>
            <section className="mx-auto max-w-3xl px-6 pb-16 pt-20 text-center sm:pt-28">
              <p className="text-[11px] font-[800] uppercase tracking-[0.25em] text-[#5b6a82]">
                Product 06 / 75
              </p>
              <h1 className="mx-auto mt-5 max-w-2xl font-[family-name:var(--font-fraunces)] text-[42px] font-[800] leading-[1.08] text-white sm:text-[64px]">
                How a company should measure success.
              </h1>
              <p className="mx-auto mt-6 max-w-xl text-[16px] leading-8 text-[#8494a7]">
                Enter any company. Get an opinionated metrics memo: one North Star,
                the drivers behind it, guardrails, and the traps most people fall into.
              </p>

              <div className="mx-auto mt-10 flex max-w-lg flex-col gap-3 sm:flex-row">
                <input
                  placeholder="Enter a company name..."
                  className="w-full rounded-xl border border-white/15 bg-white/8 px-4 py-3.5 text-[15px] text-white placeholder:text-[#5b6a82] outline-none transition focus:border-white/30 focus:ring-2 focus:ring-white/10"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && company.trim()) {
                      e.preventDefault();
                      handleSubmit();
                    }
                  }}
                />
                <button
                  onClick={handleSubmit}
                  disabled={!company.trim()}
                  className="rounded-xl bg-white px-6 py-3.5 text-sm font-[800] tracking-[0.06em] text-[#0c1220] transition hover:bg-[#e8eef6] disabled:cursor-not-allowed disabled:bg-white/20 disabled:text-white/30"
                >
                  Analyze Company
                </button>
              </div>

              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {EXAMPLE_COMPANIES.map((name) => (
                  <button
                    key={name}
                    onClick={() => setCompany(name)}
                    className="rounded-full border border-white/15 px-3.5 py-1.5 text-xs font-[600] tracking-[0.06em] text-[#8494a7] transition hover:border-white/30 hover:text-white"
                  >
                    {name}
                  </button>
                ))}
              </div>
            </section>

            <section className="mx-auto max-w-4xl border-t border-white/10 px-6 py-16">
              <p className="text-center text-[11px] font-[800] uppercase tracking-[0.25em] text-[#5b6a82]">
                How it works
              </p>
              <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-3">
                {[
                  {
                    num: "01",
                    title: "Understands the business",
                    desc: "Researches the company, identifies the business model, and maps how value is created and delivered.",
                  },
                  {
                    num: "02",
                    title: "Derives one North Star",
                    desc: "Evaluates candidate metrics, rejects weak options, and recommends one defensible metric to optimize.",
                  },
                  {
                    num: "03",
                    title: "Identifies what breaks",
                    desc: "Maps the causal drivers, sets guardrails against over-optimization, and flags common metric traps.",
                  },
                ].map((step) => (
                  <div key={step.num}>
                    <span className="text-[28px] font-[800] text-[#2a3a52]">{step.num}</span>
                    <h3 className="mt-2 text-[16px] font-[800] text-white">{step.title}</h3>
                    <p className="mt-2 text-[14px] leading-7 text-[#6b7c93]">{step.desc}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="pb-20 text-center">
              <p className="text-[11px] font-[800] uppercase tracking-[0.25em] text-[#5b6a82]">
                Built for
              </p>
              <p className="mt-3 text-[14px] text-[#6b7c93]">
                Product Managers · Founders · Operators · Consultants · Interview Prep
              </p>
            </section>
          </>
        ) : null}

        {state === "loading" ? (
          <section className="flex min-h-[60vh] items-center justify-center">
            <div className="text-center">
              <p className="text-[11px] font-[800] uppercase tracking-[0.25em] text-[#5b6a82]">
                Analyzing
              </p>
              <p className="mt-2 text-[20px] font-bold text-white">{company}</p>

              <div className="mt-10 flex flex-col gap-4 text-left">
                {REASONING_STEPS.map((step, i) => (
                  <div
                    key={step}
                    className={`flex items-center gap-3 text-[14px] transition-all duration-500 ${
                      i < currentStep
                        ? "text-[#5b6a82]"
                        : i === currentStep
                          ? "text-white"
                          : "text-[#2a3a52]"
                    }`}
                  >
                    {i < currentStep ? (
                      <span className="text-[#5b6a82]">✓</span>
                    ) : i === currentStep ? (
                      <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
                    ) : (
                      <span className="h-2 w-2 rounded-full bg-[#2a3a52]" />
                    )}
                    {step}
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {state === "success" && result ? (
          <ResultMemo result={result} onReset={resetToIdle} />
        ) : null}

        {state === "error" ? (
          <section
            className={`mx-auto w-full max-w-2xl rounded-[24px] border p-6 ${
              isDarkStage
                ? "border-white/20 bg-white/5"
                : "border-[#e0c8c6] bg-[#fcf4f3]"
            }`}
          >
            <p
              className={`text-[11px] font-[800] uppercase tracking-[0.2em] ${
                isDarkStage ? "text-[#9fb0c9]" : "text-[#86514c]"
              }`}
            >
              Analysis Error
            </p>
            <p className={`mt-3 text-sm leading-7 ${isDarkStage ? "text-white/85" : "text-[#6f3e3a]"}`}>
              {error || "Something went wrong."}
            </p>
            <button
              type="button"
              onClick={resetToIdle}
              className={`mt-5 rounded-full border px-4 py-2 text-xs font-[800] tracking-[0.1em] transition ${
                isDarkStage
                  ? "border-white/25 bg-white/10 text-white hover:bg-white/15"
                  : "border-[#d3b0ad] bg-[#f8e9e7] text-[#6f3e3a] hover:bg-[#f2ddd9]"
              }`}
            >
              Retry
            </button>
          </section>
        ) : null}
      </section>
    </main>
  );
}
