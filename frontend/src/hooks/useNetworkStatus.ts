/**
 * useNetworkStatus — TypeScript Version
 * Hook لمراقبة حالة الاتصال بالإنترنت
 */

import { useState, useEffect } from 'react';

export interface NetworkStatus {
  online: boolean;
  since: Date | null;
}

export default function useNetworkStatus(): NetworkStatus {
  const [online, setOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [since, setSince] = useState<Date | null>(() => (online ? new Date() : null));

  useEffect(() => {
    const goOnline = (): void => {
      setOnline(true);
      setSince(new Date());
    };
    const goOffline = (): void => {
      setOnline(false);
      setSince(null);
    };

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  return { online, since };
}
