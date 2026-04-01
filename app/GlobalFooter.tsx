"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const primaryLinks = [
  { label: "Home", href: "/" },
  { label: "Basics", href: "/basics" },
  { label: "Cards", href: "/swipe" },
  { label: "Quiz", href: "/swipe?mode=quiz" },
  { label: "Visualize", href: "/swipe?mode=visualize" },
  { label: "Compare", href: "/compare" },
  { label: "Interview", href: "/interview" },
  { label: "QnA", href: "/qna" },
  { label: "Case Studio", href: "/case-study-generator" },
  { label: "User Stories", href: "/user-story-generator" },
  { label: "City Guide", href: "/city-guide" },
  { label: "Frameworks", href: "/pm-framework-generator" },
  { label: "Competitor Analysis", href: "/competitor-analysis" },
  { label: "Resume Screener", href: "/pm-resume-screener" },
  { label: "MAANG", href: "/maang-interview-series" },
];

export default function GlobalFooter() {
  const pathname = usePathname();
  if (pathname.startsWith("/city-guide")) {
    return null;
  }

  const useLegacyThemeFooter =
    pathname.startsWith("/auth") ||
    pathname.startsWith("/swipe") ||
    pathname.startsWith("/basics") ||
    pathname.startsWith("/quiz") ||
    pathname.startsWith("/visualize") ||
    pathname.startsWith("/compare") ||
    pathname.startsWith("/interview") ||
    pathname.startsWith("/qna") ||
    pathname.startsWith("/concept") ||
    pathname.startsWith("/case-study-generator");
  const usePmFrameworkThemeFooter = pathname.startsWith("/pm-framework-generator");

  const footerClassName = useLegacyThemeFooter
    ? "relative z-40 border-t border-[#143a65] bg-[#05122a] px-6 py-8 text-sm text-[#cde8ff]"
    : usePmFrameworkThemeFooter
      ? "relative z-40 border-t border-[#d8e3f5] bg-[#f3f7fd] px-6 py-8 text-sm text-[#334155]"
      : "relative z-40 border-t border-[#dccfbe] bg-[#f5f0e8] px-6 py-8 text-sm text-[#4f4338]";
  const linkClassName = useLegacyThemeFooter
    ? "text-[11px] font-semibold text-[#cde8ff] underline decoration-transparent decoration-[1px] underline-offset-4 transition hover:text-[#68c6ff] hover:decoration-current"
    : usePmFrameworkThemeFooter
      ? "text-[11px] font-semibold text-[#1e3a8a] underline decoration-transparent decoration-[1px] underline-offset-4 transition hover:text-[#2563eb] hover:decoration-current"
      : "text-[11px] font-semibold text-[#3c332d] underline decoration-transparent decoration-[1px] underline-offset-4 transition hover:text-[#c0522a] hover:decoration-current";
  const subTextClassName = useLegacyThemeFooter
    ? "text-xs text-[#97bddf]"
    : usePmFrameworkThemeFooter
      ? "text-xs text-[#64748b]"
      : "text-xs text-[#6e6158]";
  const dividerClassName = useLegacyThemeFooter
    ? "border-t border-[#143a65] pt-4 text-xs text-[#97bddf]"
    : usePmFrameworkThemeFooter
      ? "border-t border-[#d8e3f5] pt-4 text-xs text-[#64748b]"
      : "border-t border-[#dccfbe] pt-4 text-xs text-[#6e6158]";

  return (
    <footer className={footerClassName}>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {primaryLinks.map((item) => (
            <Link key={item.label} href={item.href} className={linkClassName}>
              {item.label}
            </Link>
          ))}
        </div>

        <div className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${subTextClassName}`}>
          <p className="text-left">
            Contact:{" "}
            <a href="mailto:ashishgayakwar3@gmail.com" className="underline underline-offset-2">
              ashishgayakwar3@gmail.com
            </a>
          </p>
          <div className="flex flex-wrap items-center justify-start gap-4 sm:justify-end">
            <Link href="/privacy" className="underline underline-offset-2">
              Privacy Policy
            </Link>
            <Link href="/terms" className="underline underline-offset-2">
              Terms of Use
            </Link>
          </div>
        </div>

        <div className={dividerClassName}>
          © {new Date().getFullYear()} Ashish Gayakwar. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
