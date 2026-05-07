import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CategorySection from '../CategorySection';
import GroceryItem, { GroceryItemData } from '../GroceryItem';

// Setup React Query test client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

// Custom render with providers
const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
};

describe('CategorySection', () => {
  const mockItems: GroceryItemData[] = [
    { id: 'item-1', name: 'Chicken thighs', subtitle: 'Sun prep', quantity: '500g', checked: false },
    { id: 'item-2', name: 'Paneer', subtitle: 'Wed prep', quantity: '200g', checked: true },
  ];

  const mockOnToggleItem = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
    mockOnToggleItem.mockClear();
  });

  it('renders category header with correct details', () => {
    renderWithProviders(
      <CategorySection
        title="Protein"
        count={2}
        color="var(--color-protein)"
        items={mockItems}
        onToggleItem={mockOnToggleItem}
      />
    );

    expect(screen.getByText('Protein')).toBeInTheDocument();
    expect(screen.getByText('2 items')).toBeInTheDocument();
  });

  it('renders all items in the category', () => {
    renderWithProviders(
      <CategorySection
        title="Protein"
        count={2}
        color="var(--color-protein)"
        items={mockItems}
        onToggleItem={mockOnToggleItem}
      />
    );

    expect(screen.getByText('Chicken thighs')).toBeInTheDocument();
    expect(screen.getByText('Paneer')).toBeInTheDocument();
  });

  it('calls onToggleItem when an item is clicked', () => {
    renderWithProviders(
      <CategorySection
        title="Protein"
        count={2}
        color="var(--color-protein)"
        items={mockItems}
        onToggleItem={mockOnToggleItem}
      />
    );

    const chickenItem = screen.getByText('Chicken thighs').closest('[role="checkbox"]');
    fireEvent.click(chickenItem!);

    expect(mockOnToggleItem).toHaveBeenCalledTimes(1);
    expect(mockOnToggleItem).toHaveBeenCalledWith('item-1');
  });
});
