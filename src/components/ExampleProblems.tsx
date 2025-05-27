import { Button } from '@/components/ui/Button';

interface ExampleProblem {
  id: string;
  title: string;
  description: string;
  category: 'career' | 'business' | 'personal' | 'financial';
  difficulty: 'simple' | 'moderate' | 'complex';
  estimatedTime: string;
  icon: string;
}

interface ExampleProblemsProps {
  onSelectExample: (problem: string) => void;
}

const EXAMPLE_PROBLEMS: ExampleProblem[] = [
  {
    id: 'career-change',
    title: 'Should I change careers?',
    description: 'I\'m considering leaving my stable job in marketing to pursue software development. I have some coding experience but would need to take a bootcamp.',
    category: 'career',
    difficulty: 'complex',
    estimatedTime: '10-15 min',
    icon: '💼'
  },
  {
    id: 'startup-idea',
    title: 'Should I start this business?',
    description: 'I have an idea for a meal planning app. I have $50k saved and could work on it full-time for a year, but I\'d have to quit my current job.',
    category: 'business',
    difficulty: 'complex',
    estimatedTime: '15-20 min',
    icon: '🚀'
  },
  {
    id: 'house-purchase',
    title: 'Should I buy this house?',
    description: 'Found a house I love but it\'s at the top of my budget. It needs some renovations and the commute would be 45 minutes longer.',
    category: 'financial',
    difficulty: 'moderate',
    estimatedTime: '8-12 min',
    icon: '🏠'
  },
  {
    id: 'relationship-move',
    title: 'Should I move for my partner?',
    description: 'My partner got a great job offer in another city. I\'d have to leave my job and friends, but it could be good for our relationship.',
    category: 'personal',
    difficulty: 'moderate',
    estimatedTime: '10-15 min',
    icon: '❤️'
  },
  {
    id: 'investment-decision',
    title: 'Should I invest in crypto?',
    description: 'I have $10k to invest and I\'m torn between index funds, individual stocks, or cryptocurrency. I\'m 28 and can handle some risk.',
    category: 'financial',
    difficulty: 'simple',
    estimatedTime: '5-8 min',
    icon: '💰'
  },
  {
    id: 'education-choice',
    title: 'Should I go back to school?',
    description: 'Considering an MBA to advance my career. It would cost $100k and take 2 years, but could lead to better opportunities.',
    category: 'career',
    difficulty: 'complex',
    estimatedTime: '12-18 min',
    icon: '🎓'
  }
];

const categoryColors = {
  career: 'from-blue-500 to-cyan-500',
  business: 'from-purple-500 to-pink-500',
  personal: 'from-green-500 to-emerald-500',
  financial: 'from-yellow-500 to-orange-500'
};

const difficultyInfo = {
  simple: { color: 'text-green-400', label: 'Quick Decision' },
  moderate: { color: 'text-yellow-400', label: 'Moderate Complexity' },
  complex: { color: 'text-red-400', label: 'Complex Analysis' }
};

export function ExampleProblems({ onSelectExample }: ExampleProblemsProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-white mb-3">
          Not sure where to start?
        </h3>
        <p className="text-slate-300 max-w-2xl mx-auto">
          Try one of these example decisions to see how Perspectra's AI advisors can help you think through complex choices.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {EXAMPLE_PROBLEMS.map((example) => (
          <div
            key={example.id}
            className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 hover:bg-white/10 transition-all cursor-pointer group"
            onClick={() => onSelectExample(example.description)}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="text-3xl">{example.icon}</div>
              <div className={`px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r ${categoryColors[example.category]} text-white`}>
                {example.category}
              </div>
            </div>

            {/* Title */}
            <h4 className="text-lg font-semibold text-white mb-2 group-hover:text-blue-300 transition-colors">
              {example.title}
            </h4>

            {/* Description */}
            <p className="text-sm text-slate-300 mb-4 line-clamp-3">
              {example.description}
            </p>

            {/* Metadata */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className={difficultyInfo[example.difficulty].color}>
                  {difficultyInfo[example.difficulty].label}
                </span>
              </div>
              <span className="text-slate-400">
                ⏱️ {example.estimatedTime}
              </span>
            </div>

            {/* Hover overlay */}
            <div className="mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectExample(example.description);
                }}
              >
                Try This Example
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Value Proposition */}
      <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl p-6 border border-blue-500/20 mt-8">
        <div className="text-center">
          <h4 className="text-xl font-semibold text-white mb-3">
            Why Perspectra Works
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl mb-2">🧠</div>
              <h5 className="font-medium text-white mb-1">Multiple Perspectives</h5>
              <p className="text-sm text-slate-300">
                Get insights from different thinking styles - analytical, intuitive, critical, and balanced.
              </p>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-2">🎯</div>
              <h5 className="font-medium text-white mb-1">Actionable Results</h5>
              <p className="text-sm text-slate-300">
                Every conversation ends with clear recommendations and next steps you can actually follow.
              </p>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-2">⚡</div>
              <h5 className="font-medium text-white mb-1">Fast & Focused</h5>
              <p className="text-sm text-slate-300">
                Get comprehensive analysis in minutes, not hours of overthinking.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 