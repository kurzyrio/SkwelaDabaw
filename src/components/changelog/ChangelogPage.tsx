import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Tag, 
  CheckCircle2, 
  Clock, 
  Search,
  Smartphone
} from 'lucide-react';
import { CHANGELOG_DATA, ChangelogRelease } from '../../data/changelogData';
import { getCachedChangelogs, subscribeLiveChangelogs } from '../../services/changelogService';

interface ChangelogPageProps {
  onBack: () => void;
  onOpenAbout?: () => void;
}

export const ChangelogPage: React.FC<ChangelogPageProps> = ({ onBack, onOpenAbout }) => {
  const [releases, setReleases] = useState<ChangelogRelease[]>(() => getCachedChangelogs());
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    const unsubscribe = subscribeLiveChangelogs((liveList) => {
      if (liveList && liveList.length > 0) {
        setReleases(liveList);
      }
    });
    return () => unsubscribe();
  }, []);

  const latestRelease = releases[0] || CHANGELOG_DATA[0];

  const filteredReleases = releases.map((release) => {
    const matchesSearch = 
      release.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      release.tagline.toLowerCase().includes(searchQuery.toLowerCase()) ||
      release.version.toLowerCase().includes(searchQuery.toLowerCase());

    const filteredItems = release.items.filter((item) => {
      return (
        !searchQuery.trim() ||
        matchesSearch ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });

    return {
      ...release,
      items: filteredItems,
      hasVisibleContent: filteredItems.length > 0 || matchesSearch
    };
  }).filter((rel) => rel.hasVisibleContent);

  return (
    <div className="min-h-screen bg-[var(--canvas-bg)] text-[var(--text-primary)] flex flex-col animate-fade-in select-none">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-[var(--header-bg)] backdrop-blur-xl border-b border-[var(--card-border)] px-4 pt-[max(env(safe-area-inset-top),0.75rem)] pb-3 shadow-xs">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] hover:bg-[var(--nested-bg)] transition-all pressable shrink-0"
              title="Back"
            >
              <ArrowLeft className="w-5 h-5 text-[var(--text-primary)]" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-[var(--text-primary)] leading-tight">
                  What's New
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--nested-bg)] text-[var(--text-primary)] border border-[var(--nested-border)]">
                  v{latestRelease.version}
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)]">
                SkwelaDabaw Update Log
              </p>
            </div>
          </div>

          {onOpenAbout && (
            <button
              onClick={onOpenAbout}
              className="px-3.5 py-1.5 rounded-full bg-[var(--nested-bg)] border border-[var(--nested-border)] text-xs font-semibold text-[var(--text-primary)] hover:opacity-90 transition-all pressable"
            >
              About App
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-3xl w-full mx-auto p-4 sm:p-6 space-y-4">
        {/* Latest Version Inset Banner */}
        <div className="p-6 rounded-3xl bg-[var(--card-bg)] border border-[var(--card-border)] space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] uppercase tracking-wider flex items-center gap-1.5 shadow-xs">
              <Tag className="w-3.5 h-3.5" />
              Latest Version {latestRelease.version}
            </span>
            <span className="text-xs text-[var(--text-secondary)] font-medium flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {latestRelease.releaseDate}
            </span>
          </div>

          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">
              {latestRelease.title}
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
              {latestRelease.tagline}
            </p>
          </div>

          {latestRelease.highlights && latestRelease.highlights.length > 0 && (
            <div className="pt-2 border-t border-[var(--card-border)] space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                Key Highlights
              </span>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {latestRelease.highlights.map((highlight, idx) => (
                  <li key={idx} className="text-xs text-[var(--text-primary)] flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-primary)] shrink-0" />
                    <span>{highlight}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          <div className="flex items-center justify-between pt-2 border-t border-[var(--card-border)] text-xs">
            <span className="flex items-center gap-1.5 font-semibold text-[#30D158]">
              <CheckCircle2 className="w-4 h-4" />
              Up to date
            </span>
            <span className="text-[11px] text-[var(--text-secondary)] flex items-center gap-1">
              <Smartphone className="w-3.5 h-3.5" />
              Android &amp; Web
            </span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search update logs..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-[var(--input-bg)] border border-[var(--card-border)] text-xs font-semibold text-[var(--input-text)] placeholder-[var(--text-tertiary)] focus:outline-none focus:border-[var(--card-hover-border)]"
          />
        </div>

        {/* Unified Release List */}
        <div className="space-y-3">
          {filteredReleases.length === 0 ? (
            <div className="p-8 rounded-3xl bg-[var(--card-bg)] border border-[var(--card-border)] text-center space-y-2">
              <p className="text-sm font-semibold text-[var(--text-secondary)]">
                No matching updates found for "{searchQuery}".
              </p>
              <button
                onClick={() => setSearchQuery('')}
                className="px-4 py-2 rounded-full bg-[var(--btn-primary-bg)] text-xs font-bold text-[var(--btn-primary-text)]"
              >
                Clear Search
              </button>
            </div>
          ) : (
            filteredReleases.map((release) => (
              <div 
                key={release.version}
                className="p-5 rounded-3xl bg-[var(--card-bg)] border border-[var(--card-border)] space-y-3"
              >
                <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[var(--card-border)]">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-[var(--text-primary)]">
                      v{release.version}
                    </span>
                    <span className="text-xs font-medium text-[var(--text-secondary)]">
                      • {release.title}
                    </span>
                    {release.isLatest && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--nested-bg)] text-[var(--text-primary)] border border-[var(--nested-border)]">
                        Current
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-[var(--text-secondary)]">
                    {release.releaseDate}
                  </span>
                </div>

                <ul className="space-y-2 pt-1">
                  {release.items.map((item, i) => (
                    <li 
                      key={i}
                      className="flex items-start gap-2.5 text-xs"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-[var(--text-primary)] mt-1.5 shrink-0" />
                      <div className="space-y-0.5 flex-1">
                        <span className="font-bold text-[var(--text-primary)]">
                          {item.title}
                        </span>
                        <p className="text-[var(--text-secondary)] leading-relaxed">
                          {item.description}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>

        <div className="py-4 text-center">
          <p className="text-xs text-[#8E8E93]">
            SkwelaDabaw • Built for Davao City Students
          </p>
        </div>
      </main>
    </div>
  );
};
