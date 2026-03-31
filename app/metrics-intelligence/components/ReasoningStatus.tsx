"use client";

type ReasoningStatusProps = {
  steps: string[];
  currentStep: number;
};

export default function ReasoningStatus({
  steps,
  currentStep,
}: ReasoningStatusProps) {
  return (
    <section className="mx-auto w-full max-w-2xl rounded-[28px] border border-[#cfd8e4] bg-[#f9fbfe] p-6 sm:p-10">
      <p className="text-[11px] font-[800] uppercase tracking-[0.2em] text-[#667487]">
        Building Metrics Memo
      </p>
      <h2 className="mt-3 font-[family-name:var(--font-fraunces)] text-[36px] leading-tight text-[#121a28] sm:text-[48px]">
        Thinking like a PM lead
      </h2>
      <p className="mt-3 text-sm leading-7 text-[#4a586b]">
        Gathering company context, evaluating candidate north stars, and deriving causal metric
        drivers.
      </p>

      <div className="mt-8 space-y-3">
        {steps.map((step, index) => {
          const isDone = index < currentStep;
          const isActive = index === currentStep;
          const isPending = index > currentStep;

          return (
            <div
              key={step}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition ${
                isDone
                  ? "border-[#c8d4e2] bg-[#f3f7fb] text-[#2f4158]"
                  : isActive
                    ? "border-[#96abc4] bg-[#e8f0f8] text-[#142236]"
                    : "border-[#dde4ee] bg-[#ffffff] text-[#6c7686]"
              }`}
            >
              <span
                className={`inline-flex h-6 w-6 items-center justify-center rounded-full border text-xs font-[800] ${
                  isDone
                    ? "border-[#7b93b0] bg-[#e8eff7] text-[#2d445e]"
                    : isActive
                      ? "border-[#5f7da0] bg-[#dbe7f3] text-[#13243d]"
                      : "border-[#d2dae6] bg-[#f8fafd] text-[#8b95a5]"
                }`}
              >
                {isDone ? "✓" : isActive ? "•" : index + 1}
              </span>
              <span className={isActive ? "animate-pulse" : ""}>{step}</span>
              {isPending ? <span className="ml-auto text-xs">pending</span> : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
