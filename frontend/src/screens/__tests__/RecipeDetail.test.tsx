import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import RecipeDetailScreen from '../RecipeDetail';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const server = setupServer(
  http.get('*/api/recipes/:id', () => {
    return HttpResponse.json({
      id: 'test-recipe-1',
      display_name: 'Tandoori Chicken',
      authentic_name: 'Tandoori Murgh',
      description: 'Yogurt-marinated spiced grilled chicken',
      cuisine: 'Indian',
      ingredients: [
        {
          name: 'Chicken thighs',
          quantity_1500: 300,
          quantity_1800: 400,
          unit: 'g',
          nutrition_source: 'usda',
        },
        {
          name: 'Greek yogurt',
          quantity_1500: 100,
          quantity_1800: 150,
          unit: 'g',
          nutrition_source: 'usda',
        },
      ],
      prep_steps: ['Marinate', 'Grill'],
      serving_instructions: ['Reheat in oven', 'Serve with rice'],
      prep_time_min: 15,
      cook_time_min: 25,
      reheat_time_min: 5,
      shelf_life_days: 4,
      storage_notes: 'Store in fridge up to 4 days',
      tags: ['high-protein', 'batch-friendly'],
      is_batch_prep: true,
      is_favorite: false,
      is_disliked: false,
      calories_per_serving: 285,
      protein_g: 38,
      carbs_g: 8,
      fat_g: 12,
      veggie_servings: 0.5,
      prep_session_id: 'prep-session-1',
    });
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function renderWithProviders(recipeId: string) {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/recipe/${recipeId}`]}>
        <Routes>
          <Route path="/recipe/:id" element={<RecipeDetailScreen />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('RecipeDetailScreen', () => {
  it('renders recipe title', async () => {
    renderWithProviders('test-recipe-1');
    
    await waitFor(() => {
      expect(screen.getByText('Tandoori Chicken')).toBeInTheDocument();
    });
  });

  it('renders authentic name when provided', async () => {
    renderWithProviders('test-recipe-1');
    
    await waitFor(() => {
      expect(screen.getByText('Tandoori Murgh')).toBeInTheDocument();
    });
  });

  it('renders macro information', async () => {
    renderWithProviders('test-recipe-1');
    
    await waitFor(() => {
      expect(screen.getByText('285')).toBeInTheDocument();
      expect(screen.getByText('38g')).toBeInTheDocument();
      expect(screen.getByText('8g')).toBeInTheDocument();
      expect(screen.getByText('12g')).toBeInTheDocument();
    });
  });

  it('renders ingredients with correct quantities for 1500 portion', async () => {
    renderWithProviders('test-recipe-1');
    
    await waitFor(() => {
      expect(screen.getByText('300g')).toBeInTheDocument();
      expect(screen.getByText('100g')).toBeInTheDocument();
    });
  });

  it('renders serving instructions', async () => {
    renderWithProviders('test-recipe-1');
    
    await waitFor(() => {
      expect(screen.getByText('Reheat in oven')).toBeInTheDocument();
      expect(screen.getByText('Serve with rice')).toBeInTheDocument();
    });
  });

  it('renders storage notes', async () => {
    renderWithProviders('test-recipe-1');
    
    await waitFor(() => {
      expect(screen.getByText(/Store in fridge/)).toBeInTheDocument();
    });
  });

  it('renders prep session CTA when prep_session_id exists', async () => {
    renderWithProviders('test-recipe-1');
    
    await waitFor(() => {
      expect(screen.getByText('View in prep guide')).toBeInTheDocument();
    });
  });
});
