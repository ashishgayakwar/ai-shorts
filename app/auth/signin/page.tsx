"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

export default function SignInPage() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const error = searchParams.get("error");

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0B0E14] text-white">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-r from-cyan-500/20 via-emerald-500/10 to-lime-400/10 blur-3xl" />
        <div className="absolute -bottom-40 right-[-120px] h-[520px] w-[520px] rounded-full bg-fuchsia-500/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.10),transparent_55%)]" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-10">
        <header className="flex items-center justify-between">
          <Link href="/" className="text-sm text-white/70 hover:text-white">
            ← Back to AI Shorts
          </Link>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
            Secure Sign In
          </span>
        </header>

        <main className="flex flex-1 items-center">
          <div className="grid w-full grid-cols-1 gap-10 md:grid-cols-2">
            {/* Left: copy */}
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
                AI PM WORLD
                <span className="h-1 w-1 rounded-full bg-white/40" />
                Case Studies + Swipes
              </div>

              <h1 className="text-4xl font-semibold leading-tight md:text-5xl">
                Sign in to unlock
                <span className="block text-white/70">interview‑grade case packets.</span>
              </h1>

              <p className="max-w-xl text-sm text-white/65">
                Your progress, generated cases, and usage limits are tied to your account. Sign in once,
                and you’re good to go across devices.
              </p>

              <div className="flex items-center gap-3 text-xs text-white/55">
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">Private</span>
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">No spam</span>
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">Fast access</span>
              </div>
            </div>

            {/* Right: card */}
            <div className="flex items-center justify-center">
              <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.05] p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.04)] backdrop-blur">
                <div className="space-y-2">
                  <div className="text-sm text-white/60">Continue with</div>
                  <div className="text-2xl font-semibold">Google</div>
                </div>

                {error ? (
                  <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-100">
                    Sign in failed. Please try again.
                  </div>
                ) : null}

                <button
                  onClick={() => signIn("google", { callbackUrl })}
                  className="mt-6 inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-white/90"
                >
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-black/10 text-[10px] font-bold">
                    G
                  </span>
                  Sign in with Google
                </button>

                <div className="mt-6 text-xs text-white/50">
                  By continuing, you agree to our usage policy and rate limits.
                </div>
              </div>
            </div>
          </div>
        </main>

        <footer className="text-xs text-white/35">
          Need help? Contact support at hello@aipmworld.com
        </footer>
      </div>
    </div>
  );
}
