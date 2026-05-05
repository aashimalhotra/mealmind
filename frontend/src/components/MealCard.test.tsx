import { render, screen } from '@testing-library/react';
import MealCard from './MealCard';

describe('MealCard', () => {
  const mockMacros = { kcal: 320, p: 18, c: 28, f: 16 };

  it('renders breakfast meal with title and macros visible', () => {
    render(
      <MealCard
        slot="breakfast"
        time="8:00 AM"
        title="Chickpea flour crepes + mint chutney"
        macros={mockMacros}
      />
    );

    expect(screen.getByText('Chickpea flour crepes + mint chutney')).toBeInTheDocument();
    expect(screen.getByText('320 kcal · 18g P · 28g C · 16g F')).toBeInTheDocument();
    expect(screen.getByText('Breakfast')).toBeInTheDocument();
    expect(screen.getByText('8:00 AM')).toBeInTheDocument();
  });

  it('renders dimmed dinner with opacity-60 class', () => {
    const { container } = render(
      <MealCard
        slot="dinner"
        time="7:00 PM"
        title="Spiced cauliflower & potato + flatbread"
        macros={{ kcal: 410, p: 14, c: 48, f: 18 }}
        dimmed={true}
      />
    );

    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass('opacity-60');
  });

  it('renders dine-out with no macros', () => {
    render(
      <MealCard
        slot="dinner"
        time="7:00 PM"
        title="Friday"
        macros={mockMacros}
        dineOut={true}
      />
    );

    expect(screen.getByText('Dine out')).toBeInTheDocument();
    expect(screen.getByText('Friday')).toBeInTheDocument();
    expect(screen.queryByText(/kcal/)).not.toBeInTheDocument();
  });
});
