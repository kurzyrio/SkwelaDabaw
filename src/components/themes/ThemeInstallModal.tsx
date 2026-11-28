import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Download,
  Check,
  ChevronLeft,
  ChevronRight,
  Moon,
  Sun,
  AlertCircle,
  Loader2,
  Palette,
  RefreshCw,
  Image as ImageIcon
} from 'lucide-react';
import { ThemeConfig } from '../../themes/types';
import {
  fetchMarketplaceTheme,
  THEME_PORTAL_BASE_URL
} from '../../services/themeDownloadService';
import {
  applyTheme,
  installAndCacheCustomTheme
} from '../../themes';
import { useBackHandler, BackPriority } from '../../hooks/useBackHandler';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { queueCloudSync } from '../../services/cloudSyncService';

export interface ThemeInstallModalProps {
  themeId: string | null;
  onClose: () => void;
  onThemeEquipped?: (themeId: string) => void;
}

const SNAPSHOT_LABELS = [
  'Schedule & Tasks',
  'Transit & Jeep Map',
  'Student Hub & Tools',
  'Popups & Modals',
  'Widgets & Eagle Overlay'
];

export const ThemeInstallModal: React.FC<ThemeInstallModalProps> = ({
  themeId,
  onClose,
  onThemeEquipped
}) => {
  const isOpen = Boolean(themeId);
  const [loading, setLoading] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchedTheme, setFetchedTheme] = useState<ThemeConfig | null>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  useBackHandler(isOpen, () => {
    if (!installing) onClose();
  }, BackPriority.MODAL, 'theme_install_modal');
  useBodyScrollLock(isOpen);

  const loadTheme = async (id: string) => {
    setLoading(true);
    setError(null);
    setFetchedTheme(null);
    setActiveSlide(0);
    setSavedNotice(null);
    try {
      const theme = await fetchMarketplaceTheme(id);
      setFetchedTheme(theme);
    } catch (err: any) {
      setError(err?.message || 'Unable to load theme from theme.kurzyrio.dev. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (themeId) {
      loadTheme(themeId);
    } else {
      setFetchedTheme(null);
      setError(null);
      setSavedNotice(null);
    }
  }, [themeId]);

  if (!isOpen || typeof document === 'undefined') return null;

  const previews = fetchedTheme?.previewImages && fetchedTheme.previewImages.length > 0
    ? fetchedTheme.previewImages
    : (fetchedTheme?.wallpaperUrl ? [fetchedTheme.wallpaperUrl] : []);

  const handleInstall = async (equipImmediately: boolean) => {
    if (!fetchedTheme || installing) return;
    setInstalling(true);
    setError(null);
    try {
      const stored = await installAndCacheCustomTheme(fetchedTheme);
      if (equipImmediately) {
        applyTheme(stored.id);
        onThemeEquipped?.(stored.id);
        queueCloudSync();
        onClose();
      } else {
        setSavedNotice('Saved to Settings → Appearance');
        setTimeout(() => {
          onClose();
        }, 900);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to save theme to device storage.');
    } finally {
      setInstalling(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-fade-in select-none"
      onClick={() => { if (!installing) onClose(); }}
    >
      <div
        className="w-full sm:max-w-md max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-[var(--modal-bg)] border border-[var(--card-border)] shadow-2xl p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] space-y-4 sheet-enter-spring"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-2xl bg-[var(--nested-bg)] border border-[var(--card-border)] flex items-center justify-center text-[var(--accent-color)] shrink-0">
              <Palette className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-[var(--text-primary)] truncate">
                {fetchedTheme ? fetchedTheme.name : 'Community Theme'}
              </h3>
              <p className="text-[11px] text-[var(--text-secondary)] truncate">
                {fetchedTheme
                  ? `by ${fetchedTheme.author || 'Dabawenyo Creator'}`
                  : THEME_PORTAL_BASE_URL.replace('https://', '')}
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={installing}
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full bg-[var(--nested-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center transition-colors cursor-pointer pressable shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-center">
            <Loader2 className="w-7 h-7 animate-spin text-[var(--accent-color)]" />
            <p className="text-xs font-semibold text-[var(--text-secondary)]">
              Downloading theme preview…
            </p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/25 space-y-3 text-center">
            <AlertCircle className="w-6 h-6 text-rose-500 mx-auto" />
            <p className="text-xs font-medium text-[var(--text-primary)]">{error}</p>
            {themeId && (
              <button
                type="button"
                onClick={() => loadTheme(themeId)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-[var(--nested-bg)] border border-[var(--card-border)] text-[var(--text-primary)] cursor-pointer pressable"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry
              </button>
            )}
          </div>
        )}

        {/* Loaded Theme Preview */}
        {!loading && fetchedTheme && (
          <div className="space-y-4">
            {/* Static Multi-Page Snapshot Carousel */}
            {previews.length > 0 ? (
              <div className="space-y-2">
                <div className="relative rounded-2xl overflow-hidden border border-[var(--card-border)] bg-[var(--nested-bg)] aspect-[16/10] flex items-center justify-center">
                  <img
                    src={previews[activeSlide]}
                    alt={`${fetchedTheme.name} preview ${activeSlide + 1}`}
                    className="w-full h-full object-contain bg-black/20"
                  />

                  {previews.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() => setActiveSlide((prev) => (prev - 1 + previews.length) % previews.length)}
                        aria-label="Previous preview"
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/55 text-white flex items-center justify-center backdrop-blur-sm cursor-pointer pressable"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveSlide((prev) => (prev + 1) % previews.length)}
                        aria-label="Next preview"
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/55 text-white flex items-center justify-center backdrop-blur-sm cursor-pointer pressable"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </>
                  )}

                  <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-full bg-black/60 text-white text-[10px] font-semibold backdrop-blur-sm">
                    {SNAPSHOT_LABELS[activeSlide] || `Preview ${activeSlide + 1}`}
                  </div>
                </div>

                {previews.length > 1 && (
                  <div className="flex items-center justify-center gap-1.5">
                    {previews.map((_, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setActiveSlide(idx)}
                        aria-label={`Slide ${idx + 1}`}
                        className={`h-1.5 rounded-full transition-all cursor-pointer ${
                          idx === activeSlide
                            ? 'w-5 bg-[var(--accent-color)]'
                            : 'w-1.5 bg-[var(--card-border)]'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Clean Static Palette Surface Preview when no snapshot images exist */
              <div
                className="rounded-2xl p-4 border space-y-3"
                style={{
                  backgroundColor: fetchedTheme.variables['--canvas-bg'],
                  backgroundImage: fetchedTheme.variables['--canvas-gradient'] || undefined,
                  borderColor: fetchedTheme.variables['--card-border']
                }}
              >
                <div
                  className="p-3.5 rounded-xl border flex items-center justify-between gap-3"
                  style={{
                    backgroundColor: fetchedTheme.variables['--card-bg'],
                    borderColor: fetchedTheme.variables['--card-border']
                  }}
                >
                  <div className="min-w-0">
                    <div
                      className="text-xs font-bold truncate"
                      style={{ color: fetchedTheme.variables['--text-primary'] }}
                    >
                      {fetchedTheme.name}
                    </div>
                    <div
                      className="text-[10px] truncate mt-0.5"
                      style={{ color: fetchedTheme.variables['--text-secondary'] }}
                    >
                      Pages • Popups • Widgets • Eagle Overlay
                    </div>
                  </div>
                  <span
                    className="px-3 py-1 rounded-full text-[10px] font-bold shrink-0"
                    style={{
                      background: fetchedTheme.variables['--btn-primary-bg'],
                      color: fetchedTheme.variables['--btn-primary-text']
                    }}
                  >
                    Sample
                  </span>
                </div>
              </div>
            )}

            {/* Metadata & Color Swatches */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[var(--nested-bg)] border border-[var(--card-border)] text-[var(--text-primary)]">
                  {fetchedTheme.isDark ? <Moon className="w-3 h-3" /> : <Sun className="w-3 h-3" />}
                  {fetchedTheme.isDark ? 'Dark' : 'Light'}
                </span>
                {fetchedTheme.wallpaperUrl && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[var(--nested-bg)] border border-[var(--card-border)] text-[var(--text-secondary)]">
                    <ImageIcon className="w-3 h-3" />
                    {fetchedTheme.hasGif ? 'Animated GIF' : 'Wallpaper'}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                {[
                  fetchedTheme.variables['--canvas-bg'],
                  fetchedTheme.variables['--card-bg'],
                  fetchedTheme.accentColor,
                  fetchedTheme.variables['--text-primary']
                ].map((col, idx) => (
                  <span
                    key={idx}
                    className="w-5 h-5 rounded-full border border-[var(--card-border)] shadow-2xs"
                    style={{ backgroundColor: col }}
                  />
                ))}
              </div>
            </div>

            {fetchedTheme.description && (
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                {fetchedTheme.description}
              </p>
            )}

            {savedNotice && (
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-500 text-xs font-bold flex items-center justify-center gap-1.5">
                <Check className="w-4 h-4" />
                {savedNotice}
              </div>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-1 gap-2 pt-1">
              <button
                type="button"
                disabled={installing}
                onClick={() => handleInstall(true)}
                className="w-full py-3 px-4 rounded-2xl text-xs font-bold bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] flex items-center justify-center gap-2 transition-opacity disabled:opacity-60 cursor-pointer pressable"
              >
                {installing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Downloading Offline…
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Install &amp; Equip Theme
                  </>
                )}
              </button>

              <button
                type="button"
                disabled={installing}
                onClick={() => handleInstall(false)}
                className="w-full py-2.5 px-4 rounded-2xl text-xs font-semibold bg-[var(--nested-bg)] border border-[var(--card-border)] text-[var(--text-primary)] transition-opacity disabled:opacity-60 cursor-pointer pressable"
              >
                Save to Library Only
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default ThemeInstallModal;
