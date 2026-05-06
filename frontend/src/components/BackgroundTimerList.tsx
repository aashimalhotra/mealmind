import React from 'react';

export interface BackgroundTimer {
  id: string;
  step_title: string;
  dish_color?: string;
  remaining_seconds: number;
  total_seconds: number;
  started_at_step: number;
}

interface BackgroundTimerListProps {
  timers: BackgroundTimer[];
}

const BackgroundTimerList: React.FC<BackgroundTimerListProps> = ({ timers }) => {
  if (timers.length === 0) return null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="mt-4">
      <p className="text-sm font-medium text-text-primary mb-2 flex items-center gap-2">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="7" cy="7" r="5.5" stroke="#C49B28" strokeWidth="1"/>
          <path d="M7 4v3.5l2.5 1.5" stroke="#C49B28" strokeWidth="1" strokeLinecap="round"/>
        </svg>
        Running in background
      </p>
      <div className="space-y-2">
        {timers.map((timer) => (
          <div key={timer.id} className="bg-white rounded-lg p-3 flex justify-between items-center border border-gray-100">
            <div className="flex items-center gap-3">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: timer.dish_color || '#C49B28' }}
              />
              <div>
                <p className="text-sm font-medium text-text-primary">{timer.step_title}</p>
                <p className="text-xs text-text-secondary">Started at step {timer.started_at_step}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium tabular-nums" style={{ color: timer.dish_color || '#C49B28' }}>
                {formatTime(timer.remaining_seconds)}
              </p>
              <p className="text-xs text-text-secondary">
                of {formatTime(timer.total_seconds)} min
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BackgroundTimerList;
