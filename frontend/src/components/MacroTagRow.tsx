interface MacroTagRowProps {
  calories_per_serving?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  veggie_servings?: number;
}

function MacroTagRow({
  calories_per_serving,
  protein_g,
  carbs_g,
  fat_g,
  veggie_servings
}: MacroTagRowProps) {
  return (
    <div className="grid grid-cols-4 gap-2">
      <div className="bg-surface rounded-lg p-2 text-center border border-border">
        <p className="text-sm font-medium text-protein m-0">{protein_g?.toFixed(0)}g</p>
        <p className="text-2xs text-text-tertiary m-0 mt-0.5">Protein</p>
      </div>
      <div className="bg-surface rounded-lg p-2 text-center border border-border">
        <p className="text-sm font-medium text-carbs m-0">{carbs_g?.toFixed(0)}g</p>
        <p className="text-2xs text-text-tertiary m-0 mt-0.5">Carbs</p>
      </div>
      <div className="bg-surface rounded-lg p-2 text-center border border-border">
        <p className="text-sm font-medium text-fat m-0">{fat_g?.toFixed(0)}g</p>
        <p className="text-2xs text-text-tertiary m-0 mt-0.5">Fat</p>
      </div>
      <div className="bg-surface rounded-lg p-2 text-center border border-border">
        <p className="text-sm font-medium text-veggies m-0">{veggie_servings?.toFixed(1)}</p>
        <p className="text-2xs text-text-tertiary m-0 mt-0.5">Veg srv</p>
      </div>
    </div>
  );
}

export default MacroTagRow;
