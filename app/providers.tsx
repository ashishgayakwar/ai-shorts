"use client";

import { SessionProvider } from "next-auth/react";
import { GlobalLoadingProvider } from "@/lib/global-loading";
import GlobalLoader from "./global-loader";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <GlobalLoadingProvider>
        {children}
        <GlobalLoader />
      </GlobalLoadingProvider>
    </SessionProvider>
  );
}
