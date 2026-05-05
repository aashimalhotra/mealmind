import React, { useState } from 'react';
import MacroRingRow from '../components/MacroRingRow';
import MealCard from '../components/MealCard';
import WeekStrip from '../components/WeekStrip';
import PrepDayCard from '../components/PrepDayCard';
import AIInsightCard from '../components/AIInsightCard';
import PersonToggle from '../components/PersonToggle';
import dashboardData from '../fixtures/dashboard';
import type { PersonDashboardData } from '../fixtures/dashboard';

// Meal data for today's meals
const todaysMeals = [
  {
    slot: 'breakfast' as const,
    time: '8:00 AM',
    title: 'Chickpea flour crepes + mint chutney',
    macros: { kcal: 320, p: 18, c: 28, f: 16 },
  },
  {
    slot: 'lunch' as const,
    time: '12:30 PM',
    title: 'Tandoori chicken + cumin rice + lentil soup',
    macros: { kcal: 570, p: 42, c: 52, f: 18 },
  },
  {
    slot: 'dinner' as const,
    time: '7:00 PM',
    title: 'Spiced cauliflower & potato + flatbread + yogurt dip',
    macros: { kcal: 410, p: 14, c: 48, f: 18 },
    dimmed: true,
  },
];

// Week data
const weekDays = [
  { date: '2025-05-04', dayShort: 'Mon' as const, dayNum: 4, isToday: true, isPrepDay: false, isDineOut: false },
  { date: '2025-05-05', dayShort: 'Tue' as const, dayNum: 5, isToday: false, isPrepDay: false, isDineOut: false },
  { date: '2025-05-06', dayShort: 'Wed' as const, dayNum: 6, isToday: false, isPrepDay: true, isDineOut: false },
  { date: '2025-05-07', dayShort: 'Thu' as const, dayNum: 7, isToday: false, isPrepDay: false, isDineOut: false },
  { date: '2025-05-08', dayShort: 'Fri' as const, dayNum: 8, isToday: false, isPrepDay: false, isDineOut: true },
  { date: '2025-05-09', dayShort: 'Sat' as const, dayNum: 9, isToday: false, isPrepDay: false, isDineOut: false },
  { date: '2025-05-10', dayShort: 'Sun' as const, dayNum: 10, isToday: false, isPrepDay: false, isDineOut: true },
];

const Dashboard: React.FC = () => {
  const [selectedPerson, setSelectedPerson] = useState<1500 | 1800>(1500);

  const data: PersonDashboardData = dashboardData;
  const currentData = selectedPerson === 1500 ? data.person1500 : data.person1800;

  // Get user initials for avatar
  const userInitials = 'AD';

  // Format current date
  const today = new Date();
  const dateLabel = today.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).toUpperCase();
  const greeting = 'Good morning';

  return (
    <div className="min-h-screen bg-bg">
      {/* Top gradient header */}
      <div
        style={{
          background: 'linear-gradient(180deg, #E8DDD0 0%, #FAF6F0 100%)',
          padding: '20px 20px 12px',
        }}
      >
        {/* Greeting row with avatar */}
        <div className="flex justify-between items-center mb-4">
          <div>
            <p className="text-body-sm text-text-tertiary font-medium m-0" style={{ letterSpacing: '0.5px' }}>
              {dateLabel}
            </p>
            <p className="text-page-title font-medium text-text-primary m-0 mt-1">
              {greeting}
            </p>
          </div>
          <div
            className="w-10 h-10 rounded-full bg-[#C4956A] flex items-center justify-center font-medium text-sm text-text-primary"
          >
            {userInitials}
          </div>
        </div>

        {/* Person Toggle */}
        <div className="mb-4">
          <PersonToggle value={selectedPerson} onChange={setSelectedPerson} />
        </div>

        {/* Macro Ring Row */}
        <MacroRingRow data={currentData} />
      </div>

      {/* Content area */}
      <div className="px-[var(--page-padding)]">
        {/* Today's meals */}
        <h2 className="text-body-lg font-medium text-text-primary mt-4 mb-3">
          Today's meals
        </h2>
        <div className="flex flex-col gap-3 mb-4">
          {todaysMeals.map((meal, index) => (
            <MealCard
              key={index}
              slot={meal.slot}
              time={meal.time}
              title={meal.title}
              macros={meal.macros}
              dimmed={meal.dimmed}
            />
          ))}
        </div>

        {/* This week */}
        <h2 className="text-body-lg font-medium text-text-primary mt-4 mb-3">
          This week
        </h2>
        <div className="mb-4">
          <WeekStrip days={weekDays} />
        </div>

        {/* Prep Day Card */}
        <PrepDayCard
          dayLabel="Prep day — Wednesday"
          summary="Spiced ground meat + creamy spinach + quinoa pilaf"
          durationLabel="~1.5 hrs · covers Thu–Sat"
        />

        {/* AI Insight Card */}
        <AIInsightCard
          body="You're low on iron this week. Consider adding spinach to tomorrow's lunch."
        />
      </div>

      {/* Bottom padding to account for fixed nav */}
      <div className="h-[80px]" />
    </div>
  );
};

export default Dashboard;
