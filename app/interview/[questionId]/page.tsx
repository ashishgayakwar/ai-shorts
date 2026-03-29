import type { Metadata } from "next";

import { SITE_URL } from "@/lib/seo";
import questionsData from "../../../interview_prep/data/questions.json";
import InterviewQuestionClient from "./InterviewQuestionClient";

type InterviewQuestion = {
  question_id: string;
  category: string;
  question: string;
};

function getQuestionById(questionId: string): InterviewQuestion | undefined {
  const questionsDataObj = questionsData as { questions?: InterviewQuestion[] };
  const questions = Array.isArray(questionsDataObj.questions) ? questionsDataObj.questions : [];
  return questions.find((q) => q.question_id === questionId);
}

export async function generateMetadata(
  { params }: { params: Promise<{ questionId: string }> }
): Promise<Metadata> {
  const { questionId } = await params;
  const id = decodeURIComponent(String(questionId || "")).trim();
  const question = getQuestionById(id);
  const title = question?.question ?? "AI PM Interview Question";

  return {
    title: `${title} — AI PM Interview Answer`,
    description:
      "Full structured answer with signal statement, approach, metrics, tradeoffs, and a 90-second version. AI PM interview prep by AI PM World.",
    alternates: { canonical: `${SITE_URL}/interview/${id}` },
    openGraph: { url: `${SITE_URL}/interview/${id}` },
  };
}

export default function InterviewDetailPage() {
  return <InterviewQuestionClient />;
}
