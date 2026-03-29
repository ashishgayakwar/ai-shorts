import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { concepts as baseConcepts } from "@/data/concepts";
import { concepts as generatedConcepts } from "@/data/concepts.generated";

export const metadata: Metadata = {
  title: "AI PM Concept Cards — Browse & Learn",
  description:
    "Card-based learning for AI product managers. Navigate AI concepts with structured primers. Built for busy PMs who want to learn fast.",
  alternates: { canonical: "https://www.aipmworld.com/swipe" },
  openGraph: { url: "https://www.aipmworld.com/swipe" },
};

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function normalizeMode(mode?: string) {
  return mode === "quiz" || mode === "visualize" ? mode : undefined;
}

export default async function SwipePage(
  { searchParams }: { searchParams: Promise<{ mode?: string }> }
) {
  const { mode } = await searchParams;
  const generatedByTopic = new Set<string>(
    generatedConcepts.map((c) => c.topic as string)
  );
  const first = baseConcepts.find((c) => generatedByTopic.has(c.topic));

  if (!first) {
    return null;
  }

  const target = `/swipe/${slugify(first.topic)}`;
  const normalizedMode = normalizeMode(mode);
  if (normalizedMode) {
    redirect(`${target}?mode=${normalizedMode}`);
  }
  redirect(target);
}
