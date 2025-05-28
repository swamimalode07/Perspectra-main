import { NextRequest, NextResponse } from 'next/server';
import { PerplexityClient, PERSONA_PROMPTS, PersonaType } from '@/lib/perplexity';

interface PerplexityMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// Helper function to detect if content needs fact-checking
function needsFactChecking(content: string): boolean {
  const factCheckTriggers = [
    'statistic', 'data shows', 'research indicates', 'studies show',
    'according to', 'reports suggest', 'survey found', 'analysis reveals',
    'market share', 'growth rate', 'percentage', 'billion', 'million',
    'recent study', 'latest data', 'current trends', 'industry report'
  ];
  
  return factCheckTriggers.some(trigger => 
    content.toLowerCase().includes(trigger.toLowerCase())
  );
}

// Helper function to detect if previous messages contain factual claims
function containsFactualClaims(messages: any[]): boolean {
  if (!messages || messages.length === 0) return false;
  
  const recentMessages = messages.slice(-3); // Check last 3 messages
  return recentMessages.some(msg => needsFactChecking(msg.content || ''));
}

export async function POST(request: NextRequest) {
  try {
    const { messages, persona, problem, isAutoConversation, conversationContext } = await request.json();

    const apiKey = process.env.PERPLEXITY_API_KEY;
    
    // Debug API key loading
    console.log('API Key Debug:', {
      exists: !!apiKey,
      length: apiKey?.length,
      prefix: apiKey?.substring(0, 15) + '...',
      envKeys: Object.keys(process.env).filter(key => key.includes('PERPLEXITY'))
    });
    
    if (!apiKey) {
      console.error('PERPLEXITY_API_KEY environment variable not found');
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

    // Determine if this persona should use internet search for fact-checking
    const shouldUseSearch = persona === 'moderator' && (
      needsFactChecking(problem || '') || 
      containsFactualClaims(messages)
    );

    // Enhanced prompting for auto-conversation mode with point-based responses
    if (isAutoConversation) {
      systemPrompt += `

IMPORTANT: You are in AUTO-CONVERSATION mode. The AIs are discussing among themselves while the user observes.

CONVERSATION CONTEXT:
${conversationContext || 'No previous context'}

STRICT FORMATTING RULES:
- ALWAYS use bullet points (•) for your response
- Keep responses SHORT and FOCUSED (2-4 bullet points max)
- Each bullet point should be 1-2 sentences only
- NO long paragraphs or walls of text
- Be conversational but concise

${shouldUseSearch ? `
FACT-CHECKING MODE ACTIVATED:
- You have access to current internet data
- Verify any statistics or factual claims made in the conversation
- Use phrases like "Let me fact-check that..." or "Current data shows..."
- Provide accurate, up-to-date information
` : ''}

GUIDELINES:
- Build on previous points made by other personas
- Reference specific insights from earlier in the conversation
- Maintain your unique perspective while advancing the discussion
- If the conversation is getting repetitive, suggest a new angle
- Address other personas by name when referencing their points
- Use natural conversation flow - agree, disagree, or build upon previous statements

CURRENT PROBLEM/DECISION: ${problem}

Respond as if you're in a live boardroom discussion with the other AI personas. Remember: BULLET POINTS ONLY, KEEP IT CONCISE!`;
    } else {
      // For regular (non-auto) conversation mode
      systemPrompt += `

STRICT FORMATTING RULES:
- ALWAYS use bullet points (•) for your response
- Keep responses SHORT and FOCUSED (2-4 bullet points max)
- Each bullet point should be 1-2 sentences only
- NO long paragraphs or walls of text

${shouldUseSearch ? `
FACT-CHECKING MODE ACTIVATED:
- You have access to current internet data
- Verify any statistics or factual claims made in the conversation
- Use phrases like "Let me fact-check that..." or "Current data shows..."
- Provide accurate, up-to-date information
` : ''}

CURRENT PROBLEM/DECISION: ${problem}`;
    }

    // Build conversation history for context
    const conversationMessages: PerplexityMessage[] = [
      {
        role: 'system',
        content: systemPrompt
      }
    ];

    // Add recent conversation history for context (last 8 messages for better context)
    const recentMessages = messages.slice(-8);
    
    // Add conversation context
    if (recentMessages.length > 0) {
      const contextPrompt = isAutoConversation 
        ? `Previous conversation context:\n${recentMessages.map((msg: any) => 
            `${msg.persona}: ${msg.content}`
          ).join('\n')}\n\nNow respond as ${persona} to continue this discussion about: ${problem}\n\nRemember: Use bullet points only, keep it concise!`
        : `Previous conversation context:\n${recentMessages.map((msg: any) => 
            `${msg.persona}: ${msg.content}`
          ).join('\n')}\n\nAs ${persona}, provide your perspective on: ${problem}\n\nRemember: Use bullet points only, keep it concise!`;

      conversationMessages.push({
        role: 'user',
        content: contextPrompt
      });
    } else {
      // First message in conversation
      const initialPrompt = `As ${persona}, provide your initial perspective on this problem: ${problem}\n\nRemember: Use bullet points only, keep it concise!`;
      
      conversationMessages.push({
        role: 'user',
        content: initialPrompt
      });
    }

    // Make the API call with search enabled for fact-checking when needed
    const response = await client.chat(conversationMessages, 'sonar', shouldUseSearch);

    // Post-process response to ensure bullet point format
    let processedResponse = response;
    
    // If response doesn't start with bullet points, convert it
    if (!processedResponse.trim().startsWith('•') && !processedResponse.trim().startsWith('-')) {
      // Split by sentences and convert to bullet points
      const sentences = processedResponse.split(/[.!?]+/).filter(s => s.trim().length > 0);
      if (sentences.length > 1) {
        processedResponse = sentences.slice(0, 4).map(s => `• ${s.trim()}`).join('\n');
      } else {
        processedResponse = `• ${processedResponse.trim()}`;
      }
    }

    // Ensure we don't exceed 4 bullet points
    const bulletPoints = processedResponse.split('\n').filter(line => 
      line.trim().startsWith('•') || line.trim().startsWith('-')
    );
    
    if (bulletPoints.length > 4) {
      processedResponse = bulletPoints.slice(0, 4).join('\n');
    }

    return NextResponse.json({ 
      response: processedResponse,
      factChecked: shouldUseSearch 
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to get response from AI' },
      { status: 500 }
    );
  }
} 