interface DayData {
  date: string;
  dayShort: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
  dayNum: number;
  isToday: boolean;
  isPrepDay: boolean;
  isDineOut: boolean;
}

interface WeekStripProps {
  days: DayData[];
  onSelectDay?: (date: string) => void;
}

const WeekStrip: React.FC<WeekStripProps> = ({ days, onSelectDay }) => {
  return (
    <div className="flex gap-[var(--space-md)] overflow-x-auto">
      {days.map((day) => {
        const isToday = day.isToday;
        const isDineOut = day.isDineOut;

        const baseClasses = 'min-w-[42px] text-center p-[10px_6px] rounded-[var(--radius-card)]';
        const todayClasses = 'bg-primary text-white';
        const defaultClasses = 'bg-[var(--color-surface)] border border-[var(--color-border)]';

        const pillClasses = `${baseClasses} ${isToday ? todayClasses : defaultClasses}`;

        const dayNameColor = isDineOut && !isToday
          ? 'text-[var(--color-accent-gold)] font-[var(--font-weight-medium)]'
          : isToday
            ? 'text-white/70'
            : 'text-[var(--color-text-tertiary)]';

        // const dayNumColor = isToday ? 'text-white' : 'text-[var(--color-text-primary)]';

        return (
          <div
            key={day.date}
            className={pillClasses}
            onClick={() => onSelectDay?.(day.date)}
            role="button"
            tabIndex={0}
          >
            <p className={`text-[var(--font-size-xs)] m-0 ${dayNameColor}`}>
              {day.dayShort}
            </p>
            <p className={`text-[var(--font-size-section)] font-[var(--font-weight-medium)] m-[4px_0]`}>
              {day.dayNum}
            </p>
            {isToday ? (
              <div className="w-[6px] h-[6px] rounded-full bg-white/80 mx-auto mt-[4px]" />
            ) : day.isPrepDay ? (
              <div className="w-[6px] h-[6px] rounded-full bg-[var(--color-success)] mx-auto mt-[4px]" />
            ) : day.isDineOut ? (
              <div className="w-[18px] h-[6px] rounded-[3px] bg-[var(--color-accent-gold)] mx-auto mt-[4px]" />
            ) : (
              <div className="w-[6px] h-[6px] rounded-full bg-[var(--color-border)] mx-auto mt-[4px]" />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default WeekStrip;
