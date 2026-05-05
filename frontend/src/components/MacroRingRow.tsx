import MacroRing from './MacroRing';
import { DashboardData } from '../fixtures/dashboard';

interface MacroRingRowProps {
  data: DashboardData;
}

const MacroRingRow: React.FC<MacroRingRowProps> = ({ data }) => {
  return (
    <div>
      {/* 4-column grid for macro rings */}
      <div className="grid grid-cols-4 gap-[var(--space-md)]">
        {data.macros.map((macro, index) => (
          <MacroRing
            key={index}
            label={macro.label}
            current={macro.current}
            target={macro.target}
            unit={macro.unit}
            color={macro.color}
            centerText={macro.centerText}
          />
        ))}
      </div>

      {/* Calorie summary */}
      <div className="text-center mt-4">
        <p className="text-body text-tertiary">
          {data.calories.current} / {data.calories.target} kcal
        </p>
      </div>
    </div>
  );
};

export default MacroRingRow;
