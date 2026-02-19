import qnaRaw from "@/interview_prep/data/ai_interview_questions.json";
import answersRaw from "@/interview_prep/data/ai_interview_answers.json";

export type QnATopic = {
  id: number;
  topic: string;
  questions: string[];
  answers?: Array<{
    q: string;
    a: string;
  }>;
};

export type QnATopicWithSlug = QnATopic & {
  slug: string;
  qas: {
    q: string;
    a?: string;
  }[];
};

export type QnAData = {
  title: string;
  topics: QnATopic[];
};

type QnAAnswersData = {
  topics?: Array<{
    topic_id: number;
    topic?: string;
    qas?: Array<{
      q: string;
      a: string;
    }>;
  }>;
};

export function topicToSlug(topic: string): string {
  return topic.toLowerCase().trim().replace(/\s+/g, "-");
}

export function getQnAData(): QnAData {
  const raw = qnaRaw as QnAData;
  return {
    title: raw.title ?? "Topic QnA",
    topics: Array.isArray(raw.topics) ? raw.topics : [],
  };
}

export function getAllTopics(): QnATopicWithSlug[] {
  const questionData = getQnAData();
  const answerData = (answersRaw as QnAAnswersData).topics ?? [];
  const answerTopicById = new Map(answerData.map((topic) => [topic.topic_id, topic]));

  return questionData.topics.map((topic) => {
    const answerTopic = answerTopicById.get(topic.id);
    const inlineAnswers = Array.isArray(topic.answers) ? topic.answers : [];

    const inlineByQuestion = new Map(inlineAnswers.map((qa) => [qa.q.trim(), qa.a]));
    const fileByQuestion = new Map((answerTopic?.qas ?? []).map((qa) => [qa.q.trim(), qa.a]));

    const qas = topic.questions.map((q, index) => {
      const directInline = inlineByQuestion.get(q.trim());
      const byIndexInline = inlineAnswers[index]?.a;
      const directFile = fileByQuestion.get(q.trim());
      const byIndexFile = answerTopic?.qas?.[index]?.a;
      return {
        q,
        a: directInline ?? byIndexInline ?? directFile ?? byIndexFile,
      };
    });

    return {
      ...topic,
      slug: topicToSlug(topic.topic),
      qas,
    };
  });
}

export function getTopicBySlug(slug: string): QnATopicWithSlug | null {
  const normalized = decodeURIComponent(slug).trim();
  return getAllTopics().find((topic) => topic.slug === normalized) ?? null;
}

export function getAllTopicSlugs(): string[] {
  return getAllTopics().map((topic) => topic.slug);
}
