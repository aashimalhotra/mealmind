import React from 'react';

interface AIInsightCardProps {
  title?: string;
  body: string;
}

const AIInsightCard: React.FC<AIInsightCardProps> = ({
  title = 'AI insight',
  body,
}) => {
  return (
    <div
      className="
        bg-surface-warm rounded-card-lg
        py-3 px-3xl mb-4xl
        border-[0.5px] border-border
      "
    >
      <div className="flex items-start gap-xl">
        <div className="w-7 h-7 rounded-full bg-accent-gold flex items-center justify-center flex-shrink-0 mt-[2px]">
          <svg width="14" height="14" viewBox="0 0 14 14">
            <path
              d="M7 1v5l3 3"
              stroke="#FFFFFF"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
            />
            <circle
              cx="7"
              cy="7"
              r="5.5"
              stroke="#FFFFFF"
              strokeWidth="1"
              fill="none"
            />
          </svg>
        </div>
        <div>
          <p className="text-body font-medium text-text-primary m-0">
            {title}
          </p>
          <p className="text-body-sm text-text-secondary mt-1 m-0">
            {body}
          </p>
        </div>
      </div>
    </div>
  );
};

export default AIInsightCard;
