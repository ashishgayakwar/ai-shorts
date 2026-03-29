import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";

import PmResumeScreenerClient from "./pm-resume-screener-client";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  weight: ["400", "500", "600", "700", "800", "900"],
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Free AI PM Resume Screener — Get a Fit Score + Feedback",
  description:
    "Paste a job description and upload your resume. Get an editorial fit score, strengths, gaps, and one immediate fix. Files are processed in-memory and never stored.",
  alternates: { canonical: "https://www.aipmworld.com/pm-resume-screener" },
  openGraph: { url: "https://www.aipmworld.com/pm-resume-screener" },
};

export default function PmResumeScreenerPage() {
  const appSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "PM Resume Screener",
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    description:
      "AI-powered PM resume screener. Upload your resume and a job description to get a fit score, strengths, gaps, and one immediate fix.",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(appSchema) }}
      />
      <div className={`${fraunces.variable} ${manrope.variable}`}>
        <PmResumeScreenerClient />
      </div>
    </>
  );
}
