import { render, screen, fireEvent } from '@testing-library/react';
import CategorySection from '../CategorySection';
import GroceryItem, { GroceryItemData } from '../GroceryItem';

describe('CategorySection', () => {
  const mockItems: GroceryItemData[] = [
    { id: 'item-1', name: 'Chicken thighs', subtitle: 'Sun prep', quantity: '500g', checked: false },
    { id: 'item-2', name: 'Paneer', subtitle: 'Wed prep', quantity: '200g', checked: true },
  ];

  const mockOnToggleItem = vi.fn();

  beforeEach(() => {
    mockOnToggleItem.mockClear();
  });

  it('renders category header with correct details', () => {
    render(
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
    render(
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
    render(
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
