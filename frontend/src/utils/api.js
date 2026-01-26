// استخدام: const { data, loading, error, fetchData } = useApi('/students')

import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// إضافة مقاطع Axios لمعالجة الأخطاء والتوثيق
api.interceptors.request.use(
  config => {
    // إضافة التوكن إلى الطلب إذا كان متاحاً
    const token = localStorage.getItem('access_token') || localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error)
);

api.interceptors.response.use(
  response => response,
  error => {
    // معالجة الأخطاء الشاملة
    if (error.response?.status === 401) {
      // توكن منتهي الصلاحية
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
