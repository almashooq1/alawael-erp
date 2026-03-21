/**
 * API Client Configuration & Interceptors
 * ربط مركزي بين Frontend و Backend
 */

import axios from 'axios';

// تكوين قاعدة الـ API
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 ثانية
});

/**
 * Request Interceptor
 * إضافة Token و معالجة قبل الإرسال
 */
apiClient.interceptors.request.use(
  config => {
    // إضافة Token من LocalStorage
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // إضافة معلومات إضافية
    config.headers['X-Requested-With'] = 'XMLHttpRequest';
    config.headers['Accept-Language'] = localStorage.getItem('language') || 'en';

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
    return response.data;
  },
  error => {
    // معالجة الأخطاء
    const errorData = error.response?.data || error.message;

    if (error.response?.status === 401) {
      // Skip redirect for auth endpoints (login, register, refresh)
      const requestUrl = error.config?.url || '';
      const isAuthRequest = /\/auth\/(login|register|refresh)/.test(requestUrl);

      if (!isAuthRequest) {
        // انتهت جلسة العمل - حذف التوكن وإعادة التوجيه
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');

        // Use React-safe redirect (avoid full page reload loop)
        if (window.location.pathname !== '/login') {
          window.location.replace('/login');
        }
      }
    }

    if (process.env.NODE_ENV === 'development') {
      // Only log API errors in development
      console.error('API Error:', {
        status: error.response?.status,
        message: errorData,
        url: error.config?.url,
      });
    }

    return Promise.reject({
      status: error.response?.status,
      data: errorData,
      message: error.message,
    });
  }
);

export default apiClient;
