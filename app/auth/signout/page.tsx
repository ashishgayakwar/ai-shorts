"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { useSearchParams } from "next/navigation";

export default function SignOutPage() {
  const searchParams = useSearchParams();
  const callbackUrlRaw = searchParams.get("callbackUrl");
  const callbackUrl =
    callbackUrlRaw && callbackUrlRaw.startsWith("/") && !callbackUrlRaw.startsWith("//")
      ? callbackUrlRaw
      : "/";

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#070f1f] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-36 left-1/2 h-[560px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(34,211,238,0.20),rgba(2,6,23,0))]" />
        <div className="absolute -bottom-48 right-[-120px] h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,rgba(16,185,129,0.18),rgba(2,6,23,0))]" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-10">
        <header className="flex items-center justify-between">
          <Link
            href={callbackUrl}
            className="rounded-full border border-white/20 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
          >
            ← Back
          </Link>
          <span className="rounded-full border border-white/15 bg-white/[0.04] px-3 py-1 text-xs text-white/70">
            Account
          </span>
        </header>

        <main className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-2xl rounded-[28px] border border-white/15 bg-slate-950/40 p-8 shadow-[0_24px_70px_rgba(2,6,23,0.45)] backdrop-blur-xl sm:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200/90">
              Confirm Sign Out
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Sign out of AI PM World?
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-slate-300">
              You can sign back in anytime with your Google account. Your saved data
              stays secure.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => signOut({ callbackUrl })}
                className="inline-flex items-center rounded-full border border-cyan-200/45 bg-cyan-300/15 px-6 py-3 text-base font-semibold text-cyan-50 transition hover:bg-cyan-300/25"
              >
                Yes, Sign out
              </button>

              <Link
                href={callbackUrl}
                className="inline-flex items-center rounded-full border border-white/20 px-6 py-3 text-base font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                Cancel
              </Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
