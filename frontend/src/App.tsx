import { Routes, Route } from 'react-router-dom';
import Dashboard from './screens/Dashboard';
import RecipesTab from './screens/RecipesTab';
import Profile from './screens/Profile';
import PlanReview from './screens/PlanReview';
import BottomNav from './components/BottomNav';

function App() {
  return (
    <div className="min-h-dvh max-w-md mx-auto bg-bg">
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/recipes" element={<RecipesTab />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/plan/review/:id" element={<PlanReview />} />
      </Routes>
      <BottomNav />
    </div>
  );
}

export default App;
