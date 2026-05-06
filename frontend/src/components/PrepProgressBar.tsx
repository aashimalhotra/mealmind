import React from 'react';

interface PrepProgressBarProps {
  completedSteps: number;
  totalSteps: number;
}

const PrepProgressBar: React.FC<PrepProgressBarProps> = ({ completedSteps, totalSteps }) => {
  const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  return (
    <div className="flex items-center gap-1 px-4 py-2">
      <div className="flex-1 h-1 rounded-full bg-gray-200 overflow-hidden">
        <div
          className="h-full bg-accent rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <span className="text-xs text-gray-500 ml-2">
        {completedSteps} / {totalSteps}
      </span>
    </div>
  );
};

export default PrepProgressBar;
