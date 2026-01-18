const { v4: uuid } = require('uuid');

class SmartNotificationService {
  constructor() {
    this.notifications = new Map();
    this.schedules = new Map();
  }

  calculatePriority(workflow = {}, type = 'info') {
    return (
      {
        urgent: 5,
        warning: 4,
        info: 2,
        success: 1,
      }[type] || 1
    );
  }

  createSmartNotification(workflow, type = 'info', recipientId) {
    const priority = this.calculatePriority(workflow, type);
    const colorMap = {
      urgent: '#ff0000',
      warning: '#ff9900',
      info: '#0099ff',
      success: '#00cc66',
    };
    const icons = {
      urgent: '🔴',
      warning: '🟠',
      info: '🔵',
      success: '🟢',
    };

    const id = uuid();
    const notification = {
      id,
      workflowId: workflow ? workflow.id : undefined,
      recipientId,
      type,
      priority,
      color: colorMap[type] || '#0099ff',
      title: `${icons[type] || '🔵'} ${workflow?.name || 'Notification'}`,
      message: `Status: ${workflow?.status || 'pending'}`,
      createdAt: new Date(),
      isRead: false,
    };

    this.notifications.set(id, notification);
    return notification;
  }

  sendNotification(recipientId, notification) {
    const sent = { ...notification, sentAt: new Date() };
    this.notifications.set(notification.id, sent);
    return {
      success: true,
      sentAt: sent.sentAt,
      channels: { inApp: true, email: true, sms: false, push: true },
    };
  }

  markAsRead(notificationId, recipientId) {
    const notif = this.notifications.get(notificationId);
    if (notif && notif.recipientId === recipientId) {
      notif.isRead = true;
      this.notifications.set(notificationId, notif);
    }
    return notif;
  }

  getUnreadNotifications(recipientId) {
    return Array.from(this.notifications.values()).filter(n => n.recipientId === recipientId && !n.isRead);
  }

  getAllNotifications(recipientId) {
    return Array.from(this.notifications.values()).filter(n => n.recipientId === recipientId);
  }

  deleteNotification(notificationId, recipientId) {
    const notif = this.notifications.get(notificationId);
    if (notif && notif.recipientId === recipientId) {
      this.notifications.delete(notificationId);
      return true;
    }
    return false;
  }

  clearAllNotifications(recipientId) {
    let deletedCount = 0;
    for (const [id, notif] of this.notifications.entries()) {
      if (notif.recipientId === recipientId) {
        this.notifications.delete(id);
        deletedCount++;
      }
    }
    return { success: true, deletedCount };
  }

  getNotificationStats(recipientId) {
    const all = this.getAllNotifications(recipientId);
    const unread = all.filter(n => !n.isRead);
    const byType = all.reduce((acc, n) => {
      acc[n.type] = (acc[n.type] || 0) + 1;
      return acc;
    }, {});
    return { total: all.length, unread: unread.length, byType };
  }

  scheduleNotification(notification, date, recipientId) {
    const scheduleId = uuid();
    const delay = Math.max(0, date.getTime() - Date.now());
    const timeoutId = setTimeout(() => {
      this.sendNotification(recipientId, notification);
      this.schedules.delete(scheduleId);
    }, delay);

    this.schedules.set(scheduleId, timeoutId);
    return { success: true, scheduleId };
  }

  // Static method for static tests/mocking
  static async send(recipientId, title, message, type = 'INFO', link = null) {
    console.log(`[NOTIFICATION] To: ${recipientId} | ${title}`);
    return { success: true, id: uuid() };
  }
}

module.exports = SmartNotificationService;
module.exports.instance = new SmartNotificationService();
