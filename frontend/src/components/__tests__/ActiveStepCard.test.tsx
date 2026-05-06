import { render, screen, fireEvent } from '@testing-library/react';
import ActiveStepCard from '../ActiveStepCard';

const mockPassiveStep = {
  index: 1,
  recipe_id: 'recipe-1',
  title: 'Cook Rice',
  description: 'Boil water, add rice, simmer',
  active: false,
  duration_min: 15
};

const mockActiveStep = {
  index: 2,
  recipe_id: 'recipe-1',
  title: 'Chop Vegetables',
  description: 'Dice onions, carrots, celery',
  active: true,
  duration_min: null
};

describe('ActiveStepCard', () => {
  it('renders passive step with Timer', () => {
    render(<ActiveStepCard step={mockPassiveStep} stepIndex={1} totalSteps={5} onNext={vi.fn()} onPrevious={vi.fn()} />);
    expect(screen.getByText('Cook Rice')).toBeInTheDocument();
    expect(screen.getByText(/Timer/i)).toBeInTheDocument(); // Timer should render
  });

  it('renders active step without Timer', () => {
    render(<ActiveStepCard step={mockActiveStep} stepIndex={2} totalSteps={5} onNext={vi.fn()} onPrevious={vi.fn()} />);
    expect(screen.getByText('Chop Vegetables')).toBeInTheDocument();
    // Timer should NOT render for active steps without duration
  });

  it('calls onNext with next index when Next clicked', () => {
    const onNext = vi.fn();
    render(<ActiveStepCard step={mockActiveStep} stepIndex={2} totalSteps={5} onNext={onNext} onPrevious={vi.fn()} />);
    fireEvent.click(screen.getByText('Next'));
    expect(onNext).toHaveBeenCalledWith(3);
  });

  it('shows Finish on last step', () => {
    render(<ActiveStepCard step={mockActiveStep} stepIndex={4} totalSteps={5} onNext={vi.fn()} onPrevious={vi.fn()} />);
    expect(screen.getByText('Finish')).toBeInTheDocument();
  });
});
