import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import PlanReview from '../PlanReview';
import { getPlan, approvePlan } from '../../api/plans';
import type { PlanOut, PlanData } from '../../api/plans';

// Mock navigate
const mockNavigate = vi.fn();

// Mock only useNavigate, but keep real useParams via MemoryRouter
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock API module
vi.mock('../../api/plans', () => ({
  getPlan: vi.fn(),
  approvePlan: vi.fn(),
}));

// Test wrapper with QueryClient and Router (real routing, real useParams)
function renderWithProviders(ui: React.ReactNode, initialRoute = '/plan/review/test-plan-id') {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialRoute]}>
        <Routes>
          <Route path="/plan/review/:id" element={ui} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

// Fixture plan data with 7 days, 3 meals each = 21 cells
const createFixturePlan = (): PlanOut => {
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
  const planData: PlanData = {};

  days.forEach((day) => {
    planData[day] = {
      breakfast: { recipe_id: `recipe-${day}-breakfast`, meal_type: 'day-of' },
      lunch: { recipe_id: `recipe-${day}-lunch`, meal_type: 'batch-sun' },
      dinner: { meal_type: 'dine-out' },
    };
  });

  return {
    id: 'test-plan-id',
    household_id: 'household-1',
    week_start: '2025-05-04',
    status: 'draft',
    plan_data: planData,
    created_at: '2025-05-04T00:00:00Z',
    updated_at: '2025-05-04T00:00:00Z',
  };
};

describe('PlanReview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    (getPlan as vi.Mock).mockImplementationOnce(() => new Promise(() => {})); // Never resolves
    renderWithProviders(<PlanReview />);
    
    // Spinner should be present
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders all 21 cells (7 days × 3 meals) with fixture plan', async () => {
    const fixturePlan = createFixturePlan();
    (getPlan as vi.Mock).mockResolvedValueOnce(fixturePlan);
    
    renderWithProviders(<PlanReview />);
    
    await waitFor(() => {
      // Check for day labels (7 days)
      expect(screen.getByText('Mon')).toBeInTheDocument();
      expect(screen.getByText('Tue')).toBeInTheDocument();
      expect(screen.getByText('Wed')).toBeInTheDocument();
      expect(screen.getByText('Thu')).toBeInTheDocument();
      expect(screen.getByText('Fri')).toBeInTheDocument();
      expect(screen.getByText('Sat')).toBeInTheDocument();
      expect(screen.getByText('Sun')).toBeInTheDocument();

      // Check for meal slot labels (3 columns)
      expect(screen.getByText('Breakfast')).toBeInTheDocument();
      expect(screen.getByText('Lunch')).toBeInTheDocument();
      expect(screen.getByText('Dinner')).toBeInTheDocument();

      // Check for recipe references (14 cells with recipes: 7 days × 2 meals)
      // Each recipe cell shows "Recipe [first 6 chars]…" from the MiniMealCard
      expect(screen.getAllByText(/Recipe recipe/).length).toBe(14);
      // Check for dine-out cells (7 cells)
      expect(screen.getAllByText('Dine out').length).toBe(7);
    });
  });

  it('clicking "Approve & save" calls approvePlan and navigates to /', async () => {
    const fixturePlan = createFixturePlan();
    (getPlan as vi.Mock).mockResolvedValueOnce(fixturePlan);
    (approvePlan as vi.Mock).mockResolvedValueOnce({ ...fixturePlan, status: 'approved' });
    
    const user = userEvent.setup();
    renderWithProviders(<PlanReview />);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /approve & save/i })).toBeInTheDocument();
    });

    const approveButton = screen.getByRole('button', { name: /approve & save/i });
    await user.click(approveButton);

    await waitFor(() => {
      // Check approvePlan was called with correct id
      expect(approvePlan).toHaveBeenCalledWith('test-plan-id');
      // Check navigation occurred
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('"Tweak (chat)" button is disabled', async () => {
    const fixturePlan = createFixturePlan();
    (getPlan as vi.Mock).mockResolvedValueOnce(fixturePlan);
    
    renderWithProviders(<PlanReview />);
    
    await waitFor(() => {
      const tweakButton = screen.getByRole('button', { name: /tweak \(chat\)/i });
      expect(tweakButton).toBeDisabled();
    });
  });
});