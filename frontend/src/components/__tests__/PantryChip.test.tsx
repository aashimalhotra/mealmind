import { render, screen, fireEvent } from '@testing-library/react';
import PantryChip from '../PantryChip';

describe('PantryChip', () => {
  const mockOnMoveToMainList = vi.fn();

  beforeEach(() => {
    mockOnMoveToMainList.mockClear();
  });

  it('renders label correctly', () => {
    render(<PantryChip label="Tandoori blend" itemId="pantry-1" onMoveToMainList={mockOnMoveToMainList} />);

    expect(screen.getByText('Tandoori blend')).toBeInTheDocument();
  });

  it('calls onMoveToMainList with itemId when clicked', () => {
    render(<PantryChip label="Cumin seeds" itemId="pantry-2" onMoveToMainList={mockOnMoveToMainList} />);

    const chip = screen.getByLabelText('Add Cumin seeds to grocery list');
    fireEvent.click(chip);

    expect(mockOnMoveToMainList).toHaveBeenCalledTimes(1);
    expect(mockOnMoveToMainList).toHaveBeenCalledWith('pantry-2');
  });
});
