import { useEffect, useState } from 'react';
import { useBackgroundTimers, BackgroundTimer } from '../hooks/useBackgroundTimers';

const formatTime = (totalSeconds: number): string => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const BackgroundTimerList = () => {
  const { timers, removeTimer, getTimersWithRemaining } = useBackgroundTimers();
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const timersWithRemaining = getTimersWithRemaining(currentTime);

  if (timersWithRemaining.length === 0) return null;

  return (
    <div className="mb-3">
      <p className="text-sm font-medium text-[#3D2E1F] mb-2 flex items-center gap-1.5">
        <svg width="14" height="14" viewBox="0 0 14 14">
          <circle cx="7" cy="7" r="5.5" stroke="#C49B28" strokeWidth="1" fill="none" />
          <path d="M7 4v3.5l2.5 1.5" stroke="#C49B28" strokeWidth="1" fill="none" strokeLinecap="round" />
        </svg>
        Running in background
      </p>
      <div className="space-y-2">
        {timersWithRemaining.map((timer) => {
          const isComplete = timer.remainingSec <= 0;
          const totalMinutes = Math.floor(timer.durationSec / 60);
          const totalSeconds = timer.durationSec % 60;

          return (
            <div
              key={timer.id}
              className="bg-white rounded-xl p-3 border border-[#E8DDD0] flex justify-between items-center cursor-pointer"
              onClick={() => isComplete && removeTimer(timer.id)}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: timer.recipeColor }}
                />
                <div>
                  <p className="text-sm font-medium text-[#3D2E1F]">
                    {isComplete ? 'Done — tap to dismiss' : timer.label}
                  </p>
                  {!isComplete && (
                    <p className="text-xs text-[#8C7B6B] mt-0.5">
                      Started at step {timer.startedAtStep}
                    </p>
                  )}
                </div>
              </div>
              {!isComplete && (
                <div className="text-right">
                  <p
                    className="text-base font-medium tabular-nums"
                    style={{ color: timer.recipeColor }}
                  >
                    {formatTime(timer.remainingSec)}
                  </p>
                  <p className="text-[10px] text-[#8C7B6B]">
                    of {totalMinutes}:{totalSeconds.toString().padStart(2, '0')}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BackgroundTimerList;
