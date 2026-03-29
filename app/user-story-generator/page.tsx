import type { Metadata } from "next";

import UserStoryGeneratorClient from "./user-story-generator-client";

export const metadata: Metadata = {
  title: "AI User Story Generator for Product Managers",
  description:
    "Generate well-structured user stories from a product prompt. Practice writing and reviewing user stories for AI products where outputs are probabilistic.",
  alternates: { canonical: "https://www.aipmworld.com/user-story-generator" },
  openGraph: { url: "https://www.aipmworld.com/user-story-generator" },
};

export default function UserStoryGeneratorPage() {
  const appSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "User Story Generator",
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    description:
      "Generate PM-ready user stories with epics, priorities, acceptance criteria, edge cases, and definition of done.",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(appSchema) }}
      />
      <UserStoryGeneratorClient />
    </>
  );
}
