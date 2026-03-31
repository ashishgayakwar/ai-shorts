import type { MetricsResult } from "@/lib/metrics-intelligence/types";

type InputMetricsSectionProps = {
  metrics: MetricsResult["input_metrics"];
};

export default function InputMetricsSection({
  metrics,
}: InputMetricsSectionProps) {
  const displayMetrics = metrics.slice(0, 4);

  return (
    <section className="border-t border-[#d4dce8] pt-7">
      <p className="text-[11px] font-[800] uppercase tracking-[0.2em] text-[#101826]">
        What Drives It
      </p>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {displayMetrics.map((metric, index) => (
          <article
            key={`${metric.name}-${index}`}
            className="transform-gpu overflow-hidden rounded-2xl border border-[#cfd8e4] shadow-[0_14px_30px_rgba(16,24,38,0.12),0_3px_8px_rgba(16,24,38,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_44px_rgba(16,24,38,0.16),0_8px_16px_rgba(16,24,38,0.11)]"
          >
            <div className="bg-[linear-gradient(180deg,#172235_0%,#101826_85%)] px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              <span className="text-[11px] font-bold tracking-[0.12em] text-[#7b8ba3]">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h5 className="mt-1 text-[18px] font-bold text-white">
                {metric.name?.trim() || "—"}
              </h5>
            </div>
            <div className="bg-white px-5 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
              {metric.description?.trim() ? (
                <p className="text-[14px] leading-7 text-[#374151]">{metric.description}</p>
              ) : null}
              <span className="mt-4 inline-block rounded-full border border-[#cfd8e4] bg-[#f3f7fb] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#556277]">
                Owner: {metric.owner?.trim() || "—"}
              </span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
