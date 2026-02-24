/**
 * Authentication Service for React Native
 * خدمة المصادقة والتحقق من البيانات
 */

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'http://localhost:3001/api';

export class AuthService {
  static token = null;
  static refreshToken = null;
  static user = null;

  /**
   * تسجيل الدخول
   */
  static async login(email, password) {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        email,
        password,
      });

      const { token, refreshToken, user } = response.data;

      // احفظ البيانات محلياً
      await AsyncStorage.setItem('token', token);
      await AsyncStorage.setItem('refreshToken', refreshToken);
      await AsyncStorage.setItem('user', JSON.stringify(user));

      // احفظ في الذاكرة
      this.token = token;
      this.refreshToken = refreshToken;
      this.user = user;

      // اعدل رؤوس axios
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      return { success: true, user };
    } catch (error) {
      console.error('Login Error:', error.message);
      return {
        success: false,
        error: error.response?.data?.message || 'خطأ في تسجيل الدخول',
      };
    }
  }

  /**
   * تسجيل الخروج
   */
  static async logout() {
    try {
      await AsyncStorage.multiRemove(['token', 'refreshToken', 'user']);

      this.token = null;
      this.refreshToken = null;
      this.user = null;

      delete axios.defaults.headers.common['Authorization'];

      return { success: true };
    } catch (error) {
      console.error('Logout Error:', error.message);
      return { success: false };
    }
  }

  /**
   * تحديث التوكن
   */
  static async refreshAccessToken() {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
        refreshToken: this.refreshToken,
      });

      const { token } = response.data;

      // احفظ التوكن الجديد
      await AsyncStorage.setItem('token', token);
      this.token = token;

      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      return { success: true };
    } catch (error) {
      console.error('Refresh Token Error:', error.message);
      // إذا فشل التحديث، قم بتسجيل خروج
      await this.logout();
      return { success: false };
    }
  }

  /**
   * تحميل البيانات المحفوظة
   */
  static async loadStoredData() {
    try {
      const [token, refreshToken, userStr] = await AsyncStorage.multiGet([
        'token',
        'refreshToken',
        'user',
      ]);

      if (token[1]) {
        this.token = token[1];
        axios.defaults.headers.common['Authorization'] = `Bearer ${token[1]}`;
      }

      if (refreshToken[1]) {
        this.refreshToken = refreshToken[1];
      }

      if (userStr[1]) {
        this.user = JSON.parse(userStr[1]);
      }

      return {
        isAuthenticated: !!this.token,
        user: this.user,
      };
    } catch (error) {
      console.error('Load Stored Data Error:', error.message);
      return { isAuthenticated: false };
    }
  }

  /**
   * احصل على بيانات المستخدم الحالي
   */
  static async getCurrentUser() {
    try {
      const response = await axios.get(`${API_BASE_URL}/auth/me`);
      this.user = response.data.user;
      return response.data.user;
    } catch (error) {
      console.error('Get Current User Error:', error.message);
      throw error;
    }
  }

  /**
   * تحديث ملف المستخدم
   */
  static async updateProfile(profileData) {
    try {
      const response = await axios.put(`${API_BASE_URL}/auth/profile`, profileData);

      this.user = response.data.user;
      await AsyncStorage.setItem('user', JSON.stringify(response.data.user));

      return { success: true, user: response.data.user };
    } catch (error) {
      console.error('Update Profile Error:', error.message);
      return {
        success: false,
        error: error.response?.data?.message || 'خطأ في تحديث الملف',
      };
    }
  }

  /**
   * تغيير كلمة المرور
   */
  static async changePassword(oldPassword, newPassword) {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/change-password`, {
        oldPassword,
        newPassword,
      });

      return { success: true, message: response.data.message };
    } catch (error) {
      console.error('Change Password Error:', error.message);
      return {
        success: false,
        error: error.response?.data?.message || 'خطأ في تغيير كلمة المرور',
      };
    }
  }

  /**
   * طلب إعادة تعيين كلمة المرور
   */
  static async requestPasswordReset(email) {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/forgot-password`, {
        email,
      });

      return { success: true, message: response.data.message };
    } catch (error) {
      console.error('Request Password Reset Error:', error.message);
      return {
        success: false,
        error: error.response?.data?.message || 'خطأ في إرسال البريد',
      };
    }
  }

  /**
   * إعادة تعيين كلمة المرور
   */
  static async resetPassword(token, newPassword) {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/reset-password`, {
        resetToken: token,
        newPassword,
      });

      return { success: true, message: response.data.message };
    } catch (error) {
      console.error('Reset Password Error:', error.message);
      return {
        success: false,
        error: error.response?.data?.message || 'خطأ في إعادة التعيين',
      };
    }
  }

  /**
   * تحقق من صحة الاتصال
   */
  static async checkConnectivity() {
    try {
      const response = await axios.get(`${API_BASE_URL}/health`);
      return response.status === 200;
    } catch (error) {
      console.error('Connectivity Error:', error.message);
      return false;
    }
  }
}

export default AuthService;
