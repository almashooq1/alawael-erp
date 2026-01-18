import axios from 'axios';

// Create axios instance with configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3001/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add token and logging
api.interceptors.request.use(
  config => {
    // Add token from localStorage
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Log request in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`);
    }

    return config;
  },
  error => {
    console.error('[API Request Error]', error);
    return Promise.reject(error);
  },
);

// Response interceptor - Handle errors and retries
api.interceptors.response.use(
  response => {
    // Log response in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[API Response] ${response.status} ${response.config.url}`);
    }
    return response;
  },
  async error => {
    const config = error.config;

    // Handle 401 - Unauthorized
    if (error.response?.status === 401) {
      console.warn('[API] Unauthorized - Removing token and redirecting to login');
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      return Promise.reject(error);
    }

    // Handle 403 - Forbidden
    if (error.response?.status === 403) {
      console.error('[API] Forbidden - Access denied');
      return Promise.reject(new Error('ليس لديك صلاحية للوصول لهذا المورد'));
    }

    // Handle 404 - Not Found
    if (error.response?.status === 404) {
      console.warn('[API] Not Found');
      return Promise.reject(new Error('المورد المطلوب غير موجود'));
    }

    // Retry logic for network errors or 5xx errors
    if (!config.__retryCount) {
      config.__retryCount = 0;
    }

    // Only retry GET requests and network errors
    const shouldRetry =
      config.__retryCount < 3 &&
      (!error.response ||
        (error.response.status >= 500 && error.response.status < 600) ||
        error.code === 'ECONNABORTED' ||
        error.code === 'ENOTFOUND' ||
        error.code === 'ECONNREFUSED');

    if (shouldRetry && config.method === 'get') {
      config.__retryCount++;
      const delay = Math.min(1000 * Math.pow(2, config.__retryCount - 1), 10000);

      console.log(`[API] Retrying request ${config.__retryCount}/3 after ${delay}ms`);

      await new Promise(resolve => setTimeout(resolve, delay));
      return api(config);
    }

    // Handle network errors
    if (!error.response) {
      console.error('[API] Network Error', error.message);
      return Promise.reject(new Error('خطأ في الاتصال بالشبكة. يرجى التحقق من اتصالك بالإنترنت'));
    }

    // Handle server errors
    if (error.response?.status >= 500) {
      console.error('[API] Server Error', error.response.status);
      return Promise.reject(new Error('خطأ في الخادم. يرجى محاولة لاحقاً'));
    }

    // Handle client errors with custom messages
    const message = error.response?.data?.message || error.message || 'خطأ غير متوقع';
    console.error('[API] Error:', message);

    return Promise.reject(new Error(message));
  },
);

// API Methods with built-in error handling
export const apiService = {
  // GET
  get: async (url, config = {}) => {
    try {
      const response = await api.get(url, config);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // POST
  post: async (url, data = {}, config = {}) => {
    try {
      const response = await api.post(url, data, config);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // PUT
  put: async (url, data = {}, config = {}) => {
    try {
      const response = await api.put(url, data, config);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // PATCH
  patch: async (url, data = {}, config = {}) => {
    try {
      const response = await api.patch(url, data, config);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // DELETE
  delete: async (url, config = {}) => {
    try {
      const response = await api.delete(url, config);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

export default api;
