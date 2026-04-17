import type { Metadata } from "next";

import TokenLab from "./TokenLab";

export const metadata: Metadata = {
  title: "TokenLab — How the machine reads your words",
  description:
    "A visual field guide to tokenization. See the same text broken down by Character, Word, BPE, and WordPiece tokenizers. Day 14 of 75 Products 75 Days.",
  openGraph: {
    title: "TokenLab — Day 14 / 75",
    description: "See how four classic tokenizers cut the same text differently.",
  },
};

export default function Day14TokenLabPage() {
  return <TokenLab />;
}
