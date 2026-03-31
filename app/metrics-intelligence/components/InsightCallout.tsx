type InsightCalloutProps = {
  text: string;
};

export default function InsightCallout({ text }: InsightCalloutProps) {
  if (!text?.trim()) return null;

  return (
    <div className="my-8 rounded-r-xl border-l-4 border-[#101826] bg-[linear-gradient(180deg,#f5f8fc_0%,#edf2f8_100%)] px-6 py-5 shadow-[0_10px_24px_rgba(16,24,38,0.1)]">
      <p className="mb-2 text-[10px] font-[800] uppercase tracking-[0.2em] text-[#101826]">
        Insight
      </p>
      <p className="text-[15px] font-medium leading-7 text-[#1e293b]">{text}</p>
    </div>
  );
}
