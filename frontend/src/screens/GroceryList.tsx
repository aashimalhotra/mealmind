import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import FilterTabs, { type FilterType } from '../components/FilterTabs';
import CategorySection from '../components/CategorySection';
import PantryChip from '../components/PantryChip';
import { getGroceryList, updateGroceryItem, type GroceryListResponse, type GroceryItem as GroceryItemType } from '../api/grocery';

// Helper to get category color (matches mockup)
const getCategoryColor = (category: string): string => {
  switch (category.toLowerCase()) {
    case 'protein':
      return 'var(--color-protein)';
    case 'produce':
      return 'var(--color-veggies)';
    case 'spices & condiments':
      return '#8C6B3A'; // From mockup
    default:
      return 'var(--color-accent-gold)';
  }
};

const GroceryList: React.FC = () => {
  const { planId } = useParams<{ planId: string }>();
  const [groceryData, setGroceryData] = useState<GroceryListResponse | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch grocery list on mount
  useEffect(() => {
    if (!planId) return;
    setLoading(true);
    getGroceryList(planId)
      .then((data) => {
        setGroceryData(data);
        setError(null);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load grocery list');
      })
      .finally(() => setLoading(false));
  }, [planId]);

  // Helper to find an item by ID across categories and pantry
  const findItem = useCallback(
    (itemId: string): GroceryItemType | undefined => {
      if (!groceryData) return undefined;
      for (const cat of groceryData.categories) {
        const item = cat.items.find((i) => i.id === itemId);
        if (item) return item;
      }
      return groceryData.pantry_items.find((i) => i.id === itemId);
    },
    [groceryData]
  );

  // Toggle item checked status
  const handleToggleItem = useCallback(async (itemId: string) => {
    const currentItem = findItem(itemId);
    if (!currentItem) return;

    const newChecked = !currentItem.checked;
    // Optimistic update
    setGroceryData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        categories: prev.categories.map((cat) => ({
          ...cat,
          items: cat.items.map((item) =>
            item.id === itemId ? { ...item, checked: newChecked } : item
          ),
        })),
        pantry_items: prev.pantry_items.map((item) =>
          item.id === itemId ? { ...item, checked: newChecked } : item
        ),
      };
    });

    // API call
    try {
      await updateGroceryItem(itemId, { checked: newChecked });
    } catch (err) {
      console.error('Failed to update item:', err);
      // Revert on error
      setGroceryData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          categories: prev.categories.map((cat) => ({
            ...cat,
            items: cat.items.map((item) =>
              item.id === itemId ? { ...item, checked: !newChecked } : item
            ),
          })),
          pantry_items: prev.pantry_items.map((item) =>
            item.id === itemId ? { ...item, checked: !newChecked } : item
          ),
        };
      });
    }
  }, [findItem]);

  // Move pantry item to main list
  const handleMovePantryItem = useCallback(async (itemId: string) => {
    // Optimistic update
    setGroceryData((prev) => {
      if (!prev) return prev;
      const itemToMove = prev.pantry_items.find((item) => item.id === itemId);
      if (!itemToMove) return prev;

      const updatedItem = { ...itemToMove, is_pantry_chip: false };
      const targetCategory = prev.categories.find(
        (cat) => cat.title === itemToMove.category
      );

      return {
        ...prev,
        pantry_items: prev.pantry_items.filter((item) => item.id !== itemId),
        categories: targetCategory
          ? prev.categories.map((cat) =>
              cat.title === targetCategory.title
                ? { ...cat, items: [...cat.items, updatedItem], count: cat.count + 1 }
                : cat
            )
          : [
              ...prev.categories,
              {
                title: itemToMove.category,
                count: 1,
                color: getCategoryColor(itemToMove.category),
                items: [updatedItem],
              },
            ],
        total_items: prev.total_items + 1,
      };
    });

    // API call
    try {
      await updateGroceryItem(itemId, { is_pantry_chip: false });
    } catch (err) {
      console.error('Failed to move pantry item:', err);
    }
  }, []);

  // Filter and search logic
  const filteredCategories = useMemo(() => {
    if (!groceryData) return [];

    return groceryData.categories
      .map((cat) => {
        // Filter items by search query
        let filteredItems = cat.items.filter(
          (item) =>
            item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.subtitle.toLowerCase().includes(searchQuery.toLowerCase())
        );

        // Filter by prep day
        if (activeFilter !== 'all') {
          filteredItems = filteredItems.filter(
            (item) => item.prep_day === activeFilter
          );
        }

        return {
          ...cat,
          items: filteredItems,
          count: filteredItems.length,
        };
      })
      .filter((cat) => cat.items.length > 0);
  }, [groceryData, searchQuery, activeFilter]);

  // Filtered pantry items
  const filteredPantryItems = useMemo(() => {
    if (!groceryData) return [];
    return groceryData.pantry_items.filter(
      (item) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.subtitle.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [groceryData, searchQuery]);

  // Generate plain text grocery list for share/copy
  const generatePlainTextList = useCallback(() => {
    if (!groceryData) return '';
    let text = `Grocery List: ${groceryData.week_of}\n`;
    text += `Total items: ${groceryData.total_items}\n\n`;

    groceryData.categories.forEach((cat) => {
      text += `--- ${cat.title.toUpperCase()} ---\n`;
      cat.items.forEach((item) => {
        text += `${item.checked ? '[x]' : '[ ]'} ${item.name} (${item.quantity}) - ${item.subtitle}\n`;
      });
      text += '\n';
    });

    if (groceryData.pantry_items.length > 0) {
      text += '--- PANTRY CHECK ---\n';
      groceryData.pantry_items.forEach((item) => {
        text += `${item.name}\n`;
      });
    }

    return text;
  }, [groceryData]);

  // Handle share
  const handleShare = async () => {
    const text = generatePlainTextList();
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Grocery List: ${groceryData?.week_of || 'Meal Plan'}`,
          text,
        });
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error('Share failed:', err);
          // Fallback to clipboard
          navigator.clipboard.writeText(text);
        }
      }
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(text);
      alert('Grocery list copied to clipboard!');
    }
  };

  // Handle copy
  const handleCopy = () => {
    const text = generatePlainTextList();
    navigator.clipboard.writeText(text);
    alert('Grocery list copied to clipboard!');
  };

  if (loading) return <div className="p-[var(--page-padding)] text-[var(--color-text-tertiary)]">Loading...</div>;
  if (error) return <div className="p-[var(--page-padding)] text-red-500">Error: {error}</div>;
  if (!groceryData) return <div className="p-[var(--page-padding)] text-[var(--color-text-tertiary)]">No grocery list found</div>;

  return (
    <div className="min-h-dvh flex flex-col bg-[var(--color-bg)]">
      {/* Fixed header */}
      <div className="bg-[var(--color-bg)] px-[var(--page-padding)] pt-[var(--space-5xl)] pb-[var(--space-3xl)] border-b border-[var(--color-border)]">
        {/* Back button + title */}
        <div className="flex justify-between items-center mb-[var(--space-3xl)]">
          <div className="flex items-center gap-[var(--space-lg)]">
            <button
              className="w-9 h-9 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center"
              onClick={() => window.history.back()}
              aria-label="Go back"
            >
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path
                  d="M11 4L5 9l6 5"
                  stroke="var(--color-text-primary)"
                  strokeWidth="1.5"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <div>
              <p className="text-[var(--font-size-screen-title)] font-[var(--font-weight-medium)] text-[var(--color-text-primary)] m-0">
                Grocery list
              </p>
              <p className="text-[var(--font-size-sm)] text-[var(--color-text-tertiary)] m-0 mt-[var(--space-xs)]">
                {groceryData.week_of} · {groceryData.total_items} items
              </p>
            </div>
          </div>
        </div>

        {/* Filter tabs */}
        <FilterTabs activeFilter={activeFilter} onFilterChange={setActiveFilter} />

        {/* Search input */}
        <div className="bg-[var(--color-surface)] rounded-[var(--radius-card)] border border-[var(--color-border)] p-[var(--space-3xl)] flex items-center gap-[var(--space-xl)]">
          <svg width="16" height="16" viewBox="0 0 16 16">
            <circle cx="7" cy="7" r="5" stroke="var(--color-text-tertiary)" strokeWidth="1.2" fill="none" />
            <path d="M11 11l3 3" stroke="var(--color-text-tertiary)" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            placeholder="Search items..."
            className="flex-1 bg-transparent border-none outline-none text-[var(--font-size-body)] text-[var(--color-text-primary)] placeholder-[var(--color-text-placeholder)]"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-[var(--page-padding)] py-[var(--space-lg)]">
        {/* Category sections */}
        {filteredCategories.map((cat) => (
          <CategorySection
            key={cat.title}
            title={cat.title}
            count={cat.count}
            color={getCategoryColor(cat.title)}
            items={cat.items}
            onToggleItem={handleToggleItem}
          />
        ))}

        {/* Pantry section */}
        {filteredPantryItems.length > 0 && (
          <div className="mb-[var(--space-3xl)]">
            <div className="flex items-center gap-[var(--space-md)] mb-[var(--space-lg)]">
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: '#8C6B3A' }}
              />
              <p className="text-[var(--font-size-sm)] font-[var(--font-weight-medium)] text-[var(--color-text-primary)] m-0 uppercase tracking-[0.5px]">
                Spices & condiments
              </p>
              <div className="flex-1 h-[0.5px] bg-[var(--color-border)]" />
              <p className="text-[var(--font-size-sm)] text-[var(--color-text-tertiary)] m-0">
                check stock
              </p>
            </div>

            <div className="bg-[var(--color-surface-warm)] rounded-[var(--radius-card-lg)] border border-[var(--color-border)] p-[var(--space-3xl)]">
              <div className="flex items-start gap-[var(--space-xl)] mb-[var(--space-lg)]">
                <div className="w-6 h-6 rounded-full bg-[var(--color-accent-gold)] flex items-center justify-center flex-shrink-0 mt-[var(--space-xs)]">
                  <svg width="12" height="12" viewBox="0 0 12 12">
                    <path d="M6 1v4l2 2" stroke="var(--color-dark-text)" strokeWidth="1.2" fill="none" strokeLinecap="round" />
                    <circle cx="6" cy="6" r="5" stroke="var(--color-dark-text)" strokeWidth="0.8" fill="none" />
                  </svg>
                </div>
                <div>
                  <p className="text-[var(--font-size-body)] font-[var(--font-weight-medium)] text-[var(--color-text-primary)] m-0 mb-[var(--space-sm)]">
                    Pantry check
                  </p>
                  <p className="text-[var(--font-size-body-sm)] text-[var(--color-text-secondary)] m-0 mb-[var(--space-md)] leading-relaxed">
                    These are likely already in your kitchen. Tap any to add to the shopping list if you're running low.
                  </p>
                  <div className="flex flex-wrap gap-[var(--space-sm)]">
                    {filteredPantryItems.map((item) => (
                      <PantryChip
                        key={item.id}
                        label={item.name}
                        itemId={item.id}
                        onMoveToMainList={handleMovePantryItem}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Fixed bottom action bar */}
      <div className="bg-[var(--color-surface)] border-t border-[var(--color-border)] p-[var(--page-padding)] pb-[var(--space-5xl)]">
        <div className="flex gap-[var(--space-lg)]">
          <button
            className="flex-1 bg-[var(--color-dark-bg)] rounded-[var(--radius-card-lg)] p-[var(--space-3xl)] text-center"
            onClick={handleShare}
          >
            <span className="text-[var(--font-size-body-lg)] font-[var(--font-weight-medium)] text-[var(--color-dark-text)]">
              Share list
            </span>
          </button>
          <button
            className="flex-1 bg-[var(--color-bg)] rounded-[var(--radius-card-lg)] p-[var(--space-3xl)] text-center border border-[var(--color-border)]"
            onClick={handleCopy}
          >
            <span className="text-[var(--font-size-body-lg)] font-[var(--font-weight-medium)] text-[var(--color-text-primary)]">
              Copy as text
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default GroceryList;
