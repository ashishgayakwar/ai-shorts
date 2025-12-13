import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-black dark:text-zinc-50">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-6 py-10">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Replace with your own logo file in /public if you want */}
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-950 dark:ring-zinc-800">
              <Image
                src="/favicon.ico"
                alt="AI Shorts"
                width={20}
                height={20}
                priority
              />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold">AI Shorts with ASHISH</div>

            </div>
          </div>
        </header>

        {/* Main */}
        <main className="flex flex-1 flex-col justify-center py-14">
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
              Learn AI - one concept at a time
            </h1>
            <p className="max-w-xl text-base leading-7 text-zinc-600 dark:text-zinc-400">
              Start with the basics, or jump straight
              into the interactive swipe + quiz experience.
            </p>
          </div>

          {/* CTAs */}
          <div className="mt-10 grid gap-4">
            <Link
              href="/basics"
              className="group rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-200 transition hover:shadow-md dark:bg-zinc-950 dark:ring-zinc-800"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-lg font-semibold">Basic Module</div>
                  <div className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                    Beginnerfriendly concepts - absolute basics
                  </div>
                </div>
                <div className="shrink-0 rounded-full border border-zinc-200 px-3 py-1 text-sm text-zinc-700 transition group-hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-200 dark:group-hover:bg-zinc-900">
                  Start
                </div>
              </div>
            </Link>

            <Link
              href="/swipe"
              className="group rounded-2xl bg-zinc-900 p-5 text-white shadow-sm transition hover:shadow-md dark:bg-white dark:text-black"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-lg font-semibold">Intermediate Module</div>
                  <div className="text-sm leading-6 text-white/80 dark:text-black/70">
                    Swipe cards, quiz, compare, and visualize concepts
                  </div>
                </div>
                <div className="shrink-0 rounded-full bg-white/10 px-3 py-1 text-sm text-white transition group-hover:bg-white/15 dark:bg-black/10 dark:text-black dark:group-hover:bg-black/15">
                  Start
                </div>
              </div>
            </Link>
          </div>
        </main>

        {/* Footer */}
        <footer className="pt-6 text-xs text-zinc-500 dark:text-zinc-400">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span>© {new Date().getFullYear()} AI Shorts</span>
            <span className="text-zinc-400 dark:text-zinc-500">
              Basic → Reader mode · Intermediate → Swipe mode
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}
