import { useState, useEffect, useCallback } from 'react';
import { getAllServicesStatus } from '../utils/api';

export function useQuality(refreshInterval = 30000) {
  const [services, setServices] = useState([]);
  const [system, setSystem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllServicesStatus();
      setServices(data.services);
      setSystem(data.system);
    } catch (err) {
      setError(err.message || 'فشل في جلب البيانات');
      console.error('Failed to fetch quality status:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(() => {
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    fetchStatus();

    if (refreshInterval > 0) {
      const interval = setInterval(fetchStatus, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchStatus, refreshInterval]);

  return {
    services,
    system,
    loading,
    error,
    refresh,
  };
}
