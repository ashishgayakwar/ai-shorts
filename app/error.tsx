"use client";

import { useEffect } from "react";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Keep a console trace for debugging while showing a user-safe fallback.
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-6 text-white">
      <div className="w-full max-w-lg rounded-2xl border border-white/15 bg-white/5 p-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">Something broke</p>
        <h2 className="mt-2 text-2xl font-semibold">We hit a temporary issue</h2>
        <p className="mt-3 text-sm text-white/80">
          Please try again. If this keeps happening, refresh once and retry.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 rounded-full bg-white px-5 py-2 text-sm font-semibold text-black"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
