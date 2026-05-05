import React from 'react';

interface PersonToggleProps {
  value: 1500 | 1800;
  onChange: (value: 1500 | 1800) => void;
}

const PersonToggle: React.FC<PersonToggleProps> = ({ value, onChange }) => {
  return (
    <div className="inline-flex items-center gap-1">
      <button
        onClick={() => onChange(1500)}
        className={`
          px-3 py-1.5 text-sm font-medium rounded-md transition-colors
          ${value === 1500
            ? 'bg-primary text-white'
            : 'text-text-tertiary bg-transparent hover:bg-border-light'
          }
        `}
      >
        1500
      </button>
      <button
        onClick={() => onChange(1800)}
        className={`
          px-3 py-1.5 text-sm font-medium rounded-md transition-colors
          ${value === 1800
            ? 'bg-primary text-white'
            : 'text-text-tertiary bg-transparent hover:bg-border-light'
          }
        `}
      >
        1800
      </button>
    </div>
  );
};

export default PersonToggle;
