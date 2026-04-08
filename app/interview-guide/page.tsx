import type { Metadata } from "next";

import InterviewGuideClient from "./InterviewGuideClient";

export const metadata: Metadata = {
  title: "Company Interview Guide",
  description:
    "Enter any company and generate a PM interview prep brief with company context, question categories, and senior-level model answers.",
  alternates: { canonical: "https://www.aipmworld.com/interview-guide" },
  openGraph: { url: "https://www.aipmworld.com/interview-guide" },
};

export default function InterviewGuidePage() {
  return <InterviewGuideClient />;
}
