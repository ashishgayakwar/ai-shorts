import type { MetricsResult } from "@/lib/metrics-intelligence/types";

type GuardrailsSectionProps = {
  guardrails: MetricsResult["guardrails"];
};

export default function GuardrailsSection({ guardrails }: GuardrailsSectionProps) {
  const displayGuardrails = guardrails.slice(0, 2);

  return (
    <section className="border-t border-[#d4dce8] pt-7">
      <p className="text-[11px] font-[800] uppercase tracking-[0.2em] text-[#101826]">
        Guardrails
      </p>
      <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2">
        {displayGuardrails.map((guardrail, index) => (
          <article
            key={`${guardrail.name}-${index}`}
            className="border-l-[3px] border-[#101826] pl-5"
          >
            <h5 className="text-lg font-[700] text-[#1a2435]">
              {guardrail.name?.trim() || "—"}
            </h5>
            {guardrail.description?.trim() ? (
              <p className="mt-2 text-[14px] leading-7 text-[#4b5563]">
                {guardrail.description}
              </p>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
