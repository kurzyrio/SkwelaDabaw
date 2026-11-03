import React from 'react';
import { 
  Calculator, 
  Coffee, 
  Wallet, 
  PhoneCall, 
  Megaphone, 
  Calendar, 
  Layers, 
  ChevronRight,
  Settings,
  Compass,
  MessageSquarePlus,
  Info,
  Bus,
  ShieldCheck,
  CloudSun,
  Users,
  LucideIcon
} from 'lucide-react';
import { NavigationTab } from './Navbar';
import { useAppLanguage, t } from '../../services/languageService';

interface StudentHubPageProps {
  onSelectTool: (tab: NavigationTab) => void;
  onOpenFeedback?: () => void;
}

interface HubItem {
  id: NavigationTab;
  titleKey: string;
  descKey: string;
  icon: LucideIcon;
  badge?: string;
  isFeedback?: boolean;
}

interface HubGroup {
  groupKey: string;
  items: HubItem[];
}

export const StudentHubPage: React.FC<StudentHubPageProps> = ({
  onSelectTool,
  onOpenFeedback
}) => {
  const { language } = useAppLanguage();

  const groups: HubGroup[] = [
    {
      groupKey: 'hub.group.academics',
      items: [
        {
          id: 'calendar',
          titleKey: 'hub.tool.calendar.title',
          descKey: 'hub.tool.calendar.desc',
          icon: Calendar,
          badge: 'Timetable'
        },
        {
          id: 'gpa',
          titleKey: 'hub.tool.gpa.title',
          descKey: 'hub.tool.gpa.desc',
          icon: Calculator,
          badge: 'QPI & Honors'
        }
      ]
    },
    {
      groupKey: 'hub.group.transit',
      items: [
        {
          id: 'dcbus',
          titleKey: 'hub.tool.dcbus.title',
          descKey: 'hub.tool.dcbus.desc',
          icon: Bus,
          badge: 'Interim HPBS'
        },
        {
          id: 'jeep',
          titleKey: 'hub.tool.jeep.title',
          descKey: 'hub.tool.jeep.desc',
          icon: Compass,
          badge: 'Routes & Fares'
        },
        {
          id: 'weather',
          titleKey: 'hub.tool.weather.title',
          descKey: 'hub.tool.weather.desc',
          icon: CloudSun,
          badge: 'Live Davao'
        }
      ]
    },
    {
      groupKey: 'hub.group.campusLife',
      items: [
        {
          id: 'community',
          titleKey: 'hub.tool.community.title',
          descKey: 'hub.tool.community.desc',
          icon: Users,
          badge: 'Student Feed'
        },
        {
          id: 'spots',
          titleKey: 'hub.tool.spots.title',
          descKey: 'hub.tool.spots.desc',
          icon: Coffee,
          badge: 'Study Spaces'
        },
        {
          id: 'budget',
          titleKey: 'hub.tool.budget.title',
          descKey: 'hub.tool.budget.desc',
          icon: Wallet,
          badge: 'Baon Tracker'
        },
        {
          id: 'announcements',
          titleKey: 'hub.tool.announcements.title',
          descKey: 'hub.tool.announcements.desc',
          icon: Megaphone,
          badge: 'Suspensions'
        }
      ]
    },
    {
      groupKey: 'hub.group.safetySupport',
      items: [
        {
          id: 'emergency',
          titleKey: 'hub.tool.emergency.title',
          descKey: 'hub.tool.emergency.desc',
          icon: PhoneCall,
          badge: 'Central 911'
        },
        {
          id: 'settings',
          titleKey: 'hub.tool.settings.title',
          descKey: 'hub.tool.settings.desc',
          icon: Settings,
          badge: 'Preferences'
        },
        {
          id: 'about',
          titleKey: 'hub.tool.about.title',
          descKey: 'hub.tool.about.desc',
          icon: Info,
          badge: 'Credits'
        },
        {
          id: 'feedback',
          titleKey: 'hub.tool.feedback.title',
          descKey: 'hub.tool.feedback.desc',
          icon: MessageSquarePlus,
          badge: 'Suggestions',
          isFeedback: true
        }
      ]
    }
  ];

  const handleItemClick = (item: HubItem) => {
    if (item.isFeedback && onOpenFeedback) {
      onOpenFeedback();
    } else {
      onSelectTool(item.id);
    }
  };

  return (
    <div className="space-y-4 pb-20 animate-fade-in select-none">
      {/* iOS Grouped Compact Header Card */}
      <div className="p-5 sm:p-6 rounded-3xl bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--text-primary)] relative overflow-hidden shadow-xs">
        <div className="space-y-1.5 relative z-10">
          <div className="inline-flex items-center gap-1.5 text-[var(--text-secondary)] text-[11px] font-semibold">
            <Layers className="w-3.5 h-3.5 text-sky-500" />
            <span>{t('hub.badge', language)}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            {t('hub.title', language)}
          </h2>
          <p className="text-xs sm:text-sm font-normal text-[var(--text-secondary)] leading-relaxed max-w-xl">
            {t('hub.description', language)}
          </p>
        </div>

        {/* Subtle decorative watermark */}
        <Compass className="absolute -right-3 -bottom-5 w-28 h-28 text-[var(--nested-bg)] select-none pointer-events-none stroke-[1] opacity-30" />
      </div>

      {/* Grouped Categorized Grid */}
      <div className="space-y-4">
        {groups.map((group) => (
          <div key={group.groupKey} className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] px-1">
              {t(group.groupKey, language)}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    className="p-3.5 sm:p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] hover:border-[var(--card-hover-border)] transition-all cursor-pointer flex items-center justify-between gap-3 pressable group"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-xl bg-[var(--nested-bg)] border border-[var(--nested-border)] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <Icon className="w-5 h-5 text-[var(--text-primary)]" />
                      </div>

                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs sm:text-sm font-bold text-[var(--text-primary)] truncate">
                            {t(item.titleKey, language)}
                          </h4>
                          {item.badge && (
                            <span className="hidden sm:inline-block px-2 py-0.2 rounded-full text-[9px] font-semibold bg-[var(--nested-bg)] text-[var(--text-secondary)] border border-[var(--nested-border)] shrink-0">
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[var(--text-secondary)] line-clamp-1 leading-tight">
                          {t(item.descKey, language)}
                        </p>
                      </div>
                    </div>

                    <ChevronRight className="w-4 h-4 text-[var(--text-secondary)] shrink-0 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
