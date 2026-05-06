import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import GroceryList from '../GroceryList';
import * as groceryApi from '../../api/grocery';

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ planId: 'plan-123' }),
  };
});

// Mock grocery API
vi.mock('../../api/grocery', () => ({
  getGroceryList: vi.fn(),
  updateGroceryItem: vi.fn(),
}));

const mockGroceryData = {
  plan_id: 'plan-123',
  week_of: 'Week of May 4',
  total_items: 8,
  categories: [
    {
      title: 'Protein',
      count: 3,
      color: 'var(--color-protein)',
      items: [
        {
          id: 'item-1',
          name: 'Chicken thighs, boneless',
          subtitle: 'Sun prep — Tandoori chicken',
          quantity: '500g',
          checked: false,
          is_pantry_chip: false,
          category: 'Protein',
          prep_day: 'sun-prep',
        },
        {
          id: 'item-2',
          name: 'Ground chicken or lamb',
          subtitle: 'Wed prep — Spiced ground meat',
          quantity: '400g',
          checked: false,
          is_pantry_chip: false,
          category: 'Protein',
          prep_day: 'wed-prep',
        },
      ],
    },
    {
      title: 'Produce',
      count: 5,
      color: 'var(--color-veggies)',
      items: [
        {
          id: 'item-3',
          name: 'Onions',
          subtitle: 'Both preps — Multiple recipes',
          quantity: '4 med',
          checked: false,
          is_pantry_chip: false,
          category: 'Produce',
          prep_day: 'day-of',
        },
        {
          id: 'item-4',
          name: 'Cilantro bunch',
          subtitle: 'Both preps — Chutney, garnish',
          quantity: '1 bunch',
          checked: true,
          is_pantry_chip: false,
          category: 'Produce',
          prep_day: 'day-of',
        },
      ],
    },
  ],
  pantry_items: [
    {
      id: 'pantry-1',
      name: 'Tandoori blend',
      subtitle: 'Pantry item',
      quantity: '',
      checked: false,
      is_pantry_chip: true,
      category: 'Spices & condiments',
    },
    {
      id: 'pantry-2',
      name: 'Cumin seeds',
      subtitle: 'Pantry item',
      quantity: '',
      checked: false,
      is_pantry_chip: true,
      category: 'Spices & condiments',
    },
  ],
};

describe('GroceryList Screen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (groceryApi.getGroceryList as vi.Mock).mockResolvedValue(mockGroceryData);
    (groceryApi.updateGroceryItem as vi.Mock).mockResolvedValue({});
  });

  it('renders grocery list with fixture data', async () => {
    render(
      <BrowserRouter>
        <GroceryList />
      </BrowserRouter>
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Grocery list')).toBeInTheDocument();
    });

    expect(screen.getByText('Week of May 4 · 8 items')).toBeInTheDocument();
    expect(screen.getByText('Protein')).toBeInTheDocument();
    expect(screen.getByText('Produce')).toBeInTheDocument();
    expect(screen.getByText('Chicken thighs, boneless')).toBeInTheDocument();
    expect(screen.getByText('Onions')).toBeInTheDocument();
  });

  it('toggles checkbox and calls API', async () => {
    render(
      <BrowserRouter>
        <GroceryList />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Chicken thighs, boneless')).toBeInTheDocument();
    });

    // Click unchecked item
    const chickenItem = screen.getByText('Chicken thighs, boneless').closest('[role="checkbox"]');
    fireEvent.click(chickenItem!);

    // Assert API was called
    await waitFor(() => {
      expect(groceryApi.updateGroceryItem).toHaveBeenCalledWith('item-1', { checked: true });
    });

    // Assert visual strikethrough (since we do optimistic update)
    expect(screen.getByText('Chicken thighs, boneless')).toHaveStyle('text-decoration: line-through');
  });

  it('filters items when filter tab is clicked', async () => {
    render(
      <BrowserRouter>
        <GroceryList />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Chicken thighs, boneless')).toBeInTheDocument();
    });

    // Click Sun prep filter
    const sunPrepTab = screen.getByText('Sun prep').closest('button');
    fireEvent.click(sunPrepTab!);

    // Only Sun prep items should show
    expect(screen.getByText('Chicken thighs, boneless')).toBeInTheDocument();
    expect(screen.queryByText('Ground chicken or lamb')).not.toBeInTheDocument();
    expect(screen.queryByText('Onions')).not.toBeInTheDocument();
  });

  it('moves pantry chip to main list when clicked', async () => {
    render(
      <BrowserRouter>
        <GroceryList />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Tandoori blend')).toBeInTheDocument();
    });

    // Click pantry chip
    const pantryChip = screen.getByLabelText('Add Tandoori blend to grocery list');
    fireEvent.click(pantryChip);

    // Assert API was called
    await waitFor(() => {
      expect(groceryApi.updateGroceryItem).toHaveBeenCalledWith('pantry-1', { is_pantry_chip: false });
    });
  });

  it('searches items by name', async () => {
    render(
      <BrowserRouter>
        <GroceryList />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Chicken thighs, boneless')).toBeInTheDocument();
    });

    // Type in search
    const searchInput = screen.getByPlaceholderText('Search items...');
    fireEvent.change(searchInput, { target: { value: 'chicken' } });

    // Only chicken items should show
    expect(screen.getByText('Chicken thighs, boneless')).toBeInTheDocument();
    expect(screen.getByText('Ground chicken or lamb')).toBeInTheDocument();
    expect(screen.queryByText('Onions')).not.toBeInTheDocument();
  });
});
