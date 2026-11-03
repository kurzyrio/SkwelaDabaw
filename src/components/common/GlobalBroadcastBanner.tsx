import React, { useState, useEffect } from 'react';
import { 
  Info, 
  AlertTriangle, 
  AlertOctagon, 
  CheckCircle2, 
  X, 
  ExternalLink 
} from 'lucide-react';
import { 
  RemoteAppConfig, 
  isBannerDismissed, 
  dismissBanner 
} from '../../services/appConfigService';

interface GlobalBroadcastBannerProps {
  config?: RemoteAppConfig['globalBanner'];
}

export const GlobalBroadcastBanner: React.FC<GlobalBroadcastBannerProps> = ({ config }) => {
  const [isVisible, setIsVisible] = useState<boolean>(false);

  useEffect(() => {
    if (config?.enabled && config.text && !isBannerDismissed(config.text)) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [config]);

  if (!isVisible || !config || !config.text) return null;

  const handleDismiss = () => {
    setIsVisible(false);
    if (config.dismissible && config.text) {
      dismissBanner(config.text);
    }
  };

  const getStyle = () => {
    switch (config.type) {
      case 'danger':
        return {
          bg: 'bg-red-500/15 border-red-500/30 text-red-400',
          icon: <AlertOctagon className="w-4 h-4 shrink-0 text-red-400" />
        };
      case 'warning':
        return {
          bg: 'bg-amber-500/15 border-amber-500/30 text-amber-400',
          icon: <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
        };
      case 'success':
        return {
          bg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400',
          icon: <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
        };
      case 'info':
      default:
        return {
          bg: 'bg-blue-500/15 border-blue-500/30 text-blue-400',
          icon: <Info className="w-4 h-4 shrink-0 text-blue-400" />
        };
    }
  };

  const style = getStyle();

  return (
    <div className={`w-full border-b px-4 py-2.5 flex items-center justify-between gap-3 text-xs font-medium z-30 transition-all animate-fade-in ${style.bg}`}>
      <div className="flex items-center gap-2.5 overflow-hidden flex-1">
        {style.icon}
        <span className="truncate leading-tight text-[var(--text-primary)]">
          {config.text}
        </span>
        {config.link && (
          <a
            href={config.link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-bold underline shrink-0 hover:opacity-80"
          >
            <span>Learn More</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>

      {config.dismissible && (
        <button
          type="button"
          onClick={handleDismiss}
          className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-[var(--text-secondary)] hover:text-[var(--text-primary)] shrink-0 transition-colors"
          title="Dismiss notice"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
