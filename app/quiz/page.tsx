import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { concepts as baseConcepts } from "@/data/concepts";
import { concepts as generatedConcepts } from "@/data/concepts.generated";

export const metadata: Metadata = {
  title: "AI PM Quiz — Test Your AI Knowledge",
  description:
    "Level-based quiz to test your AI product management knowledge. Questions adapt by difficulty. Track recall and identify gaps fast.",
  alternates: { canonical: "https://www.aipmworld.com/quiz" },
  openGraph: { url: "https://www.aipmworld.com/quiz" },
};

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function QuizPage() {
  const generatedByTopic = new Set<string>(
    generatedConcepts.map((c) => c.topic as string)
  );
  const first = baseConcepts.find((c) => generatedByTopic.has(c.topic));

  if (!first) return null;

  redirect(`/swipe/${slugify(first.topic)}?mode=quiz`);
}
