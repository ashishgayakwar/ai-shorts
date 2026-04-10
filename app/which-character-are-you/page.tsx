import type { Metadata } from "next";
import { Anton, Bebas_Neue, DM_Sans, Playfair_Display } from "next/font/google";

import CharacterQuizClient from "./CharacterQuizClient";

const anton = Anton({
  variable: "--font-anton",
  subsets: ["latin"],
  weight: "400",
});

const bebas = Bebas_Neue({
  variable: "--font-bebas",
  subsets: ["latin"],
  weight: "400",
});

const dmSans = DM_Sans({
  variable: "--font-dmsans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  style: ["italic"],
  weight: "600",
});

export const metadata: Metadata = {
  title: "Which Character Are You?",
  description:
    "A high-energy character quiz that matches your personality to iconic movie and TV characters with cinematic result cards.",
  alternates: { canonical: "https://www.aipmworld.com/which-character-are-you" },
  openGraph: { url: "https://www.aipmworld.com/which-character-are-you" },
};

export default function WhichCharacterAreYouPage() {
  return (
    <div className={`${anton.variable} ${bebas.variable} ${dmSans.variable} ${playfair.variable}`}>
      <CharacterQuizClient />
    </div>
  );
}
