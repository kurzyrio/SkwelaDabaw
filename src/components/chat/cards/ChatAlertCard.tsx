import React from 'react';
import { MapPin, AlertTriangle, CloudRain, Car, Construction, Users, Check } from 'lucide-react';

export interface AlertCardPayload {
  category: string;
  location: string;
  description: string;
  icon?: string;
  timestamp?: string;
}

interface ChatAlertCardProps {
  payload: AlertCardPayload | string;
}

export const ChatAlertCard: React.FC<ChatAlertCardProps> = ({ payload }) => {
  let data: AlertCardPayload | null = null;
  try {
    data = typeof payload === 'string' ? JSON.parse(payload) : payload;
  } catch (_) {
    data = null;
  }

  if (!data) return null;

  // Determine category theme
  const cat = (data.category || '').toLowerCase();
  let theme = {
    borderLeft: 'border-l-rose-500',
    badgeBg: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
    iconBg: 'bg-rose-500/10 text-rose-500',
    Icon: Car,
    label: 'Traffic Congestion'
  };

  if (cat.includes('flood') || cat.includes('rain')) {
    theme = {
      borderLeft: 'border-l-sky-500',
      badgeBg: 'bg-sky-500/10 text-sky-500 border-sky-500/20',
      iconBg: 'bg-sky-500/10 text-sky-500',
      Icon: CloudRain,
      label: 'Flood / Rain Warning'
    };
  } else if (cat.includes('work') || cat.includes('construction') || cat.includes('reroute')) {
    theme = {
      borderLeft: 'border-l-amber-500',
      badgeBg: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
      iconBg: 'bg-amber-500/10 text-amber-500',
      Icon: Construction,
      label: 'Road Work / Reroute'
    };
  } else if (cat.includes('queue') || cat.includes('jeep') || cat.includes('line')) {
    theme = {
      borderLeft: 'border-l-purple-500',
      badgeBg: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
      iconBg: 'bg-purple-500/10 text-purple-500',
      Icon: Users,
      label: 'Long Commuter Queue'
    };
  } else if (cat.includes('accident') || cat.includes('incident')) {
    theme = {
      borderLeft: 'border-l-orange-500',
      badgeBg: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
      iconBg: 'bg-orange-500/10 text-orange-500',
      Icon: AlertTriangle,
      label: 'Road Incident'
    };
  }

  const { Icon } = theme;

  return (
    <div className={`p-3.5 rounded-2xl bg-[var(--nested-bg)] border border-[var(--nested-border)] border-l-4 ${theme.borderLeft} space-y-2.5 w-full max-w-full min-w-0 overflow-hidden shadow-xs`}>
      {/* Header Pill & Category */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-7 h-7 rounded-xl ${theme.iconBg} border border-current/20 flex items-center justify-center shrink-0`}>
            <Icon className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-[var(--text-primary)] truncate">
            {data.category || theme.label}
          </span>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${theme.badgeBg} shrink-0`}>
          Live Alert
        </span>
      </div>

      {/* Location */}
      <div className="flex items-start gap-1.5 text-xs text-[var(--text-primary)] font-medium">
        <MapPin className="w-3.5 h-3.5 shrink-0 text-rose-500 mt-0.5" />
        <span className="leading-snug">{data.location}</span>
      </div>

      {/* Description / Bulletin */}
      {data.description && (
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 p-2.5 rounded-xl">
          {data.description}
        </p>
      )}

      {/* Footer / Attribution */}
      <div className="flex items-center justify-between pt-1 border-t border-[var(--nested-border)] text-[10px] text-[var(--text-secondary)]">
        <span className="flex items-center gap-1 opacity-80">
          <Check className="w-3 h-3 text-emerald-500" />
          Community Verified
        </span>
        <span className="font-semibold opacity-70">
          Davao Commute
        </span>
      </div>
    </div>
  );
};
