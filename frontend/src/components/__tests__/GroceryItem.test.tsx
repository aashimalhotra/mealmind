import { render, screen, fireEvent } from '@testing-library/react';
import GroceryItem from '../GroceryItem';

describe('GroceryItem', () => {
  const mockItem = {
    id: 'item-1',
    name: 'Chicken thighs, boneless',
    subtitle: 'Sun prep — Tandoori chicken',
    quantity: '500g',
    checked: false,
  };

  const mockOnToggle = vi.fn();

  beforeEach(() => {
    mockOnToggle.mockClear();
  });

  it('renders item correctly with unchecked state', () => {
    render(<GroceryItem item={mockItem} onToggle={mockOnToggle} />);

    expect(screen.getByText('Chicken thighs, boneless')).toBeInTheDocument();
    expect(screen.getByText('Sun prep — Tandoori chicken')).toBeInTheDocument();
    expect(screen.getByText('500g')).toBeInTheDocument();
    // Checkbox should be unchecked (no success background)
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toHaveAttribute('aria-checked', 'false');
  });

  it('renders item correctly with checked state (strikethrough, dimmed)', () => {
    const checkedItem = { ...mockItem, checked: true };
    render(<GroceryItem item={checkedItem} onToggle={mockOnToggle} />);

    const nameElement = screen.getByText('Chicken thighs, boneless');
    expect(nameElement).toHaveStyle('text-decoration: line-through');
    expect(nameElement).toHaveStyle('color: var(--color-text-tertiary)');

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toHaveAttribute('aria-checked', 'true');
  });

  it('calls onToggle with item id when clicked', () => {
    render(<GroceryItem item={mockItem} onToggle={mockOnToggle} />);

    const itemContainer = screen.getByRole('checkbox');
    fireEvent.click(itemContainer);

    expect(mockOnToggle).toHaveBeenCalledTimes(1);
    expect(mockOnToggle).toHaveBeenCalledWith('item-1');
  });

  it('calls onToggle when Enter key is pressed', () => {
    render(<GroceryItem item={mockItem} onToggle={mockOnToggle} />);

    const itemContainer = screen.getByRole('checkbox');
    fireEvent.keyDown(itemContainer, { key: 'Enter' });

    expect(mockOnToggle).toHaveBeenCalledTimes(1);
    expect(mockOnToggle).toHaveBeenCalledWith('item-1');
  });
});
