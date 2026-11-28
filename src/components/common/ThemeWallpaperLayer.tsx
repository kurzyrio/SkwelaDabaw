import React, { useEffect, useState } from 'react';
import { ActiveWallpaperState, getActiveWallpaperState } from '../../themes';

/**
 * GPU-composited full-viewport wallpaper/GIF/gradient layer mounted once at root.
 * Renders null when any of the 6 official core themes is active (zero overhead).
 */
export const ThemeWallpaperLayer: React.FC = () => {
  const [wallpaper, setWallpaper] = useState<ActiveWallpaperState>(() => getActiveWallpaperState());

  useEffect(() => {
    const sync = (e?: Event) => {
      const custom = e as CustomEvent<{ wallpaperState?: ActiveWallpaperState }> | undefined;
      if (custom?.detail?.wallpaperState) {
        setWallpaper(custom.detail.wallpaperState);
      } else {
        setWallpaper(getActiveWallpaperState());
      }
    };
    sync();
    window.addEventListener('skweladabaw_theme_changed', sync);
    return () => window.removeEventListener('skweladabaw_theme_changed', sync);
  }, []);

  if (!wallpaper.isCustom || (!wallpaper.wallpaperUrl && !wallpaper.canvasGradient)) {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-0 pointer-events-none overflow-hidden select-none"
      style={{
        backgroundColor: 'var(--canvas-bg)',
        backgroundImage: wallpaper.canvasGradient || undefined,
        transform: 'translateZ(0)',
        willChange: 'transform'
      }}
    >
      {wallpaper.wallpaperUrl && (
        <img
          src={wallpaper.wallpaperUrl}
          alt=""
          decoding="async"
          className={`w-full h-full ${wallpaper.wallpaperFit === 'contain' ? 'object-contain' : 'object-cover'}`}
          style={{ opacity: wallpaper.wallpaperOpacity }}
        />
      )}
      {wallpaper.canvasOverlay && (
        <div
          className="absolute inset-0"
          style={{ background: wallpaper.canvasOverlay }}
        />
      )}
    </div>
  );
};

export default ThemeWallpaperLayer;
