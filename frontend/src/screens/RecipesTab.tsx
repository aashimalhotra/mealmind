import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getRecipes } from '../api/recipes';
import type { RecipeOut } from '../api/recipes';

export default function RecipesTab() {
  const { data: recipes, isLoading, error } = useQuery({
    queryKey: ['recipes'],
    queryFn: () => getRecipes({ limit: 50 }),
  });

  if (isLoading) {
    return (
      <div className="p-page">
        <h1 className="text-2xl font-bold text-text-primary mb-4">Recipes</h1>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-gray-200 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-page text-text-primary">
        <h1 className="text-2xl font-bold mb-4">Recipes</h1>
        <p className="text-red-500">Failed to load recipes: {error.message}</p>
        <Link to="/" className="text-primary underline mt-4 block">Back to Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="p-page text-text-primary">
      <h1 className="text-2xl font-bold mb-4">Recipes</h1>
      
      {recipes?.length === 0 ? (
        <div className="text-center py-8 text-text-tertiary">
          <p>No recipes saved yet.</p>
          <Link to="/" className="text-primary underline mt-2 block">Generate a meal plan to add recipes</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {recipes?.map((recipe: RecipeOut) => (
            <Link
              key={recipe.id}
              to={`/recipe/${recipe.id}`}
              className="block p-4 bg-surface rounded-xl border border-border hover:border-primary transition-colors"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="font-semibold text-lg">{recipe.display_name}</h2>
                  {recipe.cuisine && (
                    <span className="text-sm text-text-tertiary">{recipe.cuisine}</span>
                  )}
                </div>
                {recipe.is_favorite && (
                  <span className="text-yellow-500 text-sm">★ Favorite</span>
                )}
              </div>
              
              {recipe.description && (
                <p className="text-sm text-text-secondary mt-1 line-clamp-2">{recipe.description}</p>
              )}
              
              <div className="flex gap-2 mt-2 text-xs text-text-tertiary">
                {recipe.prep_time_min && <span>Prep: {recipe.prep_time_min}m</span>}
                {recipe.cook_time_min && <span>Cook: {recipe.cook_time_min}m</span>}
                {recipe.calories_per_serving && <span>{recipe.calories_per_serving} cal</span>}
              </div>
              
              {recipe.tags && recipe.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {recipe.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="px-2 py-0.5 bg-gray-100 rounded-full text-xs">{tag}</span>
                  ))}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
