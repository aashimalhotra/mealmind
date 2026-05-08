import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import MacroRingRow from '../components/MacroRingRow';
import MealCard from '../components/MealCard';
import WeekStrip from '../components/WeekStrip';
import PrepDayCard from '../components/PrepDayCard';
import AIInsightCard from '../components/AIInsightCard';
import PersonToggle from '../components/PersonToggle';
import { useCurrentPlan } from '../hooks/useCurrentPlan';
import { useTodaysPrepSession } from '../hooks/useTodaysPrepSession';
import { generatePlan, getPlanInsight } from '../api/plans';
import type { PlanInsight } from '../api/plans';
import { useChatStore } from '../stores/chatStore';
import { isInstallAvailable, onInstallAvailable, promptInstall } from '../pwaInstall';

// Helper to get today's weekday (lowercase, e.g., 'monday')
function getTodayWeekday(): string {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[new Date().getDay()];
}

// Skeleton loaders
const MacroRingSkeleton = () => (
  <div className="flex justify-center gap-4 my-4">
    {[1, 2, 3, 4].map((i) => (
      <div key={i} className="w-20 h-20 rounded-full bg-gray-200 animate-pulse" />
    ))}
  </div>
);

const MealCardSkeleton = () => (
  <div className="h-20 rounded-xl bg-gray-200 animate-pulse mb-3" />
);

const WeekStripSkeleton = () => (
  <div className="flex gap-2 mb-4">
    {[1, 2, 3, 4, 5, 6, 7].map((i) => (
      <div key={i} className="w-12 h-16 rounded-lg bg-gray-200 animate-pulse" />
    ))}
  </div>
);

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [selectedPerson, setSelectedPerson] = useState<1500 | 1800>(1500);
  const [genStage, setGenStage] = useState<string | null>(null);
  const [genError, setGenError] = useState<string | null>(null);
  const [prepError, setPrepError] = useState<string | null>(null);
  const [showInstallButton, setShowInstallButton] = useState(isInstallAvailable());
  
  // Listen for install availability
  useEffect(() => {
    const checkInstall = () => setShowInstallButton(isInstallAvailable());
    onInstallAvailable(checkInstall);
    // Initial check
    checkInstall();
  }, []);

  // Handle install button click
  const handleInstall = async () => {
    const result = await promptInstall();
    if (result) {
      setShowInstallButton(false);
    }
  };
  
  const { data: plan, isLoading, isError, error, refetch } = useCurrentPlan();
  const todayWeekday = getTodayWeekday();
  
  // Hook for today's prep session - only call when plan exists
  const { prepSession, isPrepDay, isLoading: prepLoading, isStarting, startPrep } = useTodaysPrepSession(plan?.id);

  // Handle prep day card click
  const handlePrepDayClick = useCallback(async () => {
    if (!plan?.id) return;
    setPrepError(null);
    if (prepSession) {
      // Existing session exists, navigate directly
      navigate(`/prep/${prepSession.id}`);
    } else {
      // No session yet, start one
      try {
        const session = await startPrep();
        if (session?.id) {
          navigate(`/prep/${session.id}`);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to start prep session';
        setPrepError(errorMessage);
        console.error('Failed to start prep session:', err);
      }
    }
  }, [plan?.id, prepSession, startPrep, navigate]);

  // FAB pulse control
  const setFabPulsing = useChatStore((state) => state.setFabPulsing);

  // Fetch plan insight
  const { data: insight, isLoading: insightLoading } = useQuery<PlanInsight, Error>({
    queryKey: ['planInsight', plan?.id],
    queryFn: () => getPlanInsight(plan!.id),
    enabled: !!plan?.id,
  });

  // Update FAB pulse based on insight severity
  React.useEffect(() => {
    if (insight?.severity === 'warning') {
      setFabPulsing(true);
    } else {
      setFabPulsing(false);
    }
    // Cleanup on unmount
    return () => setFabPulsing(false);
  }, [insight, setFabPulsing]);

  // Handle plan generation SSE
  const handleGeneratePlan = useCallback(() => {
    setGenStage('Starting…');
    setGenError(null);
    console.log('[Dashboard] Starting plan generation');
    const eventSource = generatePlan();
    
    // Listen for progress stages (default message events)
    eventSource.onmessage = (event) => {
      console.log('[Dashboard] onmessage received:', event.data);
      const stage = event.data;
      setGenStage(stage);
    };

    // Listen for 'done' event with plan_id
    eventSource.addEventListener('done', (event) => {
      console.log('[Dashboard] done event received:', event.data);
      const planId = event.data;
      eventSource.close();
      setGenStage(null);
      navigate(`/plan/review/${planId}`);
    });

    // Listen for 'error' event from backend
    eventSource.addEventListener('error', (event) => {
      console.log('[Dashboard] error event received:', event.data);
      let errorMessage = 'Failed to generate plan. Please try again.';
      try {
        const data = JSON.parse(event.data);
        if (data.error) {
          errorMessage = data.error;
        }
      } catch {
        // Invalid JSON, use default message
      }
      eventSource.close();
      setGenError(errorMessage);
      setGenStage(null);
    });

    eventSource.onerror = (error) => {
      console.log('[Dashboard] onerror triggered:', error);
      eventSource.close();
      setGenError('Failed to generate plan. Please try again.');
      setGenStage(null);
    };
  }, [navigate]);

  // Handle meal card click - navigate to recipe detail
  const handleMealClick = useCallback((recipeId: string) => {
    if (recipeId) {
      navigate(`/recipe/${recipeId}`);
    }
  }, [navigate]);

  // Derive today's data from plan when available
  const todayMeals = React.useMemo(() => {
    if (!plan?.plan_data) return [];
    const dayData = plan.plan_data[todayWeekday];
    if (!dayData) return [];

    const meals = [];
    const slotOrder = ['breakfast', 'lunch', 'dinner'] as const;
    const slotTimes = {
      breakfast: '8:00 AM',
      lunch: '12:30 PM',
      dinner: '7:00 PM',
    };

    for (const slot of slotOrder) {
      const meal = dayData[slot];
      if (!meal) continue;
      if (meal.meal_type === 'dine-out') {
        meals.push({
          slot,
          time: slotTimes[slot],
          title: 'Dining out tonight',
          macros: { kcal: 0, p: 0, c: 0, f: 0 },
          dimmed: true,
          dineOut: true,
          recipe_id: null,
        });
      } else if (meal.recipe_id) {
        meals.push({
          slot,
          time: slotTimes[slot],
          title: `Recipe ${meal.recipe_id.slice(0, 8)}…`,
          macros: { kcal: 0, p: 0, c: 0, f: 0 }, // Placeholder
          dimmed: false,
          dineOut: false,
          recipe_id: meal.recipe_id,
        });
      }
    }
    return meals;
  }, [plan, todayWeekday]);

  // Compute today's macro totals (placeholder since we don't have recipe macros yet)
  const todaysTotals = React.useMemo(() => {
    return todayMeals.reduce(
      (acc, meal) => ({
        kcal: acc.kcal + meal.macros.kcal,
        p: acc.p + meal.macros.p,
        c: acc.c + meal.macros.c,
        f: acc.f + meal.macros.f,
      }),
      { kcal: 0, p: 0, c: 0, f: 0 }
    );
  }, [todayMeals]);

  // Get user initials for avatar
  const userInitials = 'AD';
  // Format current date
  const today = new Date();
  const dateLabel = today.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).toUpperCase();
  const greeting = () => {
    const hour = today.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // --- Loading State ---
  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg">
        <div
          style={{
            background: 'linear-gradient(180deg, #E8DDD0 0%, #FAF6F0 100%)',
            padding: '20px 20px 12px',
          }}
        >
          <div className="flex justify-between items-center mb-4">
            <div>
              <p className="text-body-sm text-text-tertiary font-medium m-0" style={{ letterSpacing: '0.5px' }}>
                {dateLabel}
              </p>
              <p className="text-page-title font-medium text-text-primary m-0 mt-1">
                {greeting()}
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse" />
          </div>
          <div className="mb-4">
            <PersonToggle value={selectedPerson} onChange={setSelectedPerson} />
          </div>
          <MacroRingSkeleton />
        </div>
        <div className="px-[var(--page-padding)]">
          <h2 className="text-body-lg font-medium text-text-primary mt-4 mb-3">Today's meals</h2>
          <div className="flex flex-col gap-3 mb-4">
            {[1, 2, 3].map((i) => (
              <MealCardSkeleton key={i} />
            ))}
          </div>
          <h2 className="text-body-lg font-medium text-text-primary mt-4 mb-3">This week</h2>
          <WeekStripSkeleton />
          <div className="h-24 rounded-xl bg-gray-200 animate-pulse mb-4" />
          <div className="h-20 rounded-xl bg-gray-200 animate-pulse" />
        </div>
      </div>
    );
  }

  // --- Error State (404 = No plan) ---
  if (isError) {
    const is404 = error?.message?.includes('404');
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl p-8 shadow-sm text-center">
          {is404 ? (
            <>
              <h2 className="text-heading-md font-medium text-text-primary mb-2">No plan yet</h2>
              <p className="text-body-sm text-text-tertiary mb-6">
                Generate your first weekly meal plan to get started.
              </p>
              {genStage ? (
                <div className="mb-4">
                  <p className="text-body-sm text-text-secondary">{genStage}</p>
                  <div className="w-full h-2 bg-gray-200 rounded-full mt-2 overflow-hidden">
                    <div className="h-full bg-primary rounded-full animate-pulse" />
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleGeneratePlan}
                  className="w-full py-3 px-6 bg-primary text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
                >
                  Generate this week's plan
                </button>
              )}
              {genError && <p className="text-red-500 text-sm mt-2">{genError}</p>}
            </>
          ) : (
            <>
              <h2 className="text-heading-md font-medium text-text-primary mb-2">Error loading plan</h2>
              <p className="text-body-sm text-text-tertiary mb-6">{error?.message}</p>
              <button
                onClick={() => refetch()}
                className="w-full py-3 px-6 bg-primary text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
              >
                Retry
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // --- Data State (Plan exists) ---
  return (
    <div className="min-h-screen bg-bg">
      <div
        style={{
          background: 'linear-gradient(180deg, #E8DDD0 0%, #FAF6F0 100%)',
          padding: '20px 20px 12px',
        }}
      >
        <div className="flex justify-between items-center mb-4">
          <div>
            <p className="text-body-sm text-text-tertiary font-medium m-0" style={{ letterSpacing: '0.5px' }}>
              {dateLabel}
            </p>
            <p className="text-page-title font-medium text-text-primary m-0 mt-1">
              {greeting()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {showInstallButton && (
              <button
                onClick={handleInstall}
                className="px-3 py-1.5 text-sm font-medium text-white bg-primary rounded-lg hover:opacity-90 transition-opacity flex items-center gap-1"
                title="Install MealMind app"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Install
              </button>
            )}
            <button
              onClick={handleGeneratePlan}
              className="px-3 py-1.5 text-sm font-medium text-primary border border-primary rounded-lg hover:opacity-90 transition-opacity"
              disabled={!!genStage}
              title="Regenerate meal plan"
            >
              {genStage ? 'Generating...' : 'Regenerate'}
            </button>
            <div className="w-10 h-10 rounded-full bg-[#C4956A] flex items-center justify-center font-medium text-sm text-text-primary">
              {userInitials}
            </div>
          </div>
        </div>
        <div className="mb-4">
          <PersonToggle value={selectedPerson} onChange={setSelectedPerson} />
        </div>
        {/* TODO: Replace with real macro data from plan + user targets (Phase 2) */}
        <MacroRingRow
          data={{
            macros: [
              { label: 'Protein', current: todaysTotals.p, target: selectedPerson * 0.3, unit: 'g', color: '#C45B28', centerText: `${Math.round((todaysTotals.p / (selectedPerson * 0.3)) * 100)}%` },
              { label: 'Carbs', current: todaysTotals.c, target: selectedPerson * 0.3, unit: 'g', color: '#C49B28', centerText: `${Math.round((todaysTotals.c / (selectedPerson * 0.3)) * 100)}%` },
              { label: 'Fat', current: todaysTotals.f, target: selectedPerson * 0.4, unit: 'g', color: '#4A8C5C', centerText: `${Math.round((todaysTotals.f / (selectedPerson * 0.4)) * 100)}%` },
              { label: 'Veggies', current: 0, target: 5, unit: 'srv', color: '#6B8C3A', centerText: '0/5' },
            ],
            calories: { current: todaysTotals.kcal, target: selectedPerson },
          }}
        />
      </div>
      <div className="px-[var(--page-padding)]" data-testid="dashboard-content">
        <h2 className="text-body-lg font-medium text-text-primary mt-4 mb-3">Today's meals</h2>
        <div className="flex flex-col gap-3 mb-4">
          {todayMeals.length > 0 ? (
            todayMeals.map((meal, index) => (
              <MealCard
                key={index}
                slot={meal.slot}
                time={meal.time}
                title={meal.title}
                macros={meal.macros}
                dimmed={meal.dimmed}
                dineOut={meal.dineOut}
                onClick={meal.recipe_id ? () => handleMealClick(meal.recipe_id) : undefined}
              />
            ))
          ) : (
            <p className="text-body-sm text-text-tertiary">No meals planned for today.</p>
          )}
        </div>
        <h2 className="text-body-lg font-medium text-text-primary mt-4 mb-3">This week</h2>
        <div className="mb-4">
          {/* TODO: Replace with real week data from plan (Phase 2) */}
          <WeekStrip
            days={[
              { date: '2025-05-04', dayShort: 'Mon' as const, dayNum: 4, isToday: true, isPrepDay: false, isDineOut: false },
              { date: '2025-05-05', dayShort: 'Tue' as const, dayNum: 5, isToday: false, isPrepDay: false, isDineOut: false },
              { date: '2025-05-06', dayShort: 'Wed' as const, dayNum: 6, isToday: false, isPrepDay: true, isDineOut: false },
              { date: '2025-05-07', dayShort: 'Thu' as const, dayNum: 7, isToday: false, isPrepDay: false, isDineOut: false },
              { date: '2025-05-08', dayShort: 'Fri' as const, dayNum: 8, isToday: false, isPrepDay: false, isDineOut: true },
              { date: '2025-05-09', dayShort: 'Sat' as const, dayNum: 9, isToday: false, isPrepDay: false, isDineOut: false },
              { date: '2025-05-10', dayShort: 'Sun' as const, dayNum: 10, isToday: false, isPrepDay: false, isDineOut: true },
            ]}
          />
        </div>
        {/* Prep Day Card - only render if today is a prep day */}
        {isPrepDay && (
          <PrepDayCard
            dayLabel={`Prep day — ${todayWeekday.charAt(0).toUpperCase() + todayWeekday.slice(1)}`}
            summary="Batch cooking day — multiple recipes"
            durationLabel="~1.5 hrs estimated"
            onClick={handlePrepDayClick}
          />
        )}
        {prepError && (
          <p className="text-red-500 text-sm mt-2 mb-4">{prepError}</p>
        )}
        {prepLoading && isPrepDay && (
          <div className="h-24 rounded-xl bg-gray-200 animate-pulse mb-4" />
        )}
        {insight ? (
          <AIInsightCard
            title={insight.title}
            body={insight.body}
            severity={insight.severity}
          />
        ) : insightLoading ? (
          <div className="h-20 rounded-xl bg-gray-200 animate-pulse mb-4" />
        ) : null}
        {/* Grocery list entry point - visible when current plan exists */}
        {plan && (
        <div
          className="bg-surface rounded-card-lg py-2xl px-3xl mb-lg flex items-center justify-between cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => navigate(`/grocery/${plan.id}`)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && navigate(`/grocery/${plan.id}`)}
        >
          <div className="flex items-center gap-3">
            {/* Basket icon */}
            <svg width="20" height="20" viewBox="0 0 24 24" className="text-text-secondary" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
            </svg>
            <span className="text-body-lg font-medium text-text-primary">Grocery list</span>
          </div>
          {/* Chevron right */}
          <svg width="20" height="20" viewBox="0 0 20 20" className="text-text-tertiary">
            <path d="M7 4l6 6-6 6" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          </svg>
          </div>
        )}

      </div>
    </div>
  );
}

export default Dashboard;
