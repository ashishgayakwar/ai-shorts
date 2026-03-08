import Link from "next/link";

import LeadCaptureGate from "./LeadCaptureGate";

export default function MaangInterviewSeriesPage() {
  const guideModules = [
    {
      title: "Interview Patterns",
      body: "Most repeated MAANG question styles for product and AI PM rounds, with clear problem framing templates.",
    },
    {
      title: "Answer Frameworks",
      body: "Reusable structures for product sense, metrics, prioritization, experimentation, and AI system tradeoffs.",
    },
    {
      title: "Execution Stories",
      body: "High-signal example responses showing how to communicate scope, constraints, and measurable outcomes.",
    },
    {
      title: "Final Round Readiness",
      body: "Checklist for leadership, cross-functional influence, stakeholder alignment, and hiring panel expectations.",
    },
  ];

  const outcomes = [
    "Structure answers quickly under time pressure.",
    "Speak with stronger product and AI depth.",
    "Reduce rambling and improve answer clarity.",
    "Walk into interviews with repeatable preparation.",
  ];

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050b16] text-slate-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-36 left-1/2 h-[620px] w-[920px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(34,211,238,0.10),rgba(3,7,18,0))]" />
        <div className="absolute -top-24 left-1/2 h-[560px] w-[560px] -translate-x-1/2 rounded-full border border-cyan-200/7" />
        <div className="absolute bottom-[-220px] right-[-140px] h-[440px] w-[440px] rounded-full bg-[radial-gradient(circle,rgba(16,185,129,0.07),rgba(3,7,18,0))]" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-8 sm:px-8 sm:py-12">
        <header className="ai-shorts-topbar ai-shorts-topbar-full">
          <div className="ai-shorts-brand">
            <div className="ai-shorts-brand-title">AI SHORTS</div>
            <div className="ai-shorts-brand-subtitle">150-word primers for busy PMs</div>
          </div>

          <div className="ai-shorts-desktop-actions">
            <Link href="/swipe" className="ai-header-pill">Cards</Link>
            <Link href="/swipe?mode=quiz" className="ai-header-pill">Quiz</Link>
            <Link href="/swipe?mode=visualize" className="ai-header-pill">Visualize</Link>
            <Link href="/compare" className="ai-header-pill">Compare</Link>
            <Link href="/interview" className="ai-header-pill">Interview</Link>
            <span className="ai-header-pill ai-header-pill-active">MAANG</span>
            <Link href="/" className="ai-header-pill">Home</Link>
          </div>

          <details className="ai-shorts-mobile-menu">
            <summary>Menu</summary>
            <div className="ai-shorts-mobile-menu-panel">
              <Link href="/swipe" className="ai-header-pill">Cards</Link>
              <Link href="/swipe?mode=quiz" className="ai-header-pill">Quiz</Link>
              <Link href="/swipe?mode=visualize" className="ai-header-pill">Visualize</Link>
              <Link href="/compare" className="ai-header-pill">Compare</Link>
              <Link href="/interview" className="ai-header-pill">Interview</Link>
              <span className="ai-header-pill ai-header-pill-active">MAANG</span>
              <Link href="/" className="ai-header-pill">Home</Link>
            </div>
          </details>
        </header>

        <section className="relative mt-10 overflow-hidden rounded-[26px] border border-white/12 bg-slate-950/55 p-6 shadow-[0_30px_60px_rgba(2,6,23,0.55)] backdrop-blur-xl sm:p-10">
          <div className="pointer-events-none absolute -top-28 right-10 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(34,211,238,0.12),rgba(14,116,144,0))]" />
          <div className="relative">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-200/90">
              M-A-A-N-G Interview Series
            </p>
            <h1 className="mt-4 max-w-4xl text-3xl font-semibold leading-[1.08] tracking-tight text-white sm:text-5xl">
              Interview Prep PDF for AI PM Roles
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300 sm:text-lg">
              Frameworks and MAANG interview patterns in one practical guide.
            </p>

            <LeadCaptureGate />
          </div>
        </section>

        <section className="mt-10 border-t border-white/10 pt-6">
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200/80">
            Inside the guide
          </h2>
          <div className="mt-5 grid gap-x-10 gap-y-6 md:grid-cols-2">
            {guideModules.map((item) => (
              <article key={item.title} className="border-b border-white/10 pb-5">
                <h3 className="text-xl font-semibold text-white">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-300">{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-10 border-t border-white/10 pt-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-200/90">
            Outcomes
          </p>
          <h3 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">
            What this guide helps you do
          </h3>
          <ul className="mt-5 grid gap-x-8 gap-y-3 sm:grid-cols-2">
            {outcomes.map((item) => (
              <li key={item} className="text-sm leading-7 text-slate-200">
                • {item}
              </li>
            ))}
          </ul>

        </section>
      </div>
    </main>
  );
}
