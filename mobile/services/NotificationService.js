/**
 * Notification Service for React Native
 * خدمة التعامل مع الإشعارات والتنبيهات
 */

import axios from 'axios';
import PushNotification from 'react-native-push-notification';

const API_BASE_URL = 'http://localhost:3001/api';

export class NotificationService {
  /**
   * احصل على الإشعارات غير المقروءة
   */
  static async getUnreadNotifications(userId, limit = 10) {
    try {
      const response = await axios.get(`${API_BASE_URL}/notifications/unread`, {
        params: {
          userId,
          limit,
        },
      });

      return response.data.notifications || [];
    } catch (error) {
      console.error('Get Unread Notifications Error:', error.message);
      return [];
    }
  }

  /**
   * احصل على جميع الإشعارات
   */
  static async getAllNotifications(userId, page = 1, limit = 20) {
    try {
      const response = await axios.get(`${API_BASE_URL}/notifications`, {
        params: {
          userId,
          page,
          limit,
        },
      });

      return response.data;
    } catch (error) {
      console.error('Get All Notifications Error:', error.message);
      return { notifications: [] };
    }
  }

  /**
   * احصل على عدد الإشعارات غير المقروءة
   */
  static async getUnreadCount(userId) {
    try {
      const response = await axios.get(`${API_BASE_URL}/notifications/unread-count`, {
        params: {
          userId,
        },
      });

      return response.data.count || 0;
    } catch (error) {
      console.error('Get Unread Count Error:', error.message);
      return 0;
    }
  }

  /**
   * اجعل الإشعار مقروءاً
   */
  static async markAsRead(notificationId) {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/notifications/${notificationId}/read`
      );

      return response.data;
    } catch (error) {
      console.error('Mark as Read Error:', error.message);
      throw error;
    }
  }

  /**
   * احذف الإشعار
   */
  static async deleteNotification(notificationId) {
    try {
      const response = await axios.delete(
        `${API_BASE_URL}/notifications/${notificationId}`
      );

      return response.data;
    } catch (error) {
      console.error('Delete Notification Error:', error.message);
      throw error;
    }
  }

  /**
   * أرسل إشعار فوري واحد
   */
  static async sendQuickNotification(userId, title, message, priority = 'normal') {
    try {
      const response = await axios.post(`${API_BASE_URL}/notifications/send`, {
        recipientId: userId,
        title,
        message,
        notificationType: 'system_message',
        priority,
        channels: ['push', 'inApp'],
      });

      // عرض إشعار محلي
      this.showLocalNotification(title, message);

      return response.data;
    } catch (error) {
      console.error('Send Quick Notification Error:', error.message);
    }
  }

  /**
   * إرسال إشعار الانتهاك
   */
  static async sendViolationAlert(driverId, violationType, details) {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/notifications/violation-alert`,
        {
          driverId,
          violationType,
          details,
        }
      );

      // عرض إشعار محلي بأولوية عالية
      this.showLocalNotification(
        '⚠️ تنبيه انتهاك',
        details.message || `انتهاك: ${violationType}`,
        'high'
      );

      return response.data;
    } catch (error) {
      console.error('Send Violation Alert Error:', error.message);
    }
  }

  /**
   * إرسال تقرير الأداء
   */
  static async sendPerformanceReport(driverId, period = 'daily') {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/notifications/performance-report`,
        {
          driverId,
          period,
        }
      );

      return response.data;
    } catch (error) {
      console.error('Send Performance Report Error:', error.message);
    }
  }

  /**
   * احصل على إحصائيات الإشعارات
   */
  static async getNotificationStats(userId) {
    try {
      const response = await axios.get(`${API_BASE_URL}/notifications/stats`, {
        params: {
          userId,
        },
      });

      return response.data;
    } catch (error) {
      console.error('Get Notification Stats Error:', error.message);
      return {};
    }
  }

  /**
   * عرض إشعار محلي (Local Push Notification)
   */
  static showLocalNotification(title, message, priority = 'normal') {
    PushNotification.localNotification({
      title,
      message,
      priority,
      smallIcon: 'ic_notification',
      largeIconUrl: 'https://example.com/logo.png',
      soundName: 'default',
      vibrate: priority === 'high',
      invokeApp: true,
    });
  }

  /**
   * جدول الإشعارات المتكررة
   */
  static scheduleNotification(userId, title, message, triggerTime) {
    try {
      axios.post(`${API_BASE_URL}/notifications/schedule`, {
        recipientId: userId,
        title,
        message,
        scheduledTime: triggerTime,
      });
    } catch (error) {
      console.error('Schedule Notification Error:', error.message);
    }
  }

  /**
   * إرسال إشعارات جماعية
   */
  static async sendBulkNotifications(driverIds, title, message) {
    try {
      const response = await axios.post(`${API_BASE_URL}/notifications/bulk-send`, {
        recipientIds: driverIds,
        title,
        message,
      });

      return response.data;
    } catch (error) {
      console.error('Bulk Send Error:', error.message);
    }
  }
}

export default NotificationService;
