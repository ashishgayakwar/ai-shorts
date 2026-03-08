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
    title: "AI Quiz",
    href: "/swipe?mode=quiz",
    tag: "Quiz",
    desc: "Level-based checks to test concept clarity fast.",
    accent: "from-sky-400/20 to-cyan-500/5",
  },
  {
    title: "Case Studio",
    href: "/case-study-generator",
    tag: "Practice",
    desc: "Generate interview-ready AI PM case simulations.",
    accent: "from-amber-300/20 to-orange-500/5",
  },
  {
    title: "Topic QnA",
    href: "/qna",
    tag: "QnA",
    desc: "Browse AI PM interview questions by topic.",
    accent: "from-violet-300/20 to-cyan-500/5",
  },
  {
    title: "M-A-A-N-G Interview Series",
    href: "/maang-interview-series",
    tag: "PDF Guide",
    desc: "Download the MAANG prep PDF.",
    descClassName: "text-xs leading-5",
    accent: "from-fuchsia-300/20 to-rose-500/5",
  },
];

const headerLinks = [
  { label: "Cards", href: "/swipe" },
  { label: "Quiz", href: "/swipe?mode=quiz" },
  { label: "Visualize", href: "/swipe?mode=visualize" },
  { label: "Compare", href: "/compare" },
  { label: "Interview", href: "/interview" },
  { label: "Home", href: "/" },
];

export default async function Home() {
  const session = await getServerSession(authOptions);
  const userLabel = session?.user?.name || session?.user?.email;
  const adminEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const isAdmin = !!session?.user?.email && adminEmails.includes(session.user.email.toLowerCase());

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#040b18] text-slate-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/2 h-[520px] w-[720px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(34,211,238,0.22),rgba(3,7,18,0))]" />
        <div className="absolute bottom-[-180px] right-[-120px] h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(251,191,36,0.18),rgba(3,7,18,0))]" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-6 sm:px-8 sm:py-8">
        <header className="sticky top-3 z-50 rounded-2xl border border-white/15 bg-white/5 px-4 py-3 backdrop-blur-xl sm:px-6">
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
                  {isAdmin ? (
                    <Link
                      href="/admin/users"
                      className="rounded-full border border-white/25 px-3 py-1 text-xs text-slate-100 transition hover:bg-white/10"
                    >
                      Admin
                    </Link>
                  ) : null}
                  <Link
                    href="/auth/signout?callbackUrl=/"
                    className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-900 transition hover:bg-cyan-100"
                  >
                    Sign out
                  </Link>
                </>
              ) : null}

              <details className="menu-drawer relative md:hidden">
                <summary className="menu-attn list-none cursor-pointer rounded-full border border-white/20 bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-slate-100 transition hover:bg-white/10">
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

        <main className="flex flex-1 flex-col py-5 sm:py-14">
          <section className="max-w-3xl">
            <h1 className="mt-1 text-3xl font-semibold leading-snug tracking-tight text-white sm:mt-5 sm:text-5xl sm:leading-tight">
              Modern AI learning,
              <span className="bg-gradient-to-r from-cyan-200 to-emerald-200 bg-clip-text text-transparent sm:block">
                designed for execution.
              </span>
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-[1.45] text-slate-300 sm:mt-5 sm:text-base sm:leading-7">
              Move from fundamentals to applied AI PM workflows with concise modules,
              swipe concepts, and interview-grade case practice in one place.
            </p>
          </section>

          <section className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
                  <p className={`mt-2 text-slate-300 ${track.descClassName || "text-sm leading-6"}`}>
                    {track.desc}
                  </p>
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
      </div>
    </div>
  );
}
