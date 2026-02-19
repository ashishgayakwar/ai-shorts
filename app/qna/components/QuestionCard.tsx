import ReactMarkdown from "react-markdown";

type QuestionCardProps = {
  index: number;
  question: string;
  answer?: string;
};

type AnswerSection = {
  heading: string;
  body: string;
};

function parseAnswerSections(answer: string): AnswerSection[] {
  const sections: AnswerSection[] = [];
  const text = answer.replace(/\r\n/g, "\n").trim();

  // Supports both formats:
  // 1) "🔍 DEFINITION:\nBody..."
  // 2) "🔍 DEFINITION: Body..."
  const headingRegex = /(🔍\s+DEFINITION:|⚙️\s+HOW IT WORKS:|💡\s+WHY IT MATTERS:|📋\s+EXAMPLE:)/g;
  const matches = Array.from(text.matchAll(headingRegex));

  if (!matches.length) {
    return text ? [{ heading: "", body: text }] : [];
  }

  for (let i = 0; i < matches.length; i += 1) {
    const current = matches[i];
    const next = matches[i + 1];
    const start = current.index ?? 0;
    const heading = current[0].trim();
    const bodyStart = start + heading.length;
    const bodyEnd = next?.index ?? text.length;
    const body = text.slice(bodyStart, bodyEnd).trim();
    sections.push({ heading, body });
  }

  return sections.filter((section) => section.heading || section.body);
}

export default function QuestionCard({ index, question, answer }: QuestionCardProps) {
  const sections = answer ? parseAnswerSections(answer) : [];
  const hasStructuredSections = sections.some((section) => section.heading);

  return (
    <article className="border-b border-white/10 py-4 sm:py-5">
      <details className="group">
        <summary className="cursor-pointer list-none">
          <div className="flex items-start justify-between gap-2">
            <div className="text-xs font-semibold tracking-[0.16em] text-cyan-200">
              QUESTION {String(index + 1).padStart(2, "0")}
            </div>
            <span
              className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-cyan-200/70 bg-cyan-300/10 text-cyan-100 transition-transform group-open:rotate-180"
              aria-hidden="true"
            >
              <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none">
                <path
                  d="M5 8l5 5 5-5"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </div>
          <h3 className="mt-2 text-base font-medium leading-8 text-slate-100 sm:text-lg">{question}</h3>
        </summary>

        <div className="mt-3 rounded-xl border border-white/10 bg-slate-950/35 px-3 py-2 text-sm text-slate-300">
          {answer ? (
            hasStructuredSections ? (
              <div className="space-y-4">
                {sections.map((section, idx) => (
                  <section key={`${idx}-${section.heading.slice(0, 20)}`} className="space-y-2">
                    {section.heading ? (
                      <h4 className="text-sm font-semibold tracking-[0.06em] text-cyan-100">
                        {section.heading}
                      </h4>
                    ) : null}
                    {section.body ? (
                      <div className="prose prose-invert prose-sm max-w-none">
                        <ReactMarkdown>{section.body}</ReactMarkdown>
                      </div>
                    ) : null}
                  </section>
                ))}
              </div>
            ) : (
              <div className="prose prose-invert prose-sm max-w-none">
                <ReactMarkdown>{answer}</ReactMarkdown>
              </div>
            )
          ) : (
            <span className="text-slate-400">Answer coming soon</span>
          )}
        </div>
      </details>
    </article>
  );
}
