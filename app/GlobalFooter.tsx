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
  { label: "MAANG", href: "/maang-interview-series" },
];

export default function GlobalFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#060c18] px-6 py-8 text-sm text-slate-300">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div className="flex flex-wrap items-center gap-3">
          {primaryLinks.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="rounded-full border border-white/15 bg-white/[0.03] px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-cyan-200/45 hover:bg-cyan-300/15"
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="flex flex-col gap-3 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
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

        <div className="border-t border-white/10 pt-4 text-xs text-slate-400">
          © {new Date().getFullYear()} Ashish Gayakwar. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
