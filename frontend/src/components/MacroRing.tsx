import React, { useState, useEffect } from 'react';

interface MacroRingProps {
  label: string;
  current: number;
  target: number;
  unit: string;
  color: string;
  centerText?: string;
}

const MacroRing: React.FC<MacroRingProps> = ({
  label,
  current,
  target,
  unit,
  color,
  centerText,
}) => {
  const circumference = 175.93;
  const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max);
  const ratio = clamp(target > 0 ? current / target : 0, 0, 1);
  const pct = Math.round(ratio * 100);
  const targetOffset = circumference * (1 - ratio);
  const [offset, setOffset] = useState(circumference);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setOffset(targetOffset);
    });
    return () => cancelAnimationFrame(raf);
  }, [targetOffset]);

  const centerDisplay = centerText || `${pct}%`;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-[68px] h-[68px]">
        <svg viewBox="0 0 68 68" width="68" height="68">
          {/* Background track */}
          <circle
            cx="34"
            cy="34"
            r="28"
            fill="none"
            stroke="var(--color-border)"
            strokeWidth="5"
          />
          {/* Foreground active ring */}
          <circle
            cx="34"
            cy="34"
            r="28"
            fill="none"
            stroke={color}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform="rotate(-90, 34, 34)"
            style={{ transition: 'stroke-dashoffset 600ms ease-out' }}
          />
          {/* Center text */}
          <text
            x="34"
            y="34"
            textAnchor="middle"
            dominantBaseline="central"
            className="fill-[var(--color-text-primary)] text-[13px] font-medium"
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {centerDisplay}
          </text>
        </svg>
      </div>
      {/* Label below ring */}
      <span className="text-sm text-tertiary" style={{ fontVariantNumeric: 'tabular-nums' }}>
        {label}
      </span>
      {/* Current / target with unit */}
      <span className="text-body-sm font-medium text-primary" style={{ fontVariantNumeric: 'tabular-nums' }}>
        {current} / {target}{unit}
      </span>
    </div>
  );
};

export default MacroRing;
