import { render, screen, fireEvent } from '@testing-library/react';
import ActiveStepCard from '../ActiveStepCard';

const mockPassiveStep = {
  id: 'step-1',
  step_number: 1,
  title: 'Cook Rice',
  description: 'Boil water, add rice, simmer',
  duration_min: 15,
  is_passive: true,
  completed: false,
  dish_name: 'Rice Bowl',
  dish_color: '#4F46E5'
};

const mockActiveStep = {
  id: 'step-2',
  step_number: 2,
  title: 'Chop Vegetables',
  description: 'Dice onions, carrots, celery',
  duration_min: undefined,
  is_passive: false,
  completed: false,
  dish_name: 'Salad',
  dish_color: '#10B981'
};

describe('ActiveStepCard', () => {
  it('renders passive step with Timer', () => {
    render(<ActiveStepCard step={mockPassiveStep} stepIndex={1} totalSteps={5} onNext={vi.fn()} onPrevious={vi.fn()} />);
    expect(screen.getByText('Cook Rice')).toBeInTheDocument();
    expect(screen.getByText(/Passive Time/i)).toBeInTheDocument();
  });

  it('renders active step without Timer', () => {
    render(<ActiveStepCard step={mockActiveStep} stepIndex={2} totalSteps={5} onNext={vi.fn()} onPrevious={vi.fn()} />);
    expect(screen.getByText('Chop Vegetables')).toBeInTheDocument();
    expect(screen.queryByText(/Time/i)).not.toBeInTheDocument();
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

  it('calls onNext with -1 when Finish clicked on last step', () => {
    const onNext = vi.fn();
    render(<ActiveStepCard step={mockActiveStep} stepIndex={4} totalSteps={5} onNext={onNext} onPrevious={vi.fn()} />);
    fireEvent.click(screen.getByText('Finish'));
    expect(onNext).toHaveBeenCalledWith(-1);
  });

  it('disables Previous button on first step', () => {
    render(<ActiveStepCard step={mockActiveStep} stepIndex={0} totalSteps={5} onNext={vi.fn()} onPrevious={vi.fn()} />);
    const prevButton = screen.getByText('Previous').closest('button');
    expect(prevButton).toBeDisabled();
  });
});
