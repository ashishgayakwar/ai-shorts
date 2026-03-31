import type { MetricsResult } from "@/lib/metrics-intelligence/types";

type NorthStarSectionProps = {
  northStar: MetricsResult["north_star"];
};

export default function NorthStarSection({ northStar }: NorthStarSectionProps) {
  const alternatives = northStar.rejected_alternatives.slice(0, 3);

  return (
    <section className="rounded-[28px] border border-[#202b3f] bg-[#101826] p-8 text-[#e9eff8] sm:p-12">
      <p className="text-[11px] font-[800] uppercase tracking-[0.22em] text-[#9eb1cc]">
        North Star Metric
      </p>
      <h3 className="mt-3 max-w-4xl font-[family-name:var(--font-fraunces)] text-[38px] leading-[1.02] sm:text-[62px]">
        {northStar.name?.trim() || "—"}
      </h3>
      {northStar.definition?.trim() ? (
        <p className="mt-5 max-w-3xl text-[16px] leading-8 text-[#c4d1e2]">{northStar.definition}</p>
      ) : null}

      <div className="mt-5 rounded-2xl border border-[#314360] bg-[#15233a] px-4 py-3">
        <p className="text-[11px] font-[800] uppercase tracking-[0.16em] text-[#8fa7c7]">
          Formula
        </p>
        <p className="mt-2 font-mono text-sm leading-7 text-[#dce8f6]">
          {northStar.formula?.trim() || "—"}
        </p>
      </div>

      {northStar.why_this_works?.trim() ? (
        <p className="mt-6 max-w-3xl text-[15px] leading-8 text-[#cad7e7]">
          <span className="font-[800] text-[#ecf2fb]">Why this works:</span>{" "}
          {northStar.why_this_works}
        </p>
      ) : null}

      <div className="mt-7 border-t border-[#26354f] pt-5">
        <p className="text-[11px] font-[800] uppercase tracking-[0.2em] text-[#94a8c2]">
          Rejected Alternatives
        </p>
        <ul className="mt-3 space-y-2 text-sm leading-7 text-[#c2d0e2]">
          {alternatives.map((alternative, index) => (
            <li key={`${alternative.metric}-${index}`}>
              <span className="font-[800] text-[#edf3fb]">
                {alternative.metric?.trim() || "—"}
              </span>
              {alternative.why_weaker?.trim() ? ` — ${alternative.why_weaker}` : ""}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
