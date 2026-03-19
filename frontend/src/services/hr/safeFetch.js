/**
 * safeFetch — Shared fetch wrapper with demo-data fallback
 * طبقة آمنة للاتصال بالخادم مع بيانات احتياطية
 */
import apiClient from '../api.client';
import logger from '../../utils/logger';

export async function safeFetch(endpoint, fallback, options = {}) {
  try {
    const res =
      options.method === 'POST'
        ? await apiClient.post(endpoint, options.body)
        : options.method === 'PUT'
          ? await apiClient.put(endpoint, options.body)
          : options.method === 'DELETE'
            ? await apiClient.delete(endpoint)
            : await apiClient.get(endpoint);
    const data = res?.data ?? res;
    return { data: Array.isArray(data) ? data : data?.data || data, isDemo: false };
  } catch (err) {
    logger.warn(`HR API ${endpoint} unavailable:`, err?.message);
    return { data: fallback, isDemo: true };
  }
}
