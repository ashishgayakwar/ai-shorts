type TopicDropdownProps = {
  value: string;
  options: Array<{ id: number; topic: string; slug: string }>;
  onChange: (slug: string) => void;
};

export default function TopicDropdown({ value, options, onChange }: TopicDropdownProps) {
  return (
    <div className="md:hidden">
      <label className="mb-2 block text-[11px] font-semibold tracking-[0.22em] text-cyan-200/85">
        SELECT TOPIC
      </label>
      <select
        className="w-full rounded-xl border border-white/20 bg-white/[0.04] px-3 py-2.5 text-sm text-slate-100 outline-none"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((topic) => (
          <option key={topic.id} value={topic.slug}>
            {topic.topic}
          </option>
        ))}
      </select>
    </div>
  );
}
