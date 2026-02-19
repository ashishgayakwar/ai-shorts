import Link from "next/link";
import type { QnATopicWithSlug } from "@/interview_prep/lib/qna";

type TopicSidebarProps = {
  topics: QnATopicWithSlug[];
  activeSlug: string;
};

export default function TopicSidebar({ topics, activeSlug }: TopicSidebarProps) {
  return (
    <aside>
      <div className="flex flex-col rounded-2xl border border-white/12 bg-slate-950/55 p-3">
        <div className="mb-2 shrink-0 px-2 text-[11px] font-semibold tracking-[0.22em] text-cyan-200/85">TOPICS</div>

        <div className="max-h-[calc(100vh-112px)] space-y-2 overflow-y-auto pr-1 lg:max-h-[calc(100vh-116px)]">
          {topics.map((topic) => {
            const isActive = topic.slug === activeSlug;
            return (
              <Link
                key={topic.id}
                href={`/qna/${topic.slug}`}
                title={topic.topic}
                className={`relative flex items-start gap-3 rounded-xl border px-3 py-2.5 transition ${
                  isActive
                    ? "border-cyan-300/55 bg-cyan-300/14 text-cyan-100"
                    : "border-white/12 bg-white/[0.02] text-slate-100 hover:-translate-y-[1px] hover:border-cyan-300/35 hover:bg-white/[0.05]"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    isActive ? "bg-cyan-300" : "bg-white/35"
                  }`}
                  aria-hidden
                />

                <span
                  className={`flex-1 whitespace-normal break-words text-sm leading-5 ${isActive ? "font-semibold" : "font-medium"}`}
                >
                  {topic.topic}
                </span>

                <span className="shrink-0 rounded-full border border-white/20 bg-white/5 px-2 py-0.5 text-[10px] tracking-wide text-slate-300">
                  {topic.questions.length} Qs
                </span>

                {isActive ? (
                  <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-cyan-300" aria-hidden />
                ) : null}
              </Link>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
