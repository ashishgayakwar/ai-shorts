import { notFound } from "next/navigation";
import { concepts } from "@/data/concepts.js";
import { concepts as generatedConcepts } from "@/data/concepts.generated";
import ReactMarkdown from "react-markdown";
import Link from "next/link";



type Concept = { topic: string };

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function generateStaticParams() {
  return (concepts as Concept[]).map((c) => ({ slug: slugify(c.topic) }));
}

export default async function ConceptPage(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const list = concepts as Concept[];
  const idx = list.findIndex((c) => slugify(c.topic) === slug);

  if (idx === -1) notFound();

const current = list[idx];

const generated = generatedConcepts.find(
  (c) => c.topic === current.topic
);


let parsedSummary: { title?: string; summary?: string } | null = null;

if (generated?.summary) {
  try {
    parsedSummary = JSON.parse(generated.summary);
  } catch {
    parsedSummary = null;
  }
}

  const prev = idx > 0 ? list[idx - 1] : null;
  const next = idx < list.length - 1 ? list[idx + 1] : null;

return (
  <main style={{ maxWidth: 820, margin: "0 auto", padding: "28px 16px" }}>
    <header style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
      
      <Link href="/swipe" style={{ textDecoration: "underline" }}>
        Swipe Mode
      </Link>

      <span style={{ opacity: 0.6 }}>•</span>

      {prev ? (
        <Link
          href={`/concept/${slugify(prev.topic)}`}
          style={{ textDecoration: "underline" }}
        >
          ← Prev
        </Link>
      ) : (
        <span style={{ opacity: 0.4 }}>← Prev</span>
      )}

      {next ? (
        <Link
          href={`/concept/${slugify(next.topic)}`}
          style={{ textDecoration: "underline" }}
        >
          Next →
        </Link>
      ) : (
        <span style={{ opacity: 0.4 }}>Next →</span>
      )}


        <span style={{ marginLeft: "auto", opacity: 0.6 }}>
          {idx + 1} / {list.length}
        </span>
      </header>

      <h1 style={{ marginTop: 18, fontSize: 30, fontWeight: 800, lineHeight: 1.15 }}>
        {current.topic}
      </h1>

{parsedSummary ? (
  <section style={{ marginTop: 16, lineHeight: 1.7 }}>
    {parsedSummary.title && (
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>
        {parsedSummary.title}
      </h2>
    )}

{parsedSummary.summary && (
<ReactMarkdown
  components={{
    h3: ({ children }) => (
      <h3
        style={{
          marginTop: 28,
          fontSize: 16,
          fontWeight: 600,
          letterSpacing: "0.01em",
        }}
      >
        {children}
      </h3>
    ),
    p: ({ children }) => (
      <p
        style={{
          marginTop: 10,
          fontSize: 16,
          lineHeight: 1.75,
          opacity: 0.92,
        }}
      >
        {children}
      </p>
    ),
    ul: ({ children }) => (
      <ul style={{ marginTop: 10, paddingLeft: 18 }}>
        {children}
      </ul>
    ),
    li: ({ children }) => (
      <li style={{ marginTop: 6, opacity: 0.9 }}>
        {children}
      </li>
    ),
  }}
>
  {parsedSummary.summary}
</ReactMarkdown>

)}


  </section>
) : (
  <p style={{ marginTop: 10, opacity: 0.7 }}>
    Content not available yet for this concept.
  </p>
)}

    </main>
  );
}
