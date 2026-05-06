import React from 'react';

interface PantryChipProps {
  label: string;
  itemId: string;
  onMoveToMainList: (itemId: string) => void;
}

const PantryChip: React.FC<PantryChipProps> = ({ label, itemId, onMoveToMainList }) => {
  return (
    <button
      className="text-[var(--font-size-body-sm)] text-[var(--color-text-primary)] bg-[var(--color-surface)] px-[var(--space-3xl)] py-[var(--space-sm)] rounded-[var(--radius-md)] border-[0.5px] border-[var(--color-border)] cursor-pointer hover:bg-[var(--color-border-light)] transition-colors"
      onClick={() => onMoveToMainList(itemId)}
      aria-label={`Add ${label} to grocery list`}
    >
      {label}
    </button>
  );
};

export default PantryChip;
