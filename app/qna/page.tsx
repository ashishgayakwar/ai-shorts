import { getAllTopics, getQnAData } from "@/interview_prep/lib/qna";
import QnAClient from "./QnAClient";

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
