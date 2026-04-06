/**
 * API Client Configuration & Interceptors
 * ربط مركزي بين Frontend و Backend
 *
 * Enhanced with:
 *  - Automatic retry with exponential backoff (network/5xx errors)
 *  - Request deduplication for identical GET requests
 *  - Token refresh on 401 before redirect
 *  - Request/response timing headers
 *  - Offline detection
 */

import axios from 'axios';
import {
  getToken,
  setToken,
  setRefreshToken,
  clearAuthData,
  getRefreshToken,
} from '../utils/tokenStorage';

// تكوين قاعدة الـ API
// Runtime detection: force relative /api/v1 on production (HTTPS) to avoid mixed-content
const _isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
const API_BASE_URL = _isSecure
  ? '/api/v1'
  : process.env.REACT_APP_API_V1_URL || process.env.REACT_APP_API_URL || '/api/v1';
const API_TIMEOUT = parseInt(process.env.REACT_APP_API_TIMEOUT, 10) || 30000;

// ─── Token Refresh State (singleton) ────────────────────────────────────────
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });
  failedQueue = [];
};

/**
 * Force full logout — clear tokens, redirect to login.
 */
const forceLogout = () => {
  clearAuthData();
  if (window.location.pathname !== '/login') {
    window.location.replace('/login');
  }
};

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: API_TIMEOUT,
});

// ─── Request Deduplication for GET requests ────────────────────────────────
const pendingRequests = new Map();

const getRequestKey = config => {
  if (config.method !== 'get') return null;
  return `${config.method}:${config.baseURL}${config.url}:${JSON.stringify(config.params || {})}`;
};

// ─── Retry Configuration ────────────────────────────────────────────────────
const MAX_RETRIES = 2;
const RETRY_DELAY_BASE = 1000; // 1 second

const shouldRetry = error => {
  // Don't retry on client errors (4xx) except 408 (timeout) and 429 (rate limit)
  if (error.response) {
    const status = error.response.status;
    return status === 408 || status === 429 || status >= 500;
  }
  // Retry on network errors
  return !error.response && error.code !== 'ECONNABORTED';
};

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Request Interceptor
 * إضافة Token و معالجة قبل الإرسال
 */
apiClient.interceptors.request.use(
  config => {
    // Check if offline
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return Promise.reject({
        message: 'لا يوجد اتصال بالإنترنت',
        code: 'OFFLINE',
        config,
      });
    }

    // إضافة Token من LocalStorage
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // إضافة معلومات إضافية
    config.headers['X-Requested-With'] = 'XMLHttpRequest';
    config.headers['Accept-Language'] = localStorage.getItem('language') || 'ar';

    // Request timing
    config.metadata = { startTime: Date.now() };

    // Initialize retry count
    if (config._retryCount === undefined) {
      config._retryCount = 0;
    }

    // Deduplicate concurrent identical GET requests
    const requestKey = getRequestKey(config);
    if (requestKey) {
      const pending = pendingRequests.get(requestKey);
      if (pending) {
        // Return existing promise instead of making a new request
        const controller = new AbortController();
        config.signal = controller.signal;
        controller.abort('Deduplicated');
        config._deduplicated = pending;
      }
    }

    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

/**
 * Response Interceptor
 * معالجة الاستجابات و الأخطاء
 */
apiClient.interceptors.response.use(
  response => {
    // Track timing
    const duration = response.config.metadata ? Date.now() - response.config.metadata.startTime : 0;

    // Log slow requests in development only
    if (process.env.NODE_ENV === 'development' && duration > 3000) {
      // eslint-disable-next-line no-console
      console.warn(`⏱️ Slow API call: ${response.config.url} (${duration}ms)`);
    }

    // Clean up deduplication tracking
    const requestKey = getRequestKey(response.config);
    if (requestKey) {
      pendingRequests.delete(requestKey);
    }

    return response.data;
  },
  async error => {
    const config = error.config || {};

    // Handle deduplicated requests — return the original promise
    if (config._deduplicated) {
      try {
        return await config._deduplicated;
      } catch (e) {
        return Promise.reject(e);
      }
    }

    // ─── Retry Logic ────────────────────────────────────────────────────
    if (shouldRetry(error) && config._retryCount < MAX_RETRIES) {
      config._retryCount++;
      const retryDelay = RETRY_DELAY_BASE * Math.pow(2, config._retryCount - 1);

      // Retry logging — development only
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.info(
          `🔄 Retrying ${config.url} (attempt ${config._retryCount}/${MAX_RETRIES}) in ${retryDelay}ms`
        );
      }

      await delay(retryDelay);
      return apiClient(config);
    }

    // Clean up deduplication tracking
    const requestKey = getRequestKey(config);
    if (requestKey) {
      pendingRequests.delete(requestKey);
    }

    // معالجة الأخطاء
    const errorData = error.response?.data || error.message;

    if (error.response?.status === 401) {
      // Skip redirect for auth endpoints (login, register, refresh)
      const requestUrl = config.url || '';
      const isAuthRequest = /\/auth\/(login|register|refresh)/.test(requestUrl);

      if (!isAuthRequest) {
        // ─── Try refreshing the token before forcing logout ──────────
        const refreshToken = getRefreshToken();

        if (refreshToken && !config._isRetryAfterRefresh) {
          if (isRefreshing) {
            // Another request is already refreshing — queue this one
            return new Promise((resolve, reject) => {
              failedQueue.push({ resolve, reject });
            })
              .then(newToken => {
                config.headers.Authorization = `Bearer ${newToken}`;
                config._isRetryAfterRefresh = true;
                return apiClient(config);
              })
              .catch(err => Promise.reject(err));
          }

          isRefreshing = true;

          try {
            // Call refresh endpoint directly with axios to avoid interceptor loop
            const refreshResponse = await axios.post(
              `${API_BASE_URL}/auth/refresh`,
              { refreshToken },
              { headers: { 'Content-Type': 'application/json' }, timeout: 10000 }
            );

            const data = refreshResponse.data?.data || refreshResponse.data;
            const newAccessToken = data?.accessToken || data?.token;
            const newRefreshToken = data?.refreshToken;

            if (newAccessToken) {
              // Save new tokens
              setToken(newAccessToken);
              if (newRefreshToken) {
                setRefreshToken(newRefreshToken);
              }

              // Process queued requests with new token
              processQueue(null, newAccessToken);

              // Retry the original request
              config.headers.Authorization = `Bearer ${newAccessToken}`;
              config._isRetryAfterRefresh = true;
              return apiClient(config);
            } else {
              // Refresh succeeded but no token — force logout
              processQueue(new Error('No token in refresh response'));
              forceLogout();
            }
          } catch (refreshError) {
            // Refresh failed — force logout
            processQueue(refreshError);
            forceLogout();
          } finally {
            isRefreshing = false;
          }
        } else {
          // No refresh token or already retried — force logout
          forceLogout();
        }
      }
    }

    // Log errors only in development to avoid leaking info in production
    if (process.env.NODE_ENV === 'development') {
      if (error.response?.status === 403) {
        // eslint-disable-next-line no-console
        console.error('Access Forbidden:', errorData);
      }

      if (error.response?.status === 429) {
        const retryAfter = error.response.headers?.['retry-after'];
        // eslint-disable-next-line no-console
        console.warn(`Rate limited. Retry after: ${retryAfter || 'unknown'} seconds`);
      }

      if (error.response?.status >= 500) {
        // eslint-disable-next-line no-console
        console.error('Server Error:', errorData);
      }
    }

    return Promise.reject({
      status: error.response?.status,
      data: errorData,
      message: error.message,
      code: error.code,
    });
  }
);

export default apiClient;
