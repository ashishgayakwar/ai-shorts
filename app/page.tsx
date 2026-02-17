import Link from "next/link";
import Image from "next/image";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";

const learningTracks = [
  {
    title: "Basics Track",
    href: "/basics",
    tag: "Reader Mode",
    desc: "Day Zero foundations, explained without jargon.",
    accent: "from-cyan-400/20 to-sky-500/5",
  },
  {
    title: "Concept Swipe",
    href: "/swipe",
    tag: "Interactive",
    desc: "Card-based learning with next/prev concept journeys.",
    accent: "from-emerald-400/20 to-cyan-500/5",
  },
  {
    title: "Case Studio",
    href: "/case-study-generator",
    tag: "Practice",
    desc: "Generate interview-ready AI PM case simulations.",
    accent: "from-amber-300/20 to-orange-500/5",
  },
];

const headerLinks = [
  { label: "Quiz", href: "/swipe?mode=quiz" },
  { label: "Visualize", href: "/swipe?mode=visualize" },
  { label: "Compare Concepts", href: "/compare" },
];

export default async function Home() {
  const session = await getServerSession(authOptions);
  const userLabel = session?.user?.name || session?.user?.email;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#040b18] text-slate-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/2 h-[520px] w-[720px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(34,211,238,0.22),rgba(3,7,18,0))]" />
        <div className="absolute bottom-[-180px] right-[-120px] h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(251,191,36,0.18),rgba(3,7,18,0))]" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-6 sm:px-8 sm:py-8">
        <header className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3 backdrop-blur-xl sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/10">
                <Image src="/favicon.ico" alt="AI PM World" width={20} height={20} priority />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-200/90">
                  AI PM World
                </p>
                <p className="text-xs text-slate-300/80">Learn. Build. Ship AI products.</p>
              </div>
            </div>

            <nav className="hidden items-center gap-2 md:flex">
              {headerLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-full border border-white/20 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-cyan-200/45 hover:bg-cyan-300/15 hover:text-cyan-50"
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="flex flex-wrap items-center gap-2">
              {userLabel ? (
                <>
                  <span className="rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs text-slate-300">
                    {userLabel}
                  </span>
                  <Link
                    href="/admin/users"
                    className="rounded-full border border-white/25 px-3 py-1 text-xs text-slate-100 transition hover:bg-white/10"
                  >
                    Admin
                  </Link>
                  <Link
                    href="/api/auth/signout?callbackUrl=/"
                    className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-900 transition hover:bg-cyan-100"
                  >
                    Sign out
                  </Link>
                </>
              ) : null}

              <details className="relative md:hidden">
                <summary className="list-none cursor-pointer rounded-full border border-white/20 bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-slate-100 transition hover:bg-white/10">
                  Menu
                </summary>
                <div className="absolute right-0 top-10 z-30 w-64 rounded-2xl border border-white/15 bg-[#061126]/95 p-3 shadow-[0_14px_42px_rgba(2,6,23,0.55)] backdrop-blur-xl">
                  <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Quick Access
                  </div>
                  <div className="grid gap-2">
                    {headerLinks.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2 text-sm font-medium text-slate-100 transition hover:border-cyan-200/45 hover:bg-cyan-300/15"
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </div>
              </details>
            </div>
          </div>
        </header>

        <main className="flex flex-1 flex-col py-10 sm:py-14">
          <section className="max-w-3xl">
            <p className="inline-flex items-center rounded-full border border-cyan-200/20 bg-cyan-300/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-100">
              Built for AI Product Managers
            </p>
            <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight text-white sm:text-6xl">
              Modern AI learning,
              <span className="block bg-gradient-to-r from-cyan-200 to-emerald-200 bg-clip-text text-transparent">
                designed for execution.
              </span>
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
              Move from fundamentals to applied AI PM workflows with concise modules,
              swipe concepts, and interview-grade case practice in one place.
            </p>
          </section>

          <section className="mt-10 grid gap-4 md:grid-cols-3">
            {learningTracks.map((track) => (
              <Link
                key={track.href}
                href={track.href}
                className="group relative overflow-hidden rounded-2xl border border-white/15 bg-slate-950/35 p-5 backdrop-blur-sm transition hover:-translate-y-0.5 hover:border-cyan-200/40"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${track.accent} opacity-70`} />
                <div className="relative flex h-full flex-col">
                  <span className="inline-flex rounded-full bg-black/30 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-200">
                    {track.tag}
                  </span>
                  <h2 className="mt-3 text-xl font-semibold text-white">{track.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{track.desc}</p>
                  <div className="mt-4 flex justify-end">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-cyan-200/40 bg-cyan-300/15 text-base font-semibold text-cyan-100 transition group-hover:translate-x-0.5 group-hover:bg-cyan-300/25 group-hover:text-cyan-50">
                      ›
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </section>

        </main>

        <footer className="border-t border-white/10 pt-5 text-xs text-slate-400">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span>© {new Date().getFullYear()} AI PM World</span>
            <span>Basics · Swipe · Compare · Case Studio</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
