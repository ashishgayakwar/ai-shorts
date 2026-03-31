import type { MetricsResult } from "@/lib/metrics-intelligence/types";

type ConfidenceBlockProps = {
  confidence: MetricsResult["company"]["confidence"];
  assumptions?: string[] | null;
};

function confidenceTone(confidence: MetricsResult["company"]["confidence"]): string {
  if (confidence === "high") return "border-[#101826] bg-[#101826] text-white";
  if (confidence === "low") return "border-amber-300 bg-amber-50 text-amber-800";
  return "border-[#101826]/30 bg-[#101826]/10 text-[#101826]";
}

export default function ConfidenceBlock({
  confidence,
  assumptions,
}: ConfidenceBlockProps) {
  const safeAssumptions = Array.isArray(assumptions) ? assumptions : [];
  const visibleAssumptions = safeAssumptions.filter((item) => item?.trim());

  return (
    <section className="border-t border-[#d4dce8] pt-6">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-[11px] font-[800] uppercase tracking-[0.2em] text-[#101826]">
          Confidence
        </p>
        <span
          className={`rounded-full border px-3 py-1 text-[11px] font-[800] uppercase tracking-[0.12em] ${confidenceTone(
            confidence
          )}`}
        >
          {confidence}
        </span>
      </div>

      {visibleAssumptions.length > 0 ? (
        <ul className="mt-3 space-y-1.5 text-xs leading-6 text-[#526178]">
          {visibleAssumptions.map((assumption) => (
            <li key={assumption}>• {assumption}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
