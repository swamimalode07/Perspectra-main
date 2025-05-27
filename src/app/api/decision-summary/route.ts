import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { perplexityClient } from '@/lib/perplexity';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { messages, problem } = await request.json();

    if (!messages || !problem) {
      return NextResponse.json(
        { error: 'Messages and problem are required' },
        { status: 400 }
      );
    }

    // Create a comprehensive summary prompt
    const summaryPrompt = `
You are an expert decision analyst. Based on the following conversation between AI personas about a decision, provide a comprehensive summary.

PROBLEM: ${problem}

CONVERSATION:
${messages.map((m: any) => `${m.persona}: ${m.content}`).join('\n\n')}

Please provide a structured analysis in the following format:

RECOMMENDATION: [One clear, actionable recommendation based on the conversation]

CONFIDENCE_SCORE: [0-100 score based on consensus and depth of analysis]

KEY_INSIGHTS: [List 4-6 key insights, each marked as PRO, CON, RISK, or OPPORTUNITY]

ACTION_PLAN: [5 specific, actionable steps the person should take]

RISKS: [3-4 main risks or concerns identified]

NEXT_STEPS: [4 immediate next steps for implementation]

Format your response as a structured analysis that helps the user make an informed decision.
`;

    const response = await perplexityClient.chat.completions.create({
      model: 'llama-3.1-sonar-small-128k-online',
      messages: [
        {
          role: 'system',
          content: 'You are an expert decision analyst who provides clear, actionable summaries of complex discussions.'
        },
        {
          role: 'user',
          content: summaryPrompt
        }
      ],
      max_tokens: 1000,
      temperature: 0.3
    });

    const summaryText = response.choices[0]?.message?.content || '';

    // Parse the structured response
    const parseSummary = (text: string) => {
      const sections = {
        recommendation: '',
        confidence: 75,
        keyInsights: [] as any[],
        actionPlan: [] as string[],
        risks: [] as string[],
        nextSteps: [] as string[]
      };

      // Extract recommendation
      const recMatch = text.match(/RECOMMENDATION:\s*(.*?)(?=\n\n|\nCONFIDENCE|$)/s);
      if (recMatch) sections.recommendation = recMatch[1].trim();

      // Extract confidence score
      const confMatch = text.match(/CONFIDENCE_SCORE:\s*(\d+)/);
      if (confMatch) sections.confidence = parseInt(confMatch[1]);

      // Extract key insights
      const insightsMatch = text.match(/KEY_INSIGHTS:\s*(.*?)(?=\n\nACTION_PLAN|$)/s);
      if (insightsMatch) {
        const insights = insightsMatch[1].split('\n').filter(line => line.trim());
        sections.keyInsights = insights.map(insight => {
          const type = insight.includes('PRO') ? 'pro' : 
                      insight.includes('CON') ? 'con' :
                      insight.includes('RISK') ? 'risk' : 'opportunity';
          return {
            type,
            content: insight.replace(/^[•\-\*]\s*/, '').replace(/\[(PRO|CON|RISK|OPPORTUNITY)\]\s*/, ''),
            confidence: 0.8,
            source: 'AI Analysis'
          };
        });
      }

      // Extract action plan
      const actionMatch = text.match(/ACTION_PLAN:\s*(.*?)(?=\n\nRISKS|$)/s);
      if (actionMatch) {
        sections.actionPlan = actionMatch[1]
          .split('\n')
          .filter(line => line.trim())
          .map(line => line.replace(/^[•\-\*\d\.]\s*/, '').trim());
      }

      // Extract risks
      const risksMatch = text.match(/RISKS:\s*(.*?)(?=\n\nNEXT_STEPS|$)/s);
      if (risksMatch) {
        sections.risks = risksMatch[1]
          .split('\n')
          .filter(line => line.trim())
          .map(line => line.replace(/^[•\-\*\d\.]\s*/, '').trim());
      }

      // Extract next steps
      const stepsMatch = text.match(/NEXT_STEPS:\s*(.*?)$/s);
      if (stepsMatch) {
        sections.nextSteps = stepsMatch[1]
          .split('\n')
          .filter(line => line.trim())
          .map(line => line.replace(/^[•\-\*\d\.]\s*/, '').trim());
      }

      return sections;
    };

    const summary = parseSummary(summaryText);

    return NextResponse.json({ 
      summary,
      rawAnalysis: summaryText 
    });

  } catch (error) {
    console.error('Error generating decision summary:', error);
    return NextResponse.json(
      { error: 'Failed to generate summary' },
      { status: 500 }
    );
  }
} 