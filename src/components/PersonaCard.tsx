import { PersonaType } from '@/lib/perplexity';

interface PersonaInfo {
  name: string;
  description: string;
  color: string;
  icon: string;
}

interface PersonaCardProps {
  info: PersonaInfo;
  isActive?: boolean;
  isLoading?: boolean;
  onClick: () => void;
}

export function PersonaCard({ info, isActive, isLoading, onClick }: PersonaCardProps) {
  const getColorClasses = (color: string) => {
    switch (color) {
      case 'bg-red-500':
        return 'from-red-500 to-red-600 border-red-400/30';
      case 'bg-blue-500':
        return 'from-blue-500 to-blue-600 border-blue-400/30';
      case 'bg-green-500':
        return 'from-green-500 to-green-600 border-green-400/30';
      case 'bg-purple-500':
        return 'from-purple-500 to-purple-600 border-purple-400/30';
      default:
        return 'from-gray-500 to-gray-600 border-gray-400/30';
    }
  };

  const colorClasses = getColorClasses(info.color);

  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className={`
        w-full p-4 rounded-xl border transition-all duration-200 text-left group
        ${isActive 
          ? `bg-gradient-to-r ${colorClasses} shadow-lg scale-105` 
          : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
        }
        ${isLoading ? 'opacity-75 cursor-not-allowed' : 'hover:scale-102 cursor-pointer'}
      `}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`
          w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0
          ${isActive 
            ? 'bg-white/20' 
            : 'bg-white/10 group-hover:bg-white/15'
          }
          ${isLoading ? 'animate-pulse' : ''}
        `}>
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            info.icon
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className={`
            font-semibold text-sm mb-1 transition-colors
            ${isActive ? 'text-white' : 'text-white group-hover:text-white'}
          `}>
            {info.name}
          </h3>
          <p className={`
            text-xs leading-relaxed transition-colors
            ${isActive ? 'text-white/80' : 'text-slate-400 group-hover:text-slate-300'}
          `}>
            {info.description}
          </p>
          
          {isLoading && (
            <div className="mt-2 text-xs text-white/60">
              Thinking...
            </div>
          )}
        </div>

        {/* Active Indicator */}
        {isActive && (
          <div className="w-2 h-2 bg-white rounded-full shrink-0 animate-pulse" />
        )}
      </div>

      {/* Progress Bar */}
      {isActive && (
        <div className="mt-3 h-1 bg-white/20 rounded-full overflow-hidden">
          <div className="h-full bg-white/40 rounded-full animate-pulse" />
        </div>
      )}
    </button>
  );
} 