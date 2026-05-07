import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import Dashboard from '../Dashboard';
import { getCurrentPlan, generatePlan } from '../../api/plans';
import type { PlanOut, PlanData } from '../../api/plans';

// Mock the API module
vi.mock('../../api/plans', () => ({
  getCurrentPlan: vi.fn(),
  generatePlan: vi.fn(),
  approvePlan: vi.fn(),
}));

// Mock react-router-dom's useNavigate
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: vi.fn(() => vi.fn()),
  };
});

// Mock EventSource for SSE tests
class MockEventSource {
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  close = vi.fn();
  constructor() {
    // Simulate SSE events in tests
  }
  simulateMessage(data: string) {
    if (this.onmessage) this.onmessage({ data });
  }
  simulateError() {
    if (this.onerror) this.onerror();
  }
}

// Test wrapper with QueryClient and Router
function renderWithQueryClient(ui: React.ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    </MemoryRouter>
  );
}

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Test 1: Loading state shows skeletons
  it('renders skeletons when loading', () => {
    (getCurrentPlan as vi.Mock).mockImplementationOnce(
      () => new Promise(() => {}) // Never resolves (loading)
    );
    renderWithQueryClient(<Dashboard />);
    
    // Skeleton elements should be present
    expect(document.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
    expect(screen.queryByText(/today's meals/i)).toBeInTheDocument();
  });

  // Test 2: 404 error shows CTA
  it('shows "Generate this week\'s plan" CTA when 404 error', async () => {
    (getCurrentPlan as vi.Mock).mockRejectedValueOnce(new Error('GET /api/plans/current failed: 404'));
    renderWithQueryClient(<Dashboard />);
    
    await waitFor(() => {
      expect(screen.getByText(/no plan yet/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /generate this week's plan/i })).toBeInTheDocument();
    });
  });

  // Test 3: Fixture plan renders today's meals with dine-out handling
  it('renders today\'s meals and handles dine-out slots correctly', async () => {
    const todayWeekday = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][
      new Date().getDay()
    ];
    const mockPlanData: PlanData = {
      [todayWeekday]: {
        breakfast: { recipe_id: 'recipe-1', meal_type: 'day-of' },
        lunch: { recipe_id: 'recipe-2', meal_type: 'batch-sun' },
        dinner: { meal_type: 'dine-out' },
      },
    };
    const mockPlan: PlanOut = {
      id: 'plan-1',
      household_id: 'household-1',
      week_start: '2025-05-04',
      status: 'approved',
      plan_data: mockPlanData,
      created_at: '2025-05-04T00:00:00Z',
      updated_at: '2025-05-04T00:00:00Z',
    };
    (getCurrentPlan as vi.Mock).mockResolvedValueOnce(mockPlan);
    
    renderWithQueryClient(<Dashboard />);
    
    await waitFor(() => {
      // Should show regular meals with recipe IDs
      expect(screen.getByText(/recipe-1/i)).toBeInTheDocument();
      expect(screen.getByText(/recipe-2/i)).toBeInTheDocument();
    });

    // Dine-out meal should show "Dining out tonight" title
    expect(screen.getByText(/dining out tonight/i)).toBeInTheDocument();
    
    // Dine-out meal should render MealTypeBadge with "Dine out" label
    expect(screen.getByText('Dine out')).toBeInTheDocument();
    
    // Dine-out meal should NOT show macros (kcal text)
    const dineOutSection = screen.getByText(/dining out tonight/i).closest('div');
    expect(dineOutSection).toBeInTheDocument();
    // Check that the dine-out section doesn't contain macro information
    expect(dineOutSection?.textContent).not.toMatch(/\\d+ kcal/);
  });

  // Test 4: Grocery list entry point navigates to correct route
  it('navigates to grocery list when row is clicked with mock plan loaded', async () => {
    const todayWeekday = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][
      new Date().getDay()
    ];
    const mockPlan: PlanOut = {
      id: 'test-plan-123',
      household_id: 'household-1',
      week_start: '2025-05-04',
      status: 'approved',
      plan_data: {
        [todayWeekday]: {
          breakfast: { recipe_id: 'recipe-1', meal_type: 'day-of' },
        },
      },
      created_at: '2025-05-04T00:00:00Z',
      updated_at: '2025-05-04T00:00:00Z',
    };
    (getCurrentPlan as vi.Mock).mockResolvedValueOnce(mockPlan);

    renderWithQueryClient(<Dashboard />);

    // Get the navigate function returned by useNavigate (first call result)
    const useNavigateMock = vi.mocked(useNavigate);
    const mockNavigate = useNavigateMock.mock.results[0].value;

    // Wait for dashboard to load with plan
    await waitFor(() => {
      expect(screen.getByText(/grocery list/i)).toBeInTheDocument();
    });

    // Find and click the grocery row
    const groceryRow = screen.getByText('Grocery list').closest('div[role="button"]');
    expect(groceryRow).toBeInTheDocument();
    fireEvent.click(groceryRow!);

    // Assert navigation to correct grocery route
    expect(mockNavigate).toHaveBeenCalledWith('/grocery/test-plan-123');
  });
});
