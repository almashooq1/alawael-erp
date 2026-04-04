/**
 * Notifications Calculations Tests
 * Pure Unit Tests - No DB
 * نظام AlAwael ERP
 */

'use strict';

const {
  NOTIFICATION_CONSTANTS,
  calculateNotificationPriority,
  scheduleAppointmentReminders,
  scheduleDocumentExpiryNotifications,
  checkNotificationRateLimit,
  analyzeNotificationDelivery,
  calculateOptimalSendTime,
  processBatchNotifications,
  buildNotificationContent,
  checkUserNotificationPreferences,
  calculateNotificationStats,
} = require('../services/notifications/notificationsCalculations.service');

// ========================================
// NOTIFICATION_CONSTANTS
// ========================================
describe('NOTIFICATION_CONSTANTS', () => {
  test('أنواع الإشعارات تشمل الموعد والمدفوعات', () => {
    expect(NOTIFICATION_CONSTANTS.TYPES.APPOINTMENT_REMINDER).toBe('appointment_reminder');
    expect(NOTIFICATION_CONSTANTS.TYPES.PAYMENT_DUE).toBe('payment_due');
    expect(NOTIFICATION_CONSTANTS.TYPES.DOCUMENT_EXPIRY).toBe('document_expiry');
  });

  test('القنوات الخمس موجودة', () => {
    expect(NOTIFICATION_CONSTANTS.CHANNELS.SMS).toBe('sms');
    expect(NOTIFICATION_CONSTANTS.CHANNELS.EMAIL).toBe('email');
    expect(NOTIFICATION_CONSTANTS.CHANNELS.PUSH).toBe('push');
    expect(NOTIFICATION_CONSTANTS.CHANNELS.WHATSAPP).toBe('whatsapp');
    expect(NOTIFICATION_CONSTANTS.CHANNELS.IN_APP).toBe('in_app');
  });

  test('حد SMS 5 رسائل يومياً', () => {
    expect(NOTIFICATION_CONSTANTS.RATE_LIMITS.SMS_PER_USER_PER_DAY).toBe(5);
  });

  test('تذكير المواعيد: 24 ساعة و2 ساعة قبل', () => {
    expect(NOTIFICATION_CONSTANTS.TIMING.APPOINTMENT_REMINDER_HOURS).toContain(24);
    expect(NOTIFICATION_CONSTANTS.TIMING.APPOINTMENT_REMINDER_HOURS).toContain(2);
  });

  test('فترة انتهاء عرض الانتظار 4 ساعات', () => {
    expect(NOTIFICATION_CONSTANTS.TIMING.WAITLIST_OFFER_EXPIRY_HOURS).toBe(4);
  });
});

// ========================================
// calculateNotificationPriority
// ========================================
describe('calculateNotificationPriority', () => {
  test('تنبيه النظام → urgent', () => {
    const result = calculateNotificationPriority({
      type: NOTIFICATION_CONSTANTS.TYPES.SYSTEM_ALERT,
    });
    expect(result.priority).toBe('urgent');
    expect(result.score).toBeGreaterThanOrEqual(85);
    expect(result.requiresAcknowledgment).toBe(true);
  });

  test('إلغاء موعد → urgent', () => {
    const result = calculateNotificationPriority({
      type: NOTIFICATION_CONSTANTS.TYPES.APPOINTMENT_CANCELLED,
    });
    expect(result.priority).toBe('urgent');
  });

  test('تقرير جاهز → low/info', () => {
    const result = calculateNotificationPriority({
      type: NOTIFICATION_CONSTANTS.TYPES.REPORT_READY,
    });
    expect(['low', 'info']).toContain(result.priority);
    expect(result.requiresAcknowledgment).toBe(false);
  });

  test('null → info', () => {
    const result = calculateNotificationPriority(null);
    expect(result.priority).toBe('info');
    expect(result.score).toBe(0);
  });

  test('urgency=critical يرفع الأولوية', () => {
    const normal = calculateNotificationPriority({
      type: NOTIFICATION_CONSTANTS.TYPES.PAYMENT_DUE,
    });
    const critical = calculateNotificationPriority({
      type: NOTIFICATION_CONSTANTS.TYPES.PAYMENT_DUE,
      urgency: 'critical',
    });
    expect(critical.score).toBeGreaterThan(normal.score);
  });

  test('وثيقة تنتهي خلال يوم → urgent', () => {
    const result = calculateNotificationPriority({
      type: NOTIFICATION_CONSTANTS.TYPES.DOCUMENT_EXPIRY,
      context: { daysUntilExpiry: 1 },
    });
    expect(result.priority).toBe('urgent');
  });

  test('قنوات الإشعار مُرجعة', () => {
    const result = calculateNotificationPriority({
      type: NOTIFICATION_CONSTANTS.TYPES.APPOINTMENT_REMINDER,
    });
    expect(Array.isArray(result.channels)).toBe(true);
    expect(result.channels.length).toBeGreaterThan(0);
    expect(result.channels).toContain('in_app');
  });

  test('تذكير الموعد يشمل SMS', () => {
    const result = calculateNotificationPriority({
      type: NOTIFICATION_CONSTANTS.TYPES.APPOINTMENT_REMINDER,
    });
    expect(result.channels).toContain('sms');
  });

  test('وقت التسليم المتوقع محسوب', () => {
    const result = calculateNotificationPriority({
      type: NOTIFICATION_CONSTANTS.TYPES.SYSTEM_ALERT,
    });
    expect(result.estimatedDeliveryMinutes).toBe(1); // urgent = 1 دقيقة
  });
});

// ========================================
// scheduleAppointmentReminders
// ========================================
describe('scheduleAppointmentReminders', () => {
  test('جدولة تذكيرين لموعد مستقبلي', () => {
    const futureDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000); // بعد يومين
    const appointment = {
      id: 'apt-1',
      date: futureDate.toISOString().split('T')[0],
      time: '10:00:00',
      beneficiaryId: 'b-1',
    };

    const result = scheduleAppointmentReminders(appointment);
    expect(result.length).toBe(2); // 24h و 2h
    expect(result.every(r => r.type === 'appointment_reminder')).toBe(true);
  });

  test('الإشعار قبل ساعتين أولوية HIGH', () => {
    const futureDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    const appointment = {
      id: 'apt-1',
      date: futureDate.toISOString().split('T')[0],
      time: '10:00:00',
      beneficiaryId: 'b-1',
    };

    const result = scheduleAppointmentReminders(appointment);
    const twoHourReminder = result.find(r => r.hoursBeforeAppointment === 2);
    expect(twoHourReminder?.priority).toBe('high');
  });

  test('الإشعار قبل 24 ساعة أولوية MEDIUM', () => {
    const futureDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    const appointment = {
      id: 'apt-1',
      date: futureDate.toISOString().split('T')[0],
      time: '10:00:00',
      beneficiaryId: 'b-1',
    };

    const result = scheduleAppointmentReminders(appointment);
    const dayReminder = result.find(r => r.hoursBeforeAppointment === 24);
    expect(dayReminder?.priority).toBe('medium');
  });

  test('موعد قديم → لا إشعارات', () => {
    const pastDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const appointment = {
      id: 'apt-old',
      date: pastDate.toISOString().split('T')[0],
      time: '10:00:00',
      beneficiaryId: 'b-1',
    };

    const result = scheduleAppointmentReminders(appointment);
    expect(result).toHaveLength(0);
  });

  test('بيانات ناقصة → مصفوفة فارغة', () => {
    expect(scheduleAppointmentReminders(null)).toHaveLength(0);
    expect(scheduleAppointmentReminders({ id: 'a1' })).toHaveLength(0);
  });
});

// ========================================
// scheduleDocumentExpiryNotifications
// ========================================
describe('scheduleDocumentExpiryNotifications', () => {
  test('وثيقة تنتهي بعد 6 أشهر → إشعارات متعددة', () => {
    const expiryDate = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000);
    const doc = {
      id: 'doc-1',
      type: 'scfhs',
      expiryDate: expiryDate.toISOString(),
      ownerId: 'emp-1',
    };

    const result = scheduleDocumentExpiryNotifications(doc);
    expect(result.length).toBeGreaterThan(0);
    // كل الإشعارات لها نفس المعالج
    expect(result.every(n => n.recipientId === 'emp-1')).toBe(true);
  });

  test('الإشعار قبل 7 أيام → urgent + SMS', () => {
    const expiryDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 60000);
    const doc = {
      id: 'doc-1',
      type: 'iqama',
      expiryDate: expiryDate.toISOString(),
      ownerId: 'emp-1',
    };

    const result = scheduleDocumentExpiryNotifications(doc);
    const sevenDayNotif = result.find(n => n.daysBeforeExpiry === 7);
    if (sevenDayNotif) {
      expect(sevenDayNotif.priority).toBe('urgent');
      expect(sevenDayNotif.channels).toContain('sms');
    }
  });

  test('وثيقة منتهية → لا إشعارات', () => {
    const expiredDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const doc = {
      id: 'doc-expired',
      type: 'license',
      expiryDate: expiredDate.toISOString(),
      ownerId: 'emp-1',
    };

    const result = scheduleDocumentExpiryNotifications(doc);
    expect(result).toHaveLength(0);
  });

  test('null → مصفوفة فارغة', () => {
    expect(scheduleDocumentExpiryNotifications(null)).toHaveLength(0);
  });
});

// ========================================
// checkNotificationRateLimit
// ========================================
describe('checkNotificationRateLimit', () => {
  test('أقل من الحد → allowed', () => {
    const result = checkNotificationRateLimit('u1', 'sms', []);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBeGreaterThan(0);
  });

  test('تجاوز الحد اليومي لـ SMS → not allowed', () => {
    const now = new Date();
    const sentToday = Array(5).fill({
      userId: 'u1',
      channel: 'sms',
      sentAt: now.toISOString(),
    });

    const result = checkNotificationRateLimit('u1', 'sms', sentToday);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  test('إشعارات مستخدم آخر لا تُحسب', () => {
    const sentToday = Array(5).fill({
      userId: 'u2', // مستخدم مختلف
      channel: 'sms',
      sentAt: new Date().toISOString(),
    });

    const result = checkNotificationRateLimit('u1', 'sms', sentToday);
    expect(result.allowed).toBe(true);
  });

  test('null parameters → allowed', () => {
    const result = checkNotificationRateLimit(null, 'sms', null);
    expect(result.allowed).toBe(true);
  });

  test('الإشعارات القديمة (أكثر من يوم) لا تُحسب', () => {
    const oldNotifs = Array(5).fill({
      userId: 'u1',
      channel: 'sms',
      sentAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(), // قبل 25 ساعة
    });

    const result = checkNotificationRateLimit('u1', 'sms', oldNotifs);
    expect(result.allowed).toBe(true);
  });
});

// ========================================
// analyzeNotificationDelivery
// ========================================
describe('analyzeNotificationDelivery', () => {
  test('معدل التسليم محسوب', () => {
    const notifications = [
      { id: 'n1', channel: 'sms', type: 'appointment_reminder', status: 'delivered' },
      { id: 'n2', channel: 'sms', type: 'appointment_reminder', status: 'delivered' },
      { id: 'n3', channel: 'email', type: 'payment_due', status: 'failed' },
      { id: 'n4', channel: 'push', type: 'goal_achieved', status: 'read' },
    ];

    const result = analyzeNotificationDelivery(notifications);
    expect(result.total).toBe(4);
    expect(result.deliveryRate).toBe(75); // 3 من 4 = 75%
    expect(result.failureRate).toBe(25);
  });

  test('تحليل حسب القناة', () => {
    const notifications = [
      { id: 'n1', channel: 'sms', status: 'delivered' },
      { id: 'n2', channel: 'sms', status: 'failed' },
      { id: 'n3', channel: 'email', status: 'delivered' },
    ];

    const result = analyzeNotificationDelivery(notifications);
    expect(result.byChannel.sms).toBeDefined();
    expect(result.byChannel.sms.deliveryRate).toBe(50); // 1 من 2
    expect(result.byChannel.email.deliveryRate).toBe(100);
  });

  test('مصفوفة فارغة → أصفار', () => {
    const result = analyzeNotificationDelivery([]);
    expect(result.total).toBe(0);
    expect(result.deliveryRate).toBe(0);
  });

  test('معدل القراءة محسوب', () => {
    const notifications = [
      { id: 'n1', channel: 'push', status: 'read' },
      { id: 'n2', channel: 'push', status: 'delivered' },
    ];

    const result = analyzeNotificationDelivery(notifications);
    expect(result.readRate).toBe(50); // 1 من 2
  });
});

// ========================================
// calculateOptimalSendTime
// ========================================
describe('calculateOptimalSendTime', () => {
  test('بدون بيانات → افتراضيات معقولة', () => {
    const result = calculateOptimalSendTime([]);
    expect(result.bestHour).toBe(10);
    expect(result.bestDay).toBe('sunday');
  });

  test('أكثر تفاعل في الساعة 9 صباحاً', () => {
    // إنشاء بيانات حيث الساعة 9 هي الأكثر تفاعلاً
    const history = [
      { readAt: new Date('2026-01-04T09:00:00').toISOString() }, // أحد
      { readAt: new Date('2026-01-04T09:30:00').toISOString() }, // أحد
      { readAt: new Date('2026-01-04T09:15:00').toISOString() }, // أحد
      { readAt: new Date('2026-01-04T14:00:00').toISOString() }, // أحد
    ];

    const result = calculateOptimalSendTime(history);
    expect(result.bestHour).toBe(9);
    expect(result.readCount).toBe(4);
  });

  test('الإشعارات غير المقروءة لا تُحسب', () => {
    const history = [
      { id: 'n1', status: 'delivered' }, // بدون readAt
      { id: 'n2', readAt: new Date('2026-01-04T10:00:00').toISOString() },
    ];

    const result = calculateOptimalSendTime(history);
    expect(result.readCount).toBe(1);
  });

  test('نسب التفاعل بالساعة محسوبة (0-100)', () => {
    const history = [
      { readAt: new Date('2026-01-04T09:00:00').toISOString() },
      { readAt: new Date('2026-01-04T09:00:00').toISOString() },
      { readAt: new Date('2026-01-04T14:00:00').toISOString() },
    ];

    const result = calculateOptimalSendTime(history);
    // الساعة 9 → 100%، الساعة 14 → 50%
    expect(result.hourlyEngagement['9']).toBe(100);
    expect(result.hourlyEngagement['14']).toBe(50);
  });
});

// ========================================
// processBatchNotifications
// ========================================
describe('processBatchNotifications', () => {
  test('ترتيب الإشعارات العاجلة أولاً', () => {
    const notifications = [
      { id: 'n1', priority: 'low', channel: 'email', status: 'pending' },
      { id: 'n2', priority: 'urgent', channel: 'sms', status: 'pending' },
      { id: 'n3', priority: 'medium', channel: 'push', status: 'pending' },
    ];

    const result = processBatchNotifications(notifications);
    expect(result.total).toBe(3);
    // الدفعة الأولى يجب أن تحتوي على urgent أو أن تكون مرتبة بشكل صحيح
    expect(result.byPriority.urgent).toBe(1);
    expect(result.byPriority.low).toBe(1);
  });

  test('تجميع حسب القناة', () => {
    const notifications = [
      { id: 'n1', priority: 'high', channel: 'sms', status: 'pending' },
      { id: 'n2', priority: 'medium', channel: 'sms', status: 'pending' },
      { id: 'n3', priority: 'high', channel: 'email', status: 'pending' },
    ];

    const result = processBatchNotifications(notifications);
    const smsBatch = result.batches.find(b => b.channel === 'sms');
    const emailBatch = result.batches.find(b => b.channel === 'email');
    expect(smsBatch?.count).toBe(2);
    expect(emailBatch?.count).toBe(1);
  });

  test('تجاهل الإشعارات المرسلة/الملغاة', () => {
    const notifications = [
      { id: 'n1', priority: 'high', channel: 'sms', status: 'sent' }, // تجاهل
      { id: 'n2', priority: 'medium', channel: 'sms', status: 'pending' },
      { id: 'n3', priority: 'low', channel: 'email', status: 'cancelled' }, // تجاهل
    ];

    const result = processBatchNotifications(notifications);
    expect(result.total).toBe(1);
    expect(result.skipped).toBe(2);
  });

  test('مصفوفة فارغة → مصفوفة فارغة', () => {
    const result = processBatchNotifications([]);
    expect(result.total).toBe(0);
    expect(result.batches).toHaveLength(0);
  });
});

// ========================================
// buildNotificationContent
// ========================================
describe('buildNotificationContent', () => {
  test('تذكير موعد بالعربية', () => {
    const result = buildNotificationContent(
      'appointment_reminder',
      { serviceName: 'علاج طبيعي', time: '10:00' },
      'ar'
    );

    expect(result.isValid).toBe(true);
    expect(result.title).toBe('تذكير بموعدك');
    expect(result.body).toContain('علاج طبيعي');
    expect(result.body).toContain('10:00');
  });

  test('فاتورة مستحقة بالعربية', () => {
    const result = buildNotificationContent(
      'payment_due',
      { amount: '500', dueDate: '2026-01-15' },
      'ar'
    );

    expect(result.isValid).toBe(true);
    expect(result.title).toBe('فاتورة مستحقة');
    expect(result.body).toContain('500');
  });

  test('تذكير موعد بالإنجليزية', () => {
    const result = buildNotificationContent(
      'appointment_reminder',
      { serviceName: 'PT', time: '10:00' },
      'en'
    );

    expect(result.isValid).toBe(true);
    expect(result.language).toBe('en');
    expect(result.title).toContain('Reminder');
  });

  test('نوع غير موجود → isValid: false', () => {
    const result = buildNotificationContent('unknown_type', {});
    expect(result.isValid).toBe(false);
    expect(result.warning).toBeDefined();
  });

  test('بدون نوع → فارغ', () => {
    const result = buildNotificationContent(null, {});
    expect(result.title).toBe('');
    expect(result.isValid).toBe(false);
  });

  test('هدف محقق → رسالة تهنئة', () => {
    const result = buildNotificationContent('goal_achieved', { goalName: 'المشي 10 خطوات' }, 'ar');

    expect(result.isValid).toBe(true);
    expect(result.title).toContain('🎉');
    expect(result.body).toContain('المشي 10 خطوات');
  });
});

// ========================================
// checkUserNotificationPreferences
// ========================================
describe('checkUserNotificationPreferences', () => {
  test('تفضيلات عادية → shouldSend', () => {
    const prefs = { smsEnabled: true, emailEnabled: true, pushEnabled: true, language: 'ar' };
    const notification = {
      priority: 'medium',
      channels: ['sms', 'push'],
    };

    const result = checkUserNotificationPreferences(prefs, notification);
    expect(result.shouldSend).toBe(true);
    expect(result.language).toBe('ar');
  });

  test('الوضع الصامت → يحجب غير العاجل', () => {
    const prefs = { quietMode: true };
    const notification = { priority: 'medium', channels: ['sms'] };

    const result = checkUserNotificationPreferences(prefs, notification);
    expect(result.shouldSend).toBe(false);
    expect(result.reason).toBe('quiet_mode_active');
  });

  test('الوضع الصامت لا يحجب urgent', () => {
    const prefs = { quietMode: true };
    const notification = {
      priority: 'urgent',
      channels: ['sms', 'push'],
    };

    const result = checkUserNotificationPreferences(prefs, notification);
    expect(result.shouldSend).toBe(true);
  });

  test('قناة معطلة → لا ترسل عبرها', () => {
    const prefs = { smsEnabled: false, pushEnabled: true, language: 'ar' };
    const notification = {
      priority: 'high',
      channels: ['sms', 'push'],
    };

    const result = checkUserNotificationPreferences(prefs, notification);
    expect(result.channels).not.toContain('sms');
    expect(result.channels).toContain('push');
  });

  test('null → shouldSend = true', () => {
    const result = checkUserNotificationPreferences(null, null);
    expect(result.shouldSend).toBe(true);
  });

  test('لغة المستخدم تُرجع', () => {
    const prefs = { language: 'en' };
    const notification = { priority: 'low', channels: ['in_app'] };

    const result = checkUserNotificationPreferences(prefs, notification);
    expect(result.language).toBe('en');
  });
});

// ========================================
// calculateNotificationStats
// ========================================
describe('calculateNotificationStats', () => {
  const sampleNotifications = [
    {
      id: 'n1',
      type: 'appointment_reminder',
      channel: 'sms',
      priority: 'medium',
      status: 'delivered',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'n2',
      type: 'appointment_reminder',
      channel: 'push',
      priority: 'medium',
      status: 'read',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'n3',
      type: 'payment_due',
      channel: 'email',
      priority: 'high',
      status: 'failed',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'n4',
      type: 'document_expiry',
      channel: 'sms',
      priority: 'urgent',
      status: 'sent',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'n5',
      type: 'system_alert',
      channel: 'in_app',
      priority: 'urgent',
      status: 'pending',
      createdAt: new Date().toISOString(),
    },
  ];

  test('إحصائيات شاملة', () => {
    const result = calculateNotificationStats(sampleNotifications);
    expect(result.total).toBe(5);
    expect(result.failed).toBe(1);
    expect(result.read).toBe(1);
  });

  test('معدل التسليم محسوب', () => {
    const result = calculateNotificationStats(sampleNotifications);
    // delivered + read = 2 من 5 = 40%
    expect(result.deliveryRate).toBe(40);
  });

  test('توزيع حسب النوع', () => {
    const result = calculateNotificationStats(sampleNotifications);
    expect(result.byType.appointment_reminder).toBe(2);
    expect(result.byType.payment_due).toBe(1);
  });

  test('فلترة بالفترة الزمنية', () => {
    const past = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    const future = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString();

    const result = calculateNotificationStats(sampleNotifications, {
      start: past,
      end: future,
    });
    expect(result.total).toBe(5); // كلها ضمن الفترة
  });

  test('مصفوفة فارغة → أصفار', () => {
    const result = calculateNotificationStats([]);
    expect(result.total).toBe(0);
    expect(result.sent).toBe(0);
  });

  test('توزيع حسب القناة والأولوية', () => {
    const result = calculateNotificationStats(sampleNotifications);
    expect(result.byChannel).toBeDefined();
    expect(result.byPriority).toBeDefined();
    expect(result.byPriority.urgent).toBe(2);
  });
});

// ========================================
// Integration Scenarios
// ========================================
describe('Integration Scenarios', () => {
  test('سيناريو: جدولة وتحليل إشعارات الموعد', () => {
    // 1. جدولة الإشعارات
    const futureDate = new Date(Date.now() + 48 * 60 * 60 * 1000);
    const appointment = {
      id: 'apt-1',
      date: futureDate.toISOString().split('T')[0],
      time: '10:00:00',
      beneficiaryId: 'b-1',
    };

    const reminders = scheduleAppointmentReminders(appointment);
    expect(reminders.length).toBe(2);

    // 2. بناء محتوى الإشعار
    const content = buildNotificationContent('appointment_reminder', {
      serviceName: 'علاج نطق',
      time: '10:00',
    });
    expect(content.isValid).toBe(true);

    // 3. حساب الأولوية
    const priority = calculateNotificationPriority({
      type: 'appointment_reminder',
    });
    expect(priority.channels).toContain('sms');
  });

  test('سيناريو: معالجة دفعة إشعارات مختلطة', () => {
    const batch = [
      { id: 'n1', priority: 'urgent', channel: 'sms', status: 'pending' },
      { id: 'n2', priority: 'medium', channel: 'email', status: 'pending' },
      { id: 'n3', priority: 'low', channel: 'push', status: 'pending' },
      { id: 'n4', priority: 'high', channel: 'sms', status: 'sent' }, // تجاهل
    ];

    const processed = processBatchNotifications(batch);
    expect(processed.total).toBe(3);
    expect(processed.byPriority.urgent).toBe(1);
    expect(processed.skipped).toBe(1);
  });

  test('سيناريو: تحليل أداء الإشعارات وتحسينه', () => {
    const notifications = Array(100)
      .fill(null)
      .map((_, i) => ({
        id: `n${i}`,
        channel: i % 3 === 0 ? 'sms' : i % 3 === 1 ? 'email' : 'push',
        type: 'appointment_reminder',
        priority: 'medium',
        status: i < 80 ? 'delivered' : i < 90 ? 'read' : 'failed',
        createdAt: new Date().toISOString(),
      }));

    const delivery = analyzeNotificationDelivery(notifications);
    expect(delivery.total).toBe(100);
    expect(delivery.deliveryRate).toBeGreaterThan(80);

    const stats = calculateNotificationStats(notifications);
    expect(stats.total).toBe(100);
    expect(stats.failureRate).toBeLessThan(20);
  });
});
