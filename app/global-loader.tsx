"use client";

import { useGlobalLoading } from "@/lib/global-loading";

export default function GlobalLoader() {
  const { loading } = useGlobalLoading();

  if (!loading) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        <div className="text-sm font-semibold tracking-[0.3em] text-white">AIPMWORLD</div>
      </div>
    </div>
  );
}
