import { render, screen, waitFor } from '@testing-library/react';
import MacroRing from './MacroRing';

describe('MacroRing', () => {
  it('renders with correct percentage and dashoffset for protein macro', async () => {
    render(<MacroRing label="Protein" current={81} target={113} unit="g" color="#C45B28" />);

    // Assert center text shows 72%
    expect(screen.getByText('72%')).toBeInTheDocument();

    // Assert label is visible
    expect(screen.getByText('Protein')).toBeInTheDocument();

    // Assert current/target shows correctly
    expect(screen.getByText('81 / 113g')).toBeInTheDocument();

    // Assert foreground circle has correct stroke-dashoffset
    const circumference = 175.93;
    const ratio = 81 / 113;
    const expectedOffset = circumference * (1 - ratio);

    const foregroundCircle = document.querySelector('circle[stroke="#C45B28"]');
    expect(foregroundCircle).toBeInTheDocument();

    await waitFor(() => {
      expect(foregroundCircle?.getAttribute('stroke-dashoffset')).toBeCloseTo(expectedOffset, 2);
    });
  });

  it('uses centerText prop when provided', () => {
    render(
      <MacroRing
        label="Veggies"
        current={2}
        target={5}
        unit="srv"
        color="#6B8C3A"
        centerText="2/5"
      />
    );

    expect(screen.getByText('2/5')).toBeInTheDocument();
    expect(screen.queryByText('40%')).not.toBeInTheDocument();
  });
});
