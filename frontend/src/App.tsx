import { Routes, Route } from 'react-router-dom';
import Dashboard from './screens/Dashboard';
import RecipesTab from './screens/RecipesTab';
import Profile from './screens/Profile';
import PlanReview from './screens/PlanReview';
import RecipeDetail from './screens/RecipeDetail';
import PrepGuide from './screens/PrepGuide';
import GroceryList from './screens/GroceryList';
import BottomNav from './components/BottomNav';
import FAB from './components/FAB';
import BottomSheet from './components/BottomSheet';
import { useChatStore } from './stores/chatStore';

function App() {
  const isChatOpen = useChatStore((state) => state.isChatOpen);
  const closeChat = useChatStore((state) => state.closeChat);
  const isFabPulsing = useChatStore((state) => state.isFabPulsing);

  return (
    <div className="min-h-dvh max-w-md mx-auto bg-bg relative">
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/recipes" element={<RecipesTab />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/plan/review/:id" element={<PlanReview />} />
        <Route path="/recipe/:id" element={<RecipeDetail />} />
        <Route path="/prep/:sessionId" element={<PrepGuide />} />
        <Route path="/grocery/:planId" element={<GroceryList />} />
      </Routes>
      <BottomNav />
      <FAB pulse={isFabPulsing} />
      <BottomSheet open={isChatOpen} onClose={closeChat}>
        <div className="p-4">
          <h2 className="text-lg font-semibold mb-4">AI Chat</h2>
          <p className="text-text-tertiary">Chat content will be implemented in subsequent steps.</p>
        </div>
      </BottomSheet>
    </div>
  );
}

export default App;
