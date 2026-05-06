import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPrepSession, completePrepStep, PrepSession } from '../api/prep';
import PrepProgressBar from '../components/PrepProgressBar';
import ActiveStepCard from '../components/ActiveStepCard';
import BackgroundTimerList from '../components/BackgroundTimerList';
import { useBackgroundTimers } from '../hooks/useBackgroundTimers';
import { PrepStep } from '../components/ActiveStepCard';

const PrepGuide: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedStepsExpanded, setCompletedStepsExpanded] = useState(false);
  const { timers, addTimer } = useBackgroundTimers();

  // Wake lock
  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null;
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await navigator.wakeLock.request('screen');
        }
      } catch (err) {
        console.warn('Wake lock not supported or failed:', err);
      }
    };
    requestWakeLock();
    return () => {
      if (wakeLock) {
        wakeLock.release().catch(() => {});
      }
    };
  }, []);

  // Fetch prep session
  const { data: prepSession, isLoading, error } = useQuery({
    queryKey: ['prepSession', sessionId],
    queryFn: () => getPrepSession(sessionId!),
    enabled: !!sessionId,
  });

  // Complete step mutation
  const completeStepMutation = useMutation({
    mutationFn: (stepIndex: number) => completePrepStep(sessionId!, stepIndex),
    onSuccess: (updatedStep) => {
      queryClient.setQueryData<PrepSession>(['prepSession', sessionId], (old) => {
        if (!old) return old;
        const newSteps = [...old.steps];
        newSteps[currentStepIndex] = updatedStep;
        return { ...old, steps: newSteps, completed_steps_count: old.completed_steps_count + 1 };
      });

      // If step has passive duration, add background timer
      const currentStep = prepSession?.steps[currentStepIndex];
      if (currentStep?.duration_min && currentStep.is_passive) {
        addTimer({
          id: `timer-${currentStep.id}`,
          step_title: currentStep.title,
          dish_color: currentStep.dish_color,
          started_at_step: currentStep.step_number,
          duration_min: currentStep.duration_min,
        });
      }

      // Advance to next step
      if (prepSession && currentStepIndex < prepSession.steps.length - 1) {
        setCurrentStepIndex((prev) => prev + 1);
      }
    },
  });

  const handleNext = useCallback(() => {
    completeStepMutation.mutate(currentStepIndex);
  }, [currentStepIndex, completeStepMutation]);

  const handlePrevious = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  }, [currentStepIndex]);

  if (isLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-bg">
        <p className="text-text-secondary">Loading prep guide...</p>
      </div>
    );
  }

  if (error || !prepSession) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-bg">
        <p className="text-red-500">Failed to load prep guide. Please try again.</p>
      </div>
    );
  }

  const currentStep = prepSession.steps[currentStepIndex];
  const completedSteps = prepSession.steps.filter((step) => step.completed);
  const upcomingSteps = prepSession.steps.filter(
    (step, index) => !step.completed && index > currentStepIndex
  ).slice(0, 2);

  return (
    <div className="min-h-dvh bg-bg">
      {/* Dark Header */}
      <div className="bg-[#3D2E1F] text-white p-5 pb-4">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M11 4L5 9l6 5" stroke="#FFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-white/50 mb-0.5">
                {prepSession.subtitle}
              </p>
              <p className="text-lg font-medium">{prepSession.title}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-white/50 uppercase tracking-wide mb-0.5">Est. total</p>
            <p className="text-sm font-medium text-[#C49B28]">
              {Math.floor(prepSession.est_total_min / 60)} hr {prepSession.est_total_min % 60} min
            </p>
          </div>
        </div>

        {/* Dish Chips */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {prepSession.dishes.map((dish) => (
            <div
              key={dish.id}
              className="flex-shrink-0 rounded-lg px-3 py-1.5 border text-center"
              style={{
                backgroundColor: `${dish.color}20`,
                borderColor: `${dish.color}30`,
              }}
            >
              <p className="text-[10px] text-white/60 mb-0.5">{dish.type}</p>
              <p className="text-xs font-medium" style={{ color: `${dish.color}CC` }}>
                {dish.name}
              </p>
            </div>
          ))}
        </div>

        {/* Progress Bar */}
        <PrepProgressBar
          completedSteps={prepSession.completed_steps_count}
          totalSteps={prepSession.steps.length}
        />
      </div>

      <div className="px-5 pt-4 pb-20">
        {/* Completed Steps (Collapsible) */}
        {completedSteps.length > 0 && (
          <div className="mb-4">
            <button
              onClick={() => setCompletedStepsExpanded(!completedStepsExpanded)}
              className="flex items-center gap-2 text-sm font-medium text-text-primary mb-2"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                style={{
                  transform: completedStepsExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s',
                }}
              >
                <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              {completedSteps.length} completed
            </button>
            {completedStepsExpanded && (
              <div className="space-y-1.5">
                {completedSteps.map((step) => (
                  <div key={step.id} className="bg-white rounded-lg p-3 flex items-center gap-3 border border-gray-100 opacity-50">
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <circle cx="9" cy="9" r="8" fill="#4A8C5C"/>
                      <path d="M5.5 9l2.5 2.5 4.5-5" stroke="#FFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <p className="text-sm text-text-secondary line-through">{step.title}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Active Step Card */}
        {currentStep && (
          <div className="mb-4">
            <ActiveStepCard
              step={currentStep}
              onNext={handleNext}
              onPrevious={currentStepIndex > 0 ? handlePrevious : undefined}
            />
          </div>
        )}

        {/* Upcoming Steps Preview */}
        {upcomingSteps.length > 0 && (
          <div className="mb-4">
            <p className="text-sm font-medium text-text-primary mb-2">Up next</p>
            <div className="space-y-1.5">
              {upcomingSteps.map((step) => (
                <div key={step.id} className="bg-white rounded-lg p-3 flex items-center gap-3 border border-gray-100 opacity-70">
                  <div className="w-5 h-5 rounded-full border border-gray-200 flex items-center justify-center text-[10px] text-text-secondary">
                    {step.step_number}
                  </div>
                  <p className="text-sm text-text-primary">{step.title}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Background Timers */}
        <BackgroundTimerList timers={timers} />
      </div>
    </div>
  );
};

export default PrepGuide;
