import type { MetricsResult } from "@/lib/metrics-intelligence/types";

type MetricTrapsSectionProps = {
  traps: MetricsResult["metric_traps"];
};

export default function MetricTrapsSection({ traps }: MetricTrapsSectionProps) {
  const displayTraps = traps.slice(0, 3);

  return (
    <section className="border-t border-[#d4dce8] pt-7">
      <p className="text-[11px] font-[800] uppercase tracking-[0.2em] text-[#101826]">
        What People Get Wrong
      </p>
      <div className="mt-4 space-y-5">
        {displayTraps.map((trap, index) => (
          <article
            key={`${trap.title}-${index}`}
            className="flex gap-5 border-l-[3px] border-[#101826] pl-5"
          >
            <span className="text-[24px] font-bold text-[#101826]">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div>
              <h5 className="text-[19px] font-[800] text-[#1a2435]">
                {trap.title?.trim() || "—"}
              </h5>
              {trap.explanation?.trim() ? (
                <p className="mt-1 text-sm leading-7 text-[#334257]">{trap.explanation}</p>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
