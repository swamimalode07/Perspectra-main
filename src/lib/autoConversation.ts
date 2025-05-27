import { PersonaType } from './perplexity';
import { Message } from '@/store/conversation';

export interface ConversationState {
  currentSpeaker: PersonaType | null;
  conversationRound: number;
  topicFocus: string;
  isActive: boolean;
  pauseRequested: boolean;
  lastSpeakTime: number;
}

export interface AutoConversationConfig {
  speakingInterval: number; // milliseconds between AI responses
  maxRoundsPerTopic: number;
  enableTopicEvolution: boolean;
  pauseOnUserInterrupt: boolean;
}

export class AutoConversationEngine {
  public config: AutoConversationConfig; // Made public for external access
  private state: ConversationState;
  private personas: PersonaType[] = ['system1', 'system2', 'moderator', 'devilsAdvocate'];
  private conversationHistory: Message[] = [];
  private onMessageCallback?: (message: Omit<Message, 'id' | 'timestamp'>) => void;
  private onStateChangeCallback?: (state: ConversationState) => void;

  constructor(config: Partial<AutoConversationConfig> = {}) {
    this.config = {
      speakingInterval: 3000, // 3 seconds between responses
      maxRoundsPerTopic: 8,
      enableTopicEvolution: true,
      pauseOnUserInterrupt: true,
      ...config,
    };

    this.state = {
      currentSpeaker: null,
      conversationRound: 0,
      topicFocus: '',
      isActive: false,
      pauseRequested: false,
      lastSpeakTime: 0,
    };
  }

  public setMessageCallback(callback: (message: Omit<Message, 'id' | 'timestamp'>) => void) {
    this.onMessageCallback = callback;
  }

  public setStateChangeCallback(callback: (state: ConversationState) => void) {
    this.onStateChangeCallback = callback;
  }

  public updateConfig(newConfig: Partial<AutoConversationConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  public setSpeakingInterval(interval: number) {
    this.config.speakingInterval = interval;
  }

  public startConversation(problem: string, initialMessages: Message[] = []) {
    this.conversationHistory = [...initialMessages];
    this.state = {
      currentSpeaker: null,
      conversationRound: 0,
      topicFocus: problem,
      isActive: true,
      pauseRequested: false,
      lastSpeakTime: Date.now(),
    };

    this.notifyStateChange();
    this.scheduleNextResponse();
  }

  public pauseConversation() {
    this.state.pauseRequested = true;
    this.state.isActive = false;
    this.notifyStateChange();
  }

  public resumeConversation() {
    this.state.pauseRequested = false;
    this.state.isActive = true;
    this.notifyStateChange();
    this.scheduleNextResponse();
  }

  public stopConversation() {
    this.state.isActive = false;
    this.state.pauseRequested = false;
    this.state.currentSpeaker = null;
    this.notifyStateChange();
  }

  public interruptWithUserMessage(message: Message) {
    if (this.config.pauseOnUserInterrupt) {
      this.pauseConversation();
    }
    
    this.conversationHistory.push(message);
    
    // Resume after user input with a response to the user
    if (this.state.isActive) {
      setTimeout(() => {
        this.generateResponse();
      }, 1000);
    }
  }

  public addMessage(message: Message) {
    this.conversationHistory.push(message);
  }

  private scheduleNextResponse() {
    if (!this.state.isActive || this.state.pauseRequested) return;

    setTimeout(() => {
      this.generateResponse();
    }, this.config.speakingInterval);
  }

  private async generateResponse() {
    if (!this.state.isActive || this.state.pauseRequested) return;

    const nextSpeaker = this.selectNextSpeaker();
    this.state.currentSpeaker = nextSpeaker;
    this.state.lastSpeakTime = Date.now();
    this.notifyStateChange();

    try {
      const response = await this.getPersonaResponse(nextSpeaker);
      
      if (this.onMessageCallback && response.content) {
        this.onMessageCallback({
          content: response.content,
          persona: nextSpeaker,
          factChecked: response.factChecked || false,
        });
      }

      this.state.conversationRound++;
      
      // Check if we should evolve the topic or pause
      if (this.shouldEvolveConversation()) {
        await this.evolveConversationTopic();
      }

      // Schedule next response
      this.scheduleNextResponse();
      
    } catch (error) {
      console.error('Error generating auto-conversation response:', error);
      this.pauseConversation();
    }
  }

  private selectNextSpeaker(): PersonaType {
    const lastMessage = this.conversationHistory[this.conversationHistory.length - 1];
    const lastSpeaker = lastMessage?.persona;

    // Intelligent speaker selection based on conversation flow
    if (this.state.conversationRound === 0) {
      return 'moderator'; // Start with moderator to set context
    }

    // Avoid same speaker twice in a row (unless it's a user message)
    if (lastSpeaker && lastSpeaker !== 'user') {
      const availablePersonas = this.personas.filter(p => p !== lastSpeaker);
      
      // Select based on conversation context
      if (this.conversationHistory.length % 4 === 1) return 'system1'; // Quick reactions
      if (this.conversationHistory.length % 4 === 2) return 'system2'; // Analytical response
      if (this.conversationHistory.length % 4 === 3) return 'devilsAdvocate'; // Challenge assumptions
      return 'moderator'; // Synthesize and guide
    }

    // Default rotation
    return this.personas[this.state.conversationRound % this.personas.length];
  }

  private async getPersonaResponse(persona: PersonaType): Promise<{content: string, factChecked: boolean}> {
    const conversationContext = this.buildConversationContext();
    const personaPrompt = this.getEnhancedPersonaPrompt(persona);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: this.conversationHistory,
          persona,
          problem: this.state.topicFocus,
          isAutoConversation: true,
          conversationContext,
        }),
      });

      const data = await response.json();
      return {
        content: data.response || 'No response generated',
        factChecked: data.factChecked || false
      };
    } catch (error) {
      console.error('Error getting persona response:', error);
      return {
        content: 'Error generating response',
        factChecked: false
      };
    }
  }

  private buildConversationContext(): string {
    const recentMessages = this.conversationHistory.slice(-6); // Last 6 messages for context
    return recentMessages
      .map(msg => `${msg.persona}: ${msg.content.slice(0, 100)}`)
      .join('\n');
  }

  private getEnhancedPersonaPrompt(persona: PersonaType): string {
    const basePrompts = {
      system1: "You are System-1 Thinker. Respond with quick, intuitive insights. Be emotional and spontaneous. Reference your gut feelings and immediate reactions.",
      system2: "You are System-2 Thinker. Provide analytical, deliberate responses. Break down complex issues logically. Ask clarifying questions and consider multiple angles.",
      moderator: "You are the Moderator. Synthesize different viewpoints, guide the conversation, and ensure all perspectives are heard. Keep discussions productive.",
      devilsAdvocate: "You are the Devil's Advocate. Challenge assumptions, point out potential flaws, and present alternative viewpoints. Be constructively critical."
    };

    const autoConversationAddition = `

IMPORTANT: You are in an auto-conversation mode. The AIs are discussing among themselves while the user observes. 
- Build on previous points made by other personas
- Reference specific insights from earlier in the conversation
- Keep responses concise but insightful (2-3 sentences max)
- Maintain your unique perspective while advancing the discussion
- If the conversation is getting repetitive, suggest a new angle or deeper exploration`;

    return basePrompts[persona] + autoConversationAddition;
  }

  private shouldEvolveConversation(): boolean {
    return (
      this.config.enableTopicEvolution &&
      this.state.conversationRound > 0 &&
      this.state.conversationRound % this.config.maxRoundsPerTopic === 0
    );
  }

  private async evolveConversationTopic() {
    // This could be enhanced to use AI to suggest topic evolution
    const evolutions = [
      "Let's explore the potential risks and downsides",
      "What would be the long-term implications?",
      "How might this decision affect different stakeholders?",
      "What alternative approaches should we consider?",
      "What assumptions are we making that we should question?"
    ];

    const evolution = evolutions[Math.floor(Math.random() * evolutions.length)];
    
    if (this.onMessageCallback) {
      this.onMessageCallback({
        content: `🔄 **Topic Evolution**: ${evolution}`,
        persona: 'moderator',
      });
    }
  }

  private notifyStateChange() {
    if (this.onStateChangeCallback) {
      this.onStateChangeCallback({ ...this.state });
    }
  }

  public getState(): ConversationState {
    return { ...this.state };
  }
} 