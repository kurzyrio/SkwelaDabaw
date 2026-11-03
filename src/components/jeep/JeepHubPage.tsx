import React from 'react';
import { 
  Map, 
  ListFilter, 
  Bookmark, 
  School, 
  Receipt, 
  ShieldAlert, 
  Bus, 
  ChevronRight, 
  Compass, 
  HelpCircle,
  Navigation
} from 'lucide-react';

export interface JeepHubPageProps {
  onOpenMap: () => void;
  onOpenRoutes: () => void;
  onOpenSaved: () => void;
  onOpenSchools: () => void;
  onOpenFare: () => void;
  onOpenSafety: () => void;
  onOpenGuide?: () => void;
  onNavigateToBus?: () => void;
}

interface HubItem {
  id: string;
  title: string;
  desc: string;
  icon: React.ElementType;
  badge?: string;
  onClick: () => void;
}

interface HubGroup {
  groupKey: string;
  title: string;
  items: HubItem[];
}

export const JeepHubPage: React.FC<JeepHubPageProps> = ({
  onOpenMap,
  onOpenRoutes,
  onOpenSaved,
  onOpenSchools,
  onOpenFare,
  onOpenSafety,
  onOpenGuide,
  onNavigateToBus
}) => {
  const groups: HubGroup[] = [
    {
      groupKey: 'network',
      title: 'Transit Network',
      items: [
        {
          id: 'routes',
          title: '114 Routes Directory',
          desc: 'Browse traditional PUJ corridors, drop-off points, and street landmarks.',
          icon: ListFilter,
          badge: 'Traditional PUJ',
          onClick: onOpenRoutes
        },
        {
          id: 'saved',
          title: 'Saved Places & Trips',
          desc: 'Quick access to your home, dorm, campus, and bookmarked jeepney corridors.',
          icon: Bookmark,
          badge: 'Favorites',
          onClick: onOpenSaved
        },
        {
          id: 'schools',
          title: '54 Davao Campuses Directory',
          desc: 'Find verified campuses, nearest drop-off points, and connecting jeeps.',
          icon: School,
          badge: '54 Campuses',
          onClick: onOpenSchools
        }
      ]
    },
    {
      groupKey: 'essentials',
      title: 'Commuter Essentials',
      items: [
        {
          id: 'fare',
          title: 'LTFRB Student Fare Matrix',
          desc: 'Official ₱11.00 base student fare calculator, distance matrix, and discounts.',
          icon: Receipt,
          badge: 'LTFRB Matrix',
          onClick: onOpenFare
        },
        {
          id: 'safety',
          title: 'Commuter Safety & Flyover Guide',
          desc: 'CTTMO boarding protocols, 103 prohibited flyover zones, and transit hotlines.',
          icon: ShieldAlert,
          badge: 'CTTMO Rules',
          onClick: onOpenSafety
        },
        ...(onNavigateToBus ? [{
          id: 'dcbus',
          title: 'Davao Interim Bus (DC Bus)',
          desc: 'Live tracking and route information for 9 interim HPBS city bus routes.',
          icon: Bus,
          badge: 'City Bus',
          onClick: onNavigateToBus
        }] : [])
      ]
    }
  ];

  return (
    <div className="space-y-4 pb-20 animate-fade-in select-none">
      {/* Hero Header Card */}
      <div className="p-5 sm:p-6 rounded-3xl bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--text-primary)] relative overflow-hidden shadow-xs">
        <div className="space-y-2 relative z-10">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-1.5 text-[var(--text-secondary)] text-[11px] font-semibold">
              <Compass className="w-3.5 h-3.5 text-[var(--accent-color)]" />
              <span>Davao City Transit Hub</span>
            </div>
            {onOpenGuide && (
              <button
                type="button"
                onClick={onOpenGuide}
                title="Transit Guide"
                className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--nested-bg)] transition-colors"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            )}
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            Jeepney &amp; Public Transit
          </h2>
          <p className="text-xs sm:text-sm font-normal text-[var(--text-secondary)] leading-relaxed max-w-xl">
            Point-to-point journey planner, 114 traditional routes, 54 college campuses, and official LTFRB student fare calculation.
          </p>
        </div>

        {/* Decorative Watermark */}
        <Bus className="absolute -right-3 -bottom-5 w-28 h-28 text-[var(--nested-bg)] select-none pointer-events-none stroke-[1] opacity-25" />
      </div>

      {/* Hero Interactive Map Launch Card */}
      <div 
        onClick={onOpenMap}
        className="p-4 sm:p-5 rounded-3xl bg-[var(--card-bg)] border border-[var(--card-border)] hover:border-[var(--accent-color)]/60 transition-all cursor-pointer shadow-sm pressable group relative overflow-hidden"
      >
        <div className="flex items-center justify-between gap-3 relative z-10">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform">
              <Map className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-[var(--text-primary)] truncate">
                  Interactive Transit Map
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[var(--nested-bg)] text-[var(--text-secondary)] border border-[var(--card-border)] shrink-0">
                  Full Screen
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5 line-clamp-1">
                Plan point-to-point route with live fare &amp; walking directions
              </p>
            </div>
          </div>

          <div className="w-9 h-9 rounded-xl bg-[var(--nested-bg)] border border-[var(--card-border)] flex items-center justify-center text-[var(--text-primary)] shrink-0 group-hover:translate-x-0.5 transition-transform">
            <Navigation className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Categorized Action Grid */}
      <div className="space-y-4">
        {groups.map((group) => (
          <div key={group.groupKey} className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] px-1">
              {group.title}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.id}
                    onClick={item.onClick}
                    className="p-3.5 sm:p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] hover:border-[var(--card-hover-border)] transition-all cursor-pointer flex items-center justify-between gap-3 pressable group"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-xl bg-[var(--nested-bg)] border border-[var(--nested-border)] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform text-[var(--text-primary)]">
                        <Icon className="w-5 h-5" />
                      </div>

                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs sm:text-sm font-bold text-[var(--text-primary)] truncate">
                            {item.title}
                          </h4>
                          {item.badge && (
                            <span className="hidden sm:inline-block px-2 py-0.2 rounded-full text-[9px] font-semibold bg-[var(--nested-bg)] text-[var(--text-secondary)] border border-[var(--nested-border)] shrink-0">
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[var(--text-secondary)] line-clamp-1 leading-tight">
                          {item.desc}
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

export default JeepHubPage;
