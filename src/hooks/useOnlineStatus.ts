import { useState, useEffect, useCallback, useRef } from 'react';
import { checkDeviceNetworkStatus } from '../services/widgetService';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });
  const checkSeqRef = useRef<number>(0);

  const verifyConnectivity = useCallback(async () => {
    const seq = ++checkSeqRef.current;
    const status = await checkDeviceNetworkStatus();
    if (seq === checkSeqRef.current) {
      setIsOnline(status.connected);
    }
  }, []);

  useEffect(() => {
    // 1. Initial native check
    verifyConnectivity();

    // 2. Standard browser network events
    const handleOnline = () => {
      ++checkSeqRef.current;
      setIsOnline(true);
    };
    const handleOffline = () => {
      // Re-verify with native Android ConnectivityManager while guarding against stale responses
      verifyConnectivity();
    };

    // 3. Custom event dispatched by confirmed HTTP / API calls
    const handleNetworkActivity = (event: Event) => {
      const customEvent = event as CustomEvent<{ isOnline?: boolean }>;
      if (typeof customEvent.detail?.isOnline === 'boolean') {
        ++checkSeqRef.current;
        setIsOnline(customEvent.detail.isOnline);
      }
    };

    // 4. Window focus & app visibility resume
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        verifyConnectivity();
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('skwela_network_activity', handleNetworkActivity);
    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('skwela_network_activity', handleNetworkActivity);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    };
  }, [verifyConnectivity]);

  return isOnline;
}
