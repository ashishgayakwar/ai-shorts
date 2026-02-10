"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

type GlobalLoadingApi = {
  loading: boolean;
  start: () => void;
  stop: () => void;
  set: (next: boolean) => void;
};

const GlobalLoadingContext = createContext<GlobalLoadingApi | null>(null);

export function GlobalLoadingProvider({ children }: { children: React.ReactNode }) {
  const [count, setCount] = useState(0);

  const start = useCallback(() => setCount((c) => c + 1), []);
  const stop = useCallback(() => setCount((c) => (c > 0 ? c - 1 : 0)), []);
  const set = useCallback((next: boolean) => setCount(next ? 1 : 0), []);

  const value = useMemo(
    () => ({ loading: count > 0, start, stop, set }),
    [count, start, stop, set]
  );

  return <GlobalLoadingContext.Provider value={value}>{children}</GlobalLoadingContext.Provider>;
}

export function useGlobalLoading() {
  const ctx = useContext(GlobalLoadingContext);
  if (!ctx) {
    throw new Error("useGlobalLoading must be used within GlobalLoadingProvider");
  }
  return ctx;
}
