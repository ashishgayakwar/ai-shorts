"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { jsPDF } from "jspdf";

type Priority = "Must Have" | "Should Have" | "Could Have";

type Story = {
  userType: string;
  story: string;
  priority: Priority;
  acceptanceCriteria: string[];
  edgeCases: string[];
  definitionOfDone: string;
};

type Epic = {
  name: string;
  description: string;
  userTypes: string[];
  stories: Story[];
};

type StorySuiteResult = {
  productName: string;
  epics: Epic[];
};

type ApiSuccess = {
  result: StorySuiteResult;
  remaining?: number;
};

type ApiFailure = {
  error?: string;
  remaining?: number;
  retryAfterSeconds?: number;
};

type LoadingStage = "idle" | "generating" | "building_pdf" | "copying";

const LOADER_STEPS = [
  "Analysing your product description...",
  "Identifying user types...",
  "Mapping out epics...",
  "Writing user stories...",
  "Adding acceptance criteria...",
  "Finalising your suite...",
] as const;

const EXAMPLE_PROMPTS = [
  "A food delivery app for tier 2 Indian cities",
  "A fitness tracking app for college students",
  "A remote work tool for distributed teams",
  "An AI study planner for competitive exam aspirants",
] as const;

function normalizeWhitespace(text: string): string {
  return text.replace(/\u0000/g, "").replace(/\s+/g, " ").trim();
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function stageLabel(stage: LoadingStage): string {
  if (stage === "generating") return "Generating user story suite...";
  if (stage === "building_pdf") return "Preparing PDF...";
  if (stage === "copying") return "Copying plain text...";
  return "";
}

function countStories(result: StorySuiteResult | null): number {
  if (!result) return 0;
  return result.epics.reduce((acc, epic) => acc + epic.stories.length, 0);
}

function priorityBadgeTone(priority: Priority): string {
  if (priority === "Must Have") return "bg-[#dc2626] text-white";
  if (priority === "Should Have") return "bg-[#facc15] text-[#2b2200]";
  return "bg-[#9ca3af] text-white";
}

function priorityStoryBorder(priority: Priority): string {
  if (priority === "Must Have") return "border-l-[#dc2626]";
  if (priority === "Should Have") return "border-l-[#facc15]";
  return "border-l-[#9ca3af]";
}

function toPlainText(result: StorySuiteResult, featureDescription: string): string {
  const lines: string[] = [];
  lines.push(`Product: ${result.productName}`);
  lines.push(`Generated: ${new Date().toLocaleString()}`);
  lines.push(`Epics: ${result.epics.length}`);
  lines.push(`Stories: ${countStories(result)}`);
  lines.push("");
  lines.push("Feature Description");
  lines.push(featureDescription);
  lines.push("");

  result.epics.forEach((epic, epicIndex) => {
    lines.push(`EPIC ${epicIndex + 1}: ${epic.name}`);
    lines.push(epic.description);
    lines.push(`User Types: ${epic.userTypes.join(", ")}`);
    lines.push("");

    epic.stories.forEach((story, storyIndex) => {
      lines.push(`${epicIndex + 1}.${storyIndex + 1} ${story.story}`);
      lines.push(`Priority: ${story.priority}`);
      lines.push(`User Type: ${story.userType}`);
      lines.push("Acceptance Criteria:");
      story.acceptanceCriteria.forEach((criterion) => lines.push(`- ${criterion}`));
      lines.push("Edge Cases:");
      story.edgeCases.forEach((edgeCase) => lines.push(`- ${edgeCase}`));
      lines.push(`Definition of Done: ${story.definitionOfDone}`);
      lines.push("");
    });
  });

  return lines.join("\n");
}

export default function UserStoryGeneratorClient() {
  const [featureDescription, setFeatureDescription] = useState("");
  const [result, setResult] = useState<StorySuiteResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingStage, setLoadingStage] = useState<LoadingStage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [copyNotice, setCopyNotice] = useState<string | null>(null);
  const [loaderStepIndex, setLoaderStepIndex] = useState(0);
  const [activeEpicIndex, setActiveEpicIndex] = useState(0);
  const [isInputCollapsed, setIsInputCollapsed] = useState(false);
  const featureTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const canSubmit = useMemo(() => {
    if (isSubmitting) return false;
    return normalizeWhitespace(featureDescription).length >= 80;
  }, [featureDescription, isSubmitting]);

  useEffect(() => {
    if (loadingStage !== "generating") {
      setLoaderStepIndex(0);
      return;
    }

    const interval = window.setInterval(() => {
      setLoaderStepIndex((prev) => (prev < LOADER_STEPS.length - 1 ? prev + 1 : prev));
    }, 2300);

    return () => window.clearInterval(interval);
  }, [loadingStage]);

  useEffect(() => {
    if (!result) return;

    const readHash = () => {
      const hash = window.location.hash.replace(/^#/, "");
      if (!hash) return;
      const found = result.epics.findIndex(
        (epic, idx) => `epic-${idx}-${slugify(epic.name)}` === hash
      );
      if (found >= 0) setActiveEpicIndex(found);
    };

    readHash();
    window.addEventListener("hashchange", readHash);
    return () => window.removeEventListener("hashchange", readHash);
  }, [result]);

  useEffect(() => {
    if (!isInputCollapsed && featureTextareaRef.current) {
      featureTextareaRef.current.focus();
    }
  }, [isInputCollapsed]);

  useEffect(() => {
    if (result) {
      setIsInputCollapsed(true);
    }
  }, [result]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setCopyNotice(null);
    setLoadingStage("idle");

    const normalizedDescription = normalizeWhitespace(featureDescription);
    if (normalizedDescription.length < 80) {
      setError("Please provide at least 80 characters of feature detail.");
      return;
    }

    setIsSubmitting(true);
    setLoadingStage("generating");

    try {
      const response = await fetch("/api/user-story-generator", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ featureDescription: normalizedDescription }),
      });

      if (!response.ok) {
        const fail = (await response.json().catch(() => null)) as ApiFailure | null;
        setResult(null);
        setRemaining(typeof fail?.remaining === "number" ? fail.remaining : null);
        setError(fail?.error || "Generation failed. Please retry.");
        return;
      }

      const success = (await response.json()) as ApiSuccess;
      setResult(success.result);
      setRemaining(typeof success.remaining === "number" ? success.remaining : null);
      setIsInputCollapsed(true);
    } catch {
      setResult(null);
      setError("Unable to reach the server. Please try again.");
    } finally {
      setIsSubmitting(false);
      setLoadingStage("idle");
    }
  }

  async function copyAll() {
    if (!result) return;
    setCopyNotice(null);
    setLoadingStage("copying");

    try {
      await navigator.clipboard.writeText(toPlainText(result, normalizeWhitespace(featureDescription)));
      setCopyNotice("Copied full user story suite as plain text.");
    } catch {
      setCopyNotice("Copy failed. Please try again.");
    } finally {
      setLoadingStage("idle");
    }
  }

  function downloadPdf() {
    if (!result) return;

    setLoadingStage("building_pdf");

    try {
      const pdf = new jsPDF({ unit: "pt", format: "a4" });
      const marginX = 42;
      const maxWidth = 510;
      const pageHeight = pdf.internal.pageSize.getHeight();
      let y = 52;

      const ensureSpace = (needed: number) => {
        if (y + needed <= pageHeight - 42) return;
        pdf.addPage();
        y = 52;
      };

      const writeLines = (
        text: string,
        fontSize: number,
        fontStyle: "normal" | "bold",
        indent = 0,
        lineHeight = 14
      ) => {
        pdf.setFont("helvetica", fontStyle);
        pdf.setFontSize(fontSize);
        const lines = pdf.splitTextToSize(text, maxWidth - indent);
        lines.forEach((line: string) => {
          ensureSpace(lineHeight);
          pdf.text(line, marginX + indent, y);
          y += lineHeight;
        });
      };

      writeLines("User Story Suite", 20, "bold", 0, 22);
      writeLines(`Product: ${result.productName}`, 11, "normal");
      writeLines(`Generated: ${new Date().toLocaleString()}`, 10, "normal");
      writeLines(`Epics: ${result.epics.length} | Stories: ${countStories(result)}`, 10, "normal");
      y += 8;

      writeLines(`Feature Description: ${normalizeWhitespace(featureDescription)}`, 10, "normal");
      y += 10;

      result.epics.forEach((epic, epicIndex) => {
        writeLines(`EPIC ${epicIndex + 1}: ${epic.name}`, 13, "bold", 0, 18);
        writeLines(epic.description, 10, "normal");
        writeLines(`User Types: ${epic.userTypes.join(", ")}`, 10, "normal");
        y += 6;

        epic.stories.forEach((story, storyIndex) => {
          writeLines(`${epicIndex + 1}.${storyIndex + 1} ${story.story}`, 11, "bold", 8, 16);
          writeLines(`Priority: ${story.priority} | User Type: ${story.userType}`, 10, "normal", 12, 14);
          writeLines("Acceptance Criteria:", 10, "bold", 12, 14);
          story.acceptanceCriteria.forEach((criterion) =>
            writeLines(`- ${criterion}`, 10, "normal", 20, 14)
          );
          writeLines("Edge Cases:", 10, "bold", 12, 14);
          story.edgeCases.forEach((edgeCase) => writeLines(`- ${edgeCase}`, 10, "normal", 20, 14));
          writeLines(`Definition of Done: ${story.definitionOfDone}`, 10, "normal", 12, 14);
          y += 6;
        });

        y += 8;
      });

      pdf.save(`${slugify(result.productName || "user-story-suite")}-suite.pdf`);
    } finally {
      setLoadingStage("idle");
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f7f5] text-[#0f172a]">
      {loadingStage === "generating" ? (
        <div className="fixed inset-0 z-[120] bg-[#060912] text-white">
          <div className="mx-auto flex min-h-screen w-full max-w-3xl items-center justify-center px-6">
            <div className="loader-card-breath w-full max-w-xl rounded-2xl border border-white/15 bg-white/[0.04] p-7 shadow-[0_28px_80px_rgba(0,0,0,0.45)] sm:p-9">
              <p className="text-xs font-[800] tracking-[0.16em] text-white/70">GENERATING SUITE</p>
              <h2 className="mt-2 text-2xl font-[900] tracking-[-0.02em] text-white sm:text-3xl">
                Building your User Story Suite
              </h2>
              <ul className="mt-6 space-y-3">
                {LOADER_STEPS.map((step, idx) => {
                  const shouldRender = idx <= loaderStepIndex;
                  const completed = idx < loaderStepIndex;
                  const active = idx === loaderStepIndex;

                  if (!shouldRender) {
                    return null;
                  }

                  return (
                    <li key={step} className="loader-step-enter flex items-center gap-3">
                      <span
                        className={`relative inline-flex h-6 w-6 items-center justify-center rounded-full border transition-all duration-300 ${
                          completed
                            ? "border-emerald-400 bg-emerald-500"
                            : "border-white/60 bg-white/10"
                        }`}
                      >
                        <span
                          className={`absolute h-2 w-2 rounded-full bg-white transition-all duration-300 ${
                            active ? "loader-dot-pulse opacity-100 scale-100" : "opacity-0 scale-50"
                          }`}
                        />
                        <span
                          className={`absolute text-[11px] font-[900] leading-none text-white transition-all duration-200 ${
                            completed ? "loader-check-pop opacity-100 scale-100" : "opacity-0 scale-50"
                          }`}
                        >
                          ✓
                        </span>
                      </span>
                      <span
                        className={`text-sm transition-colors ${
                          completed
                            ? "text-white"
                            : active
                              ? "text-white/90"
                              : "text-white/45"
                        }`}
                      >
                        {step}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mx-auto w-full max-w-[1480px] px-3 py-4 sm:px-8 sm:py-10">
        <header>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="inline-flex rounded-full border border-[#d1d5db] bg-[#f9fafb] px-3 py-1 text-[11px] font-[800] tracking-[0.18em] text-[#374151]">
              02/75
            </span>
            <Link
              href="/"
              className="rounded-full border border-[#d1d5db] bg-white px-3 py-1.5 text-xs font-[700] text-[#111827] transition hover:bg-[#f3f4f6]"
            >
              Back Home
            </Link>
          </div>

          <h1 className="mt-5 text-2xl font-[900] tracking-[-0.03em] text-[#0b1220] sm:text-5xl">
            User Story Suite Generator
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[#4b5563] sm:text-[15px]">
            Describe a product or feature and generate a PM-grade user story suite with epics,
            priorities, acceptance criteria, edge cases, and definition of done.
          </p>
        </header>

        {isInputCollapsed && result ? (
          <section className="mt-6 rounded-2xl border border-[#3a3a3a] bg-[#0f0f0f] px-5 py-4 text-white shadow-[0_10px_24px_rgba(0,0,0,0.25)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="min-w-0 flex-1 text-sm text-white/90">
                {(() => {
                  const preview = normalizeWhitespace(featureDescription);
                  if (preview.length <= 100) return preview;
                  return `${preview.slice(0, 100)}...`;
                })()}
              </p>
              <button
                type="button"
                onClick={() => setIsInputCollapsed(false)}
                className="shrink-0 rounded-full border border-[#555] bg-[#1a1a1a] px-3 py-1.5 text-xs font-[700] text-white transition hover:bg-[#242424]"
              >
                Edit / Regenerate
              </button>
            </div>
          </section>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="mt-6 rounded-3xl border border-[#dddcd4] bg-white p-4 shadow-[0_16px_42px_rgba(15,15,15,0.08)] sm:p-8"
          >
            {result ? (
              <div className="mb-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsInputCollapsed(true)}
                  className="rounded-full border border-[#d1d5db] bg-[#f3f4f6] px-3 py-1.5 text-xs font-[700] text-[#374151] transition hover:bg-[#e5e7eb]"
                >
                  ↑ Collapse
                </button>
              </div>
            ) : null}
            {loadingStage !== "idle" && loadingStage !== "generating" ? (
              <div className="mb-4 rounded-xl border border-[#e5e7eb] bg-[#f9fafb] px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#6b7280] border-t-transparent" />
                  <p className="text-sm font-[700] text-[#374151]">{stageLabel(loadingStage)}</p>
                </div>
              </div>
            ) : null}

            <label htmlFor="feature-description" className="text-[12px] font-[800] tracking-[0.16em] text-[#6b7280]">
              FEATURE DESCRIPTION
            </label>
            <textarea
              ref={featureTextareaRef}
              id="feature-description"
              value={featureDescription}
              onChange={(event) => setFeatureDescription(event.target.value)}
              placeholder="Describe your product or feature in plain English..."
              className="mt-2 min-h-[160px] w-full resize-y rounded-2xl border border-[#cfcfc8] bg-white p-3 text-[15px] leading-7 text-[#111827] outline-none transition focus:border-[#111827] focus:ring-2 focus:ring-[#111827]/20 sm:min-h-[320px] sm:p-5"
            />
            <p className="mt-2 text-xs italic text-[#8b8b8b]">
              Minimum 80 characters required to enable Generate Suite.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {EXAMPLE_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => {
                    setFeatureDescription(prompt);
                    setError(null);
                    featureTextareaRef.current?.focus();
                  }}
                  className="rounded-full border border-[#d5d5cf] bg-[#f9f9f7] px-3 py-1.5 text-xs font-[700] text-left text-[#374151] transition hover:border-[#b9b9b2] hover:bg-[#f2f2ee]"
                >
                  {prompt}
                </button>
              ))}
            </div>

            <div className="mt-5 flex items-center justify-end">
              {remaining !== null ? (
                <span className="inline-flex items-center rounded-full border border-[#d1d5db] bg-[#f9fafb] px-3 py-1 text-[11px] font-[700] text-[#4b5563]">
                  Remaining: {remaining}
                </span>
              ) : null}
            </div>

            <div className="mt-3">
              <button
                type="submit"
                disabled={!canSubmit}
                className="w-full rounded-xl bg-[#111827] px-6 py-3.5 text-[15px] font-[900] text-white transition hover:bg-[#1f2937] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? "Generating..." : "Generate Suite"}
              </button>
              <div className="mt-3 rounded-xl border border-[#e6e6de] bg-[#f8f8f5] px-4 py-2.5 text-center text-[11px] font-[600] text-[#6b7280] sm:text-xs">
                Generates 5 epics · 20+ stories · Acceptance criteria · Edge cases · Definition of Done
              </div>
            </div>

            {error ? (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            ) : null}
          </form>
        )}

        {result ? (
          <section className="mt-6 flex flex-col items-start gap-6 lg:flex-row lg:items-start">
            <aside className="z-20 w-full self-start rounded-2xl bg-[#0f0f0f] text-white shadow-[0_12px_30px_rgba(0,0,0,0.35)] lg:sticky lg:top-6 lg:w-[280px] lg:flex-none">
              <div className="p-5 lg:max-h-[calc(100vh-48px)] lg:overflow-y-auto">
                <p className="text-[11px] font-[700] tracking-[0.16em] text-[#7e7e7e]">02/75</p>
                <h2 className="mt-3 text-2xl font-[900] tracking-[-0.02em] text-white">{result.productName}</h2>
                <p className="mt-1 text-xs text-[#8f8f8f]">Epic navigation</p>

                <nav className="mt-5 space-y-1.5">
                  {result.epics.map((epic, idx) => {
                    const isActive = idx === activeEpicIndex;
                    return (
                      <a
                        key={`${epic.name}-${idx}`}
                        href={`#epic-${idx}-${slugify(epic.name)}`}
                        onClick={() => setActiveEpicIndex(idx)}
                        className={`block rounded-r-lg px-3 py-2 text-sm font-[600] transition ${
                          isActive
                            ? "border-l-2 border-l-[#f59e0b] bg-white/10 text-white"
                            : "border-l-2 border-l-transparent text-white/70 hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        {String(idx + 1).padStart(2, "0")} {epic.name}
                      </a>
                    );
                  })}
                </nav>
              </div>
            </aside>

            <div className="w-full min-w-0 flex-1 space-y-8">
              <article className="rounded-2xl bg-[#0f0f0f] p-6 text-white shadow-[0_14px_34px_rgba(0,0,0,0.35)] sm:p-8">
                <p className="text-xs font-[800] tracking-[0.16em] text-[#9a9a9a]">COVER</p>
                <h2 className="mt-2 text-xl font-[900] tracking-[-0.03em] text-white sm:text-4xl">
                  {result.productName}
                </h2>
                <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-white/15 bg-white/5 px-4 py-3">
                    <p className="text-[11px] font-[700] tracking-[0.14em] text-white/60">TOTAL EPICS</p>
                    <p className="mt-1 text-2xl font-[900] text-white">{result.epics.length}</p>
                  </div>
                  <div className="rounded-xl border border-white/15 bg-white/5 px-4 py-3">
                    <p className="text-[11px] font-[700] tracking-[0.14em] text-white/60">TOTAL STORIES</p>
                    <p className="mt-1 text-2xl font-[900] text-white">{countStories(result)}</p>
                  </div>
                  <div className="rounded-xl border border-white/15 bg-white/5 px-4 py-3">
                    <p className="text-[11px] font-[700] tracking-[0.14em] text-white/60">GENERATED DATE</p>
                    <p className="mt-1 text-sm font-[700] text-white">{new Date().toLocaleString()}</p>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={downloadPdf}
                    disabled={loadingStage !== "idle"}
                    className="rounded-lg bg-white px-4 py-2.5 text-xs font-[800] tracking-[0.12em] text-[#111827] transition hover:bg-white/90 disabled:opacity-50"
                  >
                    Download PDF
                  </button>
                  <button
                    type="button"
                    onClick={copyAll}
                    disabled={loadingStage !== "idle"}
                    className="rounded-lg border border-white/25 bg-transparent px-4 py-2.5 text-xs font-[800] tracking-[0.12em] text-white transition hover:bg-white/8 disabled:opacity-50"
                  >
                    Copy All
                  </button>
                  {copyNotice ? <p className="self-center text-xs text-[#86efac]">{copyNotice}</p> : null}
                </div>
              </article>

              {result.epics.map((epic, epicIndex) => (
                <section
                  key={`${epic.name}-${epicIndex}`}
                  id={`epic-${epicIndex}-${slugify(epic.name)}`}
                  className="relative overflow-hidden rounded-2xl border border-[#e2e2da] bg-[#f7f7f5] p-3 shadow-[0_10px_26px_rgba(0,0,0,0.06)] sm:p-8"
                >
                  <p className="pointer-events-none absolute right-5 top-2 select-none text-[56px] font-[900] leading-none text-[#e1e1db] sm:text-[120px]">
                    {String(epicIndex + 1).padStart(2, "0")}
                  </p>

                  <div className="relative z-[1] border-b border-[#deded6] pb-6">
                    <p className="text-xs font-[800] tracking-[0.15em] text-[#6b7280]">EPIC {epicIndex + 1}</p>
                    <h3 className="mt-1 text-xl font-[900] tracking-[-0.02em] text-[#111111] sm:text-4xl">
                      {epic.name}
                    </h3>
                    <p className="mt-3 max-w-4xl text-[15px] leading-7 text-[#3f3f46]">{epic.description}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {epic.userTypes.map((userType) => (
                        <span
                          key={`${epic.name}-${userType}`}
                          className="rounded-full bg-[#1a1a1a] px-3 py-1 text-[11px] font-[700] text-white"
                        >
                          {userType}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="relative z-[1] mt-7 space-y-5">
                    {epic.stories.map((story, storyIndex) => (
                      <article
                        key={`${epic.name}-${storyIndex}`}
                        className={`rounded-xl border border-[#e5e5de] border-l-4 ${priorityStoryBorder(story.priority)} bg-white p-3 sm:p-6 shadow-[0_8px_20px_rgba(0,0,0,0.04)]`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <p className="text-base font-[800] leading-6 text-[#111827] sm:text-lg sm:leading-8">{story.story}</p>
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-[800] tracking-[0.08em] ${priorityBadgeTone(story.priority)}`}
                          >
                            {story.priority}
                          </span>
                        </div>
                        <p className="mt-2 text-xs font-[700] uppercase tracking-[0.08em] text-[#71717a]">
                          User Type: {story.userType}
                        </p>

                        <div className="mt-5">
                          <p className="text-xs font-[800] tracking-[0.14em] text-[#6b7280]">ACCEPTANCE CRITERIA</p>
                          <ul className="mt-2 rounded-lg border border-[#e8e8e2] bg-[#fafaf8] divide-y divide-[#e8e8e2]">
                            {story.acceptanceCriteria.map((criterion, criterionIndex) => (
                              <li
                                key={`${criterionIndex}-${criterion}`}
                                className="flex gap-2 px-3 py-2 text-sm text-[#1f2937]"
                              >
                                <span className="mt-0.5 text-[#16a34a]">✓</span>
                                <span>{criterion}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="mt-4 border-l-2 border-l-[#f59e0b] pl-3">
                          <p className="text-xs font-[800] tracking-[0.14em] text-[#92400e]">EDGE CASES</p>
                          <ul className="mt-1.5 space-y-1 text-sm text-[#7c2d12]">
                            {story.edgeCases.map((edgeCase, edgeIndex) => (
                              <li key={`${edgeIndex}-${edgeCase}`}>• {edgeCase}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="mt-4 border-l-2 border-l-[#3b82f6] pl-3">
                          <p className="text-xs font-[800] tracking-[0.14em] text-[#1d4ed8]">DEFINITION OF DONE</p>
                          <p className="mt-1 text-sm text-[#1e3a8a]">{story.definitionOfDone}</p>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </section>
        ) : null}
      </div>

      <style jsx>{`
        .loader-card-breath {
          animation: loader-breath 3.8s ease-in-out infinite;
        }

        .loader-step-enter {
          animation: loader-step-in 320ms ease-out both;
        }

        .loader-dot-pulse {
          animation: loader-dot-pulse 1.1s ease-in-out infinite;
        }

        .loader-check-pop {
          animation: loader-check-pop 280ms cubic-bezier(0.2, 0.9, 0.2, 1.2);
        }

        @keyframes loader-step-in {
          0% {
            opacity: 0;
            transform: translateY(9px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes loader-dot-pulse {
          0%,
          100% {
            transform: scale(0.74);
            opacity: 0.7;
          }
          50% {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes loader-check-pop {
          0% {
            transform: scale(0.35);
            opacity: 0;
          }
          60% {
            transform: scale(1.16);
            opacity: 1;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes loader-breath {
          0%,
          100% {
            box-shadow:
              0 0 0 1px rgba(255, 255, 255, 0.14),
              0 28px 80px rgba(0, 0, 0, 0.45),
              0 0 26px rgba(56, 189, 248, 0.08);
          }
          50% {
            box-shadow:
              0 0 0 1px rgba(255, 255, 255, 0.26),
              0 28px 80px rgba(0, 0, 0, 0.45),
              0 0 36px rgba(56, 189, 248, 0.15);
          }
        }
      `}</style>
    </main>
  );
}
