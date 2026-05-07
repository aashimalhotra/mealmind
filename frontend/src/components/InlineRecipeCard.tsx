import React from 'react';
import { RecipeSuggestion, ActionButton } from '../lib/parseRecipeMarkers';

interface InlineRecipeCardProps {
  recipe: RecipeSuggestion;
  onAction: (action: ActionButton['action'], payload?: Record<string, any>) => void;
}

const InlineRecipeCard: React.FC<InlineRecipeCardProps> = ({ recipe, onAction }) => {
  const handleButtonClick = (button: ActionButton) => {
    onAction(button.action, button.payload);
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 my-2 bg-white shadow-sm max-w-md">
      {/* Recipe Title */}
      <div className="mb-2">
        <h3 className="text-lg font-semibold text-gray-900">{recipe.title}</h3>
        {recipe.authentic_name && (
          <p className="text-sm text-gray-500 italic">{recipe.authentic_name}</p>
        )}
      </div>

      {/* Calories and Macros */}
      <div className="flex gap-4 mb-3 text-sm">
        <div className="flex items-center gap-1">
          <span className="font-medium text-gray-700">{recipe.kcal}</span>
          <span className="text-gray-500">kcal</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="font-medium text-blue-600">{recipe.p}g</span>
          <span className="text-gray-500">protein</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="font-medium text-green-600">{recipe.c}g</span>
          <span className="text-gray-500">carbs</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="font-medium text-yellow-600">{recipe.f}g</span>
          <span className="text-gray-500">fat</span>
        </div>
      </div>

      {/* Tags */}
      {recipe.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {recipe.tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        {recipe.action_buttons.map((button) => (
          <button
            key={button.label}
            onClick={() => handleButtonClick(button)}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              button.action === 'add_to_plan'
                ? 'bg-green-600 text-white hover:bg-green-700'
                : button.action === 'suggest_another'
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
            }`}
          >
            {button.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default InlineRecipeCard;
