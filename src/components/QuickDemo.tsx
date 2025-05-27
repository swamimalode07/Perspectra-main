import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { MessageBubble } from '@/components/MessageBubble';
import { Message } from '@/store/conversation';

interface QuickDemoProps {
  onStartDemo: (messages: Message[], problem: string) => void;
}

const DEMO_PROBLEM = "Should I quit my job to start a freelance consulting business? I have 6 months of savings and some potential clients lined up.";

const DEMO_MESSAGES: Omit<Message, 'id' | 'timestamp'>[] = [
  {
    content: "• This is a significant career transition that requires careful analysis\n• Let's examine both the financial and professional implications\n• Consider your risk tolerance and backup plans",
    persona: 'moderator',
    factChecked: false
  },
  {
    content: "• Freelancing offers incredible freedom and potentially higher income\n• You can choose your clients and set your own schedule\n• The market for consulting is growing rapidly\n• You already have potential clients, which is a huge advantage",
    persona: 'system1',
    factChecked: false
  },
  {
    content: "• 6 months of savings may not be sufficient for business establishment\n• Client acquisition can be unpredictable and seasonal\n• You'll lose employer benefits like health insurance and retirement contributions\n• Consider the tax implications of self-employment",
    persona: 'system2',
    factChecked: true
  },
  {
    content: "• What if your potential clients don't convert to actual contracts?\n• The consulting market is highly competitive\n• You might struggle with irregular income and cash flow\n• Consider the isolation of working alone vs. team environment",
    persona: 'devilsAdvocate',
    factChecked: false
  },
  {
    content: "• Based on our analysis, this decision has both significant opportunities and risks\n• The key factors are: financial runway, client pipeline, and risk mitigation\n• Consider a gradual transition rather than an immediate jump",
    persona: 'moderator',
    factChecked: false
  }
];

export function QuickDemo({ onStartDemo }: QuickDemoProps) {
  const [showPreview, setShowPreview] = useState(false);

  const handleStartDemo = () => {
    const demoMessages: Message[] = DEMO_MESSAGES.map((msg, index) => ({
      ...msg,
      id: `demo-${index}`,
      timestamp: new Date(Date.now() - (DEMO_MESSAGES.length - index) * 30000) // 30 seconds apart
    }));

    onStartDemo(demoMessages, DEMO_PROBLEM);
  };

  return (
    <div className="bg-gradient-to-r from-green-500/10 to-blue-500/10 rounded-xl p-6 border border-green-500/20">
      <div className="text-center mb-6">
        <div className="text-4xl mb-3">⚡</div>
        <h3 className="text-xl font-bold text-white mb-2">
          See Perspectra in Action
        </h3>
        <p className="text-slate-300">
          Watch a 2-minute demo of AI advisors analyzing a real career decision
        </p>
      </div>

      {!showPreview ? (
        <div className="space-y-4">
          <div className="bg-white/5 rounded-lg p-4">
            <h4 className="text-green-400 font-medium mb-2">Demo Scenario:</h4>
            <p className="text-sm text-slate-300 italic">
              "{DEMO_PROBLEM}"
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={() => setShowPreview(true)}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              Preview Conversation
            </Button>
            <Button
              onClick={handleStartDemo}
              className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
            >
              Try Interactive Demo
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-white/5 rounded-lg p-4 max-h-64 overflow-y-auto space-y-3">
            {DEMO_MESSAGES.map((message, index) => (
              <MessageBubble
                key={index}
                message={{
                  ...message,
                  id: `preview-${index}`,
                  timestamp: new Date()
                }}
              />
            ))}
          </div>

          <div className="flex gap-3">
            <Button
              onClick={() => setShowPreview(false)}
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10"
            >
              Back
            </Button>
            <Button
              onClick={handleStartDemo}
              className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
            >
              Start Interactive Demo
            </Button>
          </div>

          <div className="text-center">
            <p className="text-xs text-slate-400">
              This demo shows how 4 AI advisors analyze decisions from different angles
            </p>
          </div>
        </div>
      )}
    </div>
  );
} 