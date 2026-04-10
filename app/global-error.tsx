"use client";

import { useEffect } from "react";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen items-center justify-center bg-black px-6 text-white">
          <div className="w-full max-w-lg rounded-2xl border border-white/15 bg-white/5 p-6 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
              Global error
            </p>
            <h2 className="mt-2 text-2xl font-semibold">App failed to render</h2>
            <p className="mt-3 text-sm text-white/80">
              Try reloading this page. If the problem persists, we will need to inspect server logs.
            </p>
            <button
              type="button"
              onClick={reset}
              className="mt-6 rounded-full bg-white px-5 py-2 text-sm font-semibold text-black"
            >
              Reload app
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
