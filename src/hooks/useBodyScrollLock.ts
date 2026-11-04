import { useEffect } from 'react';

/**
 * Centralized, reference-counted body scroll lock manager.
 * Prevents multiple modal components from stomping on each other's scroll lock state
 * and eliminates race conditions where captured "previous" styles get stuck as 'hidden'.
 * 
 * Never sets `touch-action: none` on `document.body` so mobile swipe gestures are never
 * killed globally; touch containment is handled at the modal backdrop level.
 */

let activeLockCount = 0;
let originalOverflow = '';

/**
 * Safely request a lock on document body scroll.
 */
export function lockBodyScroll(): void {
  if (typeof document === 'undefined') return;

  if (activeLockCount === 0) {
    const current = document.body.style.overflow;
    originalOverflow = (current && current !== 'hidden') ? current : '';
    document.body.style.overflow = 'hidden';
  }
  activeLockCount++;
}

/**
 * Safely release a lock on document body scroll.
 */
export function unlockBodyScroll(): void {
  if (typeof document === 'undefined') return;

  activeLockCount = Math.max(0, activeLockCount - 1);
  if (activeLockCount === 0) {
    document.body.style.overflow = originalOverflow || '';
    document.body.style.touchAction = '';
  }
}

/**
 * Emergency fail-safe to immediately release all body locks and clear any inline scroll restrictions.
 * Used when navigating between tabs, switching root views, or resetting state.
 */
export function forceUnlockBodyScroll(): void {
  if (typeof document === 'undefined') return;

  activeLockCount = 0;
  originalOverflow = '';
  document.body.style.overflow = '';
  document.body.style.touchAction = '';
}

/**
 * React hook to lock document body scrolling while isLocked is true.
 * Automatically cleans up and decrements lock counter on unmount or when isLocked turns false.
 */
export function useBodyScrollLock(isLocked: boolean): void {
  useEffect(() => {
    if (!isLocked) return;

    lockBodyScroll();
    return () => {
      unlockBodyScroll();
    };
  }, [isLocked]);
}
