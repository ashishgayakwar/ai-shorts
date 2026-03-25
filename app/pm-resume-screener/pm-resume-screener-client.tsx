"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";

type MatchStatus = "Strong Match" | "Needs Work" | "Not a Fit";
type InputMode = "upload" | "paste";
type LoadingStage = "idle" | "extracting_pdf" | "switching_to_paste" | "analyzing";

type ScreenerResult = {
  fitScore: number;
  status: MatchStatus;
  matching: string[];
  missing: string[];
  oneThingToFixNow: string;
};

type ApiSuccess = {
  result: ScreenerResult;
  remaining?: number;
};

type ApiFailure = {
  error?: string;
  remaining?: number;
};

type PdfJsModule = typeof import("pdfjs-dist");

const PDF_MIN_TEXT_CHARS = 100;
const PDF_MAX_PAGES_TO_READ = 15;
const PDF_PARSE_FALLBACK_MESSAGE = "We couldn't read your PDF. Please paste your resume text below instead.";

function statusTone(status: MatchStatus) {
  if (status === "Strong Match") {
    return "bg-emerald-100 text-emerald-900 border-emerald-300";
  }
  if (status === "Needs Work") {
    return "bg-amber-100 text-amber-900 border-amber-300";
  }
  return "bg-rose-100 text-rose-900 border-rose-300";
}

function normalizeWhitespace(text: string) {
  return text.replace(/\u0000/g, "").replace(/\s+/g, " ").trim();
}

function stageLabel(stage: LoadingStage) {
  if (stage === "extracting_pdf") return "Reading your PDF...";
  if (stage === "switching_to_paste") return "Switching to paste mode...";
  if (stage === "analyzing") return "Analyzing resume fit...";
  return "";
}

async function extractResumeTextFromPdf(file: File): Promise<string> {
  const pdfjs = (await import("pdfjs-dist")) as PdfJsModule;

  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();

  const fileBytes = new Uint8Array(await file.arrayBuffer());
  const loadingTask = pdfjs.getDocument({ data: fileBytes });
  const document = await loadingTask.promise;

  try {
    const pageLimit = Math.min(document.numPages, PDF_MAX_PAGES_TO_READ);
    const pageTexts: string[] = [];

    for (let pageNumber = 1; pageNumber <= pageLimit; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item) => {
          if (typeof item === "object" && item !== null && "str" in item) {
            const value = (item as { str?: unknown }).str;
            return typeof value === "string" ? value : "";
          }
          return "";
        })
        .join(" ");

      pageTexts.push(pageText);
      page.cleanup();
    }

    return normalizeWhitespace(pageTexts.join("\n"));
  } finally {
    await document.destroy();
  }
}

export default function PmResumeScreenerClient() {
  const [inputMode, setInputMode] = useState<InputMode>("upload");
  const [jobDescription, setJobDescription] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeText, setResumeText] = useState("");
  const [result, setResult] = useState<ScreenerResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingStage, setLoadingStage] = useState<LoadingStage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);

  const canSubmit = useMemo(() => {
    if (isSubmitting) return false;
    if (jobDescription.trim().length < 80) return false;

    if (inputMode === "upload") {
      return !!resumeFile;
    }

    return normalizeWhitespace(resumeText).length >= PDF_MIN_TEXT_CHARS;
  }, [inputMode, isSubmitting, jobDescription, resumeFile, resumeText]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoadingStage("idle");

    let finalResumeText = "";

    if (inputMode === "upload") {
      if (!resumeFile) {
        setError("Upload a PDF resume to continue.");
        return;
      }

      try {
        setLoadingStage("extracting_pdf");
        finalResumeText = await extractResumeTextFromPdf(resumeFile);
      } catch {
        setLoadingStage("switching_to_paste");
        await new Promise((resolve) => setTimeout(resolve, 350));
        setInputMode("paste");
        setResult(null);
        setError(PDF_PARSE_FALLBACK_MESSAGE);
        setLoadingStage("idle");
        return;
      }

      if (finalResumeText.length < PDF_MIN_TEXT_CHARS) {
        setLoadingStage("switching_to_paste");
        await new Promise((resolve) => setTimeout(resolve, 350));
        setInputMode("paste");
        setResult(null);
        setError(PDF_PARSE_FALLBACK_MESSAGE);
        setLoadingStage("idle");
        return;
      }
    } else {
      finalResumeText = normalizeWhitespace(resumeText);
      if (finalResumeText.length < PDF_MIN_TEXT_CHARS) {
        setError("Please paste at least 100 characters of resume text.");
        return;
      }
    }

    setIsSubmitting(true);
    setLoadingStage("analyzing");

    try {
      const response = await fetch("/api/pm-resume-screener", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          jobDescription,
          resumeText: finalResumeText,
        }),
      });

      if (!response.ok) {
        const fail = (await response.json().catch(() => null)) as ApiFailure | null;
        setResult(null);
        setRemaining(typeof fail?.remaining === "number" ? fail.remaining : null);
        setError(fail?.error || "Analysis failed. Please retry.");
        return;
      }

      const success = (await response.json()) as ApiSuccess;
      setResult(success.result);
      setRemaining(typeof success.remaining === "number" ? success.remaining : null);
    } catch {
      setResult(null);
      setError("Unable to reach the server. Please try again.");
    } finally {
      setIsSubmitting(false);
      setLoadingStage("idle");
    }
  }

  return (
    <main className="min-h-screen bg-[#f1ece3] text-[#1f1916]">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8 sm:py-12">
        <header className="rounded-[34px] border border-[#d9d1c5] bg-[#f7f2ea] p-6 shadow-[0_20px_60px_rgba(38,30,24,0.08)] sm:p-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="rounded-full border border-[#d5cdc2] bg-[#ece6dc] px-4 py-2 text-[11px] font-[800] tracking-[0.18em] text-[#6a5d53]">
              01/75
            </p>
            <Link
              href="/"
              className="rounded-full border border-[#d5cdc2] bg-[#f1ece4] px-4 py-2 text-xs font-[700] tracking-[0.08em] text-[#3c332d] transition hover:bg-[#e8e2d8]"
            >
              Back Home
            </Link>
          </div>

          <h1 className="mt-6 font-[family-name:var(--font-fraunces)] text-[42px] leading-[0.95] tracking-[-0.02em] text-[#171210] sm:text-[74px]">
            PM Resume Screener
          </h1>

          <p className="mt-4 max-w-3xl font-[family-name:var(--font-manrope)] text-[17px] leading-8 text-[#4f433b]">
            Paste a job description, upload your resume PDF, and get an editorial fit read with
            score, strengths, gaps, and one immediate fix.
          </p>

          <div className="mt-6 rounded-2xl border border-[#d7cec2] bg-[#efe9de] p-5 font-[family-name:var(--font-manrope)] text-sm leading-6 text-[#4d4138]">
            Resume privacy: files are processed in-memory and discarded immediately after analysis.
            Nothing is stored.
          </div>
        </header>

        <form
          onSubmit={handleSubmit}
          className="mt-8 space-y-6 rounded-[34px] border border-[#d9d1c5] bg-[#f7f2ea] p-6 shadow-[0_20px_60px_rgba(38,30,24,0.08)] sm:p-10"
        >
          {loadingStage !== "idle" ? (
            <div className="rounded-2xl border border-[#d8cec2] bg-[#efe7dc] px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#8e7463] border-t-transparent" />
                <p className="font-[family-name:var(--font-manrope)] text-sm font-[700] text-[#4f433b]">
                  {stageLabel(loadingStage)}
                </p>
              </div>
            </div>
          ) : null}

          <section className="space-y-3">
            <label
              htmlFor="job-description"
              className="block font-[family-name:var(--font-manrope)] text-[12px] font-[800] uppercase tracking-[0.18em] text-[#76675d]"
            >
              Job Description
            </label>
            <textarea
              id="job-description"
              value={jobDescription}
              onChange={(event) => setJobDescription(event.target.value)}
              placeholder="Paste the full PM job description here..."
              className="min-h-[230px] w-full resize-y rounded-2xl border border-[#d2c9bc] bg-[#fbf8f2] p-5 font-[family-name:var(--font-manrope)] text-base leading-7 text-[#2a2420] outline-none transition focus:border-[#98816f] focus:ring-2 focus:ring-[#ccb9a8]"
            />
          </section>

          <section className="space-y-4">
            <p className="block font-[family-name:var(--font-manrope)] text-[12px] font-[800] uppercase tracking-[0.18em] text-[#76675d]">
              Resume Input
            </p>

            <div className="inline-flex rounded-full border border-[#d2c9bc] bg-[#eee8de] p-1">
              <button
                type="button"
                onClick={() => setInputMode("upload")}
                className={`rounded-full px-4 py-2 font-[family-name:var(--font-manrope)] text-xs font-[800] tracking-[0.08em] transition ${
                  inputMode === "upload"
                    ? "bg-[#1f1916] text-[#f7f2ea]"
                    : "text-[#5d5149] hover:bg-[#e6ddd0]"
                }`}
              >
                📎 Upload PDF
              </button>
              <button
                type="button"
                onClick={() => setInputMode("paste")}
                className={`rounded-full px-4 py-2 font-[family-name:var(--font-manrope)] text-xs font-[800] tracking-[0.08em] transition ${
                  inputMode === "paste"
                    ? "bg-[#1f1916] text-[#f7f2ea]"
                    : "text-[#5d5149] hover:bg-[#e6ddd0]"
                }`}
              >
                📝 Paste Text
              </button>
            </div>

            {inputMode === "upload" ? (
              <div className="space-y-3">
                <input
                  id="resume-upload"
                  type="file"
                  accept="application/pdf"
                  onChange={(event) => setResumeFile(event.target.files?.[0] || null)}
                  className="block w-full rounded-2xl border border-[#d2c9bc] bg-[#fbf8f2] p-4 font-[family-name:var(--font-manrope)] text-sm text-[#2d2621] file:mr-4 file:rounded-full file:border-0 file:bg-[#1f1916] file:px-4 file:py-2 file:text-xs file:font-[800] file:uppercase file:tracking-[0.12em] file:text-[#f7f2ea]"
                />
                <p className="font-[family-name:var(--font-manrope)] text-xs text-[#6e6158]">
                  We extract text with PDF.js. If text is too thin (&lt;100 chars), we will switch
                  you to Paste Text automatically.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <textarea
                  id="resume-text"
                  value={resumeText}
                  onChange={(event) => setResumeText(event.target.value)}
                  placeholder="Paste your full resume text here..."
                  className="min-h-[230px] w-full resize-y rounded-2xl border border-[#d2c9bc] bg-[#fbf8f2] p-5 font-[family-name:var(--font-manrope)] text-base leading-7 text-[#2a2420] outline-none transition focus:border-[#98816f] focus:ring-2 focus:ring-[#ccb9a8]"
                />
                <p className="font-[family-name:var(--font-manrope)] text-xs text-[#6e6158]">
                  Minimum 100 characters for analysis.
                </p>
              </div>
            )}

          </section>

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full rounded-full border border-[#1f1916] bg-[#1f1916] px-7 py-3.5 font-[family-name:var(--font-manrope)] text-sm font-[800] uppercase tracking-[0.14em] text-[#f7f2ea] transition hover:bg-[#2f2621] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "Analyzing..." : "Analyze My Fit"}
          </button>

          {remaining !== null ? (
            <p className="font-[family-name:var(--font-manrope)] text-xs text-[#6e6158]">
              Remaining analyses for this visitor: {remaining}
            </p>
          ) : null}

          {error ? (
            <div className="rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 font-[family-name:var(--font-manrope)] text-sm text-rose-900">
              {error}
            </div>
          ) : null}
        </form>

        {result ? (
          <section className="mt-8 space-y-6">
            <article className="rounded-[34px] border border-[#d9d1c5] bg-[#f7f2ea] p-7 shadow-[0_20px_60px_rgba(38,30,24,0.08)] sm:p-10">
              <p className="font-[family-name:var(--font-manrope)] text-[12px] font-[800] uppercase tracking-[0.18em] text-[#76675d]">
                Fit Score
              </p>
              <div className="mt-4 flex flex-wrap items-end gap-4">
                <div className="font-[family-name:var(--font-fraunces)] text-[84px] leading-none text-[#16110f] sm:text-[120px]">
                  {result.fitScore}
                </div>
                <div className="pb-3 font-[family-name:var(--font-manrope)] text-2xl font-[700] text-[#4b4038]">
                  /100
                </div>
              </div>

              <span
                className={`mt-4 inline-flex rounded-full border px-4 py-2 font-[family-name:var(--font-manrope)] text-xs font-[800] uppercase tracking-[0.14em] ${statusTone(result.status)}`}
              >
                {result.status}
              </span>
            </article>

            <article className="rounded-[30px] border border-emerald-200 bg-emerald-50 p-7 sm:p-9">
              <h2 className="font-[family-name:var(--font-fraunces)] text-4xl text-emerald-950 sm:text-5xl">
                ✅ What&apos;s Matching
              </h2>
              <ul className="mt-5 space-y-3 font-[family-name:var(--font-manrope)] text-[16px] leading-7 text-emerald-900">
                {result.matching.map((item) => (
                  <li key={item} className="rounded-xl bg-white/60 px-4 py-3">
                    {item}
                  </li>
                ))}
              </ul>
            </article>

            <article className="rounded-[30px] border border-rose-200 bg-rose-50 p-7 sm:p-9">
              <h2 className="font-[family-name:var(--font-fraunces)] text-4xl text-rose-950 sm:text-5xl">
                ❌ What&apos;s Missing
              </h2>
              <ul className="mt-5 space-y-3 font-[family-name:var(--font-manrope)] text-[16px] leading-7 text-rose-900">
                {result.missing.map((item) => (
                  <li key={item} className="rounded-xl bg-white/60 px-4 py-3">
                    {item}
                  </li>
                ))}
              </ul>
            </article>

            <article className="rounded-[30px] border border-amber-300 bg-amber-100 p-7 sm:p-9">
              <h2 className="font-[family-name:var(--font-fraunces)] text-4xl text-amber-950 sm:text-5xl">
                🎯 One Thing to Fix Right Now
              </h2>
              <p className="mt-5 rounded-xl bg-white/70 px-5 py-4 font-[family-name:var(--font-manrope)] text-lg leading-8 text-amber-950">
                {result.oneThingToFixNow}
              </p>
            </article>
          </section>
        ) : null}
      </div>
    </main>
  );
}
