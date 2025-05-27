import { Message } from '@/store/conversation';

interface DecisionProgressProps {
  messages: Message[];
  problem: string;
}

export function DecisionProgress({ messages, problem }: DecisionProgressProps) {
  const getProgress = () => {
    if (!problem.trim()) return { step: 0, percentage: 0, label: 'Set your problem' };
    
    const messageCount = messages.length;
    
    if (messageCount === 0) {
      return { step: 1, percentage: 20, label: 'Problem defined - Start conversation' };
    } else if (messageCount < 3) {
      return { step: 2, percentage: 40, label: 'Gathering initial perspectives' };
    } else if (messageCount < 6) {
      return { step: 3, percentage: 60, label: 'Analyzing different viewpoints' };
    } else if (messageCount < 10) {
      return { step: 4, percentage: 80, label: 'Building comprehensive analysis' };
    } else {
      return { step: 5, percentage: 100, label: 'Ready for decision summary' };
    }
  };

  const progress = getProgress();
  const steps = [
    { label: 'Define Problem', icon: '🎯' },
    { label: 'Initial Analysis', icon: '🧠' },
    { label: 'Multiple Views', icon: '👥' },
    { label: 'Deep Dive', icon: '🔍' },
    { label: 'Final Summary', icon: '📋' }
  ];

  return (
    <div className="bg-white/5 rounded-lg p-4 border border-white/10">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-slate-300">Decision Progress</h4>
        <span className="text-xs text-slate-400">{progress.percentage}% Complete</span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-700 rounded-full h-2 mb-4">
        <div 
          className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500"
          style={{ width: `${progress.percentage}%` }}
        />
      </div>

      {/* Steps */}
      <div className="flex justify-between items-center">
        {steps.map((step, index) => (
          <div key={index} className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all ${
              index < progress.step 
                ? 'bg-blue-500 text-white' 
                : index === progress.step 
                  ? 'bg-blue-500/50 text-white animate-pulse' 
                  : 'bg-slate-600 text-slate-400'
            }`}>
              {step.icon}
            </div>
            <span className={`text-xs mt-1 text-center ${
              index <= progress.step ? 'text-slate-300' : 'text-slate-500'
            }`}>
              {step.label}
            </span>
          </div>
        ))}
      </div>

      {/* Current Status */}
      <div className="mt-4 text-center">
        <p className="text-sm text-blue-400 font-medium">{progress.label}</p>
        {progress.step < 5 && (
          <p className="text-xs text-slate-400 mt-1">
            {progress.step === 1 && "Click on an AI advisor or start auto-conversation"}
            {progress.step === 2 && "Great start! Keep the conversation going"}
            {progress.step === 3 && "Multiple perspectives emerging"}
            {progress.step === 4 && "Almost ready for comprehensive analysis"}
          </p>
        )}
      </div>
    </div>
  );
} 