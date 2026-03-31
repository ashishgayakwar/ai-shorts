type InsightCalloutProps = {
  text: string;
};

export default function InsightCallout({ text }: InsightCalloutProps) {
  if (!text?.trim()) return null;

  return (
    <div className="my-8 rounded-r-xl border-l-4 border-[#101826] bg-[#f0f4f9] px-6 py-5">
      <p className="mb-2 text-[10px] font-[800] uppercase tracking-[0.2em] text-[#101826]">
        Insight
      </p>
      <p className="text-[15px] font-medium leading-7 text-[#1e293b]">{text}</p>
    </div>
  );
}
