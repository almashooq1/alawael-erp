/**
 * safeFetch — Shared fetch wrapper for HR API calls
 * طبقة آمنة للاتصال بالخادم — لا تُرجع بيانات تجريبية
 *
 * On success → { data, isDemo: false }
 * On error   → { data: [], isDemo: false, error: message }
 */
import apiClient from '../api.client';
import logger from '../../utils/logger';

export async function safeFetch(endpoint, _fallbackUnused, options = {}) {
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
    logger.error(`HR API ${endpoint} error:`, err?.message);
    return { data: [], isDemo: false, error: err?.message || 'API error' };
  }
}
