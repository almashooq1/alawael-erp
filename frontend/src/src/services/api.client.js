/**
 * API Client Configuration & Interceptors
 * ربط مركزي بين Frontend و Backend
 */

import axios from 'axios';

// تكوين قاعدة الـ API
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

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
  (config) => {
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
  (error) => {
    console.error('Request Config Error:', error);
    return Promise.reject(error);
  }
);

/**
 * Response Interceptor
 * معالجة الاستجابات و الأخطاء
 */
apiClient.interceptors.response.use(
  (response) => {
    // إذا كانت الاستجابة ناجحة
    console.log('API Response Success:', response.config.url);
    return response.data;
  },
  (error) => {
    // معالجة الأخطاء
    const errorData = error.response?.data || error.message;

    if (error.response?.status === 401) {
      // عدم استطاعة الوصول - قد انتهت جلسة العمل
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }

    if (error.response?.status === 403) {
      // ممنوع الوصول
      console.error('Access Forbidden:', errorData);
    }

    if (error.response?.status === 500) {
      // خطأ في الخادم
      console.error('Server Error:', errorData);
    }

    console.error('API Error:', {
      status: error.response?.status,
      message: errorData,
      url: error.config?.url,
    });

    return Promise.reject({
      status: error.response?.status,
      data: errorData,
      message: error.message,
    });
  }
);

export default apiClient;
