import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import CaseStudyClient from "./case-study-client";

export const metadata: Metadata = {
  title: "AI PM Case Study Generator — Practice Interview Simulations",
  description:
    "Generate AI PM case study simulations for interview practice. Get structured problem statements, constraints, and evaluation criteria on demand.",
  alternates: { canonical: "https://www.aipmworld.com/case-study-generator" },
  openGraph: { url: "https://www.aipmworld.com/case-study-generator" },
};

export default async function CaseStudyGeneratorPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect("/api/auth/signin?callbackUrl=/case-study-generator");
  }

  const appSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "AI PM Case Study Generator",
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    description:
      "Generate AI PM case study simulations for interview practice with structured prompts, constraints, and evaluation criteria.",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(appSchema) }}
      />
      <CaseStudyClient />
    </>
  );
}
