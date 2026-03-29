import type { Metadata } from "next";

import InterviewClient from "./InterviewClient";

export const metadata: Metadata = {
  title: "90+ AI PM Interview Questions with Structured Answers",
  description:
    "Full AI PM interview question bank. Covers product sense, system design, AI tradeoffs, execution, and strategy. Filter by category and get written + spoken answers.",
  alternates: { canonical: "https://www.aipmworld.com/interview" },
  openGraph: { url: "https://www.aipmworld.com/interview" },
};

export default function InterviewPage() {
  return <InterviewClient />;
}
