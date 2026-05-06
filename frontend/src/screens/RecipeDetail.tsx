import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getRecipe, RecipeDetail } from '../api/recipes';
import PortionToggle from '../components/PortionToggle';
import MacroTagRow from '../components/MacroTagRow';
import IngredientList from '../components/IngredientList';
import AIInsightCard from '../components/AIInsightCard';

function RecipeDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [portion, setPortion] = useState<1500 | 1800>(1500);

  const { data: recipe, isLoading, error } = useQuery({
    queryKey: ['recipe', id],
    queryFn: () => getRecipe(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg p-page">
        <div className="animate-pulse space-y-4">
          <div className="h-48 bg-border rounded-card-lg" />
          <div className="h-20 bg-border rounded-card-lg" />
          <div className="h-32 bg-border rounded-card-lg" />
        </div>
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <div className="min-h-screen bg-bg p-page flex items-center justify-center">
        <p className="text-text-secondary">Failed to load recipe</p>
      </div>
    );
  }

  const quantityField = portion === 1500 ? 'quantity_1500' : 'quantity_1800';

  return (
    <div className="min-h-dvh bg-bg">
      {/* Hero section with gradient */}
      <div className="relative h-48 bg-gradient-to-br from-accent-gold/80 via-primary to-accent-olive/80 flex items-end p-page">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 w-9 h-9 rounded-full bg-white/20 flex items-center justify-center"
        >
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path d="M11 4L5 9l6 5" stroke="#FFF" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Action buttons */}
        <div className="absolute top-4 right-4 flex gap-2">
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path d="M9 3C7.5 3 5 4.5 5 7c0 4 4 7 4 7s4-3 4-7c0-2.5-2.5-4-4-4z" stroke="#FFF" strokeWidth="1.2" fill="none" />
            </svg>
          </div>
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 18 18">
              <circle cx="9" cy="4" r="1.2" fill="#FFF" />
              <circle cx="9" cy="9" r="1.2" fill="#FFF" />
              <circle cx="9" cy="14" r="1.2" fill="#FFF" />
            </svg>
          </div>
        </div>

        {/* Recipe title overlay */}
        <div className="relative z-10">
          <p className="text-2xs text-white/75 font-medium uppercase tracking-wider m-0">
            {recipe.cuisine || 'Recipe'}
          </p>
          <p className="text-page-title font-medium text-white m-0 mt-1">
            {recipe.display_name}
          </p>
          {recipe.authentic_name && (
            <p className="text-body-sm text-white/70 m-0 mt-0.5">
              {recipe.authentic_name}
            </p>
          )}
        </div>
      </div>

      <div className="p-page pb-24">
        {/* Status badge - shown if prep_session_id exists */}
        {recipe.prep_session_id && (
          <div className="bg-success/8 rounded-card border border-success/20 p-3 flex items-center gap-2.5 mb-4">
            <svg width="18" height="18" viewBox="0 0 18 18">
              <circle cx="9" cy="9" r="8" fill="#4A8C5C" />
              <path d="M5.5 9l2.5 2.5 4.5-5" stroke="#FFF" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className="text-2xs text-success m-0">Prepped on Sunday · stored in fridge</p>
          </div>
        )}

        {/* Time stats */}
        <div className="grid grid-cols-3 gap-2.5 mb-4">
          {recipe.reheat_time_min && (
            <div className="bg-surface rounded-card p-2.5 text-center border border-border">
              <p className="text-2xs text-text-tertiary m-0">Reheat</p>
              <p className="text-body font-medium text-text-primary m-0 mt-1">{recipe.reheat_time_min} min</p>
            </div>
          )}
          {recipe.shelf_life_days && (
            <div className="bg-surface rounded-card p-2.5 text-center border border-border">
              <p className="text-2xs text-text-tertiary m-0">Shelf life</p>
              <p className="text-body font-medium text-text-primary m-0 mt-1">{recipe.shelf_life_days} days</p>
            </div>
          )}
          <div className="bg-surface rounded-card p-2.5 text-center border border-border">
            <p className="text-2xs text-text-tertiary m-0">Servings</p>
            <p className="text-body font-medium text-text-primary m-0 mt-1">2</p>
          </div>
        </div>

        {/* Macros */}
        <div className="mb-4">
          <div className="bg-surface rounded-card p-3 mb-3 border border-border">
            <p className="text-body font-medium text-text-primary m-0 text-center">
              {recipe.calories_per_serving || '?'} <span className="text-text-tertiary text-body-sm font-normal">kcal / serving</span>
            </p>
          </div>
          <MacroTagRow
            calories_per_serving={recipe.calories_per_serving}
            protein_g={recipe.protein_g}
            carbs_g={recipe.carbs_g}
            fat_g={recipe.fat_g}
            veggie_servings={recipe.veggie_servings}
          />
        </div>

        {/* Tags */}
        {recipe.tags && recipe.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {recipe.tags.map((tag, index) => {
              const colors = ['bg-primary', 'bg-accent-olive', 'bg-accent-gold', 'bg-success'];
              const color = colors[index % colors.length];
              return (
                <div key={tag} className="bg-surface rounded-pill px-3.5 py-2 border border-border flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${color}`} />
                  <span className="text-2xs font-medium text-text-primary">{tag}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Serving instructions */}
        {recipe.serving_instructions && recipe.serving_instructions.length > 0 && (
          <div className="mb-4">
            <p className="text-body font-medium text-text-primary m-0 mb-3">Serving instructions</p>
            <div className="bg-surface rounded-card-lg border border-border overflow-hidden">
              {recipe.serving_instructions.map((instruction, index) => (
                <div key={index} className={`p-3.5 ${index < recipe.serving_instructions!.length - 1 ? 'border-b border-border' : ''}`}>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full border-1.5 border-border flex items-center justify-center text-2xs text-text-tertiary flex-shrink-0 mt-0.5">
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-body font-medium text-text-primary m-0 mb-1">
                        {index === 0 ? 'Reheat' : 'Plate'}
                      </p>
                      <p className="text-body-sm text-text-secondary m-0 leading-relaxed">
                        {instruction}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ingredients */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-3">
            <p className="text-body font-medium text-text-primary m-0">Ingredients</p>
            <PortionToggle value={portion} onChange={setPortion} />
          </div>
          <IngredientList items={recipe.ingredients} quantityField={quantityField} />
        </div>

        {/* Storage & reheating notes */}
        {recipe.storage_notes && (
          <div className="mb-4">
            <p className="text-body font-medium text-text-primary m-0 mb-3">Storage & reheating</p>
            <div className="bg-surface rounded-card-lg p-3.5 border border-border">
              <p className="text-body-sm text-text-secondary m-0 leading-relaxed">
                {recipe.storage_notes}
              </p>
            </div>
          </div>
        )}

        {/* AI Serving tip - placeholder for now, will be populated from API in Step 4.4 */}
        <div className="mb-4">
          <AIInsightCard
            title="Serving tip"
            body={`For the ${portion} cal target, ${portion === 1800 ? 'add an extra half roti or 50g more rice to this meal.' : 'this meal fits your 1500 cal target perfectly.'}`}
          />
        </div>

        {/* CTA - View in prep guide */}
        {recipe.prep_session_id ? (
          <button
            onClick={() => navigate(`/prep/${recipe.prep_session_id}`)}
            className="w-full bg-dark-bg text-white rounded-card-lg py-4 text-body font-medium"
          >
            <div>
              <p className="m-0">View in prep guide</p>
              <p className="text-2xs text-white/50 m-0 mt-1">See full cooking steps from Sunday batch</p>
            </div>
          </button>
        ) : (
          <div className="bg-border/30 rounded-card-lg p-4 text-center">
            <p className="text-2xs text-text-tertiary m-0">Not part of any prep session yet</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default RecipeDetailScreen;
