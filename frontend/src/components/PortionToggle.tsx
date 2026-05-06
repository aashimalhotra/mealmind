interface PortionToggleProps {
  value: 1500 | 1800;
  onChange: (value: 1500 | 1800) => void;
}

function PortionToggle({ value, onChange }: PortionToggleProps) {
  return (
    <div className="inline-flex rounded-lg overflow-hidden border border-border">
      <button
        className={`text-xs px-3 py-1.5 font-medium transition-colors ${
          value === 1500
            ? 'bg-primary text-white'
            : 'text-text-tertiary hover:bg-surface'
        }`}
        onClick={() => onChange(1500)}
      >
        1500
      </button>
      <button
        className={`text-xs px-3 py-1.5 font-medium transition-colors ${
          value === 1800
            ? 'bg-primary text-white'
            : 'text-text-tertiary hover:bg-surface'
        }`}
        onClick={() => onChange(1800)}
      >
        1800
      </button>
    </div>
  );
}

export default PortionToggle;
