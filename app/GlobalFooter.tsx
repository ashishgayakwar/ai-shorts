import Link from "next/link";

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
  { label: "Competitor Analysis", href: "/competitor-analysis" },
  { label: "Resume Screener", href: "/pm-resume-screener" },
  { label: "MAANG", href: "/maang-interview-series" },
];

export default function GlobalFooter() {
  return (
    <footer className="border-t border-[#dccfbe] bg-[#f5f0e8] px-6 py-8 text-sm text-[#4f4338]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div className="flex flex-wrap items-center gap-3">
          {primaryLinks.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="rounded-full border border-[#d5c8b8] bg-[#efe6d9] px-3 py-1.5 text-xs font-semibold text-[#3c332d] transition hover:border-[#c0522a] hover:text-[#c0522a]"
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="flex flex-col gap-3 text-xs text-[#6e6158] sm:flex-row sm:items-center sm:justify-between">
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

        <div className="border-t border-[#dccfbe] pt-4 text-xs text-[#6e6158]">
          © {new Date().getFullYear()} Ashish Gayakwar. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
