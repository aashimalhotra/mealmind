import { act, renderHook } from '@testing-library/react';
import { vi } from 'vitest';
import { useBackgroundTimers } from '../useBackgroundTimers';

// Mock Date.now() to control time
const mockNow = (timestamp: number) => {
  vi.spyOn(Date, 'now').mockReturnValue(timestamp);
};

describe('useBackgroundTimers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('adds timers correctly', () => {
    mockNow(1000000);
    const { result } = renderHook(() => useBackgroundTimers());

    act(() => {
      result.current.addTimer({
        id: '1',
        step_title: 'Chicken marinating',
        dish_color: '#C45B28',
        started_at_step: 1,
        durationSec: 1800, // 30 min
        startTimestamp: Date.now(),
      });
    });

    expect(result.current.timers).toHaveLength(1);
    expect(result.current.timers[0].id).toBe('1');
  });

  it('removes timers correctly', () => {
    mockNow(1000000);
    const { result } = renderHook(() => useBackgroundTimers());

    act(() => {
      result.current.addTimer({
        id: '1',
        step_title: 'Chicken marinating',
        dish_color: '#C45B28',
        started_at_step: 1,
        durationSec: 1800,
        startTimestamp: Date.now(),
      });
    });

    act(() => {
      result.current.removeTimer('1');
    });

    expect(result.current.timers).toHaveLength(0);
  });

  it('sorts timers by remaining time ascending', () => {
    mockNow(1000000);
    const { result } = renderHook(() => useBackgroundTimers());

    // Add 3 timers with different start times
    act(() => {
      // Timer 1: started 1000s ago, duration 1800s → remaining 800s
      result.current.addTimer({
        id: '1',
        step_title: 'Timer 1',
        dish_color: '#C45B28',
        started_at_step: 1,
        durationSec: 1800,
        startTimestamp: Date.now() - 1000 * 1000,
      });

      // Timer 2: started 100s ago, duration 1800s → remaining 1700s
      result.current.addTimer({
        id: '2',
        step_title: 'Timer 2',
        dish_color: '#C49B28',
        started_at_step: 2,
        durationSec: 1800,
        startTimestamp: Date.now() - 100 * 1000,
      });

      // Timer 3: started 500s ago, duration 1800s → remaining 1300s
      result.current.addTimer({
        id: '3',
        step_title: 'Timer 3',
        dish_color: '#4A8C5C',
        started_at_step: 3,
        durationSec: 1800,
        startTimestamp: Date.now() - 500 * 1000,
      });
    });

    const sorted = result.current.getTimersWithRemaining(Date.now());

    // Sorted by remaining time ascending: 800, 1300, 1700
    expect(sorted[0].id).toBe('1');
    expect(sorted[1].id).toBe('3');
    expect(sorted[2].id).toBe('2');
    expect(sorted[0].remainingSec).toBe(800);
    expect(sorted[1].remainingSec).toBe(1300);
    expect(sorted[2].remainingSec).toBe(1700);
  });

  it('marks timers as complete when remaining time reaches 0', () => {
    mockNow(1000000);
    const { result } = renderHook(() => useBackgroundTimers());

    act(() => {
      // Timer with duration 60s, started 60s ago → remaining 0
      result.current.addTimer({
        id: '1',
        step_title: 'Short timer',
        dish_color: '#C45B28',
        started_at_step: 1,
        durationSec: 60,
        startTimestamp: Date.now() - 60 * 1000,
      });
    });

    const timersWithRemaining = result.current.getTimersWithRemaining(Date.now());
    expect(timersWithRemaining[0].remainingSec).toBe(0);
  });
});
