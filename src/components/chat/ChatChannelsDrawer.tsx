import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Search, 
  ShieldCheck, 
  Check, 
  MessageSquare,
  Bus,
  GraduationCap,
  Leaf,
  Compass,
  Stethoscope,
  Coffee
} from 'lucide-react';
import { ChatChannel } from '../../types';

export const formatChannelDisplayName = (name: string): string => {
  if (!name) return 'Lounge';
  const clean = name.replace(/^#+/, '').trim();
  if (clean.toLowerCase() === 'general-dabaw') return 'General Dabaw';
  if (clean.toLowerCase() === 'commute-traffic-alerts' || clean.toLowerCase() === 'commute-traffic') {
    return 'Commute & Traffic Alerts';
  }
  return clean
    .split(/[-_]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
};

const getChannelIcon = (iconKey?: string) => {
  switch (iconKey) {
    case 'bus': return Bus;
    case 'graduation': return GraduationCap;
    case 'leaf': return Leaf;
    case 'compass': return Compass;
    case 'stethoscope': return Stethoscope;
    case 'coffee': return Coffee;
    default: return MessageSquare;
  }
};

interface ChatChannelsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  channels: ChatChannel[];
  activeChannelId: string;
  onSelectChannel: (channelId: string) => void;
  onOpenRules: () => void;
}

export const ChatChannelsDrawer: React.FC<ChatChannelsDrawerProps> = ({
  isOpen,
  onClose,
  channels,
  activeChannelId,
  onSelectChannel,
  onOpenRules
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');

  if (!isOpen) return null;

  const filteredChannels = channels.filter((ch) => {
    const title = formatChannelDisplayName(ch.name).toLowerCase();
    const desc = (ch.description || '').toLowerCase();
    const query = searchQuery.trim().toLowerCase();
    return !query || title.includes(query) || desc.includes(query);
  });

  const content = (
    <div 
      className="fixed inset-0 z-[99999] flex justify-start bg-black/60 backdrop-blur-xs sheet-backdrop-enter"
      onClick={onClose}
    >
      <div 
        className="w-[85%] max-w-sm h-full bg-[var(--card-bg)] border-r border-[var(--card-border)] shadow-2xl flex flex-col sheet-enter-spring"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="pt-[calc(1rem+env(safe-area-inset-top))] px-4 pb-3 border-b border-[var(--card-border)] flex items-center justify-between gap-3 shrink-0">
          <div>
            <h3 className="font-bold text-sm text-[var(--text-primary)]">
              Chats &amp; Lounges
            </h3>
            <p className="text-[11px] text-[var(--text-secondary)]">
              Davao student community lounges
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[var(--nested-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center transition-colors pressable"
            aria-label="Close drawer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-3 border-b border-[var(--card-border)] shrink-0">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-[var(--text-secondary)] absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search lounges..."
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-[var(--nested-bg)] border border-[var(--nested-border)] text-xs text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="w-5 h-5 absolute right-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Channels List */}
        <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-1.5 scrollbar-thin">
          <div className="px-2 py-1 text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
            All Lounges ({filteredChannels.length})
          </div>

          {filteredChannels.length === 0 ? (
            <div className="py-8 text-center text-xs text-[var(--text-secondary)]">
              No matching chats found
            </div>
          ) : (
            filteredChannels.map((ch) => {
              const isSelected = activeChannelId === ch.id;
              const Icon = getChannelIcon(ch.icon);
              const displayName = formatChannelDisplayName(ch.name);

              return (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => {
                    onSelectChannel(ch.id);
                    onClose();
                  }}
                  className={`w-full p-2.5 rounded-2xl flex items-center gap-3 text-left transition-all border pressable ${
                    isSelected
                      ? 'bg-violet-500/10 border-violet-500/30 text-[var(--text-primary)] font-bold'
                      : 'bg-[var(--nested-bg)] border-transparent hover:border-[var(--card-hover-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                    isSelected
                      ? 'bg-violet-500 text-white border-violet-600 shadow-xs'
                      : 'bg-[var(--card-bg)] text-[var(--text-primary)] border-[var(--card-border)]'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs truncate ${isSelected ? 'font-bold text-[var(--text-primary)]' : 'font-semibold'}`}>
                        {displayName}
                      </span>
                      {ch.badge && (
                        <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-rose-500 text-white shrink-0">
                          {ch.badge}
                        </span>
                      )}
                    </div>
                    {ch.description && (
                      <p className="text-[10px] text-[var(--text-secondary)] truncate leading-snug mt-0.5 opacity-80">
                        {ch.description}
                      </p>
                    )}
                  </div>

                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-violet-500/20 text-violet-500 flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Drawer Footer: Rules & Safety */}
        <div className="p-3 border-t border-[var(--card-border)] bg-[var(--nested-bg)]/50 shrink-0 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenRules();
            }}
            className="w-full py-2.5 px-3 rounded-xl bg-[var(--card-bg)] hover:bg-[var(--nested-bg)] border border-[var(--card-border)] flex items-center justify-center gap-2 text-xs font-semibold text-[var(--text-primary)] transition-all pressable"
          >
            <ShieldCheck className="w-4 h-4 text-[#30D158]" />
            <span>Community Rules &amp; Safety</span>
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : content;
};
