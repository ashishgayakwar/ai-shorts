import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllTopicSlugs, getAllTopics, getQnAData, getTopicBySlug } from "@/interview_prep/lib/qna";
import { SITE_URL } from "@/lib/seo";
import QnAClient from "../QnAClient";

type Params = {
  topicSlug: string;
};

export async function generateMetadata(
  { params }: { params: Promise<Params> }
): Promise<Metadata> {
  const { topicSlug } = await params;
  const topicName = topicSlug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  return {
    title: `${topicName} — AI PM Interview Q&A`,
    description: `Interview questions and answers on ${topicName} for AI product managers. Covers definitions, how it works, why it matters, and real-world examples.`,
    alternates: { canonical: `${SITE_URL}/qna/${topicSlug}` },
    openGraph: { url: `${SITE_URL}/qna/${topicSlug}` },
  };
}

export default async function QnATopicPage({ params }: { params: Promise<Params> }) {
  const { topicSlug } = await params;
  const data = getQnAData();
  const topics = getAllTopics();
  const topic = getTopicBySlug(topicSlug);

  if (!topic) {
    notFound();
  }

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: topic.qas
      .filter((qa) => qa.a && qa.a.trim().length > 0)
      .map((qa) => ({
        "@type": "Question",
        name: qa.q,
        acceptedAnswer: {
          "@type": "Answer",
          text: qa.a as string,
        },
      })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <QnAClient title={data.title} topics={topics} selectedSlug={topic.slug} />
    </>
  );
}

export function generateStaticParams() {
  return getAllTopicSlugs().map((topicSlug) => ({ topicSlug }));
}
