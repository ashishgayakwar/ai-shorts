import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { concepts as baseConcepts } from "@/data/concepts";
import { concepts as generatedConcepts } from "@/data/concepts.generated";

export const metadata: Metadata = {
  title: "Visualize AI Concepts — AI PM World",
  description:
    "Visual explanations of AI concepts for product managers. See how transformers, attention, and embeddings work — without the math.",
  alternates: { canonical: "https://www.aipmworld.com/visualize" },
  openGraph: { url: "https://www.aipmworld.com/visualize" },
};

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function VisualizePage() {
  const generatedByTopic = new Set<string>(
    generatedConcepts.map((c) => c.topic as string)
  );
  const first = baseConcepts.find((c) => generatedByTopic.has(c.topic));

  if (!first) return null;

  redirect(`/swipe/${slugify(first.topic)}?mode=visualize`);
}
