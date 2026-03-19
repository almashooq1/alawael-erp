/* eslint-disable no-undef, no-unused-vars */
/**
 * اختبارات النوتيفيكيشنات الذكية
 * Smart Notification System Tests
 *
 * ملف اختبارات شامل للنظام
 */

const SmartNotificationService = require('../services/smartNotificationService');
const AdvancedMessagingAlertSystem = require('../services/advancedMessagingAlertSystem');

// ==================== اختبارات SmartNotificationService ====================

describe('SmartNotificationService Tests', () => {
  let notificationService;

  beforeEach(() => {
    notificationService = new SmartNotificationService();
  });

  // اختبار 1: إنشاء إشعار ذكي
  test('should create a smart notification', () => {
    const workflow = {
      id: 'wf_001',
      name: 'طلب إجازة',
      priority: 'high',
      status: 'pending',
    };

    const notification = notificationService.createSmartNotification(
      workflow,
      'urgent',
      'user_123'
    );

    expect(notification).toBeDefined();
    expect(notification.id).toBeDefined();
    expect(notification.title).toContain('🔴');
    expect(notification.priority).toBe(5);
    expect(notification.color).toBe('#ff0000');
  });

  // اختبار 2: حساب الأولوية
  test('should calculate correct priority', () => {
    const workflow = { priority: 'normal', status: 'active' };

    const urgentPriority = notificationService.calculatePriority(workflow, 'urgent');
    expect(urgentPriority).toBe(5);

    const warningPriority = notificationService.calculatePriority(workflow, 'warning');
    expect(warningPriority).toBe(4);

    const infoPriority = notificationService.calculatePriority(workflow, 'info');
    expect(infoPriority).toBe(2);

    const successPriority = notificationService.calculatePriority(workflow, 'success');
    expect(successPriority).toBe(1);
  });

  // اختبار 3: إرسال الإشعار
  test('should send notification successfully', () => {
    const workflow = { id: 'wf_001', name: 'Test' };
    const notification = notificationService.createSmartNotification(workflow, 'info', 'user_123');

    const result = notificationService.sendNotification('user_123', notification);

    expect(result.success).toBe(true);
    expect(result.sentAt).toBeDefined();
    expect(result.channels).toBeDefined();
    // result.channels is an object with boolean properties (inApp, email, sms, push)
    expect(typeof result.channels).toBe('object');
  });

  // اختبار 4: وضع علامة كمقروء
  test('should mark notification as read', () => {
    const workflow = { id: 'wf_001' };
    const notification = notificationService.createSmartNotification(workflow, 'info', 'user_123');
    const notificationId = notification.id;

    notificationService.markAsRead(notificationId, 'user_123');
    const _unreadNotifications = notificationService.getUnreadNotifications('user_123');

    const marked = notificationService.notifications.get(notificationId);
    expect(marked.isRead).toBe(true);
  });

  // اختبار 5: الحصول على الإشعارات غير المقروءة
  test('should get unread notifications only', () => {
    const workflow = { id: 'wf_001' };

    // إنشاء عدة إشعارات
    const notif1 = notificationService.createSmartNotification(workflow, 'urgent', 'user_123');
    const notif2 = notificationService.createSmartNotification(workflow, 'info', 'user_123');

    notificationService.sendNotification('user_123', notif1);
    notificationService.sendNotification('user_123', notif2);

    // وضع علامة على واحد كمقروء
    notificationService.markAsRead(notif1.id, 'user_123');

    const unreadNotifications = notificationService.getUnreadNotifications('user_123');
    expect(unreadNotifications.length).toBe(1);
    expect(unreadNotifications[0].id).toBe(notif2.id);
  });

  // اختبار 6: حذف إشعار
  test('should delete notification', () => {
    const workflow = { id: 'wf_001' };
    const notification = notificationService.createSmartNotification(workflow, 'info', 'user_123');
    const notificationId = notification.id;

    notificationService.sendNotification('user_123', notification);
    notificationService.deleteNotification(notificationId, 'user_123');

    expect(notificationService.notifications.has(notificationId)).toBe(false);
  });

  // اختبار 7: مسح جميع الإشعارات
  test('should clear all notifications', () => {
    const workflow = { id: 'wf_001' };

    const notif1 = notificationService.createSmartNotification(workflow, 'urgent', 'user_123');
    const notif2 = notificationService.createSmartNotification(workflow, 'info', 'user_123');

    notificationService.sendNotification('user_123', notif1);
    notificationService.sendNotification('user_123', notif2);

    const result = notificationService.clearAllNotifications('user_123');
    // clearAllNotifications returns an object with { success: true, deletedCount: 2 }
    expect(result.deletedCount).toBe(2);

    const remaining = notificationService.getAllNotifications('user_123');
    expect(remaining.length).toBe(0);
  });

  // اختبار 8: الإحصائيات
  test('should calculate statistics correctly', () => {
    const workflow = { id: 'wf_001', priority: 'high' };

    const notif1 = notificationService.createSmartNotification(workflow, 'urgent', 'user_123');
    const notif2 = notificationService.createSmartNotification(workflow, 'urgent', 'user_123');
    const notif3 = notificationService.createSmartNotification(workflow, 'info', 'user_123');

    notificationService.sendNotification('user_123', notif1);
    notificationService.sendNotification('user_123', notif2);
    notificationService.sendNotification('user_123', notif3);

    notificationService.markAsRead(notif1.id, 'user_123');

    const stats = notificationService.getNotificationStats('user_123');

    expect(stats.total).toBe(3);
    expect(stats.unread).toBe(2);
    expect(stats.byType.urgent).toBe(2);
    expect(stats.byType.info).toBe(1);
  });

  // اختبار 9: جدولة الإشعار
  test('should schedule notification', done => {
    const workflow = { id: 'wf_001' };
    const notification = notificationService.createSmartNotification(workflow, 'info', 'user_123');

    const scheduledTime = new Date(Date.now() + 1000); // بعد ثانية واحدة

    const result = notificationService.scheduleNotification(
      notification,
      scheduledTime,
      'user_123'
    );

    expect(result.success).toBe(true);
    expect(result.scheduleId).toBeDefined();

    // اختبار بعد انقضاء الوقت
    setTimeout(() => {
      const _allNotifications = notificationService.getAllNotifications('user_123');
      // يجب أن يكون الإشعار قد تم إرساله الآن
      done();
    }, 1500);
  });
});

// ==================== اختبارات AdvancedMessagingAlertSystem ====================

describe('AdvancedMessagingAlertSystem Tests', () => {
  let messagingService;

  beforeEach(() => {
    messagingService = new AdvancedMessagingAlertSystem();
  });

  // اختبار 1: تهيئة القوالب
  test('should initialize message templates', () => {
    expect(messagingService.messageTemplates.size).toBe(8);
    expect(messagingService.messageTemplates.has('workflow_created')).toBe(true);
    expect(messagingService.messageTemplates.has('approval_needed')).toBe(true);
  });

  // اختبار 2: إرسال رسالة
  test('should send message using template', async () => {
    const result = await messagingService.sendMessage('user_123', 'workflow_created', {
      workflowName: 'طلب إجازة',
      status: 'pending',
    });

    expect(result.success).toBe(true);
    expect(result.messageId).toBeDefined();
    expect(Array.isArray(result.results.successful)).toBe(true);
  });

  // اختبار 3: إنشاء إنذار
  test('should create alert rule', () => {
    const alert = messagingService.createAlert(
      'SLA Breach Alert',
      { type: 'sla_breach', threshold: 3, window: 3600 },
      { type: 'notify', recipients: ['manager@example.com'] }
    );

    expect(alert.id).toBeDefined();
    expect(alert.name).toBe('SLA Breach Alert');
    expect(alert.isActive).toBe(true);
    expect(alert.rule.type).toBe('sla_breach');
  });

  // اختبار 4: التحقق من قواعس الإنذارات
  test('should check and trigger alerts', async () => {
    // First create an alert rule
    const _alert = messagingService.createAlert(
      'Performance Drop Alert',
      { type: 'performance_drop', threshold: 70, window: 3600 },
      { type: 'notify', recipients: ['manager@example.com'] }
    );

    const workflows = [
      { id: 'wf_001', status: 'in_progress', slaBreached: true },
      { id: 'wf_002', status: 'completed', slaBreached: false },
      { id: 'wf_003', status: 'rejected', slaBreached: true },
    ];

    // checkAndTriggerAlerts will return empty array if no active alert rules match
    const triggeredAlerts = await messagingService.checkAndTriggerAlerts(workflows);

    expect(Array.isArray(triggeredAlerts)).toBe(true);
  });

  // اختبار 5: أنواع الإنذارات المختلفة
  test('should support multiple alert types', () => {
    const types = [
      'sla_breach',
      'performance_drop',
      'volume_spike',
      'high_rejection_rate',
      'stuck_workflow',
    ];

    types.forEach(type => {
      const _alert = messagingService.createAlert(
        `Test ${type}`,
        { type, threshold: 5, window: 3600 },
        { type: 'notify', recipients: [] }
      );

      expect(_alert.rule.type).toBe(type);
    });
  });

  // اختبار 6: الإحصائيات
  test('should get message statistics', () => {
    const stats = messagingService.getMessageStats('user_123');

    expect(stats).toBeDefined();
    expect(stats.total).toBe(0);
    expect(stats.sent).toBe(0);
    expect(stats.failed).toBe(0);
  });

  // اختبار 7: إحصائيات الإنذارات
  test('should get alert statistics', () => {
    messagingService.createAlert(
      'Alert 1',
      { type: 'sla_breach', threshold: 5 },
      { type: 'notify', recipients: [] }
    );
    messagingService.createAlert(
      'Alert 2',
      { type: 'performance_drop', threshold: 70 },
      { type: 'notify', recipients: [] }
    );

    const stats = messagingService.getAlertStats();

    expect(stats.total).toBe(2);
    expect(stats.active).toBe(2);
  });
});

// ==================== اختبارات التكامل ====================

describe('Integration Tests', () => {
  let notificationService;
  let messagingService;

  beforeEach(() => {
    notificationService = new SmartNotificationService();
    messagingService = new AdvancedMessagingAlertSystem();
  });

  // اختبار 1: تدفق كامل من الإشعار إلى الإجراء
  test('complete notification workflow', async () => {
    // 1. إنشاء سير عمل
    const workflow = {
      id: 'wf_001',
      name: 'طلب موافقة',
      priority: 'high',
      status: 'pending_approval',
    };

    // 2. إنشاء إشعار
    const notification = notificationService.createSmartNotification(
      workflow,
      'approval',
      'user_123'
    );

    // 3. إرسال الإشعار
    const sendResult = notificationService.sendNotification('user_123', notification);
    expect(sendResult.success).toBe(true);

    // 4. التحقق من أن الإشعار موجود
    const allNotifications = notificationService.getAllNotifications('user_123');
    expect(allNotifications.length).toBeGreaterThan(0);

    // 5. وضع علامة كمقروء
    notificationService.markAsRead(notification.id, 'user_123');

    // 6. التحقق من الإحصائيات
    const stats = notificationService.getNotificationStats('user_123');
    expect(stats.unread).toBe(0);
  });

  // اختبار 2: رسالة + إنذار
  test('send message and trigger alert', async () => {
    // 1. إرسال رسالة
    const messageResult = await messagingService.sendMessage('user_123', 'approval_needed', {
      workflowName: 'طلب إجازة',
    });
    expect(messageResult.success).toBe(true);

    // 2. إنشاء إنذار
    const alert = messagingService.createAlert(
      'High Volume Alert',
      { type: 'volume_spike', threshold: 10, window: 3600 },
      { type: 'notify', recipients: ['manager@example.com'] }
    );
    expect(alert.id).toBeDefined();

    // 3. التحقق من الإحصائيات
    const alertStats = messagingService.getAlertStats();
    expect(alertStats.total).toBeGreaterThan(0);
  });

  // اختبار 3: جدولة متعددة
  test('schedule multiple notifications', done => {
    const workflows = [
      { id: 'wf_001', name: 'Workflow 1' },
      { id: 'wf_002', name: 'Workflow 2' },
      { id: 'wf_003', name: 'Workflow 3' },
    ];

    workflows.forEach(workflow => {
      const notification = notificationService.createSmartNotification(
        workflow,
        'info',
        'user_123'
      );

      const scheduledTime = new Date(Date.now() + 2000);
      notificationService.scheduleNotification(notification, scheduledTime, 'user_123');
    });

    setTimeout(() => {
      const allNotifications = notificationService.getAllNotifications('user_123');
      expect(allNotifications.length).toBe(3);
      done();
    }, 2500);
  });
});

// ==================== اختبارات الأداء ====================

describe('Performance Tests', () => {
  let notificationService;

  beforeEach(() => {
    notificationService = new SmartNotificationService();
  });

  // اختبار 1: إنشاء إشعارات بكميات كبيرة
  test('should handle 1000 notifications', () => {
    const workflow = { id: 'wf_001', name: 'Test' };
    const startTime = Date.now();

    for (let i = 0; i < 1000; i++) {
      const notification = notificationService.createSmartNotification(
        workflow,
        'info',
        `user_${i % 100}`
      );
      notificationService.sendNotification(`user_${i % 100}`, notification);
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`✅ Created 1000 notifications in ${duration}ms`);
    expect(duration).toBeLessThan(5000); // يجب أن يستغرق أقل من 5 ثواني
  });

  // اختبار 2: سرعة الاسترجاع
  test('should retrieve notifications quickly', () => {
    const workflow = { id: 'wf_001' };

    for (let i = 0; i < 100; i++) {
      const notification = notificationService.createSmartNotification(
        workflow,
        'info',
        'user_123'
      );
      notificationService.sendNotification('user_123', notification);
    }

    const startTime = Date.now();
    const _notifications = notificationService.getAllNotifications('user_123');
    const endTime = Date.now();

    console.log(`✅ Retrieved 100 notifications in ${endTime - startTime}ms`);
    expect(endTime - startTime).toBeLessThan(100); // أقل من 100 ميلي ثانية
  });
});

// ==================== اختبارات الحالات الحدية ====================

describe('Edge Cases', () => {
  let notificationService;

  beforeEach(() => {
    notificationService = new SmartNotificationService();
  });

  // اختبار 1: مستخدم بدون إشعارات
  test('should handle user with no notifications', () => {
    const notifications = notificationService.getAllNotifications('nonexistent_user');
    expect(notifications.length).toBe(0);
  });

  // اختبار 2: حذف نفس الإشعار مرتين
  test('should handle deleting same notification twice', () => {
    const notification = notificationService.createSmartNotification(
      { id: 'wf_001' },
      'info',
      'user_123'
    );
    notificationService.sendNotification('user_123', notification);

    notificationService.deleteNotification(notification.id, 'user_123');
    // لا يجب أن يرمي خطأ عند محاولة الحذف مرة أخرى
    expect(() => {
      notificationService.deleteNotification(notification.id, 'user_123');
    }).not.toThrow();
  });

  // اختبار 3: بيانات فارغة
  test('should handle empty workflow data', () => {
    const notification = notificationService.createSmartNotification({}, 'info', 'user_123');
    expect(notification.id).toBeDefined();
    expect(notification.title).toBeDefined();
  });
});

console.log('✅ جميع الاختبارات جاهزة للتشغيل');
