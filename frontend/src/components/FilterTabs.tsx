import React from 'react';

export type FilterType = 'all' | 'sun-prep' | 'wed-prep' | 'day-of';

interface FilterTabsProps {
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
}

const FILTERS: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'sun-prep', label: 'Sun prep' },
  { key: 'wed-prep', label: 'Wed prep' },
  { key: 'day-of', label: 'Day-of' },
];

const FilterTabs: React.FC<FilterTabsProps> = ({ activeFilter, onFilterChange }) => {
  return (
    <div className="flex gap-[var(--space-md)] mb-[var(--space-xl)]">
      {FILTERS.map((filter) => {
        const isActive = filter.key === activeFilter;
        return (
          <button
            key={filter.key}
            className={`flex-1 px-[var(--space-3xl)] py-[var(--space-md)] text-center rounded-[var(--radius-lg)] border transition-colors ${
              isActive
                ? 'bg-[var(--color-primary)] text-[var(--color-dark-text)] font-[var(--font-weight-medium)] border-transparent'
                : 'bg-[var(--color-surface)] text-[var(--color-text-primary)] border-[0.5px] border-[var(--color-border)]'
            }`}
            onClick={() => onFilterChange(filter.key)}
            aria-pressed={isActive}
          >
            <span className="text-[var(--font-size-body-sm)]">{filter.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default FilterTabs;
