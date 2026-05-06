import { Ingredient } from '../api/recipes';

interface IngredientListProps {
  items: Ingredient[];
  quantityField: 'quantity_1500' | 'quantity_1800';
}

function getDotColor(name: string) {
  // Deterministic color based on ingredient name hash
  const colors = ['bg-primary', 'bg-accent-olive', 'bg-accent-gold', 'bg-success', 'bg-text-tertiary'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function IngredientList({ items, quantityField }: IngredientListProps) {
  return (
    <div className="bg-surface rounded-card-lg border border-border overflow-hidden">
      {items.map((ingredient, index) => (
        <div
          key={index}
          className={`flex justify-between items-center px-4 py-3 ${
            index < items.length - 1 ? 'border-b border-border' : ''
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className={`w-2 h-2 rounded-full ${getDotColor(ingredient.name)}`} />
            <span className="text-sm text-text-primary">{ingredient.name}</span>
            {ingredient.nutrition_source === 'llm_estimate' && (
              <span className="text-2xs text-text-tertiary">(estimated)</span>
            )}
          </div>
          <span className="text-sm font-medium text-text-secondary">
            {ingredient[quantityField]}{ingredient.unit}
          </span>
        </div>
      ))}
    </div>
  );
}

export default IngredientList;
