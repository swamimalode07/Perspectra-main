import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Message } from '@/store/conversation';

interface DecisionSummaryProps {
  messages: Message[];
  problem: string;
  onExport?: () => void;
  onImplement?: (actions: string[]) => void;
}

interface DecisionInsight {
  type: 'pro' | 'con' | 'risk' | 'opportunity' | 'action';
  content: string;
  confidence: number;
  source: string;
}

export function DecisionSummary({ messages, problem, onExport, onImplement }: DecisionSummaryProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [summary, setSummary] = useState<{
    recommendation: string;
    confidence: number;
    keyInsights: DecisionInsight[];
    actionPlan: string[];
    risks: string[];
    nextSteps: string[];
  } | null>(null);

  const generateSummary = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/decision-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages.map(m => ({
            content: m.content,
            persona: m.persona,
            timestamp: m.timestamp
          })),
          problem
        })
      });

      const data = await response.json();
      setSummary(data.summary);
    } catch (error) {
      console.error('Error generating summary:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const analyzeConversation = () => {
    const insights: DecisionInsight[] = [];
    const actionItems: string[] = [];
    const risks: string[] = [];

    // Simple analysis of conversation content
    messages.forEach(message => {
      const content = message.content.toLowerCase();
      
      // Extract pros/cons
      if (content.includes('benefit') || content.includes('advantage') || content.includes('positive')) {
        insights.push({
          type: 'pro',
          content: message.content.split('.')[0] + '.',
          confidence: 0.7,
          source: message.persona
        });
      }
      
      if (content.includes('risk') || content.includes('concern') || content.includes('problem')) {
        insights.push({
          type: 'con',
          content: message.content.split('.')[0] + '.',
          confidence: 0.8,
          source: message.persona
        });
        risks.push(message.content.split('.')[0] + '.');
      }

      // Extract action items
      if (content.includes('should') || content.includes('recommend') || content.includes('suggest')) {
        actionItems.push(message.content.split('.')[0] + '.');
      }
    });

    return {
      recommendation: "Based on the conversation, here's what the AI advisors suggest...",
      confidence: 75,
      keyInsights: insights.slice(0, 6),
      actionPlan: actionItems.slice(0, 5),
      risks: risks.slice(0, 3),
      nextSteps: [
        "Review the key insights and risks identified",
        "Consider the recommended action plan",
        "Gather additional information if needed",
        "Make your decision with confidence"
      ]
    };
  };

  const quickSummary = analyzeConversation();

  if (messages.length < 3) {
    return (
      <div className="bg-white/5 rounded-xl p-6 border border-white/10">
        <div className="text-center py-8">
          <div className="text-4xl mb-4">🤔</div>
          <h3 className="text-lg font-semibold text-white mb-2">Keep the conversation going</h3>
          <p className="text-slate-400">
            Have a few more exchanges to generate a meaningful decision summary.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick Insights */}
      <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl p-6 border border-blue-500/20">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-bold">📊</span>
          </div>
          <h3 className="text-xl font-semibold text-white">Decision Insights</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Pros */}
          <div className="bg-green-500/10 rounded-lg p-4 border border-green-500/20">
            <h4 className="text-green-400 font-medium mb-3 flex items-center gap-2">
              <span>✅</span> Key Benefits ({quickSummary.keyInsights.filter(i => i.type === 'pro').length})
            </h4>
            <div className="space-y-2">
              {quickSummary.keyInsights.filter(i => i.type === 'pro').slice(0, 3).map((insight, idx) => (
                <div key={idx} className="text-sm text-slate-300">
                  • {insight.content}
                </div>
              ))}
            </div>
          </div>

          {/* Cons */}
          <div className="bg-red-500/10 rounded-lg p-4 border border-red-500/20">
            <h4 className="text-red-400 font-medium mb-3 flex items-center gap-2">
              <span>⚠️</span> Key Concerns ({quickSummary.keyInsights.filter(i => i.type === 'con').length})
            </h4>
            <div className="space-y-2">
              {quickSummary.keyInsights.filter(i => i.type === 'con').slice(0, 3).map((insight, idx) => (
                <div key={idx} className="text-sm text-slate-300">
                  • {insight.content}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Confidence Meter */}
        <div className="bg-white/5 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-300">Decision Confidence</span>
            <span className="text-sm font-bold text-white">{quickSummary.confidence}%</span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${quickSummary.confidence}%` }}
            />
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Based on consensus among AI advisors and depth of analysis
          </p>
        </div>
      </div>

      {/* Action Plan */}
      <div className="bg-white/5 rounded-xl p-6 border border-white/10">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <span>🎯</span> Recommended Action Plan
        </h3>
        
        <div className="space-y-3 mb-6">
          {quickSummary.nextSteps.map((step, idx) => (
            <div key={idx} className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold mt-0.5">
                {idx + 1}
              </div>
              <div className="text-slate-300">{step}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <Button
            onClick={generateSummary}
            disabled={isGenerating}
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
          >
            {isGenerating ? 'Generating...' : 'Generate Detailed Summary'}
          </Button>
          
          <Button
            onClick={onExport}
            variant="outline"
            className="border-white/20 text-white hover:bg-white/10"
          >
            Export Summary
          </Button>
        </div>
      </div>

      {/* Detailed AI Summary */}
      {summary && (
        <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl p-6 border border-purple-500/20">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span>🤖</span> AI-Generated Summary
          </h3>
          
          <div className="space-y-4">
            <div className="bg-white/5 rounded-lg p-4">
              <h4 className="text-purple-400 font-medium mb-2">Final Recommendation</h4>
              <p className="text-slate-300">{summary.recommendation}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white/5 rounded-lg p-4">
                <h4 className="text-blue-400 font-medium mb-2">Action Items</h4>
                <ul className="space-y-1">
                  {summary.actionPlan.map((action, idx) => (
                    <li key={idx} className="text-sm text-slate-300">• {action}</li>
                  ))}
                </ul>
              </div>

              <div className="bg-white/5 rounded-lg p-4">
                <h4 className="text-yellow-400 font-medium mb-2">Key Risks</h4>
                <ul className="space-y-1">
                  {summary.risks.map((risk, idx) => (
                    <li key={idx} className="text-sm text-slate-300">• {risk}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 