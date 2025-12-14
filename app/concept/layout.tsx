"use client";

import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

export default function ConceptLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Always start each concept at top (feels like “new card”)
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={{ opacity: 0, x: 28 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -28 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
