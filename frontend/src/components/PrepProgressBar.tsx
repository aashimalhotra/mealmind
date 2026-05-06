import React from 'react';

const COLOR_PALETTE = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

const getRecipeColor = (recipeId: string): string => {
  let hash = 0;
  for (let i = 0; i < recipeId.length; i++) {
    hash = (hash << 5) - hash + recipeId.charCodeAt(i);
    hash |= 0; // Convert to 32-bit integer
  }
  const index = Math.abs(hash) % COLOR_PALETTE.length;
  return COLOR_PALETTE[index];
};

interface Step {
  recipe_id: string;
  completed: boolean;
  active: boolean;
}

interface PrepProgressBarProps {
  steps: Step[];
  currentStepIndex: number;
}

const PrepProgressBar: React.FC<PrepProgressBarProps> = ({ steps }) => {
  return (
    <div 
      className="w-full flex h-4 rounded-full overflow-hidden" 
      role="progressbar" 
      aria-valuenow={steps.filter(s => s.completed).length} 
      aria-valuemin={0} 
      aria-valuemax={steps.length}
    >
      {steps.map((step, index) => {
        const recipeColor = getRecipeColor(step.recipe_id);
        const isCompleted = step.completed;
        const isActive = step.active;

        let segmentStyle: React.CSSProperties = {};
        let segmentClassName = 'h-full transition-all duration-300';

        if (isCompleted) {
          // Fully filled with recipe color
          segmentStyle = {
            backgroundColor: recipeColor,
            opacity: 1,
          };
        } else if (isActive) {
          // Half-filled with recipe color + pulse animation
          segmentStyle = {
            backgroundImage: `linear-gradient(to right, ${recipeColor} 50%, transparent 50%)`,
            opacity: 1,
          };
          segmentClassName += ' animate-pulse';
        } else {
          // Upcoming: 30% opacity
          segmentStyle = {
            backgroundColor: recipeColor,
            opacity: 0.3,
          };
        }

        return (
          <div
            key={`${step.recipe_id}-${index}`}
            className={`flex-1 ${segmentClassName}`}
            style={segmentStyle}
            role="progressbar"
            aria-valuenow={isCompleted ? 100 : isActive ? 50 : 0}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Step ${index + 1}: ${isCompleted ? 'completed' : isActive ? 'active' : 'upcoming'}`}
          />
        );
      })}
    </div>
  );
};

export default PrepProgressBar;
