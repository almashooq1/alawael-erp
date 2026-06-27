import { useState, useEffect } from 'react';

/**
 * useNetworkStatus
 * Hook لمراقبة حالة الاتصال بالإنترنت
 *
 * Returns: { online: boolean, since: Date|null }
 */
export default function useNetworkStatus() {
  const [online, setOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [since, setSince] = useState(() => (online ? new Date() : null));

  useEffect(() => {
    const goOnline = () => {
      setOnline(true);
      setSince(new Date());
    };
    const goOffline = () => {
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
