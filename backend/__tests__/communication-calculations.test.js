'use strict';

const {
  COMMUNICATION_CONSTANTS,
  buildAppointmentReminderNotification,
  buildAppointmentConfirmedNotification,
  buildAppointmentCancelledNotification,
  buildSessionCompletedNotification,
  buildInvoiceNotification,
  buildDocumentExpiryNotification,
  buildWaitlistAvailableNotification,
  determineOptimalChannels,
  calculateOptimalSendTime,
  validateMessageContent,
  buildBatchNotifications,
  calculateCommunicationStats,
  calculateReminderSchedule,
  calculateDocumentExpiryReminders,
  formatSmsMessage,
  detectDuplicateNotifications,
  validateContactPreferences,
} = require('../services/communication/communicationCalculations.service');

// ========================================
// CONSTANTS
// ========================================
describe('COMMUNICATION_CONSTANTS', () => {
  test('CHANNEL_TYPES محددة', () => {
    expect(COMMUNICATION_CONSTANTS.CHANNEL_TYPES.SMS).toBe('sms');
    expect(COMMUNICATION_CONSTANTS.CHANNEL_TYPES.EMAIL).toBe('email');
    expect(COMMUNICATION_CONSTANTS.CHANNEL_TYPES.WHATSAPP).toBe('whatsapp');
    expect(COMMUNICATION_CONSTANTS.CHANNEL_TYPES.PUSH).toBe('push');
    expect(COMMUNICATION_CONSTANTS.CHANNEL_TYPES.IN_APP).toBe('in_app');
  });

  test('NOTIFICATION_TYPES تشمل الأنواع الرئيسية', () => {
    expect(COMMUNICATION_CONSTANTS.NOTIFICATION_TYPES.APPOINTMENT_REMINDER).toBe(
      'appointment_reminder'
    );
    expect(COMMUNICATION_CONSTANTS.NOTIFICATION_TYPES.TRANSPORT_PICKUP).toBe('transport_pickup');
    expect(COMMUNICATION_CONSTANTS.NOTIFICATION_TYPES.INVOICE_ISSUED).toBe('invoice_issued');
    expect(COMMUNICATION_CONSTANTS.NOTIFICATION_TYPES.DOCUMENT_EXPIRING).toBe('document_expiring');
    expect(COMMUNICATION_CONSTANTS.NOTIFICATION_TYPES.WAITLIST_AVAILABLE).toBe(
      'waitlist_available'
    );
  });

  test('PRIORITY_LEVELS محددة', () => {
    expect(COMMUNICATION_CONSTANTS.PRIORITY_LEVELS.CRITICAL).toBe('critical');
    expect(COMMUNICATION_CONSTANTS.PRIORITY_LEVELS.HIGH).toBe('high');
    expect(COMMUNICATION_CONSTANTS.PRIORITY_LEVELS.MEDIUM).toBe('medium');
    expect(COMMUNICATION_CONSTANTS.PRIORITY_LEVELS.LOW).toBe('low');
  });

  test('MESSAGE_STATUS محددة', () => {
    expect(COMMUNICATION_CONSTANTS.MESSAGE_STATUS.PENDING).toBe('pending');
    expect(COMMUNICATION_CONSTANTS.MESSAGE_STATUS.SENT).toBe('sent');
    expect(COMMUNICATION_CONSTANTS.MESSAGE_STATUS.DELIVERED).toBe('delivered');
    expect(COMMUNICATION_CONSTANTS.MESSAGE_STATUS.READ).toBe('read');
    expect(COMMUNICATION_CONSTANTS.MESSAGE_STATUS.FAILED).toBe('failed');
  });

  test('SMS_MAX_LENGTH = 160', () => {
    expect(COMMUNICATION_CONSTANTS.SMS_MAX_LENGTH).toBe(160);
  });

  test('OPTIMAL_SEND_TIMES محددة', () => {
    expect(COMMUNICATION_CONSTANTS.OPTIMAL_SEND_TIMES.MORNING).toBe('09:00');
    expect(COMMUNICATION_CONSTANTS.OPTIMAL_SEND_TIMES.MIDDAY).toBe('12:00');
  });
});

// ========================================
// APPOINTMENT REMINDER NOTIFICATION
// ========================================
describe('buildAppointmentReminderNotification', () => {
  const validData = {
    beneficiaryName: 'أحمد محمد',
    appointmentDate: '2025-01-10',
    startTime: '09:00',
    therapistName: 'علي الغامدي',
    serviceName: 'علاج نطق',
    branchName: 'فرع الرياض',
    reminderType: '24h',
  };

  test('إشعار صالح لتذكير 24h', () => {
    const n = buildAppointmentReminderNotification(validData);
    expect(n.isValid).toBe(true);
    expect(n.type).toBe(COMMUNICATION_CONSTANTS.NOTIFICATION_TYPES.APPOINTMENT_REMINDER);
    expect(n.titleAr).toContain('أحمد محمد');
    expect(n.bodyAr).toContain('غداً');
    expect(n.bodyAr).toContain('09:00');
    expect(n.bodyAr).toContain('علاج نطق');
  });

  test('نوع التذكير 2h', () => {
    const n = buildAppointmentReminderNotification({ ...validData, reminderType: '2h' });
    expect(n.bodyAr).toContain('بعد ساعتين');
  });

  test('نوع التذكير 1h', () => {
    const n = buildAppointmentReminderNotification({ ...validData, reminderType: '1h' });
    expect(n.bodyAr).toContain('بعد ساعة');
  });

  test('يحتوي على قناتي Push و SMS', () => {
    const n = buildAppointmentReminderNotification(validData);
    expect(n.channels).toContain(COMMUNICATION_CONSTANTS.CHANNEL_TYPES.PUSH);
    expect(n.channels).toContain(COMMUNICATION_CONSTANTS.CHANNEL_TYPES.SMS);
  });

  test('الأولوية MEDIUM', () => {
    const n = buildAppointmentReminderNotification(validData);
    expect(n.priority).toBe(COMMUNICATION_CONSTANTS.PRIORITY_LEVELS.MEDIUM);
  });

  test('بيانات ناقصة → isValid false', () => {
    expect(buildAppointmentReminderNotification(null).isValid).toBe(false);
    expect(buildAppointmentReminderNotification({ beneficiaryName: 'أحمد' }).isValid).toBe(false);
  });

  test('data تحتوي على بيانات الموعد', () => {
    const n = buildAppointmentReminderNotification(validData);
    expect(n.data.beneficiaryName).toBe('أحمد محمد');
    expect(n.data.appointmentDate).toBe('2025-01-10');
    expect(n.data.startTime).toBe('09:00');
  });
});

// ========================================
// APPOINTMENT CONFIRMED NOTIFICATION
// ========================================
describe('buildAppointmentConfirmedNotification', () => {
  const data = {
    beneficiaryName: 'فاطمة علي',
    appointmentDate: '2025-01-12',
    startTime: '10:30',
    therapistName: 'نورة محمد',
    serviceName: 'علاج وظيفي',
    appointmentNumber: 'APT-2025-0001',
  };

  test('إشعار تأكيد صالح', () => {
    const n = buildAppointmentConfirmedNotification(data);
    expect(n.isValid).toBe(true);
    expect(n.type).toBe(COMMUNICATION_CONSTANTS.NOTIFICATION_TYPES.APPOINTMENT_CONFIRMED);
    expect(n.titleAr).toContain('تأكيد');
    expect(n.bodyAr).toContain('فاطمة علي');
    expect(n.bodyAr).toContain('2025-01-12');
  });

  test('قناة Push فقط', () => {
    const n = buildAppointmentConfirmedNotification(data);
    expect(n.channels).toContain(COMMUNICATION_CONSTANTS.CHANNEL_TYPES.PUSH);
    expect(n.channels.length).toBe(1);
  });

  test('null → isValid false', () => {
    expect(buildAppointmentConfirmedNotification(null).isValid).toBe(false);
  });
});

// ========================================
// APPOINTMENT CANCELLED NOTIFICATION
// ========================================
describe('buildAppointmentCancelledNotification', () => {
  const data = {
    beneficiaryName: 'محمد عبدالله',
    appointmentDate: '2025-01-15',
    startTime: '11:00',
    cancellationReason: 'مرض طارئ',
    cancelledBy: 'ولي الأمر',
  };

  test('إشعار إلغاء صالح مع سبب', () => {
    const n = buildAppointmentCancelledNotification(data);
    expect(n.isValid).toBe(true);
    expect(n.type).toBe(COMMUNICATION_CONSTANTS.NOTIFICATION_TYPES.APPOINTMENT_CANCELLED);
    expect(n.bodyAr).toContain('مرض طارئ');
    expect(n.bodyAr).toContain('السبب');
  });

  test('إشعار إلغاء بدون سبب', () => {
    const n = buildAppointmentCancelledNotification({
      beneficiaryName: 'أحمد',
      appointmentDate: '2025-01-15',
      startTime: '11:00',
    });
    expect(n.bodyAr).not.toContain('السبب');
  });

  test('الأولوية HIGH', () => {
    const n = buildAppointmentCancelledNotification(data);
    expect(n.priority).toBe(COMMUNICATION_CONSTANTS.PRIORITY_LEVELS.HIGH);
  });

  test('null → isValid false', () => {
    expect(buildAppointmentCancelledNotification(null).isValid).toBe(false);
  });
});

// ========================================
// SESSION COMPLETED NOTIFICATION
// ========================================
describe('buildSessionCompletedNotification', () => {
  test('إشعار اكتمال جلسة مع تقدم', () => {
    const n = buildSessionCompletedNotification({
      beneficiaryName: 'سارة محمد',
      sessionDate: '2025-01-10',
      serviceName: 'تحليل سلوك',
      therapistName: 'خالد',
      progressLevel: 'جيد',
    });
    expect(n.isValid).toBe(true);
    expect(n.type).toBe(COMMUNICATION_CONSTANTS.NOTIFICATION_TYPES.SESSION_COMPLETED);
    expect(n.bodyAr).toContain('سارة محمد');
    expect(n.bodyAr).toContain('جيد');
  });

  test('الأولوية LOW', () => {
    const n = buildSessionCompletedNotification({
      beneficiaryName: 'أحمد',
      sessionDate: '2025-01-10',
    });
    expect(n.priority).toBe(COMMUNICATION_CONSTANTS.PRIORITY_LEVELS.LOW);
  });

  test('قناة IN_APP + PUSH', () => {
    const n = buildSessionCompletedNotification({
      beneficiaryName: 'أحمد',
      sessionDate: '2025-01-10',
    });
    expect(n.channels).toContain(COMMUNICATION_CONSTANTS.CHANNEL_TYPES.IN_APP);
    expect(n.channels).toContain(COMMUNICATION_CONSTANTS.CHANNEL_TYPES.PUSH);
  });

  test('hasNotes صحيح', () => {
    const n = buildSessionCompletedNotification({
      beneficiaryName: 'أحمد',
      sessionDate: '2025-01-10',
      sessionNotes: 'ملاحظة مهمة',
    });
    expect(n.data.hasNotes).toBe(true);
  });

  test('null → isValid false', () => {
    expect(buildSessionCompletedNotification(null).isValid).toBe(false);
  });
});

// ========================================
// INVOICE NOTIFICATION
// ========================================
describe('buildInvoiceNotification', () => {
  const data = {
    invoiceNumber: 'INV-2025-00001',
    amount: 500,
    dueDate: '2025-02-01',
    beneficiaryName: 'عائلة محمد',
    currency: 'ر.س',
  };

  test('إشعار فاتورة صالح', () => {
    const n = buildInvoiceNotification(data);
    expect(n.isValid).toBe(true);
    expect(n.type).toBe(COMMUNICATION_CONSTANTS.NOTIFICATION_TYPES.INVOICE_ISSUED);
    expect(n.bodyAr).toContain('INV-2025-00001');
    expect(n.bodyAr).toContain('500');
    expect(n.bodyAr).toContain('ر.س');
    expect(n.bodyAr).toContain('2025-02-01');
  });

  test('قناة Email + Push', () => {
    const n = buildInvoiceNotification(data);
    expect(n.channels).toContain(COMMUNICATION_CONSTANTS.CHANNEL_TYPES.EMAIL);
    expect(n.channels).toContain(COMMUNICATION_CONSTANTS.CHANNEL_TYPES.PUSH);
  });

  test('بدون اسم مستفيد', () => {
    const n = buildInvoiceNotification({
      invoiceNumber: 'INV-001',
      amount: 100,
      dueDate: '2025-02-01',
    });
    expect(n.isValid).toBe(true);
    expect(n.data.beneficiaryName).toBeNull();
  });

  test('بيانات ناقصة → isValid false', () => {
    expect(buildInvoiceNotification(null).isValid).toBe(false);
    expect(buildInvoiceNotification({ invoiceNumber: 'INV-001' }).isValid).toBe(false);
  });

  test('عملة افتراضية ر.س', () => {
    const n = buildInvoiceNotification({
      invoiceNumber: 'INV-001',
      amount: 100,
      dueDate: '2025-02-01',
    });
    expect(n.data.currency).toBe('ر.س');
  });
});

// ========================================
// DOCUMENT EXPIRY NOTIFICATION
// ========================================
describe('buildDocumentExpiryNotification', () => {
  test('7 أيام → CRITICAL + 3 قنوات', () => {
    const n = buildDocumentExpiryNotification({
      employeeName: 'أحمد السالم',
      documentType: 'إقامة',
      daysLeft: 5,
      expiryDate: '2025-01-15',
    });
    expect(n.isValid).toBe(true);
    expect(n.priority).toBe(COMMUNICATION_CONSTANTS.PRIORITY_LEVELS.CRITICAL);
    expect(n.channels).toContain(COMMUNICATION_CONSTANTS.CHANNEL_TYPES.SMS);
    expect(n.channels).toContain(COMMUNICATION_CONSTANTS.CHANNEL_TYPES.EMAIL);
    expect(n.channels).toContain(COMMUNICATION_CONSTANTS.CHANNEL_TYPES.PUSH);
  });

  test('30 يوم → HIGH', () => {
    const n = buildDocumentExpiryNotification({
      employeeName: 'سالم محمد',
      documentType: 'رخصة SCFHS',
      daysLeft: 20,
    });
    expect(n.priority).toBe(COMMUNICATION_CONSTANTS.PRIORITY_LEVELS.HIGH);
  });

  test('90 يوم → MEDIUM', () => {
    const n = buildDocumentExpiryNotification({
      employeeName: 'نورة',
      documentType: 'جواز سفر',
      daysLeft: 60,
    });
    expect(n.priority).toBe(COMMUNICATION_CONSTANTS.PRIORITY_LEVELS.MEDIUM);
  });

  test('titleAr يحتوي نوع الوثيقة', () => {
    const n = buildDocumentExpiryNotification({
      employeeName: 'أحمد',
      documentType: 'إقامة',
      daysLeft: 10,
    });
    expect(n.titleAr).toContain('إقامة');
  });

  test('بيانات ناقصة → isValid false', () => {
    expect(buildDocumentExpiryNotification(null).isValid).toBe(false);
    expect(buildDocumentExpiryNotification({ employeeName: 'أحمد' }).isValid).toBe(false);
  });
});

// ========================================
// WAITLIST NOTIFICATION
// ========================================
describe('buildWaitlistAvailableNotification', () => {
  test('إشعار قائمة الانتظار صالح', () => {
    const n = buildWaitlistAvailableNotification({
      beneficiaryName: 'أحمد',
      serviceName: 'علاج نطق',
      availableDate: '2025-01-20',
      availableTime: '10:00',
      expiresAt: '14:00',
    });
    expect(n.isValid).toBe(true);
    expect(n.type).toBe(COMMUNICATION_CONSTANTS.NOTIFICATION_TYPES.WAITLIST_AVAILABLE);
    expect(n.bodyAr).toContain('أحمد');
    expect(n.bodyAr).toContain('علاج نطق');
    expect(n.bodyAr).toContain('2025-01-20');
    expect(n.bodyAr).toContain('14:00');
  });

  test('الأولوية HIGH', () => {
    const n = buildWaitlistAvailableNotification({
      beneficiaryName: 'أحمد',
      serviceName: 'علاج طبيعي',
    });
    expect(n.priority).toBe(COMMUNICATION_CONSTANTS.PRIORITY_LEVELS.HIGH);
  });

  test('قناة SMS + Push', () => {
    const n = buildWaitlistAvailableNotification({
      beneficiaryName: 'أحمد',
      serviceName: 'علاج طبيعي',
    });
    expect(n.channels).toContain(COMMUNICATION_CONSTANTS.CHANNEL_TYPES.SMS);
    expect(n.channels).toContain(COMMUNICATION_CONSTANTS.CHANNEL_TYPES.PUSH);
  });

  test('null → isValid false', () => {
    expect(buildWaitlistAvailableNotification(null).isValid).toBe(false);
  });
});

// ========================================
// CHANNEL SELECTION
// ========================================
describe('determineOptimalChannels', () => {
  test('CRITICAL → SMS + Push + Email', () => {
    const r = determineOptimalChannels('critical', 'guardian');
    expect(r.isValid).toBe(true);
    expect(r.channels).toContain(COMMUNICATION_CONSTANTS.CHANNEL_TYPES.SMS);
    expect(r.channels).toContain(COMMUNICATION_CONSTANTS.CHANNEL_TYPES.PUSH);
    expect(r.channels).toContain(COMMUNICATION_CONSTANTS.CHANNEL_TYPES.EMAIL);
  });

  test('HIGH → Push + Email', () => {
    const r = determineOptimalChannels('high', 'employee');
    expect(r.channels).toContain(COMMUNICATION_CONSTANTS.CHANNEL_TYPES.PUSH);
    expect(r.channels).toContain(COMMUNICATION_CONSTANTS.CHANNEL_TYPES.EMAIL);
  });

  test('MEDIUM → Push فقط', () => {
    const r = determineOptimalChannels('medium', 'employee');
    expect(r.channels).toContain(COMMUNICATION_CONSTANTS.CHANNEL_TYPES.PUSH);
    expect(r.channels.length).toBe(1);
  });

  test('LOW → IN_APP فقط', () => {
    const r = determineOptimalChannels('low', 'employee');
    expect(r.channels).toContain(COMMUNICATION_CONSTANTS.CHANNEL_TYPES.IN_APP);
    expect(r.channels.length).toBe(1);
  });

  test('ولي أمر يحصل على WhatsApp تلقائياً', () => {
    const r = determineOptimalChannels('high', 'guardian');
    expect(r.channels).toContain(COMMUNICATION_CONSTANTS.CHANNEL_TYPES.WHATSAPP);
  });

  test('ولي أمر LOW لا يحصل على WhatsApp', () => {
    const r = determineOptimalChannels('low', 'guardian');
    expect(r.channels).not.toContain(COMMUNICATION_CONSTANTS.CHANNEL_TYPES.WHATSAPP);
  });

  test('تفضيلات تعطيل قناة SMS', () => {
    const r = determineOptimalChannels('critical', 'guardian', { disabledChannels: ['sms'] });
    expect(r.channels).not.toContain(COMMUNICATION_CONSTANTS.CHANNEL_TYPES.SMS);
  });

  test('إضافة قناة مفضلة', () => {
    const r = determineOptimalChannels('medium', 'employee', { preferredChannels: ['email'] });
    expect(r.channels).toContain(COMMUNICATION_CONSTANTS.CHANNEL_TYPES.EMAIL);
  });

  test('null → isValid false', () => {
    const r = determineOptimalChannels(null, 'guardian');
    expect(r.isValid).toBe(false);
  });
});

// ========================================
// OPTIMAL SEND TIME
// ========================================
describe('calculateOptimalSendTime', () => {
  test('إشعار نقل فوري - لا ينتظر', () => {
    const r = calculateOptimalSendTime('transport_pickup', '2025-01-10T10:00:00.000Z', 3);
    expect(r.isValid).toBe(true);
    expect(r.sendImmediate).toBe(true);
    expect(r.reason).toContain('فوري');
  });

  test('تأخر نقل → فوري', () => {
    const r = calculateOptimalSendTime('transport_delay', '2025-01-10T14:00:00.000Z', 3);
    expect(r.sendImmediate).toBe(true);
  });

  test('ساعة هدوء (23:00 UTC+3 = 02:00 محلي +3 → 22) → مجدول للصباح', () => {
    // 19:00 UTC = 22:00 الرياض (UTC+3) - ساعات هدوء
    const r = calculateOptimalSendTime('appointment_reminder', '2025-01-10T19:00:00.000Z', 3);
    expect(r.isQuietHours).toBe(true);
    expect(r.sendImmediate).toBe(false);
    expect(r.scheduledTime).toBe('09:00');
  });

  test('وقت نهار طبيعي → فوري', () => {
    // 07:00 UTC = 10:00 الرياض - وقت مناسب
    const r = calculateOptimalSendTime('appointment_reminder', '2025-01-10T07:00:00.000Z', 3);
    expect(r.sendImmediate).toBe(true);
    expect(r.isQuietHours).toBe(false);
  });

  test('null → isValid false', () => {
    expect(calculateOptimalSendTime(null).isValid).toBe(false);
  });
});

// ========================================
// MESSAGE VALIDATION
// ========================================
describe('validateMessageContent', () => {
  test('SMS نص صالح', () => {
    const r = validateMessageContent({ bodyAr: 'رسالة قصيرة' }, 'sms');
    expect(r.isValid).toBe(true);
    expect(r.errors.length).toBe(0);
  });

  test('SMS طويل → تحذير', () => {
    const longText = 'أ'.repeat(200);
    const r = validateMessageContent({ bodyAr: longText }, 'sms');
    expect(r.isValid).toBe(true);
    expect(r.warnings.length).toBeGreaterThan(0);
    expect(r.warnings[0]).toContain('SMS');
  });

  test('Push بدون عنوان → خطأ', () => {
    const r = validateMessageContent({ bodyAr: 'محتوى' }, 'push');
    expect(r.isValid).toBe(false);
    expect(r.errors).toContain('عنوان Push مطلوب');
  });

  test('Push صالح', () => {
    const r = validateMessageContent({ titleAr: 'عنوان', bodyAr: 'محتوى' }, 'push');
    expect(r.isValid).toBe(true);
  });

  test('Email بدون موضوع → خطأ', () => {
    const r = validateMessageContent({ bodyAr: 'محتوى' }, 'email');
    expect(r.isValid).toBe(false);
    expect(r.errors).toContain('موضوع البريد مطلوب');
  });

  test('Email صالح', () => {
    const r = validateMessageContent({ titleAr: 'موضوع', bodyAr: 'محتوى' }, 'email');
    expect(r.isValid).toBe(true);
  });

  test('WhatsApp بدون نص → خطأ', () => {
    const r = validateMessageContent({}, 'whatsapp');
    expect(r.isValid).toBe(false);
  });

  test('null → isValid false', () => {
    expect(validateMessageContent(null, 'sms').isValid).toBe(false);
    expect(validateMessageContent({ bodyAr: 'نص' }, null).isValid).toBe(false);
  });
});

// ========================================
// BATCH NOTIFICATIONS
// ========================================
describe('buildBatchNotifications', () => {
  const recipients = [
    { id: 'R1', name: 'أحمد', type: 'guardian' },
    { id: 'R2', name: 'فاطمة', type: 'guardian' },
    { id: 'R3', name: 'محمد', type: 'employee' },
  ];

  const template = {
    type: COMMUNICATION_CONSTANTS.NOTIFICATION_TYPES.APPOINTMENT_REMINDER,
    priority: COMMUNICATION_CONSTANTS.PRIORITY_LEVELS.MEDIUM,
    titleAr: 'تذكير',
    bodyAr: 'محتوى التذكير',
    data: { appointmentDate: '2025-01-10' },
  };

  test('batch صالح', () => {
    const r = buildBatchNotifications(recipients, template);
    expect(r.isValid).toBe(true);
    expect(r.total).toBe(3);
    expect(r.notifications.length).toBe(3);
  });

  test('كل إشعار له recipientId', () => {
    const r = buildBatchNotifications(recipients, template);
    expect(r.notifications[0].recipientId).toBe('R1');
    expect(r.notifications[1].recipientId).toBe('R2');
  });

  test('batchId موجود', () => {
    const r = buildBatchNotifications(recipients, template);
    expect(r.batchId).toMatch(/^BATCH-/);
  });

  test('قائمة فارغة → isValid false', () => {
    expect(buildBatchNotifications([], template).isValid).toBe(false);
    expect(buildBatchNotifications(null, template).isValid).toBe(false);
  });

  test('بدون قالب → isValid false', () => {
    expect(buildBatchNotifications(recipients, null).isValid).toBe(false);
    expect(buildBatchNotifications(recipients, {}).isValid).toBe(false);
  });
});

// ========================================
// COMMUNICATION STATS
// ========================================
describe('calculateCommunicationStats', () => {
  const messages = [
    { channel: 'sms', type: 'appointment_reminder', status: 'delivered', createdAt: '2025-01-06' },
    { channel: 'sms', type: 'appointment_reminder', status: 'delivered', createdAt: '2025-01-06' },
    { channel: 'push', type: 'transport_pickup', status: 'read', createdAt: '2025-01-06' },
    { channel: 'push', type: 'transport_pickup', status: 'failed', createdAt: '2025-01-07' },
    { channel: 'email', type: 'invoice_issued', status: 'sent', createdAt: '2025-01-07' },
    { channel: 'sms', type: 'appointment_reminder', status: 'pending', createdAt: '2025-01-08' },
    { channel: 'sms', type: 'appointment_reminder', status: 'cancelled', createdAt: '2025-01-08' },
  ];

  test('إحصائيات صحيحة', () => {
    const r = calculateCommunicationStats(messages);
    expect(r.total).toBe(7);
    expect(r.sent).toBe(5); // الكل إلا pending و cancelled
    expect(r.delivered).toBe(3); // 2 delivered + 1 read
    expect(r.read).toBe(1);
    expect(r.failed).toBe(1);
  });

  test('معدل التسليم', () => {
    const r = calculateCommunicationStats(messages);
    expect(r.deliveryRate).toBe(60); // 3/5 = 60%
  });

  test('معدل القراءة', () => {
    const r = calculateCommunicationStats(messages);
    expect(r.readRate).toBe(33); // 1/3 ≈ 33%
  });

  test('فلتر القناة', () => {
    const r = calculateCommunicationStats(messages, { channel: 'sms' });
    expect(r.total).toBe(4);
  });

  test('فلتر النوع', () => {
    const r = calculateCommunicationStats(messages, { type: 'transport_pickup' });
    expect(r.total).toBe(2);
  });

  test('فلتر التاريخ', () => {
    const r = calculateCommunicationStats(messages, {
      dateFrom: '2025-01-07',
      dateTo: '2025-01-08',
    });
    expect(r.total).toBe(4);
  });

  test('byChannel موجود', () => {
    const r = calculateCommunicationStats(messages);
    expect(r.byChannel.sms).toBeDefined();
    expect(r.byChannel.push).toBeDefined();
    expect(r.byChannel.sms.total).toBe(4);
  });

  test('byType موجود', () => {
    const r = calculateCommunicationStats(messages);
    expect(r.byType.appointment_reminder).toBe(4);
    expect(r.byType.transport_pickup).toBe(2);
  });

  test('null → أصفار', () => {
    const r = calculateCommunicationStats(null);
    expect(r.total).toBe(0);
    expect(r.deliveryRate).toBe(0);
  });
});

// ========================================
// REMINDER SCHEDULE
// ========================================
describe('calculateReminderSchedule', () => {
  test('3 تذكيرات للموعد', () => {
    const r = calculateReminderSchedule('2025-01-20T09:00:00.000Z');
    expect(r.isValid).toBe(true);
    expect(r.totalReminders).toBe(3);
    expect(r.reminders.map(x => x.type)).toContain('24h');
    expect(r.reminders.map(x => x.type)).toContain('2h');
    expect(r.reminders.map(x => x.type)).toContain('1h');
  });

  test('التذكير 24h قبل 24 ساعة من الموعد', () => {
    const appointment = '2025-01-20T09:00:00.000Z';
    const r = calculateReminderSchedule(appointment);
    const reminder24h = r.reminders.find(x => x.type === '24h');
    const expected = new Date('2025-01-20T09:00:00.000Z').getTime() - 24 * 60 * 60 * 1000;
    expect(new Date(reminder24h.scheduledAt).getTime()).toBe(expected);
  });

  test('أولوية 1h أعلى من 24h', () => {
    const r = calculateReminderSchedule('2025-01-20T09:00:00.000Z');
    const r1h = r.reminders.find(x => x.type === '1h');
    expect(r1h.priority).toBe(COMMUNICATION_CONSTANTS.PRIORITY_LEVELS.HIGH);
  });

  test('null → isValid false', () => {
    expect(calculateReminderSchedule(null).isValid).toBe(false);
  });

  test('تاريخ غير صالح → isValid false', () => {
    expect(calculateReminderSchedule('invalid-date').isValid).toBe(false);
  });
});

// ========================================
// DOCUMENT EXPIRY REMINDERS
// ========================================
describe('calculateDocumentExpiryReminders', () => {
  test('وثيقة منتهية الصلاحية', () => {
    const r = calculateDocumentExpiryReminders('2024-12-01', '2025-01-10');
    expect(r.isValid).toBe(true);
    expect(r.isExpired).toBe(true);
    expect(r.daysExpired).toBeGreaterThan(0);
    expect(r.requiresImmediateAction).toBe(true);
  });

  test('2 يوم متبقي → critical + 4 تذكيرات', () => {
    // بناء تاريخ انتهاء بعد يومين من الآن
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 2);
    const expiryStr = expiry.toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];

    const r = calculateDocumentExpiryReminders(expiryStr, today);
    expect(r.isExpired).toBe(false);
    expect(r.urgencyLevel).toBe('critical');
    expect(r.requiresImmediateAction).toBe(true);
    // يجب أن تكون هناك تذكيرات: 90days, 30days, 7days, critical
    expect(r.reminders.length).toBe(4);
  });

  test('5 أيام متبقية → high', () => {
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 5);
    const expiryStr = expiry.toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];

    const r = calculateDocumentExpiryReminders(expiryStr, today);
    expect(r.urgencyLevel).toBe('high');
    expect(r.daysUntilExpiry).toBe(5);
  });

  test('20 يوم متبقي → medium', () => {
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 20);
    const expiryStr = expiry.toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];

    const r = calculateDocumentExpiryReminders(expiryStr, today);
    expect(r.urgencyLevel).toBe('medium');
  });

  test('120 يوم متبقي → low + تذكير واحد فقط (90 يوم)', () => {
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 120);
    const expiryStr = expiry.toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];

    const r = calculateDocumentExpiryReminders(expiryStr, today);
    expect(r.urgencyLevel).toBe('low');
    expect(r.reminders.length).toBe(0); // 120 > 90 لا تذكير
  });

  test('null → isValid false', () => {
    expect(calculateDocumentExpiryReminders(null).isValid).toBe(false);
  });
});

// ========================================
// SMS FORMATTING
// ========================================
describe('formatSmsMessage', () => {
  test('رسالة قصيرة مع توقيع', () => {
    const r = formatSmsMessage('رسالة قصيرة');
    expect(r.isValid).toBe(true);
    expect(r.partsCount).toBe(1);
    expect(r.exceedsLimit).toBe(false);
    expect(r.formattedText).toContain('مراكز الأوائل');
  });

  test('رسالة طويلة تُقسَّم', () => {
    const longText = 'أ'.repeat(200);
    const r = formatSmsMessage(longText, { addSignature: false });
    expect(r.isValid).toBe(true);
    expect(r.partsCount).toBeGreaterThan(1);
    expect(r.exceedsLimit).toBe(true);
  });

  test('بدون توقيع', () => {
    const r = formatSmsMessage('رسالة', { addSignature: false });
    expect(r.formattedText).toBe('رسالة');
    expect(r.formattedText).not.toContain('الأوائل');
  });

  test('توقيع مخصص', () => {
    const r = formatSmsMessage('مرحبا', { signature: ' - مركزي' });
    expect(r.formattedText).toContain('مركزي');
  });

  test('totalChars صحيح', () => {
    const r = formatSmsMessage('abc', { addSignature: false });
    expect(r.totalChars).toBe(3);
  });

  test('null → isValid false', () => {
    expect(formatSmsMessage(null).isValid).toBe(false);
    expect(formatSmsMessage(123).isValid).toBe(false);
  });
});

// ========================================
// DUPLICATE DETECTION
// ========================================
describe('detectDuplicateNotifications', () => {
  test('لا تكرار - إشعارات مختلفة النوع', () => {
    const newNotif = {
      type: 'appointment_reminder',
      recipientId: 'R1',
      data: { appointmentDate: '2025-01-10', beneficiaryName: 'أحمد' },
    };
    const recent = [
      {
        type: 'transport_pickup',
        recipientId: 'R1',
        data: { appointmentDate: '2025-01-10', beneficiaryName: 'أحمد' },
        createdAt: new Date().toISOString(),
      },
    ];
    const r = detectDuplicateNotifications(newNotif, recent, 60);
    expect(r.isDuplicate).toBe(false);
  });

  test('تكرار - نفس النوع والمستفيد والتاريخ', () => {
    const newNotif = {
      type: 'appointment_reminder',
      recipientId: 'R1',
      data: { appointmentDate: '2025-01-10', beneficiaryName: 'أحمد' },
    };
    const recent = [
      {
        id: 'N1',
        type: 'appointment_reminder',
        recipientId: 'R1',
        data: { appointmentDate: '2025-01-10', beneficiaryName: 'أحمد' },
        createdAt: new Date().toISOString(),
      },
    ];
    const r = detectDuplicateNotifications(newNotif, recent, 60);
    expect(r.isDuplicate).toBe(true);
    expect(r.duplicateId).toBe('N1');
  });

  test('نافذة زمنية منتهية → ليس تكرار', () => {
    const newNotif = {
      type: 'appointment_reminder',
      recipientId: 'R1',
      data: { appointmentDate: '2025-01-10', beneficiaryName: 'أحمد' },
    };
    const oldDate = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(); // قبل ساعتين
    const recent = [
      {
        type: 'appointment_reminder',
        recipientId: 'R1',
        data: { appointmentDate: '2025-01-10', beneficiaryName: 'أحمد' },
        createdAt: oldDate,
      },
    ];
    const r = detectDuplicateNotifications(newNotif, recent, 60); // نافذة 60 دقيقة
    expect(r.isDuplicate).toBe(false);
  });

  test('null → ليس تكرار', () => {
    expect(detectDuplicateNotifications(null, [], 60).isDuplicate).toBe(false);
  });
});

// ========================================
// CONTACT PREFERENCES
// ========================================
describe('validateContactPreferences', () => {
  test('بدون تفضيلات → قيم افتراضية', () => {
    const r = validateContactPreferences(null);
    expect(r.isValid).toBe(true);
    expect(r.enabledChannels.length).toBe(5); // كل القنوات
    expect(r.quietHoursStart).toBe('22:00');
    expect(r.quietHoursEnd).toBe('08:00');
    expect(r.language).toBe('ar');
  });

  test('تفضيلات مع قناة معطلة', () => {
    const r = validateContactPreferences({ disabledChannels: ['sms', 'whatsapp'] });
    expect(r.isValid).toBe(true);
    expect(r.enabledChannels).not.toContain('sms');
    expect(r.enabledChannels).not.toContain('whatsapp');
    expect(r.enabledChannels.length).toBe(3);
  });

  test('ساعات هدوء مخصصة', () => {
    const r = validateContactPreferences({ quietHoursStart: '23:00', quietHoursEnd: '07:00' });
    expect(r.isValid).toBe(true);
    expect(r.quietHoursStart).toBe('23:00');
    expect(r.quietHoursEnd).toBe('07:00');
  });

  test('تنسيق ساعات هدوء غير صالح', () => {
    const r = validateContactPreferences({ quietHoursStart: 'invalid' });
    expect(r.isValid).toBe(false);
    expect(r.errors.length).toBeGreaterThan(0);
  });

  test('لغة إنجليزية', () => {
    const r = validateContactPreferences({ language: 'en' });
    expect(r.language).toBe('en');
  });

  test('بيانات الاتصال', () => {
    const r = validateContactPreferences({
      smsNumber: '0501234567',
      email: 'test@test.com',
      pushToken: 'token123',
    });
    expect(r.smsNumber).toBe('0501234567');
    expect(r.email).toBe('test@test.com');
    expect(r.pushToken).toBe('token123');
  });
});

// ========================================
// INTEGRATION
// ========================================
describe('Integration - دورة تواصل كاملة', () => {
  test('من إنشاء موعد إلى إرسال تذكيرات', () => {
    // 1. إنشاء إشعار التأكيد
    const confirmed = buildAppointmentConfirmedNotification({
      beneficiaryName: 'أحمد محمد',
      appointmentDate: '2025-01-20',
      startTime: '09:00',
      therapistName: 'علي الغامدي',
      serviceName: 'علاج نطق',
      appointmentNumber: 'APT-2025-001',
    });
    expect(confirmed.isValid).toBe(true);

    // 2. حساب جدول التذكيرات
    const schedule = calculateReminderSchedule('2025-01-20T06:00:00.000Z');
    expect(schedule.totalReminders).toBe(3);

    // 3. التحقق من صحة محتوى Push
    const validation = validateMessageContent(confirmed, 'push');
    expect(validation.isValid).toBe(true);

    // 4. تحديد القنوات لولي الأمر
    const channels = determineOptimalChannels('medium', 'guardian');
    expect(channels.channels).toContain('whatsapp');

    // 5. بناء إشعارات مجمّعة
    const batch = buildBatchNotifications(
      [{ id: 'G1', name: 'والد أحمد', type: 'guardian' }],
      confirmed
    );
    expect(batch.isValid).toBe(true);
    expect(batch.total).toBe(1);
  });

  test('من إلغاء موعد إلى إشعار قائمة الانتظار', () => {
    // 1. إشعار الإلغاء
    const cancelled = buildAppointmentCancelledNotification({
      beneficiaryName: 'فاطمة',
      appointmentDate: '2025-01-20',
      startTime: '10:00',
      cancellationReason: 'مرض',
    });
    expect(cancelled.priority).toBe(COMMUNICATION_CONSTANTS.PRIORITY_LEVELS.HIGH);

    // 2. إشعار قائمة الانتظار
    const waitlist = buildWaitlistAvailableNotification({
      beneficiaryName: 'محمد عبدالله',
      serviceName: 'علاج طبيعي',
      availableDate: '2025-01-20',
      availableTime: '10:00',
      expiresAt: '14:00',
    });
    expect(waitlist.isValid).toBe(true);
    expect(waitlist.bodyAr).toContain('14:00');
  });

  test('إحصائيات التواصل الشهرية', () => {
    const messages = [
      {
        channel: 'sms',
        type: 'appointment_reminder',
        status: 'delivered',
        createdAt: '2025-01-06',
      },
      {
        channel: 'sms',
        type: 'appointment_reminder',
        status: 'delivered',
        createdAt: '2025-01-07',
      },
      { channel: 'push', type: 'transport_pickup', status: 'read', createdAt: '2025-01-07' },
      { channel: 'push', type: 'invoice_issued', status: 'failed', createdAt: '2025-01-08' },
      { channel: 'email', type: 'document_expiring', status: 'sent', createdAt: '2025-01-08' },
    ];

    const stats = calculateCommunicationStats(messages);
    expect(stats.total).toBe(5);
    expect(stats.deliveryRate).toBeGreaterThan(0);
    expect(stats.byChannel).toBeDefined();
    expect(Object.keys(stats.byType).length).toBeGreaterThan(0);
  });
});
