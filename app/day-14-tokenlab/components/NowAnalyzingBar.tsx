interface NowAnalyzingBarProps {
  text: string;
  onEdit: () => void;
}

export default function NowAnalyzingBar({ text, onEdit }: NowAnalyzingBarProps) {
  return (
    <div className="tl-analyzing-bar">
      <div className="tl-ab-left">
        <div className="tl-ab-label">NOW ANALYZING</div>
        <div className="tl-ab-text">{text}</div>
      </div>
      <button type="button" className="tl-ab-edit" onClick={onEdit} aria-label="Edit specimen">
        ↑ Edit specimen
      </button>
    </div>
  );
}
