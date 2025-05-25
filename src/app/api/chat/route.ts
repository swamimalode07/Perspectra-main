import { NextRequest, NextResponse } from 'next/server';
import { PerplexityClient, PERSONA_PROMPTS, PersonaType } from '@/lib/perplexity';

interface PerplexityMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function POST(request: NextRequest) {
  try {
    const { messages, persona, problem, isAutoConversation, conversationContext } = await request.json();

    const apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Perplexity API key not configured' },
        { status: 500 }
      );
    }

    const client = new PerplexityClient(apiKey);

    // Get the system prompt for the persona
    let systemPrompt = PERSONA_PROMPTS[persona as PersonaType];
    if (!systemPrompt) {
      return NextResponse.json(
        { error: 'Invalid persona type' },
        { status: 400 }
      );
    }

    // Enhanced prompting for auto-conversation mode
    if (isAutoConversation) {
      systemPrompt += `

IMPORTANT: You are in AUTO-CONVERSATION mode. The AIs are discussing among themselves while the user observes.

CONVERSATION CONTEXT:
${conversationContext || 'No previous context'}

GUIDELINES:
- Build on previous points made by other personas
- Reference specific insights from earlier in the conversation
- Keep responses concise but insightful (2-3 sentences max)
- Maintain your unique perspective while advancing the discussion
- If the conversation is getting repetitive, suggest a new angle or deeper exploration
- Address other personas by name when referencing their points
- Use natural conversation flow - agree, disagree, or build upon previous statements

CURRENT PROBLEM/DECISION: ${problem}

Respond as if you're in a live boardroom discussion with the other AI personas.`;
    }

    // Build conversation history for context
    const conversationMessages: PerplexityMessage[] = [
      {
        role: 'system',
        content: systemPrompt
      }
    ];

    // Add recent conversation history for context (last 10 messages)
    const recentMessages = messages.slice(-10);
    
    // Add conversation context
    if (recentMessages.length > 0) {
      conversationMessages.push({
        role: 'user',
        content: `Previous conversation context:\n${recentMessages.map((msg: any) => 
          `${msg.persona}: ${msg.content}`
        ).join('\n')}\n\nNow respond as ${persona} to continue this discussion about: ${problem}`
      });
    } else {
      // First message in conversation
      conversationMessages.push({
        role: 'user',
        content: `As ${persona}, provide your initial perspective on this problem: ${problem}`
      });
    }

    const response = await client.chat(conversationMessages);

    return NextResponse.json({ response });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to get response from AI' },
      { status: 500 }
    );
  }
} 