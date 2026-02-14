import type { Metadata } from "next";
import { notFound } from "next/navigation";

import SwipeClient from "../SwipeClient";
import { concepts as baseConcepts } from "@/data/concepts";
import { concepts as generatedConcepts } from "@/data/concepts.generated";

type Concept = (typeof generatedConcepts)[number];
type SwipeMode = "cards" | "quiz" | "visualize";

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function normalizeMode(mode?: string): SwipeMode {
  return mode === "quiz" || mode === "visualize" ? mode : "cards";
}

const generatedByTopic: Record<string, Concept> = Object.fromEntries(
  generatedConcepts.map((c) => [c.topic, c])
);

const orderedConcepts = baseConcepts
  .map((base) => generatedByTopic[base.topic])
  .filter(Boolean) as Concept[];

const conceptBySlug: Record<string, Concept> = Object.fromEntries(
  orderedConcepts.map((c) => [slugify(c.topic), c])
);

export function generateStaticParams() {
  return orderedConcepts.map((c) => ({ slug: slugify(c.topic) }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const concept = conceptBySlug[slug];

  if (!concept) {
    return {
      title: "AI Concepts | AI Shorts",
      description: "Learn AI concepts one swipe at a time.",
    };
  }

  return {
    title: `${concept.title ?? concept.topic} | AI Concepts | AI Shorts`,
    description: `Understand ${concept.topic} with concise What/How/Why explanations.`,
    alternates: {
      canonical: `/swipe/${slug}`,
    },
  };
}

export default async function SwipeConceptPage(
  {
    params,
    searchParams,
  }: {
    params: Promise<{ slug: string }>;
    searchParams: Promise<{ mode?: string }>;
  }
) {
  const { slug } = await params;
  const { mode } = await searchParams;
  const initialMode = normalizeMode(mode);
  if (!conceptBySlug[slug]) {
    notFound();
  }
  return <SwipeClient key={`${slug}:${initialMode}`} initialSlug={slug} initialMode={initialMode} />;
}
