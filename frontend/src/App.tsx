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
import ChatPanel from './components/ChatPanel';
import { useChatStore } from './stores/chatStore';

function App() {
  const isChatOpen = useChatStore((state) => state.isChatOpen);
  const closeChat = useChatStore((state) => state.closeChat);
  const toggleChat = useChatStore((state) => state.toggleChat);
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
      <FAB pulse={isFabPulsing} onClick={toggleChat} />
      <BottomSheet open={isChatOpen} onClose={closeChat}>
        <ChatPanel />
      </BottomSheet>
    </div>
  );
}

export default App;
