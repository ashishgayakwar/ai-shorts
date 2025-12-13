"use client";

import { useState } from "react";
import Link from "next/link";
import { basicConcepts } from "@/data/basicConcepts";

type Block =
  | { type: "idea" | "intuition"; text: string[] }
  | { type: "example"; title?: string; text: string[] }
  | { type: "steps"; title: string; steps: string[] }
  | { type: "checklist"; title: string; bullets: string[] }
  | { type: "commonMistake"; mistake: string; fix: string }
  | { type: "takeaway"; text: string };

type BasicConcept = {
  id: string;
  title: string;
  subtitle: string;
  blocks: Block[];
};

export default function BasicsPage() {
  const [index, setIndex] = useState(0);

  const concepts = basicConcepts as BasicConcept[];
  const total = concepts.length;
  const concept = concepts[index];

  function next() {
    if (index < total - 1) setIndex(index + 1);
  }

  function prev() {
    if (index > 0) setIndex(index - 1);
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-black dark:text-zinc-50">
      <div className="mx-auto max-w-3xl px-6 py-8">
        {/* HEADER */}
        <header className="mb-10 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">AI Shorts</div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              Basic Module
            </div>
          </div>

          <Link
            href="/"
            className="text-sm text-zinc-600 hover:underline dark:text-zinc-400"
          >
            ← Back to home
          </Link>
        </header>

        {/* CONTENT */}
        <main className="space-y-8">
          {/* Progress */}
          <div className="text-sm text-zinc-500 dark:text-zinc-400">
            {index + 1} / {total}
          </div>

          {/* Title */}
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold leading-tight">
              {concept.title}
            </h1>
            <h2 className="text-lg text-zinc-600 dark:text-zinc-400">
              {concept.subtitle}
            </h2>
          </div>

          {/* BLOCKS */}
          <div className="space-y-8">
            {concept.blocks.map((block, i) => {
              switch (block.type) {
                case "idea":
                case "intuition":
                  return (
                    <div key={i} className="space-y-3">
                      {block.text.map((t, j) => (
                        <p key={j} className="text-base leading-7">
                          {t}
                        </p>
                      ))}
                    </div>
                  );

                case "example":
                  return (
                    <div
                      key={i}
                      className="rounded-xl bg-zinc-100 p-4 dark:bg-zinc-900"
                    >
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                        {(block.title || "Example").toUpperCase()}
                      </div>
                      <div className="space-y-2">
                        {block.text.map((t, j) => (
                          <p key={j} className="text-sm leading-6">
                            {t}
                          </p>
                        ))}
                      </div>
                    </div>
                  );

                case "steps":
                  return (
                    <div key={i} className="space-y-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                        {block.title}
                      </div>
                      <ol className="list-decimal space-y-2 pl-5">
                        {block.steps.map((s, j) => (
                          <li key={j} className="text-base leading-7">
                            {s}
                          </li>
                        ))}
                      </ol>
                    </div>
                  );

                case "checklist":
                  return (
                    <div key={i} className="space-y-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                        {block.title}
                      </div>
                      <ul className="list-disc space-y-2 pl-5">
                        {block.bullets.map((b, j) => (
                          <li key={j} className="text-base leading-7">
                            {b}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );

                case "commonMistake":
                  return (
                    <div
                      key={i}
                      className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-black"
                    >
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                        COMMON MISCONCEPTION
                      </div>
                      <p className="mb-2 text-sm">❌ {block.mistake}</p>
                      <p className="text-sm">✅ {block.fix}</p>
                    </div>
                  );

                case "takeaway":
                  return (
                    <div
                      key={i}
                      className="rounded-xl bg-zinc-900 p-4 text-white dark:bg-zinc-800"
                    >
                      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-white/70">
                        KEY TAKEAWAY
                      </div>
                      <p className="text-base leading-7">{block.text}</p>
                    </div>
                  );

                default:
                  return null;
              }
            })}
          </div>
        </main>

        {/* NAVIGATION */}
<footer className="mt-12 flex justify-between rounded-xl bg-white/70 p-4 shadow-sm backdrop-blur dark:bg-zinc-950/60">
          <button
            onClick={prev}
            disabled={index === 0}
            className="rounded-lg border px-4 py-2 text-sm disabled:opacity-40"
          >
            ← Previous
          </button>

          <button
            onClick={next}
            disabled={index === total - 1}
            className="rounded-lg border px-4 py-2 text-sm disabled:opacity-40"
          >
            Next →
          </button>
        </footer>
      </div>
    </div>
  );
}
