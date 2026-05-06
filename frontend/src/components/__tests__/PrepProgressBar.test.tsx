import React from 'react';
import { render } from '@testing-library/react';
import PrepProgressBar from '../PrepProgressBar';

describe('PrepProgressBar', () => {
  test('renders correct segments for 8 steps with 3 completed and 4th step active', () => {
    // Create 8 test steps: first 3 completed, 4th (index 3) active, rest upcoming
    const testSteps = Array.from({ length: 8 }, (_, i) => ({
      recipe_id: `recipe-${i + 1}`,
      completed: i < 3,
      active: i === 3,
    }));

    render(<PrepProgressBar steps={testSteps} currentStepIndex={3} />);

    // Assert 3 fully filled (completed) segments
    const completedSegments = document.querySelectorAll('[aria-valuenow="100"]');
    expect(completedSegments).toHaveLength(3);

    // Assert 1 half-filled (active) segment
    const activeSegments = document.querySelectorAll('[aria-valuenow="50"]');
    expect(activeSegments).toHaveLength(1);

    // Assert 4 faded (upcoming) segments
    const upcomingSegments = document.querySelectorAll('[aria-valuenow="0"]');
    expect(upcomingSegments).toHaveLength(4);
  });
});
