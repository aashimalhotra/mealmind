import { render, screen, fireEvent } from '@testing-library/react';
import Dashboard from '../Dashboard';

describe('Dashboard', () => {
  it('renders all four macro ring labels', () => {
    render(<Dashboard />);

    expect(screen.getByText('Protein')).toBeInTheDocument();
    expect(screen.getByText('Carbs')).toBeInTheDocument();
    expect(screen.getByText('Fat')).toBeInTheDocument();
    expect(screen.getByText('Veggies')).toBeInTheDocument();
  });

  it('renders three meal titles', () => {
    render(<Dashboard />);

    expect(screen.getByText('Chickpea flour crepes + mint chutney')).toBeInTheDocument();
    expect(screen.getByText('Tandoori chicken + cumin rice + lentil soup')).toBeInTheDocument();
    expect(screen.getByText('Spiced cauliflower & potato + flatbread + yogurt dip')).toBeInTheDocument();
  });

  it('displays 1500 kcal data by default', () => {
    render(<Dashboard />);

    expect(screen.getByText('890 / 1500 kcal')).toBeInTheDocument();
  });

  it('toggling to 1800 changes the kcal line', () => {
    render(<Dashboard />);

    // Verify initial state shows 1500 data
    expect(screen.getByText('890 / 1500 kcal')).toBeInTheDocument();

    // Click the 1800 toggle button
    const toggle1800 = screen.getByText('1800');
    fireEvent.click(toggle1800);

    // Verify it now shows 1800 data
    expect(screen.getByText('1050 / 1800 kcal')).toBeInTheDocument();
    expect(screen.queryByText('890 / 1500 kcal')).not.toBeInTheDocument();
  });

  it('toggling back to 1500 restores 1500 data', () => {
    render(<Dashboard />);

    // Switch to 1800
    const toggle1800 = screen.getByText('1800');
    fireEvent.click(toggle1800);
    expect(screen.getByText('1050 / 1800 kcal')).toBeInTheDocument();

    // Switch back to 1500
    const toggle1500 = screen.getByText('1500');
    fireEvent.click(toggle1500);
    expect(screen.getByText('890 / 1500 kcal')).toBeInTheDocument();
  });
});
