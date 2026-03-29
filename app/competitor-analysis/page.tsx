import type { Metadata } from "next";

import CompetitorAnalysisClient from "./CompetitorAnalysisClient";

export const metadata: Metadata = {
  title: "AI PM Competitor Analysis Tool",
  description:
    "Generate structured competitor analyses for AI products. Built for product managers who need to quickly map the landscape before strategy or interview sessions.",
  alternates: { canonical: "https://www.aipmworld.com/competitor-analysis" },
  openGraph: { url: "https://www.aipmworld.com/competitor-analysis" },
};

export default function CompetitorAnalysisPage() {
  return <CompetitorAnalysisClient />;
}
