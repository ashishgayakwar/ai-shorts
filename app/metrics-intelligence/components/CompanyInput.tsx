"use client";

const EXAMPLES = [
  "Uber",
  "Airbnb",
  "Notion",
  "Stripe",
  "Netflix",
  "Duolingo",
  "Swiggy",
  "Practo",
] as const;

type CompanyInputProps = {
  company: string;
  onCompanyChange: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
};

export default function CompanyInput({
  company,
  onCompanyChange,
  onSubmit,
  isLoading,
}: CompanyInputProps) {
  const canSubmit = company.trim().length >= 2 && !isLoading;

  return (
    <section className="mx-auto w-full max-w-4xl rounded-[28px] border border-[#cfd8e4] bg-[#f9fbfe] p-6 sm:p-10">
      <p className="text-[11px] font-[800] uppercase tracking-[0.2em] text-[#667487]">
        Product 06 / 75
      </p>
      <h1 className="mt-3 max-w-3xl font-[family-name:var(--font-fraunces)] text-[40px] leading-[1.04] text-[#111827] sm:text-[58px]">
        See how a company should actually measure success.
      </h1>
      <p className="mt-4 max-w-2xl text-[16px] leading-8 text-[#465468]">
        Enter any company and get a structured, opinionated metrics memo: one North Star, causal
        drivers, guardrails, and metric traps.
      </p>

      <div className="mt-7 flex flex-col gap-3 sm:flex-row">
        <input
          value={company}
          onChange={(event) => onCompanyChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && canSubmit) {
              event.preventDefault();
              onSubmit();
            }
          }}
          placeholder="Enter a company name..."
          className="w-full rounded-2xl border border-[#cfd8e4] bg-white px-4 py-3 text-[15px] text-[#0f172a] outline-none transition focus:border-[#6e7d92] focus:ring-2 focus:ring-[#d7e0ed]"
        />
        <button
          type="button"
          disabled={!canSubmit}
          onClick={onSubmit}
          className="rounded-2xl border border-[#101826] bg-[#101826] px-6 py-3 text-sm font-[800] tracking-[0.08em] text-[#f8fafc] transition hover:bg-[#1d2b42] disabled:cursor-not-allowed disabled:border-[#7f8a9a] disabled:bg-[#7f8a9a]"
        >
          Analyze Company
        </button>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {EXAMPLES.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => onCompanyChange(example)}
            className="rounded-full border border-[#ccd6e2] bg-[#f3f7fb] px-3.5 py-1.5 text-xs font-[700] tracking-[0.08em] text-[#516074] transition hover:bg-[#e8eef6]"
          >
            {example}
          </button>
        ))}
      </div>
    </section>
  );
}
