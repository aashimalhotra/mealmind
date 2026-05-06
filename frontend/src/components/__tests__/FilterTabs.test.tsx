import { render, screen, fireEvent } from '@testing-library/react';
import FilterTabs from '../FilterTabs';

describe('FilterTabs', () => {
  const mockOnFilterChange = vi.fn();

  beforeEach(() => {
    mockOnFilterChange.mockClear();
  });

  it('renders all filter tabs', () => {
    render(<FilterTabs activeFilter="all" onFilterChange={mockOnFilterChange} />);

    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('Sun prep')).toBeInTheDocument();
    expect(screen.getByText('Wed prep')).toBeInTheDocument();
    expect(screen.getByText('Day-of')).toBeInTheDocument();
  });

  it('highlights active filter tab', () => {
    render(<FilterTabs activeFilter="sun-prep" onFilterChange={mockOnFilterChange} />);

    const sunPrepTab = screen.getByText('Sun prep').closest('button');
    expect(sunPrepTab).toHaveClass('bg-[var(--color-primary)]');
    expect(sunPrepTab).toHaveAttribute('aria-pressed', 'true');

    const allTab = screen.getByText('All').closest('button');
    expect(allTab).not.toHaveClass('bg-[var(--color-primary)]');
    expect(allTab).toHaveAttribute('aria-pressed', 'false');
  });

  it('calls onFilterChange when a tab is clicked', () => {
    render(<FilterTabs activeFilter="all" onFilterChange={mockOnFilterChange} />);

    const wedPrepTab = screen.getByText('Wed prep').closest('button');
    fireEvent.click(wedPrepTab!);

    expect(mockOnFilterChange).toHaveBeenCalledTimes(1);
    expect(mockOnFilterChange).toHaveBeenCalledWith('wed-prep');
  });
});
