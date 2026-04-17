export const SAMPLES = {
  en: "The quick brown fox jumps over the lazy dog. Tokenization isn't always obvious.",
  code: "def tokenize(text):\n    return text.split()",
  emoji: "I ❤️ tokenization 🔥 even with émojis & naïve splits!",
  tech: "Transformers use self-attention across multi-head embeddings.",
  numbers: "Revenue grew 47.3% YoY to $12,450,000 in Q3 2025.",
} as const;

export type SampleKey = keyof typeof SAMPLES;
