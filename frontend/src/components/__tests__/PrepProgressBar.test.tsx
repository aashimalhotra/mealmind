import React from 'react';
import { render, screen } from '@testing-library/react';
import PrepProgressBar from '../PrepProgressBar';

describe('PrepProgressBar', () => {
  test('renders progress bar with correct completed and total steps', () => {
    render(<PrepProgressBar completedSteps={3} totalSteps={8} />);

    // Check that the progress text shows correct values
    expect(screen.getByText('3 / 8')).toBeInTheDocument();

    // Check that the progress bar has correct width style (3/8 = 37.5%)
    const progressBar = document.querySelector('.bg-accent');
    expect(progressBar).toHaveStyle('width: 37.5%');
  });

  test('renders empty progress bar when no steps completed', () => {
    render(<PrepProgressBar completedSteps={0} totalSteps={8} />);

    expect(screen.getByText('0 / 8')).toBeInTheDocument();
    const progressBar = document.querySelector('.bg-accent');
    expect(progressBar).toHaveStyle('width: 0%');
  });

  test('renders full progress bar when all steps completed', () => {
    render(<PrepProgressBar completedSteps={8} totalSteps={8} />);

    expect(screen.getByText('8 / 8')).toBeInTheDocument();
    const progressBar = document.querySelector('.bg-accent');
    expect(progressBar).toHaveStyle('width: 100%');
  });

  test('renders nothing when totalSteps is 0', () => {
    render(<PrepProgressBar completedSteps={0} totalSteps={0} />);

    expect(screen.getByText('0 / 0')).toBeInTheDocument();
    const progressBar = document.querySelector('.bg-accent');
    expect(progressBar).toHaveStyle('width: 0%');
  });
});
