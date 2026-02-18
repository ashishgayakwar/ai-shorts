import { notFound } from "next/navigation";
import { getAllTopicSlugs, getAllTopics, getQnAData, getTopicBySlug } from "@/interview_prep/lib/qna";
import QnAClient from "../QnAClient";

type Params = {
  topicSlug: string;
};

export default async function QnATopicPage({ params }: { params: Promise<Params> }) {
  const { topicSlug } = await params;
  const data = getQnAData();
  const topics = getAllTopics();
  const topic = getTopicBySlug(topicSlug);

  if (!topic) {
    notFound();
  }

  return <QnAClient title={data.title} topics={topics} selectedSlug={topic.slug} />;
}

export function generateStaticParams() {
  return getAllTopicSlugs().map((topicSlug) => ({ topicSlug }));
}
