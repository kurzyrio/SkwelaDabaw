import React, { useState, useEffect } from 'react';
import { 
  Megaphone, 
  Search, 
  Pin, 
  Share2, 
  Check, 
  Bookmark, 
  ChevronDown, 
  ChevronUp, 
  X,
  Image as ImageIcon,
  ExternalLink,
  ShieldAlert,
  AlertTriangle,
  Building2,
  Users,
  ArrowRight
} from 'lucide-react';
import { INITIAL_ANNOUNCEMENTS, DavaoAnnouncement } from '../../data/davaoAnnouncements';
import { DAVAO_CAMPUSES } from '../../data/davaoCampuses';
import { StudentAuthSession } from '../../services/authService';
import { PageIntroGuide } from '../common/PageIntroGuide';
import { shareContent } from '../../services/shareService';
import { fetchAllAnnouncements } from '../../services/announcementService';
import { queueCloudSync } from '../../services/cloudSyncService';

interface AnnouncementBoardProps {
  userSession?: StudentAuthSession;
  onNavigateToCommunity?: () => void;
}

export const AnnouncementBoard: React.FC<AnnouncementBoardProps> = ({ 
  userSession,
  onNavigateToCommunity
}) => {
  const [announcements, setAnnouncements] = useState<DavaoAnnouncement[]>(INITIAL_ANNOUNCEMENTS);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('skweladabaw_bookmarked_bulletins');
    return saved ? JSON.parse(saved) : [];
  });
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  const userCampus = DAVAO_CAMPUSES.find((c) => c.id === userSession?.campusId);

  // Save bookmarks to localStorage and trigger cloud sync
  useEffect(() => {
    localStorage.setItem('skweladabaw_bookmarked_bulletins', JSON.stringify(bookmarkedIds));
    queueCloudSync();
  }, [bookmarkedIds]);

  // Sync cloud bulletins on mount
  useEffect(() => {
    let isMounted = true;
    fetchAllAnnouncements(userSession?.campusId).then((cloudItems) => {
      if (!isMounted || cloudItems.length === 0) return;
      setAnnouncements((prev) => {
        const map = new Map<string, DavaoAnnouncement>();
        cloudItems.forEach((item) => map.set(item.id, item));
        prev.forEach((item) => {
          if (!map.has(item.id)) map.set(item.id, item);
        });
        return Array.from(map.values());
      });
    });
    return () => { isMounted = false; };
  }, [userSession?.campusId]);

  const toggleBookmark = (id: string) => {
    setBookmarkedIds((prev) =>
      prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]
    );
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) =>
      prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]
    );
  };

  const shareAnnouncement = async (ann: DavaoAnnouncement) => {
    const text = `[SkwelaDabaw Bulletin]\n${ann.title}\nSource: ${ann.source}\nDate: ${ann.date}\n\n${ann.summary}\n\nRead more on SkwelaDabaw App!`;
    const res = await shareContent(ann.title, text);
    if (res.action === 'copied') {
      setCopiedId(ann.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  // Filter announcements
  const filteredAnnouncements = announcements.filter((ann) => {
    if (selectedCategory === 'bookmarked') return bookmarkedIds.includes(ann.id);
    if (selectedCategory === 'my_campus') {
      return ann.targetCampus === 'all' || ann.targetCampus === userSession?.campusId;
    }
    if (selectedCategory !== 'all' && ann.category !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        ann.title.toLowerCase().includes(q) ||
        ann.summary.toLowerCase().includes(q) ||
        ann.source.toLowerCase().includes(q) ||
        ann.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="space-y-4 pb-16 md:pb-6 animate-fade-in select-none">
      <PageIntroGuide
        pageKey="announcements"
        icon={<Megaphone className="w-6 h-6 text-white" />}
        title="Davao Campus Bulletins &amp; Alerts"
        description="Official updates on Davao LGU suspensions, heavy rain alerts, EBSU scholarships, and campus holidays."
        tips={[
          'Filter notices by your university or citywide advisories.',
          'Bookmark important notices to review them offline anytime.'
        ]}
      />

      {/* Top Grouped Card */}
      <div className="p-5 sm:p-6 rounded-3xl bg-[var(--card-bg)] border border-[var(--card-border)] space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-[var(--nested-bg)] text-[var(--text-primary)] border border-[var(--nested-border)]">
              <Megaphone className="w-3.5 h-3.5" />
              <span>Davao Student Bulletins</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-[var(--text-primary)] pt-1">
              Campus Advisories &amp; Alerts
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Official verified updates on Davao LGU suspensions, DepEd Region XI advisories, and university notices.
            </p>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="space-y-2.5">
        <div className="relative">
          <Search className="w-4 h-4 text-[var(--text-secondary)] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search bulletins (e.g. 'suspension', 'DepEd', 'scholarship', 'EBSU')..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs rounded-2xl bg-[var(--input-bg)] border border-[var(--card-border)] text-[var(--input-text)] placeholder-[var(--text-tertiary)] focus:outline-none focus:border-[var(--card-hover-border)]"
          />
        </div>

        {/* Categories Pill Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: 'all', label: 'All Bulletins' },
            { id: 'my_campus', label: userCampus ? userCampus.shortName : 'My Campus' },
            { id: 'deped', label: 'DepEd Alerts' },
            { id: 'suspension', label: 'Suspensions & Floods' },
            { id: 'scholarship', label: 'Scholarships & Aid' },
            { id: 'holiday', label: 'Davao Holidays' },
            { id: 'bookmarked', label: `Saved (${bookmarkedIds.length})` },
          ].map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border shrink-0 pressable ${
                  isSelected
                    ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] border-transparent font-bold shadow-xs'
                    : 'bg-[var(--nested-bg)] text-[var(--text-secondary)] border border-[var(--nested-border)] hover:text-[var(--text-primary)]'
                }`}
              >
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* DepEd Order No. 037 s.2022 Quick-Reference Card */}
      {selectedCategory === 'deped' && (
        <div className="p-4 sm:p-5 rounded-3xl bg-blue-500/5 border border-blue-500/20 space-y-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-500 shrink-0" />
            <h4 className="font-bold text-xs sm:text-sm text-[var(--text-primary)]">
              DepEd Order No. 037 s.2022: Davao Regional Guidelines
            </h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[11px]">
            <div className="p-2.5 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] space-y-1">
              <span className="font-bold text-sky-500 block">🌀 Typhoon Signals 1+</span>
              <p className="text-[var(--text-secondary)] leading-relaxed">
                Automatic cancellation of in-person and online classes in basic education (K-12).
              </p>
            </div>
            <div className="p-2.5 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] space-y-1">
              <span className="font-bold text-amber-500 block">🌧️ Orange / Red Rainfall</span>
              <p className="text-[var(--text-secondary)] leading-relaxed">
                Automatic localized class suspension or modular shift issued by Davao CDRRMO / City Hall.
              </p>
            </div>
            <div className="p-2.5 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] space-y-1">
              <span className="font-bold text-rose-500 block">⚠️ Intensity 5+ Earthquake</span>
              <p className="text-[var(--text-secondary)] leading-relaxed">
                Immediate class suspension for school structural integrity inspections by engineers.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Announcements List Feed */}
      <div className="space-y-3">
        {filteredAnnouncements.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] space-y-1">
            <Megaphone className="w-6 h-6 text-[var(--text-primary)] mx-auto mb-1" />
            <h4 className="font-bold text-sm text-[var(--text-primary)]">
              No notices match your filter
            </h4>
            <p className="text-xs text-[var(--text-secondary)]">
              Try choosing another category or clearing your search term.
            </p>
          </div>
        ) : (
          filteredAnnouncements.map((ann) => {
            const isSaved = bookmarkedIds.includes(ann.id);
            const isExpanded = expandedIds.includes(ann.id);

            return (
              <div
                key={ann.id}
                className="p-5 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] hover:border-[var(--card-hover-border)] space-y-3 transition-all relative pressable"
              >
                {/* Top Meta Line */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-[var(--text-primary)]">
                      {ann.source}
                    </span>

                    {ann.category === 'deped' && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-500/10 text-blue-500 border border-blue-500/20 flex items-center gap-1">
                        <Building2 className="w-2.5 h-2.5" />
                        <span>DepEd Region XI</span>
                      </span>
                    )}

                    {ann.urgency === 'high' && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-[#FF453A] text-white">
                        URGENT
                      </span>
                    )}

                    {ann.isPinned && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[var(--nested-bg)] text-[var(--text-primary)] border border-[var(--nested-border)] flex items-center gap-1">
                        <Pin className="w-2.5 h-2.5" />
                        <span>Pinned</span>
                      </span>
                    )}
                  </div>

                  <span className="text-[11px] text-[var(--text-secondary)] shrink-0 font-medium">
                    {ann.date}
                  </span>
                </div>

                {/* Title & Body */}
                <div className="space-y-1.5">
                  <h3 className="font-bold text-sm text-[var(--text-primary)] leading-snug">
                    {ann.title}
                  </h3>
                  <p className={`text-xs text-[var(--text-secondary)] leading-relaxed ${isExpanded ? '' : 'line-clamp-2'}`}>
                    {ann.summary}
                  </p>
                </div>

                {/* Poster Image if present */}
                {ann.imageData && (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      setViewingImage(ann.imageData || null);
                    }}
                    className="w-full rounded-2xl overflow-hidden max-h-72 sm:max-h-80 bg-black/5 dark:bg-white/5 border border-[var(--nested-border)] flex items-center justify-center cursor-pointer pressable"
                  >
                    <img
                      src={ann.imageData}
                      alt={ann.title}
                      className="w-full h-auto max-h-72 sm:max-h-80 object-cover rounded-2xl"
                      loading="lazy"
                    />
                  </div>
                )}

                {/* Tags */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {ann.tags.map((t, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-[var(--nested-bg)] text-[var(--text-secondary)] border border-[var(--nested-border)]"
                    >
                      #{t}
                    </span>
                  ))}
                </div>

                {/* Footer Controls */}
                <div className="pt-2 border-t border-[var(--card-border)] flex items-center justify-between text-xs text-[var(--text-secondary)]">
                  <button
                    onClick={() => toggleExpand(ann.id)}
                    className="flex items-center gap-1 text-[var(--text-primary)] hover:opacity-80 font-semibold"
                  >
                    <span>{isExpanded ? 'Show less' : 'Read full notice'}</span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleBookmark(ann.id)}
                      className={`p-1.5 rounded-lg border transition-colors ${
                        isSaved
                          ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] border-transparent font-bold'
                          : 'bg-[var(--nested-bg)] text-[var(--text-secondary)] border border-[var(--nested-border)] hover:text-[var(--text-primary)]'
                      }`}
                      title={isSaved ? 'Remove from Saved' : 'Save Notice'}
                    >
                      <Bookmark className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => shareAnnouncement(ann)}
                      className="p-1.5 rounded-lg bg-[var(--nested-bg)] border border-[var(--nested-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                      title="Share"
                    >
                      {copiedId === ann.id ? <Check className="w-3.5 h-3.5 text-[#30D158]" /> : <Share2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Community Feed Banner */}
      {onNavigateToCommunity && (
        <div 
          onClick={onNavigateToCommunity}
          className="p-4 rounded-3xl bg-[var(--nested-bg)] border border-[var(--nested-border)] flex items-center justify-between gap-3 cursor-pointer hover:border-[var(--card-hover-border)] transition-all pressable"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-500 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h5 className="font-bold text-xs text-[var(--text-primary)]">
                Looking for student discussions or lost &amp; found?
              </h5>
              <p className="text-[11px] text-[var(--text-secondary)]">
                Visit the Davao Student Community feed to post and discuss with classmates.
              </p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-[var(--text-secondary)] shrink-0" />
        </div>
      )}

      {/* Lightbox for viewing bulletin posters */}
      {viewingImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in"
          onClick={() => setViewingImage(null)}
        >
          <div className="relative max-w-2xl max-h-[90vh] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setViewingImage(null)}
              className="absolute -top-10 right-0 p-2 text-white/80 hover:text-white cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
            <img src={viewingImage} alt="Full notice poster" className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl" />
          </div>
        </div>
      )}
    </div>
  );
};
