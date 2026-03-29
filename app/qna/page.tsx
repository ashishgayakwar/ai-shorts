import type { Metadata } from "next";
import { getAllTopics, getQnAData } from "@/interview_prep/lib/qna";
import QnAClient from "./QnAClient";

export const metadata: Metadata = {
  title: "AI PM Interview Q&A by Topic — LLMs, RAG, Agents & More",
  description:
    "Deep Q&A on 30 AI topics including transformers, RAG, vector databases, agents, and LLM evaluation. Built for PMs who need to speak credibly with ML engineers.",
  alternates: { canonical: "https://www.aipmworld.com/qna" },
  openGraph: { url: "https://www.aipmworld.com/qna" },
};

export default function QnAPage() {
  const data = getQnAData();
  const topics = getAllTopics();
  const firstSlug = topics[0]?.slug;

  return (
    <QnAClient
      title={data.title}
      topics={topics}
      selectedSlug={firstSlug}
      restoreLastTopic
    />
  );
}
