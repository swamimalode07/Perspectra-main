import { create } from 'zustand';
import { PersonaType } from '@/lib/perplexity';

export interface Message {
  id: string;
  content: string;
  persona: PersonaType | 'user';
  timestamp: Date;
  isLoading?: boolean;
}

export interface ConversationState {
  messages: Message[];
  problem: string;
  isLoading: boolean;
  activePersonas: PersonaType[];
  isConversationActive: boolean;
  
  // Actions
  addMessage: (message: Message) => void;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  setProblem: (problem: string) => void;
  setIsLoading: (loading: boolean) => void;
  setActivePersonas: (personas: PersonaType[]) => void;
  startConversation: () => void;
  endConversation: () => void;
  clearConversation: () => void;
}

export const useConversationStore = create<ConversationState>((set, get) => ({
  messages: [],
  problem: '',
  isLoading: false,
  activePersonas: ['system1', 'system2', 'moderator', 'devilsAdvocate'],
  isConversationActive: false,

  addMessage: (message) => {
    set((state) => ({
      messages: [...state.messages, message],
    }));
  },

  updateMessage: (id, updates) => {
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === id ? { ...msg, ...updates } : msg
      ),
    }));
  },

  setProblem: (problem) => {
    set({ problem });
  },

  setIsLoading: (isLoading) => {
    set({ isLoading });
  },

  setActivePersonas: (personas) => {
    set({ activePersonas: personas });
  },

  startConversation: () => {
    set({ isConversationActive: true });
  },

  endConversation: () => {
    set({ isConversationActive: false });
  },

  clearConversation: () => {
    set({
      messages: [],
      problem: '',
      isLoading: false,
      isConversationActive: false,
    });
  },
})); 