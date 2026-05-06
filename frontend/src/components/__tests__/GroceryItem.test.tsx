import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import GroceryItem from '../GroceryItem';
import * as groceryApi from '../../api/grocery';

// Mock the grocery API module
vi.mock('../../api/grocery');

describe('GroceryItem', () => {
  const mockItem = {
    id: 'item-1',
    name: 'Chicken thighs, boneless',
    subtitle: 'Sun prep — Tandoori chicken',
    quantity: '500g',
    checked: false,
  };

  let queryClient: QueryClient;
  let mockToggleGroceryItemChecked: vi.MockedFunction<typeof groceryApi.toggleGroceryItemChecked>;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    mockToggleGroceryItemChecked = vi.spyOn(groceryApi, 'toggleGroceryItemChecked');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderWithQueryClient = (component: React.ReactNode) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    );
  };

  it('renders item correctly with unchecked state', () => {
    renderWithQueryClient(<GroceryItem item={mockItem} />);

    expect(screen.getByText('Chicken thighs, boneless')).toBeInTheDocument();
    expect(screen.getByText('Sun prep — Tandoori chicken')).toBeInTheDocument();
    expect(screen.getByText('500g')).toBeInTheDocument();
    // Buttons with role="checkbox" are selected by getByRole('checkbox')
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toHaveAttribute('aria-checked', 'false');
  });

  it('renders item correctly with checked state (strikethrough, dimmed)', () => {
    const checkedItem = { ...mockItem, checked: true };
    renderWithQueryClient(<GroceryItem item={checkedItem} />);

    const nameElement = screen.getByText('Chicken thighs, boneless');
    expect(nameElement).toHaveStyle('text-decoration: line-through');
    expect(nameElement).toHaveStyle('color: var(--color-text-tertiary)');

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toHaveAttribute('aria-checked', 'true');
  });

  it('calls API to toggle checked state on click (success case)', async () => {
    mockToggleGroceryItemChecked.mockResolvedValue({ ...mockItem, checked: true });

    renderWithQueryClient(<GroceryItem item={mockItem} />);

    const itemContainer = screen.getByRole('checkbox');
    fireEvent.click(itemContainer);

    await waitFor(() => {
      expect(mockToggleGroceryItemChecked).toHaveBeenCalledTimes(1);
      expect(mockToggleGroceryItemChecked).toHaveBeenCalledWith('item-1', true);
    });
  });

  it('optimistically updates cache and rolls back on 500 error', async () => {
    // Mock a 500 error response
    mockToggleGroceryItemChecked.mockRejectedValue(new Error('500 Server Error'));

    // Pre-populate query cache with initial data
    const initialCache = {
      categories: [
        {
          title: 'Meat',
          count: 1,
          color: 'red',
          items: [mockItem],
        },
      ],
      pantry_items: [],
    };
    queryClient.setQueryData(['groceryList'], initialCache);

    renderWithQueryClient(<GroceryItem item={mockItem} queryKey={['groceryList']} />);

    const itemContainer = screen.getByRole('checkbox');
    expect(itemContainer).toHaveAttribute('aria-checked', 'false');

    // Click to toggle
    fireEvent.click(itemContainer);

    // Wait for optimistic update in cache
    await waitFor(() => {
      const optimisticCache = queryClient.getQueryData(['groceryList']) as any;
      expect(optimisticCache.categories[0].items[0].checked).toBe(true);
    });

    // Wait for error to occur and rollback
    await waitFor(() => {
      const rolledBackCache = queryClient.getQueryData(['groceryList']) as any;
      expect(rolledBackCache.categories[0].items[0].checked).toBe(false);
    });

    // Verify API was called once
    expect(mockToggleGroceryItemChecked).toHaveBeenCalledTimes(1);
    expect(mockToggleGroceryItemChecked).toHaveBeenCalledWith('item-1', true);
  });

  it('calls toggle once when Enter key is pressed', async () => {
    mockToggleGroceryItemChecked.mockResolvedValue({ ...mockItem, checked: true });
    renderWithQueryClient(<GroceryItem item={mockItem} />);

    const itemContainer = screen.getByRole('checkbox');
    // Buttons natively handle Enter key to trigger click events
    fireEvent.keyDown(itemContainer, { key: 'Enter' });

    await waitFor(() => {
      expect(mockToggleGroceryItemChecked).toHaveBeenCalledTimes(1);
    });
  });
});
