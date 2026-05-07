import { create } from 'zustand';
import { ActionButton } from '../lib/parseRecipeMarkers';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatStoreState {
  isChatOpen: boolean;
  openChat: () => void;
  closeChat: () => void;
  toggleChat: () => void;
  isFabPulsing: boolean;
  setFabPulsing: (pulsing: boolean) => void;
  messages: ChatMessage[];
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  handleRecipeAction: (action: ActionButton['action'], payload?: Record<string, any>) => void;
}

export const useChatStore = create<ChatStoreState>((set, get) => ({
  isChatOpen: false,
  openChat: () => set({ isChatOpen: true }),
  closeChat: () => set({ isChatOpen: false }),
  toggleChat: () => set((state) => ({ isChatOpen: !state.isChatOpen })),
  isFabPulsing: false,
  setFabPulsing: (pulsing) => set({ isFabPulsing: pulsing }),
  messages: [],
  addMessage: (message) =>
    set((state) => ({
      messages: [
        ...state.messages,
        {
          ...message,
          id: crypto.randomUUID(),
          timestamp: new Date(),
        },
      ],
    })),
  handleRecipeAction: (action, payload) => {
    switch (action) {
      case 'add_to_plan': {
        // Spec: PATCH to plan, next available slot same meal type
        // TODO: Implement actual API call
        // 1. Fetch current plan
        // 2. Find next available slot matching meal type (from payload or recipe tags)
        // 3. PATCH /api/plans/{plan_id} with updated plan_data
        console.log('Adding to plan:', payload);
        alert('Adding recipe to plan (implementation pending)');
        break;
      }
      case 'suggest_another': {
        // Spec: re-prompt LLM
        // TODO: Implement LLM re-prompt
        console.log('Suggesting another recipe');
        get().addMessage({
          role: 'user',
          content: 'Can you suggest another recipe like the previous one?',
        });
        alert('Re-prompting LLM for another suggestion (implementation pending)');
        break;
      }
      case 'view_recipe': {
        // Spec: navigate or create recipe
        // TODO: Implement navigation to recipe page
        console.log('Viewing recipe:', payload);
        alert('Navigating to recipe page (implementation pending)');
        break;
      }
      default:
        console.warn('Unknown recipe action:', action);
    }
  },
}));
