import { render, screen } from '@testing-library/react';
import MacroRingRow from './MacroRingRow';
import { dashboardData } from '../fixtures/dashboard';

describe('MacroRingRow', () => {
  it('renders all four macro labels and correct calorie summary', () => {
    render(<MacroRingRow data={dashboardData} />);

    // Assert all four macro labels are visible
    expect(screen.getByText('Protein')).toBeInTheDocument();
    expect(screen.getByText('Carbs')).toBeInTheDocument();
    expect(screen.getByText('Fat')).toBeInTheDocument();
    expect(screen.getByText('Veggies')).toBeInTheDocument();

    // Assert calorie summary line
    expect(screen.getByText('890 / 1500 kcal')).toBeInTheDocument();
  });
});
