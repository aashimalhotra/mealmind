import { render, screen } from '@testing-library/react';
import WeekStrip from './WeekStrip';

describe('WeekStrip', () => {
  const weekDays = [
    { date: '2024-11-04', dayShort: 'Mon' as const, dayNum: 4, isToday: true, isPrepDay: false, isDineOut: false },
    { date: '2024-11-05', dayShort: 'Tue' as const, dayNum: 5, isToday: false, isPrepDay: false, isDineOut: false },
    { date: '2024-11-06', dayShort: 'Wed' as const, dayNum: 6, isToday: false, isPrepDay: true, isDineOut: false },
    { date: '2024-11-07', dayShort: 'Thu' as const, dayNum: 7, isToday: false, isPrepDay: false, isDineOut: false },
    { date: '2024-11-08', dayShort: 'Fri' as const, dayNum: 8, isToday: false, isPrepDay: false, isDineOut: true },
    { date: '2024-11-09', dayShort: 'Sat' as const, dayNum: 9, isToday: false, isPrepDay: false, isDineOut: false },
    { date: '2024-11-10', dayShort: 'Sun' as const, dayNum: 10, isToday: false, isPrepDay: false, isDineOut: true },
  ];

  it('renders all 7 days', () => {
    render(<WeekStrip days={weekDays} />);

    expect(screen.getByText('Mon')).toBeInTheDocument();
    expect(screen.getByText('Tue')).toBeInTheDocument();
    expect(screen.getByText('Wed')).toBeInTheDocument();
    expect(screen.getByText('Thu')).toBeInTheDocument();
    expect(screen.getByText('Fri')).toBeInTheDocument();
    expect(screen.getByText('Sat')).toBeInTheDocument();
    expect(screen.getByText('Sun')).toBeInTheDocument();
  });

  it('Monday has primary background (isToday)', () => {
    const { container } = render(<WeekStrip days={weekDays} />);

    const pills = container.querySelectorAll('[class*="min-w"]');
    const mondayPill = pills[0];
    expect(mondayPill).toHaveClass('bg-primary');
  });

  it('Wednesday has prep-day green dot', () => {
    const { container } = render(<WeekStrip days={weekDays} />);

    const pills = container.querySelectorAll('[class*="min-w"]');
    const wednesdayPill = pills[2]; // Wed is 3rd item (index 2)

    const dot = wednesdayPill.querySelector('[class*="bg-[var(--color-success)]"]');
    expect(dot).toBeInTheDocument();
  });

  it('Friday has gold styling for dine-out', () => {
    const { container } = render(<WeekStrip days={weekDays} />);

    const fridayText = screen.getByText('Fri');
    expect(fridayText).toHaveClass('text-[var(--color-accent-gold)]');
    expect(fridayText).toHaveClass('font-[var(--font-weight-medium)]');
  });

  it('Sunday has gold styling for dine-out', () => {
    const { container } = render(<WeekStrip days={weekDays} />);

    const sundayText = screen.getByText('Sun');
    expect(sundayText).toHaveClass('text-[var(--color-accent-gold)]');
    expect(sundayText).toHaveClass('font-[var(--font-weight-medium)]');
  });

  it('dine-out days have gold bar indicator (18x6) instead of dot', () => {
    const { container } = render(<WeekStrip days={weekDays} />);

    const pills = container.querySelectorAll('[class*="min-w"]');
    const fridayPill = pills[4]; // Fri is 5th item (index 4)

    const goldBar = fridayPill.querySelector('[class*="w-[18px]"]');
    expect(goldBar).toBeInTheDocument();
    expect(goldBar).toHaveClass('bg-[var(--color-accent-gold)]');
  });
});
