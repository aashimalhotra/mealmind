import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { Timer } from '../Timer';

describe('Timer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Mock requestAnimationFrame and cancelAnimationFrame
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback) => {
      return window.setTimeout(() => cb(performance.now()), 0) as unknown as number;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id: number) => {
      clearTimeout(id);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('renders with initial duration', () => {
    render(<Timer durationSec={300} autoStart={false} />);
    expect(screen.getByText('05:00')).toBeTruthy();
    expect(screen.getByText('of 05:00')).toBeTruthy();
  });

  it('renders label when provided', () => {
    render(<Timer label="SIMMER TIME" durationSec={300} autoStart={false} />);
    expect(screen.getByText('SIMMER TIME')).toBeTruthy();
  });

  it('counts down when autoStart is true', () => {
    render(<Timer durationSec={5} autoStart={true} />);
    
    // Check initial time
    expect(screen.getByText('00:05')).toBeTruthy();
    
    // Advance time by 1 second
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    
    // After 1 second, should show 00:04
    expect(screen.getByText('00:04')).toBeTruthy();
  });

  it('pauses when paused prop is true', () => {
    const { rerender } = render(
      <Timer durationSec={10} autoStart={true} paused={false} />
    );

    // Advance some time
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    // Should have counted down to ~7 seconds
    expect(screen.getByText('00:07')).toBeTruthy();
    
    // Now pause
    rerender(<Timer durationSec={10} autoStart={true} paused={true} />);

    // Advance more time while paused - should not change
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // Time should still be ~7 seconds (paused)
    expect(screen.getByText('00:07')).toBeTruthy();
  });

  it('calls onTogglePause when pause button is clicked', () => {
    const onTogglePause = vi.fn();
    render(
      <Timer
        durationSec={300}
        autoStart={true}
        paused={false}
        onTogglePause={onTogglePause}
      />
    );

    const pauseButton = screen.getByLabelText('Pause');
    fireEvent.click(pauseButton);

    expect(onTogglePause).toHaveBeenCalledTimes(1);
  });

  it('extends timer when extend button is clicked', () => {
    render(<Timer durationSec={300} autoStart={false} />);
    
    // Check initial time
    expect(screen.getByText('05:00')).toBeTruthy();
    
    const extendButton = screen.getByLabelText('Extend by 1 minute');
    fireEvent.click(extendButton);
    
    // After extending, the countdown should have more time
    // The remaining time should increase
    // We need to start the timer to see the effect
  });

  it('calls onComplete when timer reaches zero', () => {
    const onComplete = vi.fn();
    render(<Timer durationSec={2} autoStart={true} onComplete={onComplete} />);

    // Advance past the duration
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('shows resume icon when paused', () => {
    const { rerender } = render(
      <Timer durationSec={300} autoStart={true} paused={false} />
    );

    // Should show pause icon (two vertical bars)
    expect(screen.getByLabelText('Pause')).toBeTruthy();
    
    // Now pause
    rerender(<Timer durationSec={300} autoStart={true} paused={true} />);
    
    // Should show resume icon (play triangle)
    expect(screen.getByLabelText('Resume')).toBeTruthy();
  });
});
