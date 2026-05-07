import { create } from 'zustand';

interface ChatStoreState {
  isChatOpen: boolean;
  openChat: () => void;
  closeChat: () => void;
  toggleChat: () => void;
  isFabPulsing: boolean;
  setFabPulsing: (pulsing: boolean) => void;
}

export const useChatStore = create<ChatStoreState>((set) => ({
  isChatOpen: false,
  openChat: () => set({ isChatOpen: true }),
  closeChat: () => set({ isChatOpen: false }),
  toggleChat: () => set((state) => ({ isChatOpen: !state.isChatOpen })),
  isFabPulsing: false,
  setFabPulsing: (pulsing) => set({ isFabPulsing: pulsing }),
}));
