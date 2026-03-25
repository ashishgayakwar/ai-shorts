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
  title: "PM Resume Screener",
  description:
    "Paste a PM job description and upload your resume PDF to get a fit score, match gaps, and one priority fix.",
};

export default function PmResumeScreenerPage() {
  return (
    <div className={`${fraunces.variable} ${manrope.variable}`}>
      <PmResumeScreenerClient />
    </div>
  );
}
