import { App } from '@capacitor/app';

export const BackPriority = {
  POPUP: 40,
  MODAL: 30,
  SUBVIEW: 20,
  TAB: 10,
  ROOT: 0,
} as const;

export type BackPriorityLevel = typeof BackPriority[keyof typeof BackPriority];

export type BackHandler = () => boolean;

interface RegisteredHandler {
  id: string;
  priority: number;
  handler: BackHandler;
  timestamp: number;
}

class NavigationManager {
  private handlers: RegisteredHandler[] = [];
  private isInitialized = false;
  private exitArmed = false;
  private exitTimer: ReturnType<typeof setTimeout> | null = null;
  private onExitArmedChangeListeners: ((armed: boolean) => void)[] = [];

  constructor() {
    this.init();
  }

  public init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Listen to native Android back button via Capacitor
    try {
      App.addListener('backButton', ({ canGoBack }) => {
        this.dispatchBackPress(canGoBack);
      });
    } catch (e) {
      console.warn('Capacitor App backButton listener registration:', e);
    }

    // Listen to web browser popstate (history navigation)
    window.addEventListener('popstate', (e) => {
      const handled = this.dispatchBackPress(true);
      if (handled) {
        // Prevent browser from reloading or going to arbitrary external URL
        window.history.pushState(null, '', window.location.href);
      }
    });

    // Ensure there is at least one history entry for popstate interception
    try {
      window.history.pushState(null, '', window.location.href);
    } catch {
      // Ignored in strict environments
    }
  }

  /**
   * Register a back action handler
   * Returns a cleanup unregister function
   */
  public register(id: string, priority: number, handler: BackHandler): () => void {
    // Remove existing if registered under same id
    this.unregister(id);

    const entry: RegisteredHandler = {
      id,
      priority,
      handler,
      timestamp: Date.now(),
    };

    this.handlers.push(entry);

    return () => {
      this.unregister(id);
    };
  }

  /**
   * Unregister handler by id
   */
  public unregister(id: string) {
    this.handlers = this.handlers.filter((h) => h.id !== id);
  }

  /**
   * Dispatch back press event down the prioritized LIFO chain
   */
  public dispatchBackPress(canGoBackNative = false): boolean {
    // Sort handlers: higher priority first; if equal priority, newer timestamp first (LIFO)
    const sorted = [...this.handlers].sort((a, b) => {
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      return b.timestamp - a.timestamp;
    });

    for (const item of sorted) {
      try {
        const handled = item.handler();
        if (handled) {
          // If a higher level handled the back press, disarm any pending root exit
          this.disarmExit();
          return true;
        }
      } catch (err) {
        console.error(`Error in back handler [${item.id}]:`, err);
      }
    }

    // Fallback if no handler consumed it
    return false;
  }

  /**
   * Arm double-tap exit prompt
   */
  public armExit(timeoutMs = 2000): boolean {
    if (this.exitArmed) {
      // Second tap received within window -> cleanly exit app
      this.disarmExit();
      try {
        App.exitApp();
      } catch (e) {
        console.warn('App.exitApp call:', e);
      }
      return true;
    }

    // First tap -> arm and notify listeners
    this.exitArmed = true;
    this.notifyExitListeners(true);

    if (this.exitTimer) {
      clearTimeout(this.exitTimer);
    }

    this.exitTimer = setTimeout(() => {
      this.disarmExit();
    }, timeoutMs);

    return false;
  }

  /**
   * Disarm double-tap exit prompt
   */
  public disarmExit() {
    if (this.exitTimer) {
      clearTimeout(this.exitTimer);
      this.exitTimer = null;
    }
    if (this.exitArmed) {
      this.exitArmed = false;
      this.notifyExitListeners(false);
    }
  }

  public isExitArmed(): boolean {
    return this.exitArmed;
  }

  public onExitArmedChange(listener: (armed: boolean) => void): () => void {
    this.onExitArmedChangeListeners.push(listener);
    return () => {
      this.onExitArmedChangeListeners = this.onExitArmedChangeListeners.filter((l) => l !== listener);
    };
  }

  private notifyExitListeners(armed: boolean) {
    for (const listener of this.onExitArmedChangeListeners) {
      try {
        listener(armed);
      } catch (e) {
        console.error('Exit listener error:', e);
      }
    }
  }
}

export const navigationManager = new NavigationManager();
