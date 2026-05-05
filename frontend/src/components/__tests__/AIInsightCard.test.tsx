import { test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import AIInsightCard from '../AIInsightCard';

test('renders AIInsightCard with default title and fixture body', () => {
  const fixture = {
    body: 'You\'re low on iron this week. Consider adding spinach to tomorrow\'s lunch.',
  };

  render(<AIInsightCard body={fixture.body} />);

  // Assert default title appears
  expect(screen.getByText('AI insight')).toBeInTheDocument();
  // Assert body text appears
  expect(screen.getByText(fixture.body)).toBeInTheDocument();
});

test('renders AIInsightCard with custom title', () => {
  const fixture = {
    title: 'Custom AI Tip',
    body: 'Add more protein to your breakfast.',
  };

  render(<AIInsightCard title={fixture.title} body={fixture.body} />);

  expect(screen.getByText(fixture.title)).toBeInTheDocument();
  expect(screen.getByText(fixture.body)).toBeInTheDocument();
});
