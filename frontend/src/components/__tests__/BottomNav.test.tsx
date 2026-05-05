import { test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import BottomNav from '../BottomNav';

test('renders all 3 nav labels', () => {
  render(
    <MemoryRouter>
      <BottomNav />
    </MemoryRouter>
  );
  expect(screen.getByText('Dashboard')).toBeInTheDocument();
  expect(screen.getByText('Recipes')).toBeInTheDocument();
  expect(screen.getByText('Profile')).toBeInTheDocument();
});
