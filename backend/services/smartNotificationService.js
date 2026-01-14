/**
 * Smart Notification Service
 * خدمة النوتيفيكيشنات الذكية المتقدمة
 *
 * الميزات:
 * - التنبيهات الموجهة حسب الأولوية
 * - التنبيهات الذكية بناءً على السلوك
 * - جدولة النوتيفيكيشنات
 * - تتبع التنبيهات
 */

class SmartNotificationService {
  constructor() {
    this.notifications = new Map();
    this.notificationHistory = [];
    this.userPreferences = new Map();
    this.schedules = new Map();
  }

  /**
   * إنشاء نوتيفيكيشن ذكي
   * بناءً على أولوية وحالة سير العمل
   */
  createSmartNotification(workflow, type, userId) {
    const notification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      workflowId: workflow.id,
      userId: userId,
      type: type, // 'urgent', 'warning', 'info', 'success'
      title: this.generateTitle(workflow, type),
      message: this.generateMessage(workflow, type),
      priority: this.calculatePriority(workflow, type),
      icon: this.getIconForType(type),
      color: this.getColorForType(type),
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 ساعة
      isRead: false,
      action: this.generateAction(workflow, type),
      tags: this.generateTags(workflow, type),
      metadata: {
        workflowName: workflow.name,
        workflowStatus: workflow.status,
        workflowPriority: workflow.priority,
      },
    };

    this.notifications.set(notification.id, notification);
    this.notificationHistory.push(notification);

    return notification;
  }

  /**
   * توليد عنوان النوتيفيكيشن بناءً على النوع
   */
  generateTitle(workflow, type) {
    const titles = {
      urgent: `🔴 فوري: ${workflow.name}`,
      warning: `⚠️ تحذير: ${workflow.name}`,
      info: `ℹ️ معلومة: ${workflow.name}`,
      success: `✅ نجاح: ${workflow.name}`,
      delayed: `⏰ متأخر: ${workflow.name}`,
      sla_breach: `📛 انتهاك SLA: ${workflow.name}`,
      approval: `👤 موافقة مطلوبة: ${workflow.name}`,
      rejected: `❌ تم الرفض: ${workflow.name}`,
      revised: `🔄 تحتاج مراجعة: ${workflow.name}`,
      completed: `🎉 مكتملة: ${workflow.name}`,
    };

    return titles[type] || `إشعار: ${workflow.name}`;
  }

  /**
   * توليد نص الرسالة
   */
  generateMessage(workflow, type) {
    const messages = {
      urgent: `هناك سير عمل عاجل يحتاج تدخل فوري`,
      warning: `تم اكتشاف تحذير في سير العمل`,
      info: `معلومة جديدة حول سير العمل`,
      success: `تمت معالجة العملية بنجاح`,
      delayed: `سير العمل متأخر عن الموعد المحدد`,
      sla_breach: `تم تجاوز الوقت المسموح به (SLA)`,
      approval: `يحتاج إلى موافقتك للمتابعة`,
      rejected: `تم رفض الطلب لأسباب معينة`,
      revised: `يحتاج إلى مراجعة وتصحيحات`,
      completed: `تمت معالجة الطلب بنجاح`,
    };

    return messages[type] || 'لديك إشعار جديد';
  }

  /**
   * حساب أولوية النوتيفيكيشن
   */
  calculatePriority(workflow, type) {
    const priorityScores = {
      urgent: 5,
      sla_breach: 5,
      warning: 4,
      delayed: 4,
      approval: 3,
      revised: 3,
      rejected: 3,
      info: 2,
      success: 1,
      completed: 1,
    };

    let basePriority = priorityScores[type] || 2;

    // زيادة الأولوية حسب أولوية سير العمل
    if (workflow.priority === 'urgent') basePriority += 2;
    if (workflow.priority === 'high') basePriority += 1;

    return Math.min(basePriority, 5); // Max 5
  }

  /**
   * الحصول على أيقونة حسب النوع
   */
  getIconForType(type) {
    const icons = {
      urgent: '🔴',
      warning: '⚠️',
      info: 'ℹ️',
      success: '✅',
      delayed: '⏰',
      sla_breach: '📛',
      approval: '👤',
      rejected: '❌',
      revised: '🔄',
      completed: '🎉',
    };

    return icons[type] || '📢';
  }

  /**
   * الحصول على اللون حسب النوع
   */
  getColorForType(type) {
    const colors = {
      urgent: '#ff0000', // أحمر
      warning: '#ff9800', // برتقالي
      info: '#2196f3', // أزرق
      success: '#4caf50', // أخضر
      delayed: '#ff5722', // برتقالي غامق
      sla_breach: '#f44336', // أحمر
      approval: '#673ab7', // بنفسجي
      rejected: '#c62828', // أحمر غامق
      revised: '#ffc107', // ذهبي
      completed: '#00bcd4', // سماوي
    };

    return colors[type] || '#9e9e9e';
  }

  /**
   * توليد الإجراء (الزر الذي يضغط عليه المستخدم)
   */
  generateAction(workflow, type) {
    const actions = {
      urgent: { label: 'معالجة فوراً', action: 'handle_immediately' },
      warning: { label: 'مراجعة', action: 'review' },
      approval: { label: 'الموافقة', action: 'approve' },
      rejected: { label: 'عرض التفاصيل', action: 'view_details' },
      revised: { label: 'إصلاح', action: 'fix' },
      completed: { label: 'عرض النتيجة', action: 'view_result' },
    };

    return actions[type] || { label: 'عرض', action: 'view' };
  }

  /**
   * توليد العلامات (Tags)
   */
  generateTags(workflow, type) {
    const tags = [];

    tags.push(type);
    tags.push(workflow.priority);
    tags.push(workflow.category || 'general');

    if (type === 'sla_breach') tags.push('urgent');
    if (type === 'delayed') tags.push('performance');
    if (type === 'approval') tags.push('action_required');

    return tags;
  }

  /**
   * إرسال النوتيفيكيشن للمستخدم
   */
  sendNotification(userId, notification) {
    // تحقق من تفضيلات المستخدم
    const preferences = this.userPreferences.get(userId) || this.getDefaultPreferences();

    // تحقق إذا كان نوع النوتيفيكيشن مفعل للمستخدم
    if (!preferences.enabledTypes.includes(notification.type)) {
      return { success: false, reason: 'notification_type_disabled' };
    }

    // تحقق من قنوات الإرسال
    const channels = this.getActiveChannels(userId, notification.priority);

    // محاكاة الإرسال عبر القنوات المختلفة
    const results = {
      inApp: true, // في التطبيق دائماً
      email: channels.includes('email'),
      sms: channels.includes('sms'),
      push: channels.includes('push'),
    };

    return {
      success: true,
      sentAt: new Date(),
      channels: results,
      notificationId: notification.id,
    };
  }

  /**
   * الحصول على التفضيلات الافتراضية للمستخدم
   */
  getDefaultPreferences() {
    return {
      enabledTypes: ['urgent', 'sla_breach', 'approval', 'warning', 'rejected', 'completed', 'info', 'success', 'delayed', 'revised'],
      channels: {
        email: { enabled: true, maxPerDay: 50 },
        sms: { enabled: false, maxPerDay: 10 },
        push: { enabled: true, maxPerDay: 100 },
        inApp: { enabled: true, maxPerDay: -1 },
      },
      quietHours: {
        enabled: false,
        startTime: '22:00',
        endTime: '08:00',
      },
      urgentAlwaysNotify: true,
    };
  }

  /**
   * الحصول على القنوات النشطة
   */
  getActiveChannels(userId, priority) {
    const prefs = this.userPreferences.get(userId) || this.getDefaultPreferences();
    const channels = [];

    // للتنبيهات العاجلة، أرسل عبر جميع القنوات
    if (priority >= 4) {
      if (prefs.channels.email.enabled) channels.push('email');
      if (prefs.channels.sms.enabled) channels.push('sms');
      if (prefs.channels.push.enabled) channels.push('push');
    } else {
      // للتنبيهات العادية
      if (prefs.channels.email.enabled) channels.push('email');
      if (prefs.channels.push.enabled) channels.push('push');
    }

    return channels;
  }

  /**
   * تحديث حالة النوتيفيكيشن (قراءة)
   */
  markAsRead(notificationId, userId) {
    const notification = this.notifications.get(notificationId);

    if (!notification) {
      return { success: false, error: 'Notification not found' };
    }

    if (notification.userId !== userId) {
      return { success: false, error: 'Unauthorized' };
    }

    notification.isRead = true;
    notification.readAt = new Date();

    return { success: true, notification };
  }

  /**
   * الحصول على جميع النوتيفيكيشنات غير المقروءة
   */
  getUnreadNotifications(userId) {
    const unread = [];

    this.notifications.forEach(notif => {
      if (notif.userId === userId && !notif.isRead) {
        unread.push(notif);
      }
    });

    return unread.sort((a, b) => {
      // ترتيب حسب الأولوية أولاً
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      // ثم حسب التاريخ
      return b.createdAt - a.createdAt;
    });
  }

  /**
   * الحصول على جميع النوتيفيكيشنات
   */
  getAllNotifications(userId, limit = 50) {
    const userNotifications = [];

    this.notifications.forEach(notif => {
      if (notif.userId === userId) {
        userNotifications.push(notif);
      }
    });

    return userNotifications.sort((a, b) => b.createdAt - a.createdAt).slice(0, limit);
  }

  /**
   * حذف النوتيفيكيشن
   */
  deleteNotification(notificationId, userId) {
    const notification = this.notifications.get(notificationId);

    if (!notification) {
      return { success: false, error: 'Notification not found' };
    }

    if (notification.userId !== userId) {
      return { success: false, error: 'Unauthorized' };
    }

    this.notifications.delete(notificationId);
    return { success: true };
  }

  /**
   * حذف جميع النوتيفيكيشنات
   */
  clearAllNotifications(userId) {
    let deletedCount = 0;

    this.notifications.forEach((notif, id) => {
      if (notif.userId === userId) {
        this.notifications.delete(id);
        deletedCount++;
      }
    });

    return { success: true, deletedCount };
  }

  /**
   * الحصول على إحصائيات النوتيفيكيشنات
   */
  getNotificationStats(userId) {
    const userNotifications = [];

    this.notifications.forEach(notif => {
      if (notif.userId === userId) {
        userNotifications.push(notif);
      }
    });

    const stats = {
      total: userNotifications.length,
      unread: userNotifications.filter(n => !n.isRead).length,
      byType: {},
      byPriority: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      today: 0,
      thisWeek: 0,
    };

    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const oneWeek = 7 * oneDay;

    userNotifications.forEach(notif => {
      // حسب النوع
      stats.byType[notif.type] = (stats.byType[notif.type] || 0) + 1;

      // حسب الأولوية
      stats.byPriority[notif.priority]++;

      // اليوم والأسبوع
      const age = now - notif.createdAt.getTime();
      if (age < oneDay) stats.today++;
      if (age < oneWeek) stats.thisWeek++;
    });

    return stats;
  }

  /**
   * جدولة نوتيفيكيشن مستقبلي
   */
  scheduleNotification(notification, scheduledTime, userId) {
    const scheduleId = `sched_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const schedule = {
      id: scheduleId,
      notification,
      userId,
      scheduledTime,
      createdAt: new Date(),
      status: 'pending',
      executedAt: null,
    };

    this.schedules.set(scheduleId, schedule);

    // محاكاة تنفيذ الجدولة
    const delayMs = scheduledTime - Date.now();
    if (delayMs > 0) {
      setTimeout(() => {
        this.executeScheduledNotification(scheduleId);
      }, delayMs);
    }

    return { success: true, scheduleId };
  }

  /**
   * تنفيذ نوتيفيكيشن مجدول
   */
  executeScheduledNotification(scheduleId) {
    const schedule = this.schedules.get(scheduleId);

    if (!schedule) return { success: false, error: 'Schedule not found' };

    schedule.status = 'executed';
    schedule.executedAt = new Date();

    // أرسل النوتيفيكيشن
    this.sendNotification(schedule.userId, schedule.notification);

    return { success: true, schedule };
  }
}

module.exports = SmartNotificationService;
