import React from 'react';

export interface GroceryItemData {
  id: string;
  name: string;
  subtitle: string;
  quantity: string;
  checked: boolean;
}

interface GroceryItemProps {
  item: GroceryItemData;
  onToggle: (id: string) => void;
}

const GroceryItem: React.FC<GroceryItemProps> = ({ item, onToggle }) => {
  const handleToggle = () => onToggle(item.id);

  const nameColor = item.checked ? 'var(--color-text-tertiary)' : 'var(--color-text-primary)';
  const subtitleColor = item.checked ? 'var(--color-text-placeholder)' : 'var(--color-text-tertiary)';
  const quantityColor = item.checked ? 'var(--color-text-placeholder)' : 'var(--color-text-primary)';
  const textDecoration = item.checked ? 'line-through' : 'none';

  return (
    <div
      className="flex items-center gap-[var(--space-xl)] px-[var(--space-3xl)] py-[var(--space-3xl)] border-b border-[var(--color-border-light)] last:border-b-0 cursor-pointer"
      onClick={handleToggle}
      role="checkbox"
      aria-checked={item.checked}
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleToggle()}
    >
      {/* Checkbox with 44px tap target */}
      <div className="w-11 h-11 flex items-center justify-center flex-shrink-0">
        {item.checked ? (
          <div className="w-[22px] h-[22px] rounded-[var(--radius-sm)] bg-[var(--color-success)] flex items-center justify-center">
            <svg width="12" height="12" viewBox="0 0 12 12">
              <path
                d="M3 6l2 2 4-4"
                stroke="var(--color-dark-text)"
                strokeWidth="1.5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        ) : (
          <div className="w-[22px] h-[22px] rounded-[var(--radius-sm)] border-[1.5px] border-[var(--color-border)] flex-shrink-0" />
        )}
      </div>

      {/* Item text */}
      <div className="flex-1 min-w-0">
        <p
          className="text-[var(--font-size-body-lg)] m-0 mb-[var(--space-xs)] truncate"
          style={{ color: nameColor, textDecoration }}
        >
          {item.name}
        </p>
        <p
          className="text-[var(--font-size-sm)] m-0 truncate"
          style={{ color: subtitleColor }}
        >
          {item.subtitle}
        </p>
      </div>

      {/* Quantity */}
      <span
        className="text-[var(--font-size-body-lg)] font-[var(--font-weight-medium)] flex-shrink-0"
        style={{ color: quantityColor }}
      >
        {item.quantity}
      </span>
    </div>
  );
};

export default GroceryItem;
