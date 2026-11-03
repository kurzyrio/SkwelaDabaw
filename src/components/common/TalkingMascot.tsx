import React, { useState, useEffect } from 'react';
import { playEagleSound } from '../../utils/audio';
import { EagleBuddy, EagleMood } from './EagleBuddy';
import { Calendar, CheckSquare, Bus, Coffee, Lightbulb } from 'lucide-react';
import { getProactiveStudentInsight, BayaniStudentInsight, BayaniQuickAction } from '../../services/bayaniAssistantService';

export type MascotMood = 'happy' | 'waving' | 'thinking' | 'excited' | 'shield' | 'budget' | 'alarm';

interface TalkingMascotProps {
  mood?: MascotMood;
  message?: string;
  subMessage?: string;
  onTap?: () => void;
  onSelectAction?: (actionType: string) => void;
  enableProactiveHelper?: boolean;
}

export const TalkingMascot: React.FC<TalkingMascotProps> = ({
  mood = 'happy',
  message,
  subMessage,
  onTap,
  onSelectAction,
  enableProactiveHelper = true
}) => {
  const [isWiggling, setIsWiggling] = useState(false);
  const [isTalking, setIsTalking] = useState(true);
  const [insight, setInsight] = useState<BayaniStudentInsight | null>(null);

  const refreshInsight = async () => {
    if (!enableProactiveHelper) return;
    try {
      const data = await getProactiveStudentInsight();
      setInsight(data);
    } catch {
      // Silent catch
    }
  };

  useEffect(() => {
    refreshInsight();
    const handleLanguageChange = () => {
      refreshInsight();
    };
    window.addEventListener('skweladabaw_language_changed', handleLanguageChange);
    window.addEventListener('storage', handleLanguageChange);
    return () => {
      window.removeEventListener('skweladabaw_language_changed', handleLanguageChange);
      window.removeEventListener('storage', handleLanguageChange);
    };
  }, [enableProactiveHelper]);

  useEffect(() => {
    setIsTalking(true);
    const timer = setTimeout(() => {
      setIsTalking(false);
    }, 4500);
    return () => clearTimeout(timer);
  }, [message, insight?.headline]);

  const getEagleMood = (): EagleMood => {
    if (insight && !message) {
      return insight.mood;
    }

    switch (mood) {
      case 'waving':
        return 'friendly';
      case 'thinking':
        return 'questioning';
      case 'excited':
        return 'celebrating';
      case 'shield':
        return 'confident';
      case 'budget':
        return 'focused';
      case 'alarm':
        return 'alert';
      default:
        return 'friendly';
    }
  };

  const handleMascotTap = () => {
    setIsWiggling(true);
    setIsTalking(true);
    playEagleSound('chirp');
    if (onTap) onTap();
    setTimeout(() => setIsWiggling(false), 500);
    setTimeout(() => setIsTalking(false), 4000);
  };

  const handleActionClick = (action: BayaniQuickAction) => {
    playEagleSound('chirp');
    setIsTalking(true);
    setTimeout(() => setIsTalking(false), 3000);

    if (action.actionType === 'show_tip') {
      refreshInsight();
    } else if (onSelectAction) {
      onSelectAction(action.actionType);
    }
  };

  const displayMessage = message || insight?.headline || 'Kumusta! Ako si Bayani, imong student companion!';
  const displaySubMessage = subMessage || insight?.body;
  const actions = insight?.quickActions || [];

  return (
    <div className="select-none animate-fade-in">
      <div className="p-5 sm:p-6 rounded-3xl bg-[var(--card-bg)] border border-[var(--card-border)] space-y-4 shadow-sm">
        {/* Header Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
              Bayani Companion
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] font-medium">
            <span>Dabawenyo Guide</span>
            <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
          </div>
        </div>

        {/* Mascot & Speech Row: Whole Unclipped Mascot Display */}
        <div className="flex items-center gap-4 sm:gap-6">
          <div 
            onClick={handleMascotTap}
            className="relative shrink-0 cursor-pointer group"
            title="Tap Bayani"
          >
            {/* Generous unclipped container with ample headroom for crest & wings */}
            <div className={`w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-[var(--nested-bg)] border border-[var(--nested-border)] flex items-center justify-center p-1 overflow-visible transition-transform ${isWiggling ? 'animate-bounce scale-105' : 'hover:scale-105'}`}>
              <EagleBuddy
                mood={getEagleMood()}
                width={100}
                height={100}
                showSpeech={false}
                isAnimated={true}
                isTalking={isTalking}
              />
            </div>
            <div className="absolute -bottom-1.5 -right-1 px-2 py-0.5 rounded-full bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] text-[10px] font-extrabold shadow-sm">
              Bayani
            </div>
          </div>

          {/* Conversational Guidance Dialogue */}
          <div className="flex-1 min-w-0 space-y-1.5">
            <h4 className="font-bold text-sm sm:text-base text-[var(--text-primary)] leading-snug">
              {displayMessage}
            </h4>
            {displaySubMessage && (
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed font-normal">
                {displaySubMessage}
              </p>
            )}
          </div>
        </div>

        {/* Quick Action Chips */}
        {actions.length > 0 && (
          <div className="pt-2 border-t border-[var(--card-border)] flex items-center gap-2 flex-wrap">
            {actions.map((action) => (
              <button
                key={action.id}
                type="button"
                onClick={() => handleActionClick(action)}
                className="px-3 py-1.5 rounded-full bg-[var(--nested-bg)] border border-[var(--nested-border)] text-[var(--text-primary)] text-xs font-semibold hover:opacity-90 transition-all flex items-center gap-1.5"
              >
                {action.iconType === 'schedule' && <Calendar className="w-3.5 h-3.5 text-blue-400" />}
                {action.iconType === 'tasks' && <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />}
                {action.iconType === 'jeep' && <Bus className="w-3.5 h-3.5 text-amber-400" />}
                {action.iconType === 'spots' && <Coffee className="w-3.5 h-3.5 text-purple-400" />}
                {action.iconType === 'tip' && <Lightbulb className="w-3.5 h-3.5 text-yellow-400" />}
                <span>{action.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TalkingMascot;
