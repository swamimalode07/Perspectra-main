import { create } from 'zustand';
import { PersonaType } from '@/lib/perplexity';

export interface Message {
  id: string;
  content: string;
  persona: PersonaType | 'user';
  timestamp: Date;
  isLoading?: boolean;
  factChecked?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  problem: string;
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ARCHIVED';
  createdAt: Date;
  updatedAt: Date;
  totalMessages: number;
  activePersonas: PersonaType[];
  conversationMode: string;
}

export interface ConversationState {
  // Current conversation state
  currentConversation: Conversation | null;
  messages: Message[];
  isLoading: boolean;
  isConversationActive: boolean;
  problem: string | null;
  
  // Conversation history
  conversations: Conversation[];
  isLoadingConversations: boolean;
  
  // Actions
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  setIsLoading: (loading: boolean) => void;
  setProblem: (problem: string | null) => void;
  clearConversation: () => void;
  
  // Conversation management
  createConversation: (data: {
    title: string;
    problem: string;
    context?: string;
    urgency?: string;
    activePersonas: PersonaType[];
  }) => Promise<void>;
  loadConversation: (conversationId: string) => Promise<void>;
  saveMessage: (message: Omit<Message, 'id' | 'timestamp'>) => Promise<void>;
  endConversation: () => Promise<void>;
  pauseConversation: () => Promise<void>;
  resumeConversation: () => Promise<void>;
  clearCurrentConversation: () => void;
  
  // Conversation history
  loadConversations: () => Promise<void>;
  deleteConversation: (conversationId: string) => Promise<void>;
}

export const useConversationStore = create<ConversationState>((set, get) => ({
  // Initial state
  currentConversation: null,
  messages: [],
  isLoading: false,
  isConversationActive: false,
  conversations: [],
  isLoadingConversations: false,
  problem: null,

  // Actions
  setProblem: (problem) => set({ problem }),
  clearConversation: () => set({ 
    currentConversation: null, 
    messages: [], 
    isConversationActive: false,
    problem: null 
  }),

  // Message management
  addMessage: (message) => {
    const newMessage: Message = {
      ...message,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    };
    
    set((state) => ({
      messages: [...state.messages, newMessage],
    }));

    // Save to database if we have an active conversation
    const { currentConversation, saveMessage } = get();
    if (currentConversation && !message.isLoading) {
      saveMessage(message);
    }
  },

  updateMessage: (id, updates) => {
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === id ? { ...msg, ...updates } : msg
      ),
    }));

    // Save updated message to database
    const { currentConversation, messages } = get();
    if (currentConversation && !updates.isLoading) {
      const updatedMessage = messages.find(m => m.id === id);
      if (updatedMessage && updatedMessage.content) {
        get().saveMessage({
          content: updatedMessage.content,
          persona: updatedMessage.persona,
          factChecked: updatedMessage.factChecked,
        });
      }
    }
  },

  setIsLoading: (isLoading) => {
    set({ isLoading });
  },

  // Conversation management
  createConversation: async (data) => {
    try {
      set({ isLoading: true });
      
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: data.title,
          problem: `${data.problem}${data.context ? `\n\nAdditional context: ${data.context}` : ''}`,
          activePersonas: data.activePersonas,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create conversation');
      }

      const { conversation } = await response.json();
      
      set({
        currentConversation: {
          ...conversation,
          createdAt: new Date(conversation.createdAt),
          updatedAt: new Date(conversation.updatedAt),
          activePersonas: JSON.parse(conversation.activePersonas),
        },
        messages: [],
        isConversationActive: true,
        isLoading: false,
      });

      // Add initial user message
      get().addMessage({
        content: `I need help with this decision: ${data.problem}`,
        persona: 'user',
      });

    } catch (error) {
      console.error('Error creating conversation:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  loadConversation: async (conversationId) => {
    try {
      set({ isLoading: true });
      
      const response = await fetch(`/api/conversations/${conversationId}`);
      if (!response.ok) {
        throw new Error('Failed to load conversation');
      }

      const { conversation, messages } = await response.json();
      
      set({
        currentConversation: {
          ...conversation,
          createdAt: new Date(conversation.createdAt),
          updatedAt: new Date(conversation.updatedAt),
          activePersonas: JSON.parse(conversation.activePersonas),
        },
        messages: messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        })),
        isConversationActive: conversation.status === 'ACTIVE',
        isLoading: false,
      });
    } catch (error) {
      console.error('Error loading conversation:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  saveMessage: async (message) => {
    const { currentConversation } = get();
    if (!currentConversation) return;

    try {
      await fetch(`/api/conversations/${currentConversation.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: message.content,
          persona: message.persona,
          factChecked: message.factChecked || false,
        }),
      });
    } catch (error) {
      console.error('Error saving message:', error);
    }
  },

  endConversation: async () => {
    const { currentConversation } = get();
    if (!currentConversation) return;

    try {
      await fetch(`/api/conversations/${currentConversation.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'COMPLETED' }),
      });

      set({
        isConversationActive: false,
        currentConversation: {
          ...currentConversation,
          status: 'COMPLETED',
        },
      });
    } catch (error) {
      console.error('Error ending conversation:', error);
    }
  },

  pauseConversation: async () => {
    const { currentConversation } = get();
    if (!currentConversation) return;

    try {
      await fetch(`/api/conversations/${currentConversation.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'PAUSED' }),
      });

      set({
        isConversationActive: false,
        currentConversation: {
          ...currentConversation,
          status: 'PAUSED',
        },
      });
    } catch (error) {
      console.error('Error pausing conversation:', error);
    }
  },

  resumeConversation: async () => {
    const { currentConversation } = get();
    if (!currentConversation) return;

    try {
      await fetch(`/api/conversations/${currentConversation.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'ACTIVE' }),
      });

      set({
        isConversationActive: true,
        currentConversation: {
          ...currentConversation,
          status: 'ACTIVE',
        },
      });
    } catch (error) {
      console.error('Error resuming conversation:', error);
    }
  },

  clearCurrentConversation: () => {
    set({
      currentConversation: null,
      messages: [],
      isConversationActive: false,
    });
  },

  // Conversation history
  loadConversations: async () => {
    try {
      set({ isLoadingConversations: true });
      
      const response = await fetch('/api/conversations');
      if (!response.ok) {
        throw new Error('Failed to load conversations');
      }

      const { conversations } = await response.json();
      
      set({
        conversations: conversations.map((conv: any) => ({
          ...conv,
          createdAt: new Date(conv.createdAt),
          updatedAt: new Date(conv.updatedAt),
          activePersonas: JSON.parse(conv.activePersonas),
        })),
        isLoadingConversations: false,
      });
    } catch (error) {
      console.error('Error loading conversations:', error);
      set({ isLoadingConversations: false });
    }
  },

  deleteConversation: async (conversationId) => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete conversation');
      }

      set((state) => ({
        conversations: state.conversations.filter(conv => conv.id !== conversationId),
        ...(state.currentConversation?.id === conversationId ? {
          currentConversation: null,
          messages: [],
          isConversationActive: false,
        } : {}),
      }));
    } catch (error) {
      console.error('Error deleting conversation:', error);
      throw error;
    }
  },
})); 