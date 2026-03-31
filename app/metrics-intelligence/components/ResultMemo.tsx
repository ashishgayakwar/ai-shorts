import type { MetricsResult } from "@/lib/metrics-intelligence/types";

import CompanyUnderstanding from "./CompanyUnderstanding";
import GuardrailsSection from "./GuardrailsSection";
import InsightCallout from "./InsightCallout";
import InputMetricsSection from "./InputMetricsSection";
import MetricTrapsSection from "./MetricTrapsSection";
import NorthStarSection from "./NorthStarSection";

type ResultMemoProps = {
  result: MetricsResult;
  onReset: () => void;
};

export default function ResultMemo({ result, onReset }: ResultMemoProps) {
  return (
    <section className="mx-auto w-full">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-[800] uppercase tracking-[0.2em] text-[#677588]">
            Metrics Intelligence Memo
          </p>
          <h2 className="truncate font-[family-name:var(--font-fraunces)] text-[32px] leading-tight text-[#131b29] sm:text-[40px]">
            {result.company.name?.trim() || "—"}
          </h2>
          <span className="mt-1 inline-flex rounded-full border border-[#d0d9e5] bg-[#f2f6fb] px-2.5 py-1 text-[11px] font-[700] uppercase tracking-[0.12em] text-[#506077]">
            {result.company.business_type?.trim() || "—"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onReset}
            className="rounded-full border border-[#cbd5e2] bg-[#f2f6fb] px-4 py-2 text-xs font-[800] tracking-[0.1em] text-[#49566b] transition hover:bg-[#e8eef6]"
          >
            Analyze another company
          </button>
        </div>
      </div>

      <div className="mt-8 space-y-8">
        <CompanyUnderstanding company={result.company} />
        <NorthStarSection northStar={result.north_star} />
        <InsightCallout text={result.callouts?.north_star_insight || ""} />
        <InputMetricsSection metrics={result.input_metrics} />
        <GuardrailsSection guardrails={result.guardrails} />
        <InsightCallout text={result.callouts?.system_insight || ""} />
        <MetricTrapsSection traps={result.metric_traps} />
      </div>
    </section>
  );
}
