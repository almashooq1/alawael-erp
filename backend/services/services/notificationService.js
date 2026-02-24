/**
 * Notification Service - Multi-channel Notifications
 */

const { sendEmail } = require('./emailService');
const { sendSMS } = require('./smsService');
const { sendPush } = require('./pushService');

class NotificationService {
  static notifications = [];

  /**
   * إرسال إشعار
   */
  static async sendNotification(userId, notificationData) {
    try {
      const notif = {
        id: `notif_${Date.now()}`,
        userId,
        title: notificationData.title,
        message: notificationData.message,
        channels: notificationData.channels || ['in-app'],
        priority: notificationData.priority || 'normal',
        createdAt: new Date(),
        sent: true,
        deliveryStatus: {},
      };

      // إرسال عبر القنوات المطلوبة

      // جلب بيانات المستخدم (للحصول على البريد، الجوال، fcmTokens)
      let user = notificationData.userObj;
      if (!user) {
        user = await User.findById(userId).lean();
      }

      for (const channel of notif.channels) {
        if (channel === 'email') {
          const to = notificationData.email || (user && user.email) || 'test@example.com';
          const subject = notif.title;
          const text = notif.message;
          const result = await sendEmail({ to, subject, text });
          notif.deliveryStatus.email = result.success ? 'sent' : 'failed';
        } else if (channel === 'sms') {
          const to = notificationData.phone || (user && user.phone) || '+201234567890';
          const message = notif.message;
          const result = await sendSMS({ to, message });
          notif.deliveryStatus.sms = result.success ? 'sent' : 'failed';
        } else if (channel === 'push') {
          const tokens = (user && user.fcmTokens) || [];
          if (tokens.length > 0) {
            const result = await sendPush({ tokens, title: notif.title, body: notif.message });
            notif.deliveryStatus.push = result.success ? 'sent' : 'failed';
          } else {
            notif.deliveryStatus.push = 'no-tokens';
          }
        } else if (channel === 'in-app') {
          notif.deliveryStatus.inApp = 'delivered';
        }
      }

      this.notifications.push(notif);

      return {
        success: true,
        notificationId: notif.id,
        sentTo: notif.channels,
        deliveryStatus: notif.deliveryStatus,
        timestamp: new Date(),
      };
    } catch (err) {
      throw new Error(`Notification send failed: ${err.message}`);
    }
  }

  /**
   * الحصول على إشعارات المستخدم
   */
  static async getNotifications(userId, limit = 50, unreadOnly = false) {
    try {
      let userNotifs = this.notifications.filter(n => n.userId === userId);

      if (unreadOnly) {
        userNotifs = userNotifs.filter(n => !n.read);
      }

      return {
        success: true,
        count: userNotifs.length,
        notifications: userNotifs.slice(-limit),
        timestamp: new Date(),
      };
    } catch (err) {
      throw new Error(`Get notifications failed: ${err.message}`);
    }
  }

  /**
   * وضع علامة على الإشعار كمقروء
   */
  static async markAsRead(notificationId) {
    try {
      const notif = this.notifications.find(n => n.id === notificationId);
      if (notif) {
        notif.read = true;
      }

      return { success: true, message: 'Marked as read' };
    } catch (err) {
      throw new Error(`Mark as read failed: ${err.message}`);
    }
  }

  /**
   * حذف الإشعار
   */
  static async deleteNotification(notificationId) {
    try {
      this.notifications = this.notifications.filter(n => n.id !== notificationId);
      return { success: true, message: 'Notification deleted' };
    } catch (err) {
      throw new Error(`Delete notification failed: ${err.message}`);
    }
  }

  /**
   * حذف جميع إشعارات المستخدم
   */
  static async deleteAllNotifications(userId) {
    try {
      const countBefore = this.notifications.length;
      this.notifications = this.notifications.filter(n => n.userId !== userId);
      const deletedCount = countBefore - this.notifications.length;

      return {
        success: true,
        message: `${deletedCount} notifications deleted`,
      };
    } catch (err) {
      throw new Error(`Delete all notifications failed: ${err.message}`);
    }
  }

  /**
   * جدولة إشعار (محاكاة)
   */
  static async scheduleNotification(userId, notificationData, scheduleTime) {
    try {
      return {
        success: true,
        message: 'Notification scheduled',
        scheduledFor: scheduleTime,
        userId,
        status: 'pending',
      };
    } catch (err) {
      throw new Error(`Schedule notification failed: ${err.message}`);
    }
  }

  // Helper Methods
  static _simulateDelivery(channels) {
    const delivery = {};
    channels.forEach(channel => {
      delivery[channel] = {
        status: 'delivered',
        timestamp: new Date(),
        attempts: 1,
      };
    });
    return delivery;
  }
}

module.exports = NotificationService;
