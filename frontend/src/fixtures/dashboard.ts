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

const dashboardData: DashboardData = {
  macros: [
    { label: 'Protein', current: 81, target: 113, unit: 'g', color: '#C45B28', centerText: '72%' },
    { label: 'Carbs', current: 66, target: 113, unit: 'g', color: '#C49B28', centerText: '58%' },
    { label: 'Fat', current: 44, target: 67, unit: 'g', color: '#4A8C5C', centerText: '65%' },
    { label: 'Veggies', current: 2, target: 5, unit: 'srv', color: '#6B8C3A', centerText: '2/5' },
  ],
  calories: { current: 890, target: 1500 },
};

export default dashboardData;
