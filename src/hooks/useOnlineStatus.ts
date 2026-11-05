import { useState, useEffect, useCallback } from 'react';
import { checkDeviceNetworkStatus } from '../services/widgetService';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });

  const verifyConnectivity = useCallback(async () => {
    const status = await checkDeviceNetworkStatus();
    setIsOnline(status.connected);
  }, []);

  useEffect(() => {
    // 1. Initial native check
    verifyConnectivity();

    // 2. Standard browser network events
    const handleOnline = () => setIsOnline(true);
    const handleOffline = async () => {
      // Re-verify with native Android ConnectivityManager before committing to offline
      const status = await checkDeviceNetworkStatus();
      setIsOnline(status.connected);
    };

    // 3. Custom event dispatched by successful HTTP / API calls
    const handleNetworkActivity = (event: Event) => {
      const customEvent = event as CustomEvent<{ isOnline?: boolean }>;
      const online = customEvent.detail?.isOnline ?? true;
      setIsOnline(online);
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
