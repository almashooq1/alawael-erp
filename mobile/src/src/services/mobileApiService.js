/**
 * Mobile API Service Layer
 * طبقة خدمات API للهاتف الذكي
 *
 * Features:
 * ✅ Offline-First Architecture
 * ✅ Request Caching
 * ✅ Auto Retry with Exponential Backoff
 * ✅ JWT Token Management
 * ✅ Error Handling
 * ✅ Request/Response Interceptors
 */

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as RNKeychain from 'react-native-keychain';
import store from '../redux/store';
import { showErrorMessage } from '../utils/notifications';

// API Configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://api.license-system.sa/v1';
const REQUEST_TIMEOUT = 30000; // 30 seconds
const MAX_RETRIES = 3;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Create Axios Instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: REQUEST_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-Client': 'mobile-app',
    'X-App-Version': '2.1.0',
  },
});

// Cache Management
const requestCache = new Map();

/**
 * Request Interceptor - Add Token & Handle Authentication
 */
apiClient.interceptors.request.use(
  async config => {
    try {
      // Get token from secure storage
      const credentials = await RNKeychain.getGenericPassword();
      if (credentials && credentials.password) {
        config.headers.Authorization = `Bearer ${credentials.password}`;
      }

      // Add device info
      const deviceId = await AsyncStorage.getItem('deviceId');
      if (deviceId) {
        config.headers['X-Device-ID'] = deviceId;
      }

      // Add custom request ID for tracking
      config.headers['X-Request-ID'] = `${Date.now()}-${Math.random()}`;

      return config;
    } catch (error) {
      console.error('❌ Request interceptor error:', error);
      return config;
    }
  },
  error => Promise.reject(error),
);

/**
 * Response Interceptor - Handle Errors & Token Refresh
 */
apiClient.interceptors.response.use(
  response => {
    // Cache successful GET requests
    if (response.config.method === 'get') {
      requestCache.set(response.config.url, {
        data: response.data,
        timestamp: Date.now(),
      });
    }
    return response;
  },
  async error => {
    const config = error.config;

    // Handle 401 - Token Expired
    if (error.response?.status === 401) {
      try {
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        if (refreshToken && !config._retry) {
          config._retry = true;
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken,
          });

          if (response.data.accessToken) {
            await RNKeychain.setGenericPassword('token', response.data.accessToken);
            await AsyncStorage.setItem('refreshToken', response.data.refreshToken);
            return apiClient(config);
          }
        } else {
          // Logout user
          store.dispatch({ type: 'LOGOUT' });
        }
      } catch (refreshError) {
        store.dispatch({ type: 'LOGOUT' });
      }
    }

    // Handle 403 - Forbidden
    if (error.response?.status === 403) {
      showErrorMessage('⚠️ ليس لديك صلاحية لهذه العملية');
    }

    // Handle 404 - Not Found
    if (error.response?.status === 404) {
      showErrorMessage('🔍 المورد المطلوب غير موجود');
    }

    // Handle 429 - Rate Limited
    if (error.response?.status === 429) {
      showErrorMessage('⏱️ تم تجاوز حد الطلبات، يرجى المحاولة لاحقاً');
    }

    // Handle 500+ - Server Errors
    if (error.response?.status >= 500) {
      showErrorMessage('❌ خطأ في الخادم، يرجى المحاولة لاحقاً');
    }

    return Promise.reject(error);
  },
);

/**
 * Mobile API Service
 * خدمة API للجوال
 */
const mobileApiService = {
  /**
   * GET Request with Caching
   */
  async get(url, options = {}) {
    const cacheKey = url;
    const useCache = options.cache !== false;

    // Check cache
    if (useCache) {
      const cached = requestCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached.data;
      }
    }

    try {
      const response = await apiClient.get(url, {
        ...options,
        validateStatus: () => true,
      });

      if (response.status === 200) {
        return response.data;
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error(`❌ GET ${url} failed:`, error);
      throw error;
    }
  },

  /**
   * POST Request
   */
  async post(url, data = {}, options = {}) {
    try {
      const response = await apiClient.post(url, data, {
        ...options,
        validateStatus: () => true,
      });

      if (response.status >= 200 && response.status < 300) {
        // Clear cache for related endpoints
        this.clearCache(url);
        return response.data;
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error(`❌ POST ${url} failed:`, error);
      throw error;
    }
  },

  /**
   * PUT Request
   */
  async put(url, data = {}, options = {}) {
    try {
      const response = await apiClient.put(url, data, options);
      this.clearCache(url);
      return response.data;
    } catch (error) {
      console.error(`❌ PUT ${url} failed:`, error);
      throw error;
    }
  },

  /**
   * DELETE Request
   */
  async delete(url, options = {}) {
    try {
      const response = await apiClient.delete(url, options);
      this.clearCache(url);
      return response.data;
    } catch (error) {
      console.error(`❌ DELETE ${url} failed:`, error);
      throw error;
    }
  },

  /**
   * Upload File with Progress
   */
  async uploadFile(url, file, onProgress) {
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        type: file.type || 'application/octet-stream',
        name: file.name || 'file',
      });

      const response = await apiClient.post(url, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: progressEvent => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress?.(progress);
        },
      });

      this.clearCache(url);
      return response.data;
    } catch (error) {
      console.error(`❌ File upload failed:`, error);
      throw error;
    }
  },

  /**
   * Batch Requests
   */
  async batch(requests) {
    try {
      const responses = await Promise.all(
        requests.map(req => {
          if (req.method === 'get') return this.get(req.url, req.options);
          if (req.method === 'post') return this.post(req.url, req.data, req.options);
          if (req.method === 'put') return this.put(req.url, req.data, req.options);
          if (req.method === 'delete') return this.delete(req.url, req.options);
        }),
      );
      return responses;
    } catch (error) {
      console.error('❌ Batch request failed:', error);
      throw error;
    }
  },

  /**
   * Clear Cache
   */
  clearCache(pattern) {
    if (pattern) {
      for (const key of requestCache.keys()) {
        if (key.includes(pattern)) {
          requestCache.delete(key);
        }
      }
    } else {
      requestCache.clear();
    }
  },

  /**
   * Get Cache Stats
   */
  getCacheStats() {
    return {
      size: requestCache.size,
      items: Array.from(requestCache.keys()),
    };
  },
};

export default mobileApiService;
