import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import PrepGuide from '../PrepGuide';
import { getPrepSession, completePrepStep } from '../../api/prep';

// Mock API functions
jest.mock('../../api/prep');

const mockGetPrepSession = getPrepSession as jest.MockedFunction<typeof getPrepSession>;
const mockCompletePrepStep = completePrepStep as jest.MockedFunction<typeof completePrepStep>;

describe('PrepGuide', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  const mockSession = {
    id: 'session-1',
    session_id: 'session-1',
    title: 'Batch cook guide',
    subtitle: 'Sun prep — covers Mon–Wed',
    est_total_min: 90,
    dishes: [
      { id: 'dish-1', name: 'Tandoori chicken', color: '#C45B28', type: 'Protein' },
      { id: 'dish-2', name: 'Cumin rice', color: '#C49B28', type: 'Grain' },
    ],
    steps: [
      {
        id: 'step-1',
        step_number: 1,
        title: 'Marinate chicken and refrigerate',
        description: 'Mix yogurt, tandoori masala, and chicken. Refrigerate for 30 mins.',
        duration_min: 30,
        is_passive: true,
        completed: false,
        dish_name: 'Tandoori chicken',
        dish_color: '#C45B28',
      },
      {
        id: 'step-2',
        step_number: 2,
        title: 'Start the lentil soup',
        description: 'Rinse lentils. In a pot, heat oil and add cumin seeds, onion, garlic, turmeric, and tomato.',
        duration_min: 25,
        is_passive: true,
        completed: false,
        dish_name: 'Lentil soup',
        dish_color: '#4A8C5C',
      },
    ],
    completed_steps_count: 0,
    background_timers: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetPrepSession.mockResolvedValue(mockSession);
  });

  const renderComponent = (sessionId = 'session-1') => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[`/prep/${sessionId}`]}>
          <Routes>
            <Route path="/prep/:sessionId" element={<PrepGuide />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  it('renders loading state initially', () => {
    renderComponent();
    expect(screen.getByText('Loading prep guide...')).toBeInTheDocument();
  });

  it('renders active step and dish chips after loading', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('Batch cook guide')).toBeInTheDocument();
    });
    expect(screen.getByText('Tandoori chicken')).toBeInTheDocument();
    expect(screen.getByText('Marinate chicken and refrigerate')).toBeInTheDocument();
  });

  it('calls completePrepStep when Next is clicked', async () => {
    const user = require('@testing-library/user-event').default;
    mockCompletePrepStep.mockResolvedValue({
      ...mockSession.steps[0],
      completed: true,
    });

    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('Marinate chicken and refrigerate')).toBeInTheDocument();
    });

    const nextButton = screen.getByText('Done');
    await user.click(nextButton);

    await waitFor(() => {
      expect(mockCompletePrepStep).toHaveBeenCalledWith('session-1', 0);
    });
  });

  it('shows error state when fetch fails', async () => {
    mockGetPrepSession.mockRejectedValue(new Error('Failed to fetch'));
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('Failed to load prep guide. Please try again.')).toBeInTheDocument();
    });
  });
});
