import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "StackLens",
  description:
    "Describe your idea, answer adaptive context questions, and get a complete app stack recommendation across frontend, backend, data, auth, AI, analytics, hosting, and workflows.",
  alternates: { canonical: "https://www.aipmworld.com/stacklens" },
  openGraph: { url: "https://www.aipmworld.com/stacklens" },
};

export default function StackLensPage() {
  return (
    <iframe
      title="StackLens"
      src="/stacklens.html"
      style={{
        display: "block",
        width: "100%",
        minHeight: "100vh",
        border: "none",
        background: "#f7f4ef",
      }}
    />
  );
}
