import MealTypeBadge from './MealTypeBadge';

interface MacroData {
  kcal: number;
  p: number;
  c: number;
  f: number;
}

interface MealCardProps {
  slot: 'breakfast' | 'lunch' | 'dinner';
  time: string;
  title: string;
  macros: MacroData;
  dimmed?: boolean;
  dineOut?: boolean;
  onClick?: () => void;
}

const MealCard: React.FC<MealCardProps> = ({
  slot,
  time,
  title,
  macros,
  dimmed = false,
  dineOut = false,
  onClick,
}) => {
  const opacityClass = dimmed ? 'opacity-60' : '';

  if (dineOut) {
    return (
      <div
        className={`w-full min-h-[60px] rounded-[var(--radius-card-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-[var(--space-2xl)] ${opacityClass} cursor-pointer`}
        onClick={onClick}
        role="button"
        tabIndex={0}
        data-testid="meal-card"
      >
        <MealTypeBadge type="dine-out" />
        <span className="ml-[var(--space-md)] text-[var(--font-size-body-sm)] text-[var(--color-text-tertiary)]">
          {title}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`w-full min-h-[60px] rounded-[var(--radius-card-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-[var(--space-2xl)] ${opacityClass} cursor-pointer flex justify-between items-start`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      data-testid="meal-card"
    >
      <div className="flex-1">
        <div className="flex items-center gap-[var(--space-md)] mb-[var(--space-sm)]">
          <MealTypeBadge type={slot} />
          <span className="text-[var(--font-size-sm)] text-[var(--color-text-tertiary)]">
            {time}
          </span>
        </div>
        <p className="text-[var(--font-size-card-title)] font-[var(--font-weight-medium)] text-[var(--color-text-primary)] m-0 mb-[var(--space-xs)]">
          {title}
        </p>
        <p className="text-[var(--font-size-body-sm)] text-[var(--color-text-tertiary)] m-0">
          {macros.kcal} kcal · {macros.p}g P · {macros.c}g C · {macros.f}g F
        </p>
      </div>
      <div
        className="w-[52px] h-[52px] rounded-[var(--radius-card)] bg-[var(--color-border-light)] flex-shrink-0 ml-[var(--space-xl)]"
      />
    </div>
  );
};

export default MealCard;
