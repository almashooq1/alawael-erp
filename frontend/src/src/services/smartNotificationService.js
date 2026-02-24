// إعداد ثابت عنوان الـ API قبل تعريف الكلاس
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

class SmartNotificationService {
  /**
   * إرسال إشعار ذكي مخصص (مباشر)
   * @param {Object} notification - بيانات الإشعار
   * @returns {Promise<Object>} النتيجة
   */
  static async sendSmartNotification(notification) {
    try {
      const response = await fetch(`${API_BASE_URL}/notifications/smart/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(notification),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('خطأ في إرسال الإشعار الذكي:', error);
      throw error;
    }
  }
  /**
   * الحصول على الإشعارات الذكية للمستخدم
   * @param {string} userId - معرّف المستخدم
   * @param {string} type - نوع الإشعارات (all, unread)
   * @param {number} limit - عدد الإشعارات
   * @returns {Promise<Object>} البيانات والإحصائيات
   */
  static async getSmartNotifications(userId, type = 'all', limit = 50) {
    try {
      const url = `${API_BASE_URL}/notifications/smart/${userId}?type=${type}&limit=${limit}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('خطأ في جلب الإشعارات:', error);
      throw error;
    }
  }

  /**
   * الحصول على الإشعارات غير المقروءة فقط
   * @param {string} userId - معرّف المستخدم
   * @returns {Promise<Object>} الإشعارات والإحصائيات
   */
  static async getUnreadNotifications(userId) {
    return this.getSmartNotifications(userId, 'unread');
  }

  /**
   * وضع علامة على إشعار كمقروء
   * @param {string} notificationId - معرّف الإشعار
   * @returns {Promise<Object>} النتيجة
   */
  static async markAsRead(notificationId) {
    try {
      const response = await fetch(`${API_BASE_URL}/notifications/smart/${notificationId}/read`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('خطأ في وضع علامة على الإشعار:', error);
      throw error;
    }
  }

  /**
   * حذف إشعار
   * @param {string} notificationId - معرّف الإشعار
   * @returns {Promise<Object>} النتيجة
   */
  static async deleteNotification(notificationId) {
    try {
      const response = await fetch(`${API_BASE_URL}/notifications/smart/${notificationId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('خطأ في حذف الإشعار:', error);
      throw error;
    }
  }

  /**
   * حذف جميع الإشعارات
   * @param {string} userId - معرّف المستخدم
   * @returns {Promise<Object>} النتيجة مع عدد الإشعارات المحذوفة
   */
  static async clearAllNotifications(userId) {
    try {
      const response = await fetch(`${API_BASE_URL}/notifications/smart/clear/${userId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('خطأ في حذف جميع الإشعارات:', error);
      throw error;
    }
  }

  /**
   * جدولة إشعار للإرسال لاحقاً
   * @param {Object} notification - بيانات الإشعار
   * @param {Date} scheduledTime - وقت الإرسال
   * @param {string} userId - معرّف المستخدم
   * @returns {Promise<Object>} النتيجة مع معرّف الجدول
   */
  static async scheduleNotification(notification, scheduledTime, userId) {
    try {
      const response = await fetch(`${API_BASE_URL}/notifications/smart/schedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          notification,
          scheduledTime,
          userId,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('خطأ في جدولة الإشعار:', error);
      throw error;
    }
  }

  /**
   * إنشاء إشعار ذكي جديد
   * @param {Object} workflow - بيانات سير العمل
   * @param {string} type - نوع الإشعار
   * @param {string} userId - معرّف المستخدم
   * @returns {Promise<Object>} الإشعار الجديد
   */
  static async createSmartNotification(workflow, type, userId) {
    try {
      const response = await fetch(`${API_BASE_URL}/notifications/smart/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          workflow,
          type,
          userId,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('خطأ في إنشاء الإشعار:', error);
      throw error;
    }
  }

  /**
   * وضع علامة على جميع الإشعارات كمقروءة
   * دالة مساعدة تقوم بوضع علامة على كل إشعار
   * @param {Array} notifications - قائمة الإشعارات
   * @returns {Promise<void>}
   */
  static async markAllAsRead(notifications) {
    try {
      const promises = notifications.filter(n => !n.isRead).map(n => this.markAsRead(n.id));

      await Promise.all(promises);
    } catch (error) {
      console.error('خطأ في وضع علامة على جميع الإشعارات:', error);
      throw error;
    }
  }
}

export default SmartNotificationService;
