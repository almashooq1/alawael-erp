'use strict';

/**
 * Communication & Notifications Calculations Service
 * وحدة التواصل والإشعارات - Pure Business Logic
 * نظام AlAwael ERP - مراكز تأهيل ذوي الإعاقة
 *
 * لا يحتوي على أي imports خارجية - pure functions فقط
 */

// ========================================
// CONSTANTS
// ========================================
const COMMUNICATION_CONSTANTS = {
  CHANNEL_TYPES: {
    SMS: 'sms',
    EMAIL: 'email',
    WHATSAPP: 'whatsapp',
    PUSH: 'push',
    IN_APP: 'in_app',
  },

  NOTIFICATION_TYPES: {
    APPOINTMENT_REMINDER: 'appointment_reminder',
    APPOINTMENT_CONFIRMED: 'appointment_confirmed',
    APPOINTMENT_CANCELLED: 'appointment_cancelled',
    SESSION_COMPLETED: 'session_completed',
    TRANSPORT_PICKUP: 'transport_pickup',
    TRANSPORT_DROPOFF: 'transport_dropoff',
    TRANSPORT_DELAY: 'transport_delay',
    INVOICE_ISSUED: 'invoice_issued',
    INVOICE_OVERDUE: 'invoice_overdue',
    PAYMENT_RECEIVED: 'payment_received',
    DOCUMENT_EXPIRING: 'document_expiring',
    REPORT_READY: 'report_ready',
    SYSTEM_ALERT: 'system_alert',
    PROGRESS_UPDATE: 'progress_update',
    WAITLIST_AVAILABLE: 'waitlist_available',
  },

  PRIORITY_LEVELS: {
    CRITICAL: 'critical', // فوري - SMS + Push
    HIGH: 'high', // عالي - Push + Email
    MEDIUM: 'medium', // متوسط - Push
    LOW: 'low', // منخفض - In-App فقط
  },

  RECIPIENT_TYPES: {
    GUARDIAN: 'guardian',
    EMPLOYEE: 'employee',
    ADMIN: 'admin',
    THERAPIST: 'therapist',
    MANAGER: 'manager',
  },

  MESSAGE_STATUS: {
    PENDING: 'pending',
    SENT: 'sent',
    DELIVERED: 'delivered',
    READ: 'read',
    FAILED: 'failed',
    CANCELLED: 'cancelled',
  },

  // أوقات الإرسال المثلى (ساعة:دقيقة)
  OPTIMAL_SEND_TIMES: {
    MORNING: '09:00',
    MIDDAY: '12:00',
    AFTERNOON: '15:00',
    EVENING: '18:00',
  },

  // حدود الرسائل
  SMS_MAX_LENGTH: 160,
  PUSH_TITLE_MAX: 50,
  PUSH_BODY_MAX: 200,
  EMAIL_SUBJECT_MAX: 100,

  // فترات التذكير (بالساعات)
  REMINDER_INTERVALS: {
    APPOINTMENT_24H: 24,
    APPOINTMENT_2H: 2,
    APPOINTMENT_1H: 1,
    INVOICE_DUE_3_DAYS: 72,
    DOCUMENT_EXPIRY_30_DAYS: 720,
    DOCUMENT_EXPIRY_7_DAYS: 168,
  },
};

// ========================================
// NOTIFICATION BUILDER
// ========================================

/**
 * بناء إشعار موعد - تذكير
 */
function buildAppointmentReminderNotification(data) {
  if (!data || !data.beneficiaryName || !data.appointmentDate || !data.startTime) {
    return { isValid: false, error: 'بيانات الموعد غير مكتملة' };
  }

  const {
    beneficiaryName,
    appointmentDate,
    startTime,
    therapistName,
    serviceName,
    branchName,
    reminderType,
  } = data;

  const typeLabel =
    reminderType === '24h' ? 'غداً' : reminderType === '2h' ? 'بعد ساعتين' : 'بعد ساعة';

  return {
    isValid: true,
    type: COMMUNICATION_CONSTANTS.NOTIFICATION_TYPES.APPOINTMENT_REMINDER,
    priority: COMMUNICATION_CONSTANTS.PRIORITY_LEVELS.MEDIUM,
    channels: [
      COMMUNICATION_CONSTANTS.CHANNEL_TYPES.PUSH,
      COMMUNICATION_CONSTANTS.CHANNEL_TYPES.SMS,
    ],
    titleAr: `تذكير بموعد ${beneficiaryName}`,
    titleEn: `Appointment Reminder for ${beneficiaryName}`,
    bodyAr: `لديكم موعد ${typeLabel} في ${startTime} - ${serviceName || 'جلسة'} مع ${therapistName || 'المعالج'} في ${branchName || 'المركز'}`,
    bodyEn: `You have an appointment ${typeLabel} at ${startTime}`,
    data: {
      beneficiaryName,
      appointmentDate,
      startTime,
      therapistName,
      serviceName,
      branchName,
      reminderType,
    },
  };
}

/**
 * بناء إشعار تأكيد موعد
 */
function buildAppointmentConfirmedNotification(data) {
  if (!data || !data.beneficiaryName || !data.appointmentDate) {
    return { isValid: false, error: 'بيانات ناقصة' };
  }

  const {
    beneficiaryName,
    appointmentDate,
    startTime,
    therapistName,
    serviceName,
    appointmentNumber,
  } = data;

  return {
    isValid: true,
    type: COMMUNICATION_CONSTANTS.NOTIFICATION_TYPES.APPOINTMENT_CONFIRMED,
    priority: COMMUNICATION_CONSTANTS.PRIORITY_LEVELS.MEDIUM,
    channels: [COMMUNICATION_CONSTANTS.CHANNEL_TYPES.PUSH],
    titleAr: 'تم تأكيد الموعد',
    titleEn: 'Appointment Confirmed',
    bodyAr: `تم تأكيد موعد ${beneficiaryName} يوم ${appointmentDate} الساعة ${startTime} مع ${therapistName || 'المعالج'}`,
    bodyEn: `Appointment confirmed for ${beneficiaryName} on ${appointmentDate} at ${startTime}`,
    data: {
      appointmentNumber,
      beneficiaryName,
      appointmentDate,
      startTime,
      therapistName,
      serviceName,
    },
  };
}

/**
 * بناء إشعار إلغاء موعد
 */
function buildAppointmentCancelledNotification(data) {
  if (!data || !data.beneficiaryName) {
    return { isValid: false, error: 'بيانات ناقصة' };
  }

  const { beneficiaryName, appointmentDate, startTime, cancellationReason, cancelledBy } = data;

  return {
    isValid: true,
    type: COMMUNICATION_CONSTANTS.NOTIFICATION_TYPES.APPOINTMENT_CANCELLED,
    priority: COMMUNICATION_CONSTANTS.PRIORITY_LEVELS.HIGH,
    channels: [
      COMMUNICATION_CONSTANTS.CHANNEL_TYPES.PUSH,
      COMMUNICATION_CONSTANTS.CHANNEL_TYPES.SMS,
    ],
    titleAr: 'إلغاء موعد',
    titleEn: 'Appointment Cancelled',
    bodyAr: `تم إلغاء موعد ${beneficiaryName} يوم ${appointmentDate} الساعة ${startTime}${cancellationReason ? `. السبب: ${cancellationReason}` : ''}`,
    bodyEn: `Appointment for ${beneficiaryName} on ${appointmentDate} has been cancelled`,
    data: {
      beneficiaryName,
      appointmentDate,
      startTime,
      cancellationReason: cancellationReason || null,
      cancelledBy: cancelledBy || null,
    },
  };
}

/**
 * بناء إشعار اكتمال جلسة
 */
function buildSessionCompletedNotification(data) {
  if (!data || !data.beneficiaryName) {
    return { isValid: false, error: 'بيانات ناقصة' };
  }

  const { beneficiaryName, sessionDate, serviceName, therapistName, sessionNotes, progressLevel } =
    data;

  return {
    isValid: true,
    type: COMMUNICATION_CONSTANTS.NOTIFICATION_TYPES.SESSION_COMPLETED,
    priority: COMMUNICATION_CONSTANTS.PRIORITY_LEVELS.LOW,
    channels: [
      COMMUNICATION_CONSTANTS.CHANNEL_TYPES.IN_APP,
      COMMUNICATION_CONSTANTS.CHANNEL_TYPES.PUSH,
    ],
    titleAr: 'اكتملت الجلسة',
    titleEn: 'Session Completed',
    bodyAr: `اكتملت جلسة ${serviceName || 'التأهيل'} لـ${beneficiaryName} مع ${therapistName || 'المعالج'}${progressLevel ? `. التقدم: ${progressLevel}` : ''}`,
    bodyEn: `Session completed for ${beneficiaryName}`,
    data: {
      beneficiaryName,
      sessionDate,
      serviceName,
      therapistName,
      hasNotes: !!sessionNotes,
      progressLevel: progressLevel || null,
    },
  };
}

/**
 * بناء إشعار فاتورة جديدة
 */
function buildInvoiceNotification(data) {
  if (!data || !data.invoiceNumber || !data.amount) {
    return { isValid: false, error: 'بيانات الفاتورة ناقصة' };
  }

  const { invoiceNumber, amount, dueDate, beneficiaryName, currency } = data;
  const curr = currency || 'ر.س';

  return {
    isValid: true,
    type: COMMUNICATION_CONSTANTS.NOTIFICATION_TYPES.INVOICE_ISSUED,
    priority: COMMUNICATION_CONSTANTS.PRIORITY_LEVELS.MEDIUM,
    channels: [
      COMMUNICATION_CONSTANTS.CHANNEL_TYPES.EMAIL,
      COMMUNICATION_CONSTANTS.CHANNEL_TYPES.PUSH,
    ],
    titleAr: 'فاتورة جديدة',
    titleEn: 'New Invoice',
    bodyAr: `صدرت فاتورة رقم ${invoiceNumber} بمبلغ ${amount} ${curr}${beneficiaryName ? ` لـ${beneficiaryName}` : ''}. تاريخ الاستحقاق: ${dueDate}`,
    bodyEn: `Invoice #${invoiceNumber} for ${amount} ${curr} issued. Due: ${dueDate}`,
    data: {
      invoiceNumber,
      amount,
      dueDate,
      beneficiaryName: beneficiaryName || null,
      currency: curr,
    },
  };
}

/**
 * بناء إشعار انتهاء وثيقة
 */
function buildDocumentExpiryNotification(data) {
  if (!data || !data.employeeName || !data.documentType || data.daysLeft === undefined) {
    return { isValid: false, error: 'بيانات الوثيقة ناقصة' };
  }

  const { employeeName, documentType, daysLeft, expiryDate } = data;
  const urgency =
    daysLeft <= 7
      ? COMMUNICATION_CONSTANTS.PRIORITY_LEVELS.CRITICAL
      : daysLeft <= 30
        ? COMMUNICATION_CONSTANTS.PRIORITY_LEVELS.HIGH
        : COMMUNICATION_CONSTANTS.PRIORITY_LEVELS.MEDIUM;

  return {
    isValid: true,
    type: COMMUNICATION_CONSTANTS.NOTIFICATION_TYPES.DOCUMENT_EXPIRING,
    priority: urgency,
    channels:
      urgency === COMMUNICATION_CONSTANTS.PRIORITY_LEVELS.CRITICAL
        ? [
            COMMUNICATION_CONSTANTS.CHANNEL_TYPES.SMS,
            COMMUNICATION_CONSTANTS.CHANNEL_TYPES.EMAIL,
            COMMUNICATION_CONSTANTS.CHANNEL_TYPES.PUSH,
          ]
        : [COMMUNICATION_CONSTANTS.CHANNEL_TYPES.EMAIL, COMMUNICATION_CONSTANTS.CHANNEL_TYPES.PUSH],
    titleAr: `تنبيه: انتهاء ${documentType}`,
    titleEn: `Alert: ${documentType} Expiring`,
    bodyAr: `${documentType} الموظف ${employeeName} ستنتهي خلال ${daysLeft} يوم${expiryDate ? ` (${expiryDate})` : ''}`,
    bodyEn: `${employeeName}'s ${documentType} expires in ${daysLeft} days`,
    data: {
      employeeName,
      documentType,
      daysLeft,
      expiryDate: expiryDate || null,
      urgency,
    },
  };
}

/**
 * بناء إشعار قائمة الانتظار - توفر مقعد
 */
function buildWaitlistAvailableNotification(data) {
  if (!data || !data.beneficiaryName || !data.serviceName) {
    return { isValid: false, error: 'بيانات ناقصة' };
  }

  const { beneficiaryName, serviceName, availableDate, availableTime, therapistName, expiresAt } =
    data;

  return {
    isValid: true,
    type: COMMUNICATION_CONSTANTS.NOTIFICATION_TYPES.WAITLIST_AVAILABLE,
    priority: COMMUNICATION_CONSTANTS.PRIORITY_LEVELS.HIGH,
    channels: [
      COMMUNICATION_CONSTANTS.CHANNEL_TYPES.SMS,
      COMMUNICATION_CONSTANTS.CHANNEL_TYPES.PUSH,
    ],
    titleAr: 'موعد متاح من قائمة الانتظار',
    titleEn: 'Waitlist Slot Available',
    bodyAr: `أصبح متاح موعد لـ${beneficiaryName} في خدمة ${serviceName}${availableDate ? ` يوم ${availableDate} الساعة ${availableTime}` : ''}${expiresAt ? `. العرض ينتهي: ${expiresAt}` : ''}`,
    bodyEn: `A slot is available for ${beneficiaryName} - ${serviceName}`,
    data: {
      beneficiaryName,
      serviceName,
      availableDate: availableDate || null,
      availableTime: availableTime || null,
      therapistName: therapistName || null,
      expiresAt: expiresAt || null,
    },
  };
}

// ========================================
// CHANNEL SELECTION
// ========================================

/**
 * تحديد القنوات المناسبة بناءً على الأولوية ونوع المستلم
 */
function determineOptimalChannels(priority, recipientType, preferences) {
  if (!priority || !recipientType) {
    return { channels: [COMMUNICATION_CONSTANTS.CHANNEL_TYPES.IN_APP], isValid: false };
  }

  const userPrefs = preferences || {};

  // القنوات الافتراضية حسب الأولوية
  let defaultChannels = [];

  switch (priority) {
    case COMMUNICATION_CONSTANTS.PRIORITY_LEVELS.CRITICAL:
      defaultChannels = [
        COMMUNICATION_CONSTANTS.CHANNEL_TYPES.SMS,
        COMMUNICATION_CONSTANTS.CHANNEL_TYPES.PUSH,
        COMMUNICATION_CONSTANTS.CHANNEL_TYPES.EMAIL,
      ];
      break;
    case COMMUNICATION_CONSTANTS.PRIORITY_LEVELS.HIGH:
      defaultChannels = [
        COMMUNICATION_CONSTANTS.CHANNEL_TYPES.PUSH,
        COMMUNICATION_CONSTANTS.CHANNEL_TYPES.EMAIL,
      ];
      break;
    case COMMUNICATION_CONSTANTS.PRIORITY_LEVELS.MEDIUM:
      defaultChannels = [COMMUNICATION_CONSTANTS.CHANNEL_TYPES.PUSH];
      break;
    case COMMUNICATION_CONSTANTS.PRIORITY_LEVELS.LOW:
      defaultChannels = [COMMUNICATION_CONSTANTS.CHANNEL_TYPES.IN_APP];
      break;
    default:
      defaultChannels = [COMMUNICATION_CONSTANTS.CHANNEL_TYPES.IN_APP];
  }

  // تطبيق تفضيلات المستخدم
  if (userPrefs.disabledChannels && Array.isArray(userPrefs.disabledChannels)) {
    defaultChannels = defaultChannels.filter(ch => !userPrefs.disabledChannels.includes(ch));
  }

  // إضافة قنوات مفضّلة
  if (userPrefs.preferredChannels && Array.isArray(userPrefs.preferredChannels)) {
    userPrefs.preferredChannels.forEach(ch => {
      if (!defaultChannels.includes(ch)) {
        defaultChannels.push(ch);
      }
    });
  }

  // أولياء الأمور يفضلون WhatsApp
  if (
    recipientType === COMMUNICATION_CONSTANTS.RECIPIENT_TYPES.GUARDIAN &&
    !userPrefs.disabledChannels?.includes(COMMUNICATION_CONSTANTS.CHANNEL_TYPES.WHATSAPP)
  ) {
    if (
      priority !== COMMUNICATION_CONSTANTS.PRIORITY_LEVELS.LOW &&
      !defaultChannels.includes(COMMUNICATION_CONSTANTS.CHANNEL_TYPES.WHATSAPP)
    ) {
      defaultChannels.push(COMMUNICATION_CONSTANTS.CHANNEL_TYPES.WHATSAPP);
    }
  }

  return {
    isValid: true,
    channels: defaultChannels,
    priority,
    recipientType,
  };
}

// ========================================
// SEND TIME OPTIMIZATION
// ========================================

/**
 * حساب أفضل وقت لإرسال الإشعار
 */
function calculateOptimalSendTime(notificationType, currentTime, userTimeZoneOffset) {
  if (!notificationType) {
    return { isValid: false, error: 'نوع الإشعار مطلوب' };
  }

  const now = currentTime || new Date().toISOString();
  const hour = parseInt(now.split('T')[1]?.split(':')[0] || '12', 10);
  const offsetHours = userTimeZoneOffset !== undefined ? userTimeZoneOffset : 3; // UTC+3 الرياض

  const localHour = (hour + offsetHours) % 24;

  // الإشعارات الفورية لا تنتظر
  const urgentTypes = [
    COMMUNICATION_CONSTANTS.NOTIFICATION_TYPES.TRANSPORT_PICKUP,
    COMMUNICATION_CONSTANTS.NOTIFICATION_TYPES.TRANSPORT_DELAY,
    COMMUNICATION_CONSTANTS.NOTIFICATION_TYPES.SYSTEM_ALERT,
  ];

  if (urgentTypes.includes(notificationType)) {
    return {
      isValid: true,
      sendImmediate: true,
      scheduledTime: now,
      reason: 'إشعار فوري',
    };
  }

  // التحقق من ساعات الهدوء (22:00 - 08:00)
  const isQuietHours = localHour >= 22 || localHour < 8;

  if (isQuietHours) {
    // جدولة في الساعة 9 صباحاً
    return {
      isValid: true,
      sendImmediate: false,
      scheduledTime: COMMUNICATION_CONSTANTS.OPTIMAL_SEND_TIMES.MORNING,
      reason: 'ساعات هدوء - مجدول للصباح',
      isQuietHours: true,
    };
  }

  // أوقات مناسبة حسب نوع الإشعار
  let preferredTime = COMMUNICATION_CONSTANTS.OPTIMAL_SEND_TIMES.MORNING;

  if (notificationType === COMMUNICATION_CONSTANTS.NOTIFICATION_TYPES.APPOINTMENT_REMINDER) {
    preferredTime =
      localHour < 10
        ? COMMUNICATION_CONSTANTS.OPTIMAL_SEND_TIMES.MORNING
        : localHour < 14
          ? COMMUNICATION_CONSTANTS.OPTIMAL_SEND_TIMES.MIDDAY
          : COMMUNICATION_CONSTANTS.OPTIMAL_SEND_TIMES.AFTERNOON;
  } else if (notificationType === COMMUNICATION_CONSTANTS.NOTIFICATION_TYPES.INVOICE_ISSUED) {
    preferredTime = COMMUNICATION_CONSTANTS.OPTIMAL_SEND_TIMES.MIDDAY;
  }

  return {
    isValid: true,
    sendImmediate: true,
    scheduledTime: now,
    preferredTime,
    reason: 'وقت مناسب',
    isQuietHours: false,
  };
}

// ========================================
// MESSAGE VALIDATION
// ========================================

/**
 * التحقق من صحة محتوى الرسالة حسب القناة
 */
function validateMessageContent(message, channel) {
  if (!message || !channel) {
    return { isValid: false, errors: ['الرسالة والقناة مطلوبان'] };
  }

  const errors = [];
  const warnings = [];

  switch (channel) {
    case COMMUNICATION_CONSTANTS.CHANNEL_TYPES.SMS: {
      const smsText = message.bodyAr || message.body || '';
      if (!smsText) {
        errors.push('نص SMS مطلوب');
      } else if (smsText.length > COMMUNICATION_CONSTANTS.SMS_MAX_LENGTH) {
        warnings.push(
          `طول SMS (${smsText.length}) يتجاوز ${COMMUNICATION_CONSTANTS.SMS_MAX_LENGTH} حرف - سيُقسَّم`
        );
      }
      break;
    }

    case COMMUNICATION_CONSTANTS.CHANNEL_TYPES.PUSH: {
      const title = message.titleAr || message.title || '';
      const body = message.bodyAr || message.body || '';

      if (!title) errors.push('عنوان Push مطلوب');
      if (!body) errors.push('محتوى Push مطلوب');
      if (title.length > COMMUNICATION_CONSTANTS.PUSH_TITLE_MAX) {
        warnings.push(
          `عنوان Push طويل (${title.length}/${COMMUNICATION_CONSTANTS.PUSH_TITLE_MAX})`
        );
      }
      if (body.length > COMMUNICATION_CONSTANTS.PUSH_BODY_MAX) {
        warnings.push(`محتوى Push طويل (${body.length}/${COMMUNICATION_CONSTANTS.PUSH_BODY_MAX})`);
      }
      break;
    }

    case COMMUNICATION_CONSTANTS.CHANNEL_TYPES.EMAIL: {
      const subject = message.titleAr || message.subject || '';
      const emailBody = message.bodyAr || message.body || '';

      if (!subject) errors.push('موضوع البريد مطلوب');
      if (!emailBody) errors.push('محتوى البريد مطلوب');
      if (subject.length > COMMUNICATION_CONSTANTS.EMAIL_SUBJECT_MAX) {
        warnings.push(`موضوع البريد طويل`);
      }
      break;
    }

    case COMMUNICATION_CONSTANTS.CHANNEL_TYPES.WHATSAPP: {
      const waText = message.bodyAr || message.body || '';
      if (!waText) errors.push('نص WhatsApp مطلوب');
      break;
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    channel,
  };
}

// ========================================
// BATCH NOTIFICATIONS
// ========================================

/**
 * بناء قائمة إشعارات مجمّعة لأولياء الأمور
 */
function buildBatchNotifications(recipients, notificationTemplate) {
  if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
    return { isValid: false, notifications: [], total: 0 };
  }

  if (!notificationTemplate || !notificationTemplate.type) {
    return { isValid: false, notifications: [], total: 0, error: 'قالب الإشعار مطلوب' };
  }

  const notifications = recipients.map(recipient => ({
    recipientId: recipient.id,
    recipientType: recipient.type || COMMUNICATION_CONSTANTS.RECIPIENT_TYPES.GUARDIAN,
    channels: determineOptimalChannels(
      notificationTemplate.priority || COMMUNICATION_CONSTANTS.PRIORITY_LEVELS.MEDIUM,
      recipient.type || COMMUNICATION_CONSTANTS.RECIPIENT_TYPES.GUARDIAN,
      recipient.preferences
    ).channels,
    notification: {
      ...notificationTemplate,
      data: {
        ...notificationTemplate.data,
        recipientId: recipient.id,
        recipientName: recipient.name,
      },
    },
    status: COMMUNICATION_CONSTANTS.MESSAGE_STATUS.PENDING,
    createdAt: new Date().toISOString(),
  }));

  return {
    isValid: true,
    notifications,
    total: notifications.length,
    batchId: `BATCH-${Date.now()}`,
  };
}

// ========================================
// COMMUNICATION STATS
// ========================================

/**
 * حساب إحصائيات التواصل لفترة زمنية
 */
function calculateCommunicationStats(messages, filters) {
  if (!messages || !Array.isArray(messages)) {
    return {
      total: 0,
      sent: 0,
      delivered: 0,
      read: 0,
      failed: 0,
      deliveryRate: 0,
      readRate: 0,
      byChannel: {},
      byType: {},
    };
  }

  let filtered = messages;

  if (filters) {
    if (filters.channel) {
      filtered = filtered.filter(m => m.channel === filters.channel);
    }
    if (filters.type) {
      filtered = filtered.filter(m => m.type === filters.type);
    }
    if (filters.dateFrom) {
      filtered = filtered.filter(m => m.createdAt >= filters.dateFrom);
    }
    if (filters.dateTo) {
      filtered = filtered.filter(m => m.createdAt <= filters.dateTo);
    }
  }

  const total = filtered.length;
  const sent = filtered.filter(
    m =>
      m.status !== COMMUNICATION_CONSTANTS.MESSAGE_STATUS.PENDING &&
      m.status !== COMMUNICATION_CONSTANTS.MESSAGE_STATUS.CANCELLED
  ).length;
  const delivered = filtered.filter(
    m =>
      m.status === COMMUNICATION_CONSTANTS.MESSAGE_STATUS.DELIVERED ||
      m.status === COMMUNICATION_CONSTANTS.MESSAGE_STATUS.READ
  ).length;
  const read = filtered.filter(
    m => m.status === COMMUNICATION_CONSTANTS.MESSAGE_STATUS.READ
  ).length;
  const failed = filtered.filter(
    m => m.status === COMMUNICATION_CONSTANTS.MESSAGE_STATUS.FAILED
  ).length;

  // تجميع حسب القناة
  const byChannel = {};
  filtered.forEach(m => {
    const ch = m.channel || 'unknown';
    if (!byChannel[ch]) byChannel[ch] = { total: 0, delivered: 0, failed: 0 };
    byChannel[ch].total++;
    if (
      m.status === COMMUNICATION_CONSTANTS.MESSAGE_STATUS.DELIVERED ||
      m.status === COMMUNICATION_CONSTANTS.MESSAGE_STATUS.READ
    )
      byChannel[ch].delivered++;
    if (m.status === COMMUNICATION_CONSTANTS.MESSAGE_STATUS.FAILED) byChannel[ch].failed++;
  });

  // تجميع حسب النوع
  const byType = {};
  filtered.forEach(m => {
    const t = m.type || 'unknown';
    if (!byType[t]) byType[t] = 0;
    byType[t]++;
  });

  return {
    total,
    sent,
    delivered,
    read,
    failed,
    deliveryRate: sent > 0 ? Math.round((delivered / sent) * 100) : 0,
    readRate: delivered > 0 ? Math.round((read / delivered) * 100) : 0,
    failureRate: sent > 0 ? Math.round((failed / sent) * 100) : 0,
    byChannel,
    byType,
  };
}

// ========================================
// REMINDER SCHEDULING
// ========================================

/**
 * حساب أوقات التذكير للمواعيد
 */
function calculateReminderSchedule(appointmentDateTime, timezone) {
  if (!appointmentDateTime) {
    return { isValid: false, reminders: [] };
  }

  // نقبل صيغ ISO أو 'YYYY-MM-DD HH:MM'
  let aptTime;
  try {
    aptTime = new Date(appointmentDateTime);
    if (isNaN(aptTime.getTime())) {
      return { isValid: false, reminders: [] };
    }
  } catch {
    return { isValid: false, reminders: [] };
  }

  const tz = timezone || 3; // UTC+3 الرياض
  const reminders = [];

  // تذكير قبل 24 ساعة
  const reminder24h = new Date(aptTime.getTime() - 24 * 60 * 60 * 1000);
  reminders.push({
    type: '24h',
    scheduledAt: reminder24h.toISOString(),
    hoursBeforeAppointment: 24,
    channel: COMMUNICATION_CONSTANTS.CHANNEL_TYPES.SMS,
    priority: COMMUNICATION_CONSTANTS.PRIORITY_LEVELS.MEDIUM,
  });

  // تذكير قبل 2 ساعة
  const reminder2h = new Date(aptTime.getTime() - 2 * 60 * 60 * 1000);
  reminders.push({
    type: '2h',
    scheduledAt: reminder2h.toISOString(),
    hoursBeforeAppointment: 2,
    channel: COMMUNICATION_CONSTANTS.CHANNEL_TYPES.PUSH,
    priority: COMMUNICATION_CONSTANTS.PRIORITY_LEVELS.MEDIUM,
  });

  // تذكير قبل 1 ساعة
  const reminder1h = new Date(aptTime.getTime() - 60 * 60 * 1000);
  reminders.push({
    type: '1h',
    scheduledAt: reminder1h.toISOString(),
    hoursBeforeAppointment: 1,
    channel: COMMUNICATION_CONSTANTS.CHANNEL_TYPES.PUSH,
    priority: COMMUNICATION_CONSTANTS.PRIORITY_LEVELS.HIGH,
  });

  return {
    isValid: true,
    appointmentDateTime,
    reminders,
    totalReminders: reminders.length,
    timezone: tz,
  };
}

/**
 * حساب تذكيرات انتهاء الوثائق
 */
function calculateDocumentExpiryReminders(expiryDate, currentDate) {
  if (!expiryDate) {
    return { isValid: false, reminders: [] };
  }

  const expiry = new Date(expiryDate);
  const now = new Date(currentDate || new Date().toISOString().split('T')[0]);

  if (isNaN(expiry.getTime())) {
    return { isValid: false, reminders: [] };
  }

  const daysUntilExpiry = Math.ceil((expiry - now) / (24 * 60 * 60 * 1000));

  if (daysUntilExpiry < 0) {
    return {
      isValid: true,
      isExpired: true,
      daysExpired: Math.abs(daysUntilExpiry),
      reminders: [],
      requiresImmediateAction: true,
    };
  }

  const reminders = [];

  // تذكير قبل 90 يوم (للهيئة SCFHS)
  if (daysUntilExpiry <= 90) {
    reminders.push({
      type: '90_days',
      daysLeft: daysUntilExpiry,
      priority: COMMUNICATION_CONSTANTS.PRIORITY_LEVELS.LOW,
      channel: COMMUNICATION_CONSTANTS.CHANNEL_TYPES.EMAIL,
    });
  }

  // تذكير قبل 30 يوم
  if (daysUntilExpiry <= 30) {
    reminders.push({
      type: '30_days',
      daysLeft: daysUntilExpiry,
      priority: COMMUNICATION_CONSTANTS.PRIORITY_LEVELS.MEDIUM,
      channel: COMMUNICATION_CONSTANTS.CHANNEL_TYPES.PUSH,
    });
  }

  // تذكير قبل 7 أيام
  if (daysUntilExpiry <= 7) {
    reminders.push({
      type: '7_days',
      daysLeft: daysUntilExpiry,
      priority: COMMUNICATION_CONSTANTS.PRIORITY_LEVELS.HIGH,
      channel: COMMUNICATION_CONSTANTS.CHANNEL_TYPES.SMS,
    });
  }

  // حرج - قبل 3 أيام
  if (daysUntilExpiry <= 3) {
    reminders.push({
      type: 'critical',
      daysLeft: daysUntilExpiry,
      priority: COMMUNICATION_CONSTANTS.PRIORITY_LEVELS.CRITICAL,
      channel: COMMUNICATION_CONSTANTS.CHANNEL_TYPES.SMS,
    });
  }

  return {
    isValid: true,
    isExpired: false,
    daysUntilExpiry,
    reminders,
    requiresImmediateAction: daysUntilExpiry <= 3,
    urgencyLevel:
      daysUntilExpiry <= 3
        ? 'critical'
        : daysUntilExpiry <= 7
          ? 'high'
          : daysUntilExpiry <= 30
            ? 'medium'
            : 'low',
  };
}

// ========================================
// SMS FORMATTING
// ========================================

/**
 * تنسيق رسالة SMS وتقسيمها إذا لزم
 */
function formatSmsMessage(text, options) {
  if (!text || typeof text !== 'string') {
    return { isValid: false, parts: [], totalChars: 0 };
  }

  const opts = options || {};
  const maxLength = opts.maxLength || COMMUNICATION_CONSTANTS.SMS_MAX_LENGTH;
  const addSignature = opts.addSignature !== false;
  const signature = opts.signature || ' - مراكز الأوائل';

  let finalText = text.trim();
  if (addSignature) {
    finalText = finalText + signature;
  }

  const totalChars = finalText.length;
  const parts = [];

  if (totalChars <= maxLength) {
    parts.push(finalText);
  } else {
    // تقسيم الرسالة
    let remaining = finalText;
    while (remaining.length > 0) {
      parts.push(remaining.substring(0, maxLength));
      remaining = remaining.substring(maxLength);
    }
  }

  return {
    isValid: true,
    originalText: text,
    formattedText: finalText,
    totalChars,
    parts,
    partsCount: parts.length,
    exceedsLimit: totalChars > maxLength,
  };
}

// ========================================
// NOTIFICATION DEDUPLICATION
// ========================================

/**
 * كشف الإشعارات المكررة (للتحقق من عدم الإرسال المزدوج)
 */
function detectDuplicateNotifications(newNotification, recentNotifications, windowMinutes) {
  if (!newNotification || !recentNotifications || !Array.isArray(recentNotifications)) {
    return { isDuplicate: false };
  }

  const windowMs = (windowMinutes || 60) * 60 * 1000;
  const now = Date.now();

  const duplicate = recentNotifications.find(existing => {
    if (existing.type !== newNotification.type) return false;
    if (existing.recipientId !== newNotification.recipientId) return false;

    // التحقق من النافذة الزمنية
    const existingTime = new Date(existing.sentAt || existing.createdAt).getTime();
    if (now - existingTime > windowMs) return false;

    // التحقق من تشابه البيانات
    if (newNotification.data && existing.data) {
      const isSameAppointment =
        newNotification.data.appointmentDate === existing.data.appointmentDate &&
        newNotification.data.beneficiaryName === existing.data.beneficiaryName;
      return isSameAppointment;
    }

    return true;
  });

  return {
    isDuplicate: !!duplicate,
    duplicateId: duplicate?.id || null,
    duplicateSentAt: duplicate?.sentAt || duplicate?.createdAt || null,
  };
}

// ========================================
// CONTACT PREFERENCES
// ========================================

/**
 * التحقق من تفضيلات التواصل للمستلم
 */
function validateContactPreferences(preferences) {
  if (!preferences) {
    return {
      isValid: true,
      enabledChannels: Object.values(COMMUNICATION_CONSTANTS.CHANNEL_TYPES),
      quietHoursStart: '22:00',
      quietHoursEnd: '08:00',
      language: 'ar',
    };
  }

  const errors = [];
  const enabledChannels = [];

  // التحقق من القنوات المفعّلة
  const allChannels = Object.values(COMMUNICATION_CONSTANTS.CHANNEL_TYPES);
  allChannels.forEach(ch => {
    if (!preferences.disabledChannels || !preferences.disabledChannels.includes(ch)) {
      enabledChannels.push(ch);
    }
  });

  // التحقق من ساعات الهدوء
  let quietHoursStart = '22:00';
  let quietHoursEnd = '08:00';

  if (preferences.quietHoursStart) {
    if (!/^\d{2}:\d{2}$/.test(preferences.quietHoursStart)) {
      errors.push('تنسيق ساعة الهدوء غير صالح');
    } else {
      quietHoursStart = preferences.quietHoursStart;
    }
  }
  if (preferences.quietHoursEnd) {
    if (!/^\d{2}:\d{2}$/.test(preferences.quietHoursEnd)) {
      errors.push('تنسيق نهاية ساعة الهدوء غير صالح');
    } else {
      quietHoursEnd = preferences.quietHoursEnd;
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    enabledChannels,
    quietHoursStart,
    quietHoursEnd,
    language: preferences.language || 'ar',
    smsNumber: preferences.smsNumber || null,
    email: preferences.email || null,
    pushToken: preferences.pushToken || null,
  };
}

// ========================================
// EXPORT
// ========================================
module.exports = {
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
};
