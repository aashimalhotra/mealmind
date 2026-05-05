export interface DashboardMacro {
  label: string;
  current: number;
  target: number;
  unit: string;
  color: string;
  centerText?: string;
}

export interface DashboardCalories {
  current: number;
  target: number;
}

export interface DashboardData {
  macros: DashboardMacro[];
  calories: DashboardCalories;
}

export interface PersonDashboardData {
  person1500: DashboardData;
  person1800: DashboardData;
}

const person1500: DashboardData = {
  macros: [
    { label: 'Protein', current: 81, target: 113, unit: 'g', color: '#C45B28', centerText: '72%' },
    { label: 'Carbs', current: 66, target: 113, unit: 'g', color: '#C49B28', centerText: '58%' },
    { label: 'Fat', current: 44, target: 67, unit: 'g', color: '#4A8C5C', centerText: '65%' },
    { label: 'Veggies', current: 2, target: 5, unit: 'srv', color: '#6B8C3A', centerText: '2/5' },
  ],
  calories: { current: 890, target: 1500 },
};

const person1800: DashboardData = {
  macros: [
    { label: 'Protein', current: 95, target: 135, unit: 'g', color: '#C45B28', centerText: '70%' },
    { label: 'Carbs', current: 80, target: 135, unit: 'g', color: '#C49B28', centerText: '59%' },
    { label: 'Fat', current: 52, target: 80, unit: 'g', color: '#4A8C5C', centerText: '65%' },
    { label: 'Veggies', current: 3, target: 5, unit: 'srv', color: '#6B8C3A', centerText: '3/5' },
  ],
  calories: { current: 1050, target: 1800 },
};

const dashboardData: PersonDashboardData = {
  person1500,
  person1800,
};

export default dashboardData;

// Keep backward compatibility
export { person1500 as dashboardData };
