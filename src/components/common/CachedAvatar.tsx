import React, { useState, useEffect, useMemo } from 'react';
import { imageCacheService } from '../../services/imageCacheService';

export interface CachedAvatarProps {
  src?: string | null;
  name?: string;
  username?: string;
  alt?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  shape?: 'circle' | 'rounded' | 'square';
  className?: string;
  imgClassName?: string;
  fallbackClassName?: string;
  onClick?: () => void;
  badge?: React.ReactNode;
}

const GRADIENT_PALETTES = [
  'from-sky-500 to-indigo-600',
  'from-violet-500 to-purple-600',
  'from-emerald-500 to-teal-600',
  'from-rose-500 to-pink-600',
  'from-amber-500 to-orange-600',
  'from-cyan-500 to-blue-600',
  'from-fuchsia-500 to-rose-600',
  'from-blue-600 to-indigo-800'
];

function getDeterministicGradient(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % GRADIENT_PALETTES.length;
  return GRADIENT_PALETTES[index];
}

const SIZE_CLASSES = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-xl',
  xl: 'w-20 h-20 text-2xl'
};

const SHAPE_CLASSES = {
  circle: 'rounded-full',
  rounded: 'rounded-2xl',
  square: 'rounded-lg'
};

export const CachedAvatar: React.FC<CachedAvatarProps> = ({
  src,
  name = 'Student',
  username,
  alt,
  size = 'md',
  shape = 'circle',
  className = '',
  imgClassName = '',
  fallbackClassName = '',
  onClick,
  badge
}) => {
  // Check synchronous memory cache first for 0ms initial render
  const initialResolved = useMemo(() => imageCacheService.getSync(src), [src]);
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(initialResolved);
  const [hasError, setHasError] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    setHasError(false);

    if (!src || src === '??' || src === 'none') {
      setResolvedSrc(null);
      return;
    }

    const syncUrl = imageCacheService.getSync(src);
    if (syncUrl) {
      setResolvedSrc(syncUrl);
      return;
    }

    imageCacheService.getImageUrl(src).then((url) => {
      if (isMounted) {
        if (url) {
          setResolvedSrc(url);
          setHasError(false);
        } else {
          setHasError(true);
        }
      }
    }).catch(() => {
      if (isMounted) {
        setHasError(true);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [src]);

  // Derive initial character for fallback
  const initialChar = useMemo(() => {
    const raw = (name && name !== 'Student' ? name : (username || 'Student')).trim();
    const clean = raw.replace(/^@/, '');
    return clean ? clean.charAt(0).toUpperCase() : 'S';
  }, [name, username]);

  const gradientClass = useMemo(() => {
    const seed = (username || name || 'SkwelaDabaw').toLowerCase();
    return getDeterministicGradient(seed);
  }, [name, username]);

  const sizeClass = size ? SIZE_CLASSES[size] : '';
  const shapeClass = SHAPE_CLASSES[shape];

  const handleImageError = () => {
    setHasError(true);
    if (src) {
      // Invalidate broken URL from local cache so it doesn't stay stuck
      imageCacheService.invalidate(src);
    }
  };

  const showFallback = !resolvedSrc || hasError;

  return (
    <div
      onClick={onClick}
      className={`relative shrink-0 select-none overflow-hidden flex items-center justify-center font-bold tracking-tight text-white ${shapeClass} ${sizeClass} ${className}`}
    >
      {showFallback ? (
        <div
          className={`w-full h-full flex items-center justify-center bg-gradient-to-tr ${gradientClass} shadow-inner text-white font-black ${fallbackClassName}`}
          title={alt || name}
        >
          <span>{initialChar}</span>
        </div>
      ) : (
        <img
          src={resolvedSrc!}
          alt={alt || name || 'User Avatar'}
          onError={handleImageError}
          className={`w-full h-full object-cover ${shapeClass} ${imgClassName}`}
          loading="lazy"
        />
      )}
      {badge}
    </div>
  );
};
