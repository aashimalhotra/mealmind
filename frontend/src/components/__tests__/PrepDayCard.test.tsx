import { test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PrepDayCard from '../PrepDayCard';

test('renders PrepDayCard with fixture content', () => {
  const fixture = {
    dayLabel: 'Prep day — Wednesday',
    summary: 'Spiced ground meat + creamy spinach + quinoa pilaf',
    durationLabel: '~1.5 hrs · covers Thu–Sat',
  };

  const { container } = render(<PrepDayCard {...fixture} />);

  // Assert all text content appears
  expect(screen.getByText(fixture.dayLabel)).toBeInTheDocument();
  expect(screen.getByText(fixture.summary)).toBeInTheDocument();
  expect(screen.getByText(fixture.durationLabel)).toBeInTheDocument();

  // Assert green left border via class presence (CSS not loaded in JSDOM)
  const card = container.firstChild as HTMLElement;
  expect(card.classList.contains('border-l-[3px]')).toBe(true);
  expect(card.classList.contains('border-l-success')).toBe(true);
});

test('PrepDayCard calls onClick when provided', () => {
  const onClick = vitest.fn();
  render(
    <PrepDayCard
      dayLabel="Test Day"
      summary="Test Summary"
      durationLabel="Test Duration"
      onClick={onClick}
    />
  );

  const card = screen.getByRole('button');
  card.click();
  expect(onClick).toHaveBeenCalledTimes(1);
});
