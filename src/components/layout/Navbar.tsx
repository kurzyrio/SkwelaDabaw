import React, { useState } from 'react';
import { 
  Calendar, 
  Map, 
  Coffee, 
  LayoutGrid, 
  Settings, 
  CheckSquare, 
  GraduationCap, 
  CalendarDays, 
  MessageSquare, 
  Compass, 
  ShieldAlert, 
  Bell, 
  Info,
  X,
  ChevronRight,
  MessageSquarePlus
} from 'lucide-react';
export type NavigationTab = 
  | 'schedule'
  | 'tasks'
  | 'tools'
  | 'community'
  | 'gpa'
  | 'grades'
  | 'calendar'
  | 'jeep'
  | 'dcbus'
  | 'announcements'
  | 'chat'
  | 'spots'
  | 'budget'
  | 'emergency'
  | 'settings'
  | 'about'
  | 'feedback'
  | 'weather';

export type TabType = NavigationTab;

export interface NavbarProps {
  activeTab: NavigationTab;
  onChangeTab?: (tab: NavigationTab) => void;
  setActiveTab?: (tab: NavigationTab) => void;
  onOpenSettings?: () => void;
  unreadAnnouncementsCount?: number;
  onOpenFeedback?: () => void;
  isHidden?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  activeTab, 
  onChangeTab,
  setActiveTab,
  onOpenSettings,
  unreadAnnouncementsCount = 0,
  onOpenFeedback,
  isHidden = false
}) => {
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const maxObservedHeightRef = React.useRef(typeof window !== 'undefined' ? window.innerHeight : 800);

  // App-wide virtual keyboard detection: hides floating navbar whenever virtual keyboard opens
  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkHeight = () => {
      const currentHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
      if (currentHeight > maxObservedHeightRef.current) {
        maxObservedHeightRef.current = currentHeight;
      }
      const isHeightShrunk = maxObservedHeightRef.current - currentHeight > 120;
      setIsKeyboardVisible(isHeightShrunk);
    };

    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        setIsInputFocused(true);
      }
    };

    const handleFocusOut = () => {
      setIsInputFocused(false);
      // Recheck height after blur
      setTimeout(checkHeight, 150);
    };

    window.addEventListener('resize', checkHeight);
    window.addEventListener('focusin', handleFocusIn);
    window.addEventListener('focusout', handleFocusOut);

    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener('resize', checkHeight);
    }

    return () => {
      window.removeEventListener('resize', checkHeight);
      window.removeEventListener('focusin', handleFocusIn);
      window.removeEventListener('focusout', handleFocusOut);
      if (vv) {
        vv.removeEventListener('resize', checkHeight);
      }
    };
  }, []);

  // Left Mobile Tabs
  const mobileLeftTabs = [
    { id: 'schedule' as TabType, label: 'Schedule', icon: Calendar },
    { id: 'tasks' as TabType, label: 'Tasks', icon: CheckSquare },
  ];

  // Right Mobile Tabs (Swapped Alerts with Jeep)
  const mobileRightTabs: { id: TabType; label: string; icon: any; badge?: number }[] = [
    { id: 'chat' as TabType, label: 'Chat', icon: MessageSquare },
    { id: 'jeep' as TabType, label: 'Jeep', icon: Compass },
  ];

  // Secondary Tabs presented in the Mobile "Hub" Modal Sheet & Hub Page
  const mobileSecondaryTabs = [
    { id: 'community' as TabType, label: 'Student Community', subtitle: 'Discussions, tips & lost and found', icon: MessageSquarePlus },
    { id: 'dcbus' as TabType, label: 'DC Bus Interim', subtitle: 'Davao City bus transit & web portal', icon: Map },
    { id: 'announcements' as TabType, label: 'Campus Bulletins & DepEd', subtitle: 'Suspensions & official notices', icon: Bell, badge: unreadAnnouncementsCount },
    { id: 'gpa' as TabType, label: 'GWA Calculator', subtitle: 'Grades simulator & goals', icon: GraduationCap },
    { id: 'calendar' as TabType, label: 'Academic Calendar', subtitle: 'Davao campus schedules', icon: CalendarDays },
    { id: 'spots' as TabType, label: 'Study Spots', subtitle: 'Libraries, cafes & wifi hubs', icon: Coffee },
    { id: 'budget' as TabType, label: 'Baon Tracker', subtitle: 'Student daily expenses', icon: GraduationCap },
    { id: 'emergency' as TabType, label: 'Hotlines & Safety', subtitle: 'Davao 911 & campus security', icon: ShieldAlert },
    { id: 'settings' as TabType, label: 'Settings & Cloud', subtitle: 'Customization & data sync', icon: Settings },
    { id: 'about' as TabType, label: 'About SkwelaDabaw', subtitle: 'App info & developers', icon: Info },
  ];

  // Tablet & Desktop Minimalist Segmented Navigation Pill Dock
  const primaryDesktopTabs = [
    { id: 'schedule' as TabType, label: 'Schedule', icon: Calendar },
    { id: 'tasks' as TabType, label: 'Tasks', icon: CheckSquare },
    { id: 'tools' as TabType, label: 'Student Hub', icon: LayoutGrid },
    { id: 'community' as TabType, label: 'Community', icon: MessageSquarePlus },
    { id: 'chat' as TabType, label: 'Chat', icon: MessageSquare },
    { id: 'jeep' as TabType, label: 'Jeep Routes', icon: Compass },
  ];

  const handleSelectTab = (tabId: TabType) => {
    if (tabId === 'settings' && onOpenSettings) {
      onOpenSettings();
    } else if (onChangeTab) {
      onChangeTab(tabId);
    } else if (setActiveTab) {
      setActiveTab(tabId);
    }
    setIsMoreOpen(false);
  };

  const isMoreTabActive = mobileSecondaryTabs.some(t => t.id === activeTab);
  const isHubActive = activeTab === 'tools' || isMoreTabActive;
  const shouldHide = isHidden || isKeyboardVisible || isInputFocused;

  return (
    <>
      {/* Floating Mobile Dock Bar */}
      <nav 
        className={`md:hidden fixed bottom-3 left-3 right-3 max-w-md mx-auto z-40 transition-all duration-300 ease-in-out ${
          shouldHide 
            ? 'translate-y-36 opacity-0 pointer-events-none' 
            : 'translate-y-0 opacity-100'
        }`}
        aria-hidden={shouldHide}
      >
        <div className="relative bg-[var(--card-bg)]/90 backdrop-blur-2xl border border-[var(--card-border)] rounded-full px-3 py-1.5 shadow-[0_12px_36px_rgba(0,0,0,0.18)] dark:shadow-[0_12px_36px_rgba(0,0,0,0.55)] flex items-center justify-between transition-colors">
          {/* Left Tabs (Schedule, Tasks) */}
          <div className="flex items-center justify-around flex-1">
            {mobileLeftTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleSelectTab(tab.id)}
                  aria-label={tab.label}
                  className={`relative flex flex-col items-center justify-center py-1 px-3 rounded-full transition-all duration-150 cursor-pointer pressable ${
                    isActive ? 'text-[#8B5CF6]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Icon className="w-5 h-5 transition-transform duration-150 active:scale-90" />
                  <span className={`text-[10px] mt-0.5 tracking-tight ${isActive ? 'font-bold text-[#8B5CF6]' : 'font-medium'}`}>
                    {tab.label}
                  </span>
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6] mt-0.5 transition-all" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Center Elevated Floating Hub Action Button */}
          <div className="relative -top-5 flex flex-col items-center shrink-0 px-2">
            <button
              onClick={() => handleSelectTab('tools')}
              onContextMenu={(e) => {
                e.preventDefault();
                setIsMoreOpen(true);
              }}
              aria-label="Student Hub"
              className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#7C3AED] via-[#8B5CF6] to-[#A855F7] text-white flex items-center justify-center shadow-lg shadow-purple-500/40 border-4 border-[var(--bg-primary)] transition-all duration-200 active:scale-95 hover:scale-105 cursor-pointer pressable"
            >
              <LayoutGrid className="w-5 h-5 text-white" />
            </button>
            <span className={`text-[10px] tracking-tight mt-0.5 ${isHubActive ? 'font-bold text-[#8B5CF6]' : 'font-medium text-[var(--text-secondary)]'}`}>
              Hub
            </span>
            {isHubActive && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6] mt-0.5 transition-all" />
            )}
          </div>

          {/* Right Tabs (Chat, Alerts) */}
          <div className="flex items-center justify-around flex-1">
            {mobileRightTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleSelectTab(tab.id)}
                  aria-label={tab.label}
                  className={`relative flex flex-col items-center justify-center py-1 px-3 rounded-full transition-all duration-150 cursor-pointer pressable ${
                    isActive ? 'text-[#8B5CF6]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <div className="relative">
                    <Icon className="w-5 h-5 transition-transform duration-150 active:scale-90" />
                    {tab.badge && tab.badge > 0 ? (
                      <span className="absolute -top-1 -right-2 px-1 min-w-[14px] h-[14px] rounded-full bg-[#FF453A] text-white text-[9px] font-bold flex items-center justify-center leading-none">
                        {tab.badge}
                      </span>
                    ) : null}
                  </div>
                  <span className={`text-[10px] mt-0.5 tracking-tight ${isActive ? 'font-bold text-[#8B5CF6]' : 'font-medium'}`}>
                    {tab.label}
                  </span>
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6] mt-0.5 transition-all" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Mobile iOS Action Sheet Modal */}
      {isMoreOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sheet-backdrop-enter">
          <div className="w-full max-h-[82vh] overflow-y-auto bg-[var(--modal-bg)] border-t border-[var(--card-border)] rounded-t-3xl p-5 pb-safe sheet-enter-spring space-y-4">
            {/* Sheet Handle */}
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-1 rounded-full bg-[var(--card-border)]" />
              <div className="w-full flex items-center justify-between pt-1">
                <h4 className="font-bold text-sm text-[var(--text-primary)]">Student Hub &amp; Tools</h4>
                <button
                  onClick={() => setIsMoreOpen(false)}
                  className="p-1.5 rounded-full bg-[var(--nested-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer transition-colors pressable-icon"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Inset List Container */}
            <div className="bg-[var(--nested-bg)] rounded-2xl border border-[var(--card-border)] overflow-hidden divide-y divide-[var(--card-border)]">
              {mobileSecondaryTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleSelectTab(tab.id)}
                    className={`w-full p-3.5 text-left flex items-center justify-between transition-colors cursor-pointer list-row-interactive ${
                      isActive ? 'bg-[var(--card-bg)]' : 'hover:bg-[var(--card-bg)]/60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--text-primary)] flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <h5 className="font-bold text-xs text-[var(--text-primary)]">{tab.label}</h5>
                        <p className="text-[10px] text-[var(--text-secondary)]">{tab.subtitle}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[var(--text-secondary)]" />
                  </button>
                );
              })}
            </div>

            {onOpenFeedback && (
              <button
                onClick={() => {
                  setIsMoreOpen(false);
                  onOpenFeedback();
                }}
                className="w-full p-3.5 rounded-2xl bg-[var(--nested-bg)] border border-[var(--card-border)] text-left flex items-center justify-between hover:bg-[var(--card-bg)]/60 transition-colors cursor-pointer list-row-interactive"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] flex items-center justify-center shrink-0 font-bold">
                    <MessageSquarePlus className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="font-bold text-xs text-[var(--text-primary)]">Student Review &amp; Feedback</h5>
                    <p className="text-[10px] text-[var(--text-secondary)]">Rate app and submit campus feature requests</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[var(--text-secondary)]" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Tablet & Desktop iOS Segmented Navigation Pill Dock */}
      <div className="hidden md:flex items-center justify-center w-full py-2.5">
        <div className="inline-flex items-center gap-1.5 p-1.5 rounded-full bg-[var(--card-bg)]/90 backdrop-blur-xl border border-[var(--card-border)] shadow-md transition-colors max-w-2xl">
          {primaryDesktopTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id || (tab.id === 'tools' && isMoreTabActive);
            return (
              <button
                key={tab.id}
                onClick={() => handleSelectTab(tab.id)}
                className={`relative flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs transition-all duration-150 cursor-pointer pressable ${
                  isActive
                    ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--nested-bg)] font-medium'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="tracking-tight">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
};
