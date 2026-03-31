import type { MetricsResult } from "@/lib/metrics-intelligence/types";

type CompanyUnderstandingProps = {
  company: MetricsResult["company"];
};

export default function CompanyUnderstanding({
  company,
}: CompanyUnderstandingProps) {
  return (
    <section className="border-t border-[#d4dce8] pt-7">
      <p className="text-[11px] font-[800] uppercase tracking-[0.2em] text-[#101826]">
        Company Understanding
      </p>

      <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-[1.7fr_1fr]">
        <div>
          <p className="text-[15px] leading-8 text-[#2f3e53]">{company.summary?.trim() || "—"}</p>
          <p className="mt-4 text-sm leading-7 text-[#3b495d]">
            <span className="font-[800] text-[#1a2435]">Value event:</span>{" "}
            {company.value_event?.trim() || "—"}
          </p>
        </div>

        <div className="space-y-2 text-sm leading-7 text-[#3b495d]">
          <p>
            <span className="font-[800] text-[#1a2435]">Primary:</span>{" "}
            {company.primary_user?.trim() || "—"}
          </p>
          <p>
            <span className="font-[800] text-[#1a2435]">Secondary:</span>{" "}
            {company.secondary_user?.trim() || "None"}
          </p>
          <p>
            <span className="font-[800] text-[#1a2435]">Business type:</span>{" "}
            {company.business_type?.trim() || "—"}
          </p>
        </div>
      </div>
    </section>
  );
}
