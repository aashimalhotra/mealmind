import React from 'react';
import { PlanData, MealSlot } from '../api/plans';

interface MealInfo {
  title: string;
  macros: { kcal: number; p: number; c: number; f: number };
}

interface PlanWeekGridProps {
  planData: PlanData;
  recipes?: Record<string, MealInfo>;
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
const DAY_LABELS: Record<string, string> = {
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
  saturday: 'Sat',
  sunday: 'Sun',
};
const SLOTS = ['breakfast', 'lunch', 'dinner'] as const;
const SLOT_LABELS: Record<string, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
};

const MiniMealCard: React.FC<{ meal?: MealSlot; mealInfo?: MealInfo }> = ({ meal, mealInfo }) => {
  if (!meal) {
    return <div className="p-2 rounded-lg bg-gray-50 text-sm text-text-tertiary min-h-[60px]">—</div>;
  }

  if (meal.meal_type === 'dine-out') {
    return (
      <div className="p-2 rounded-lg bg-gray-50 text-sm text-text-tertiary min-h-[60px] flex items-center">
        Dine out
      </div>
    );
  }

  if (!mealInfo) {
    return (
      <div className="p-2 rounded-lg bg-gray-50 text-sm text-text-tertiary min-h-[60px] flex items-center">
        {meal.recipe_id ? `Recipe ${meal.recipe_id.slice(0, 6)}…` : '—'}
      </div>
    );
  }

  return (
    <div className="p-2 rounded-lg bg-white border border-border-light min-h-[60px]">
      <p className="text-sm font-medium text-text-primary m-0 mb-1 truncate">{mealInfo.title}</p>
      <p className="text-xs text-text-tertiary m-0">
        {mealInfo.macros.kcal}kcal · {mealInfo.macros.p}P · {mealInfo.macros.c}C · {mealInfo.macros.f}F
      </p>
    </div>
  );
};

const PlanWeekGrid: React.FC<PlanWeekGridProps> = ({ planData, recipes }) => {
  return (
    <div className="w-full">
      {/* Header row: Day + Meal slot labels */}
      <div className="grid grid-cols-[80px_repeat(3,1fr)] gap-2 mb-2 px-1">
        <div className="text-xs font-medium text-text-tertiary uppercase">Day</div>
        {SLOTS.map((slot) => (
          <div key={slot} className="text-xs font-medium text-text-tertiary uppercase text-center">
            {SLOT_LABELS[slot]}
          </div>
        ))}
      </div>

      {/* Day rows */}
      {DAYS.map((day) => (
        <div key={day} className="grid grid-cols-[80px_repeat(3,1fr)] gap-2 mb-2">
          {/* Day label */}
          <div className="flex items-center text-sm font-medium text-text-primary capitalize">
            {DAY_LABELS[day]}
          </div>

          {/* Meal slots */}
          {SLOTS.map((slot) => {
            const meal: MealSlot | undefined = planData[day]?.[slot];
            const mealInfo = meal?.recipe_id ? recipes?.[meal.recipe_id] : undefined;
            return (
              <MiniMealCard key={slot} meal={meal} mealInfo={mealInfo} />
            );
          })}
        </div>
      ))}
    </div>
  );
};

export default PlanWeekGrid;
