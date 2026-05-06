import React from 'react';

export interface PrepStep {
  id: string;
  step_number: number;
  title: string;
  description: string;
  duration_min?: number;
  is_passive: boolean;
  completed: boolean;
  dish_name?: string;
  dish_color?: string;
}

interface ActiveStepCardProps {
  step: PrepStep;
  onNext: () => void;
  onPrevious?: () => void;
}

const ActiveStepCard: React.FC<ActiveStepCardProps> = ({ step, onNext, onPrevious }) => {
  return (
    <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center text-white text-xs font-medium">
          {step.step_number}
        </div>
        <span className="text-xs font-medium text-accent tracking-wide uppercase">
          Active Now
        </span>
      </div>
      <h3 className="text-lg font-semibold text-text-primary mb-2">{step.title}</h3>
      <p className="text-sm text-text-secondary mb-4 leading-relaxed">{step.description}</p>
      {step.duration_min && (
        <div className="bg-text-primary rounded-lg p-4 text-center mb-4">
          <p className="text-xs text-white/50 uppercase tracking-wide mb-1">
            {step.is_passive ? 'Passive Time' : 'Active Time'}
          </p>
          <p className="text-3xl font-medium text-white tabular-nums">
            {String(Math.floor(step.duration_min / 60)).padStart(2, '0')}:
            {String(step.duration_min % 60).padStart(2, '0')}
          </p>
        </div>
      )}
      <div className="flex gap-3">
        {onPrevious && (
          <button
            onClick={onPrevious}
            className="flex-1 bg-bg rounded-lg p-3 flex flex-col items-center gap-1 border border-gray-100"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M12 14l-6-6 6-6" stroke="#8C7B6B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="text-xs text-text-secondary">Previous</span>
          </button>
        )}
        <button
          onClick={onNext}
          className="flex-2 bg-accent rounded-lg p-3 text-center"
        >
          <p className="text-sm font-medium text-white">Done</p>
          <p className="text-xs text-white/70">Move to next step</p>
        </button>
      </div>
    </div>
  );
};

export default ActiveStepCard;
