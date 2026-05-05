import React from 'react';

interface PrepDayCardProps {
  dayLabel: string;
  summary: string;
  durationLabel: string;
  onClick?: () => void;
}

const PrepDayCard: React.FC<PrepDayCardProps> = ({
  dayLabel,
  summary,
  durationLabel,
  onClick,
}) => {
  return (
    <div
      className={`
        bg-surface rounded-card-lg
        py-2xl px-3xl mb-lg
        border-[0.5px] border-border
        border-l-[3px] border-l-success
        ${onClick ? 'cursor-pointer' : ''}
      `}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      <div className="flex justify-between items-center">
        <div>
          <p className="text-body-sm text-success font-medium m-0">
            {dayLabel}
          </p>
          <p className="text-body-lg text-text-primary font-medium mt-1 mb-0.5">
            {summary}
          </p>
          <p className="text-body-sm text-text-tertiary m-0">
            {durationLabel}
          </p>
        </div>
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          className="text-text-tertiary"
        >
          <path
            d="M7 4l6 6-6 6"
            stroke="currentColor"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
          />
        </svg>
      </div>
    </div>
  );
};

export default PrepDayCard;
