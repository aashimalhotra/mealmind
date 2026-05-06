import React from 'react';
import GroceryItem from './GroceryItem';
import type { GroceryItemData } from './GroceryItem';

interface CategorySectionProps {
  title: string;
  count: number;
  color: string;
  items: GroceryItemData[];
  onToggleItem: (id: string) => void;
}

const CategorySection: React.FC<CategorySectionProps> = ({
  title,
  count,
  color,
  items,
  onToggleItem,
}) => {
  return (
    <div className="mb-[var(--space-4xl)]">
      {/* Category header */}
      <div className="flex items-center gap-[var(--space-md)] mb-[var(--space-lg)]">
        <div
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: color }}
        />
        <p className="text-[var(--font-size-sm)] font-[var(--font-weight-medium)] text-[var(--color-text-primary)] m-0 uppercase tracking-[0.5px]">
          {title}
        </p>
        <div className="flex-1 h-[0.5px] bg-[var(--color-border)]" />
        <p className="text-[var(--font-size-sm)] text-[var(--color-text-tertiary)] m-0">
          {count} {count === 1 ? 'item' : 'items'}
        </p>
      </div>

      {/* Items list */}
      <div className="bg-[var(--color-surface)] rounded-[var(--radius-card-lg)] border border-[var(--color-border)] overflow-hidden">
        {items.map((item) => (
          <GroceryItem key={item.id} item={item} onToggle={onToggleItem} />
        ))}
      </div>
    </div>
  );
};

export default CategorySection;
