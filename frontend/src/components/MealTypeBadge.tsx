interface MealTypeBadgeProps {
  type: 'breakfast' | 'lunch' | 'dinner' | 'dine-out';
}

const mealTypeStyles: Record<string, { text: string; bg: string; label: string }> = {
  breakfast: { text: 'text-[#C45B28]', bg: 'bg-[#FAECE7]', label: 'Breakfast' },
  lunch: { text: 'text-[#4A8C5C]', bg: 'bg-[#E1F5EE]', label: 'Lunch' },
  dinner: { text: 'text-[#8C6B3A]', bg: 'bg-[#FAF0E0]', label: 'Dinner' },
  'dine-out': { text: 'text-[#C49B28]', bg: 'bg-[#FBF6E8]', label: 'Dine out' },
};

const MealTypeBadge: React.FC<MealTypeBadgeProps> = ({ type }) => {
  const style = mealTypeStyles[type] || mealTypeStyles.breakfast;
  return (
    <span
      className={`${style.text} ${style.bg} text-xs font-medium px-2 py-0.5 rounded-[8px]`}
    >
      {style.label}
    </span>
  );
};

export default MealTypeBadge;