import type { Metadata } from "next";

import CompareClient from "./CompareClient";

export const metadata: Metadata = {
  title: "Compare AI Concepts Side by Side",
  description:
    "Visually compare AI concepts and models side by side. Built to help product managers understand tradeoffs and explain decisions to stakeholders.",
  alternates: { canonical: "https://www.aipmworld.com/compare" },
  openGraph: { url: "https://www.aipmworld.com/compare" },
};

export default function ComparePage() {
  return <CompareClient />;
}
