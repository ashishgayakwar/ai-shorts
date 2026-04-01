import type { Metadata } from "next";

import PmFrameworkGeneratorClient from "./pm-framework-generator-client";

export const metadata: Metadata = {
  title: "PM Framework Generator (Day 07) — AI PM World",
  description:
    "Day 07 of the 75 Hard product series. Generate PM frameworks instantly across prioritization, problem framing, execution, and strategy.",
  alternates: { canonical: "https://www.aipmworld.com/pm-framework-generator" },
  openGraph: { url: "https://www.aipmworld.com/pm-framework-generator" },
};

export default function PmFrameworkGeneratorPage() {
  return <PmFrameworkGeneratorClient />;
}
