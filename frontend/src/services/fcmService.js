// src/services/fcmService.js
// خدمة تسجيل توكن FCM للواجهة الأمامية (React/PWA)
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const fcmService = {
  /**
   * تسجيل توكن FCM للمستخدم الحالي
   * @param {string} token
   * @param {string} jwtToken
   */
  async registerToken(token, jwtToken) {
    return axios.post(
      `${API_BASE_URL}/fcm/register`,
      { token },
      { headers: { Authorization: `Bearer ${jwtToken}` } }
    );
  },
  /**
   * حذف توكن FCM عند تسجيل الخروج
   * @param {string} token
   * @param {string} jwtToken
   */
  async unregisterToken(token, jwtToken) {
    return axios.post(
      `${API_BASE_URL}/fcm/unregister`,
      { token },
      { headers: { Authorization: `Bearer ${jwtToken}` } }
    );
  },
};

export default fcmService;
