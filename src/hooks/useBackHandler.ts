import { useEffect, useRef, useId } from 'react';
import { navigationManager, BackPriority, BackPriorityLevel } from '../services/navigationManager';

/**
 * Hook to register a back action handler when an overlay/modal/view is active.
 * When the back button is pressed while isOpen is true, onBack is invoked and the back event is consumed.
 * 
 * @param isOpen Whether the modal/overlay/view is currently open/active
 * @param onBack Callback invoked when back button is pressed while open
 * @param priority Priority level (default: BackPriority.MODAL = 30)
 * @param customId Optional unique identifier for the handler
 */
export function useBackHandler(
  isOpen: boolean,
  onBack: () => void,
  priority: number = BackPriority.MODAL,
  customId?: string
) {
  const autoId = useId();
  const id = customId || autoId;
  const onBackRef = useRef(onBack);

  useEffect(() => {
    onBackRef.current = onBack;
  }, [onBack]);

  useEffect(() => {
    if (!isOpen) return;

    const unregister = navigationManager.register(id, priority, () => {
      onBackRef.current();
      return true; // Mark as handled to prevent further propagation
    });

    return () => {
      unregister();
    };
  }, [isOpen, id, priority]);
}

export { BackPriority };
export type { BackPriorityLevel };
