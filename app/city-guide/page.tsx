import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI City Guide Generator",
  description:
    "Enter any city and generate a full AI travel guide with vibe, visa notes, budget tiers, food picks, neighborhoods, hidden gems, and a photo carousel.",
  alternates: { canonical: "https://www.aipmworld.com/city-guide" },
  openGraph: { url: "https://www.aipmworld.com/city-guide" },
};

export default function CityGuidePage() {
  return (
    <iframe
      title="City Guide"
      src="/city-guide.html"
      style={{
        display: "block",
        width: "100%",
        minHeight: "100vh",
        border: "none",
        background: "#faf6ef",
      }}
    />
  );
}
