import type { Metadata } from "next";

import BasicsClient from "./BasicsClient";

export const metadata: Metadata = {
  title: "AI Basics for Product Managers — 20-Lesson Primer",
  description:
    "20 jargon-free lessons covering AI fundamentals for product managers. From what AI is to how transformers work — structured clarity that compounds.",
  alternates: { canonical: "https://www.aipmworld.com/basics" },
  openGraph: { url: "https://www.aipmworld.com/basics" },
};

export default function BasicsPage() {
  const courseSchema = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: "AI Basics for Product Managers",
    description: "20 jargon-free lessons covering AI fundamentals for product managers.",
    provider: {
      "@type": "Organization",
      name: "AI PM World",
      sameAs: "https://www.aipmworld.com",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(courseSchema) }}
      />
      <BasicsClient />
    </>
  );
}
