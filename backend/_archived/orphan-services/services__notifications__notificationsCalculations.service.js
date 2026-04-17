/**
 * Notifications Calculations Service
 * خدمة حسابات الإشعارات والتنبيهات
 * Notification Priority + Scheduling + Delivery Analytics
 * Pure Business Logic - No DB, No Side Effects
 * نظام AlAwael ERP - مراكز تأهيل ذوي الإعاقة
 */

'use strict';

// ========================================
// CONSTANTS
// ========================================
const NOTIFICATION_CONSTANTS = {
  TYPES: {
    APPOINTMENT_REMINDER: 'appointment_reminder',
    APPOINTMENT_CONFIRMED: 'appointment_confirmed',
    APPOINTMENT_CANCELLED: 'appointment_cancelled',
    PAYMENT_DUE: 'payment_due',
    PAYMENT_RECEIVED: 'payment_received',
    DOCUMENT_EXPIRY: 'document_expiry',
    WAITLIST_AVAILABLE: 'waitlist_available',
    SESSION_COMPLETED: 'session_completed',
    GOAL_ACHIEVED: 'goal_achieved',
    STAFF_ALERT: 'staff_alert',
    SYSTEM_ALERT: 'system_alert',
    TRANSPORT_UPDATE: 'transport_update',
    REPORT_READY: 'report_ready',
    CONTRACT_EXPIRY: 'contract_expiry',
  },
  CHANNELS: {
    SMS: 'sms',
    EMAIL: 'email',
    PUSH: 'push',
    WHATSAPP: 'whatsapp',
    IN_APP: 'in_app',
  },
  PRIORITY: {
    URGENT: 'urgent', // 1 - فوري
    HIGH: 'high', // 2
    MEDIUM: 'medium', // 3
    LOW: 'low', // 4
    INFO: 'info', // 5
  },
  STATUS: {
    PENDING: 'pending',
    QUEUED: 'queued',
    SENT: 'sent',
    DELIVERED: 'delivered',
    READ: 'read',
    FAILED: 'failed',
    CANCELLED: 'cancelled',
  },
  TIMING: {
    // تذكيرات المواعيد
    APPOINTMENT_REMINDER_HOURS: [24, 2], // 24 ساعة و2 ساعة قبل
    // تجديد الوثائق
    DOCUMENT_EXPIRY_DAYS: [90, 60, 30, 14, 7, 1],
    // الدفعات المتأخرة
    PAYMENT_OVERDUE_DAYS: [1, 3, 7, 14, 30],
    // قائمة الانتظار
    WAITLIST_OFFER_EXPIRY_HOURS: 4,
    // اشتراك العقود
    CONTRACT_EXPIRY_DAYS: [90, 30, 14, 7],
  },
  RATE_LIMITS: {
    SMS_PER_USER_PER_DAY: 5,
    EMAIL_PER_USER_PER_DAY: 10,
    PUSH_PER_USER_PER_HOUR: 3,
    WHATSAPP_PER_USER_PER_DAY: 10,
  },
};

// ========================================
// NOTIFICATION PRIORITY CALCULATION
// ========================================

/**
 * حساب أولوية الإشعار وقناته المناسبة
 * @param {object} notificationData - {type, urgency, recipient, context}
 * @returns {object} - الأولوية والقنوات والتوقيت
 */
function calculateNotificationPriority(notificationData) {
  if (!notificationData || !notificationData.type) {
    return {
      priority: NOTIFICATION_CONSTANTS.PRIORITY.INFO,
      channels: [NOTIFICATION_CONSTANTS.CHANNELS.IN_APP],
      score: 0,
    };
  }

  const { type, urgency, recipient, context } = notificationData;

  // نقاط الأولوية حسب النوع
  const typeScores = {
    [NOTIFICATION_CONSTANTS.TYPES.SYSTEM_ALERT]: 100,
    [NOTIFICATION_CONSTANTS.TYPES.APPOINTMENT_CANCELLED]: 90,
    [NOTIFICATION_CONSTANTS.TYPES.WAITLIST_AVAILABLE]: 85,
    [NOTIFICATION_CONSTANTS.TYPES.PAYMENT_DUE]: 70,
    [NOTIFICATION_CONSTANTS.TYPES.DOCUMENT_EXPIRY]: 65,
    [NOTIFICATION_CONSTANTS.TYPES.APPOINTMENT_REMINDER]: 60,
    [NOTIFICATION_CONSTANTS.TYPES.APPOINTMENT_CONFIRMED]: 50,
    [NOTIFICATION_CONSTANTS.TYPES.TRANSPORT_UPDATE]: 75,
    [NOTIFICATION_CONSTANTS.TYPES.CONTRACT_EXPIRY]: 60,
    [NOTIFICATION_CONSTANTS.TYPES.STAFF_ALERT]: 80,
    [NOTIFICATION_CONSTANTS.TYPES.SESSION_COMPLETED]: 30,
    [NOTIFICATION_CONSTANTS.TYPES.GOAL_ACHIEVED]: 40,
    [NOTIFICATION_CONSTANTS.TYPES.PAYMENT_RECEIVED]: 45,
    [NOTIFICATION_CONSTANTS.TYPES.REPORT_READY]: 20,
  };

  let score = typeScores[type] || 50;

  // تعديل حسب الإلحاح المحدد
  if (urgency === 'critical') score = Math.min(100, score + 20);
  else if (urgency === 'low') score = Math.max(0, score - 20);

  // تعديل حسب السياق
  if (context?.daysUntilExpiry !== undefined) {
    if (context.daysUntilExpiry <= 1) score = Math.min(100, score + 30);
    else if (context.daysUntilExpiry <= 7) score = Math.min(100, score + 15);
  }

  if (context?.overdueDays > 30) score = Math.min(100, score + 20);

  // تحديد الأولوية من النقاط
  let priority;
  if (score >= 85) priority = NOTIFICATION_CONSTANTS.PRIORITY.URGENT;
  else if (score >= 65) priority = NOTIFICATION_CONSTANTS.PRIORITY.HIGH;
  else if (score >= 40) priority = NOTIFICATION_CONSTANTS.PRIORITY.MEDIUM;
  else if (score >= 20) priority = NOTIFICATION_CONSTANTS.PRIORITY.LOW;
  else priority = NOTIFICATION_CONSTANTS.PRIORITY.INFO;

  // تحديد القنوات المناسبة
  const channels = _selectChannels(type, priority, recipient);

  return {
    priority,
    score,
    channels,
    estimatedDeliveryMinutes: _estimateDelivery(priority),
    requiresAcknowledgment: score >= 85,
  };
}

function _selectChannels(type, priority, recipient) {
  const channels = [NOTIFICATION_CONSTANTS.CHANNELS.IN_APP];

  // الأولوية العاجلة: SMS + Push + WhatsApp
  if (priority === NOTIFICATION_CONSTANTS.PRIORITY.URGENT) {
    channels.push(NOTIFICATION_CONSTANTS.CHANNELS.SMS);
    channels.push(NOTIFICATION_CONSTANTS.CHANNELS.PUSH);
    if (recipient?.whatsappEnabled) {
      channels.push(NOTIFICATION_CONSTANTS.CHANNELS.WHATSAPP);
    }
  }
  // الأولوية العالية: Push + Email
  else if (priority === NOTIFICATION_CONSTANTS.PRIORITY.HIGH) {
    channels.push(NOTIFICATION_CONSTANTS.CHANNELS.PUSH);
    channels.push(NOTIFICATION_CONSTANTS.CHANNELS.EMAIL);
  }
  // المتوسطة: Push
  else if (priority === NOTIFICATION_CONSTANTS.PRIORITY.MEDIUM) {
    channels.push(NOTIFICATION_CONSTANTS.CHANNELS.PUSH);
  }

  // تذكير المواعيد دائماً عبر SMS
  if (type === NOTIFICATION_CONSTANTS.TYPES.APPOINTMENT_REMINDER) {
    if (!channels.includes(NOTIFICATION_CONSTANTS.CHANNELS.SMS)) {
      channels.push(NOTIFICATION_CONSTANTS.CHANNELS.SMS);
    }
  }

  return [...new Set(channels)];
}

function _estimateDelivery(priority) {
  const times = { urgent: 1, high: 5, medium: 15, low: 60, info: 120 };
  return times[priority] || 15;
}

// ========================================
// NOTIFICATION SCHEDULING
// ========================================

/**
 * جدولة إشعارات تذكير المواعيد
 * @param {object} appointment - {id, date, time, beneficiaryId}
 * @returns {Array} - قائمة الإشعارات المجدولة
 */
function scheduleAppointmentReminders(appointment) {
  if (!appointment || !appointment.date || !appointment.time) {
    return [];
  }

  const appointmentDateTime = new Date(`${appointment.date}T${appointment.time}`);
  const now = new Date();
  const scheduled = [];

  for (const hoursBefor of NOTIFICATION_CONSTANTS.TIMING.APPOINTMENT_REMINDER_HOURS) {
    const sendAt = new Date(appointmentDateTime.getTime() - hoursBefor * 60 * 60 * 1000);

    if (sendAt > now) {
      scheduled.push({
        type: NOTIFICATION_CONSTANTS.TYPES.APPOINTMENT_REMINDER,
        recipientId: appointment.beneficiaryId,
        sendAt: sendAt.toISOString(),
        hoursBeforeAppointment: hoursBefor,
        appointmentId: appointment.id,
        channels: [NOTIFICATION_CONSTANTS.CHANNELS.SMS, NOTIFICATION_CONSTANTS.CHANNELS.PUSH],
        priority:
          hoursBefor <= 2
            ? NOTIFICATION_CONSTANTS.PRIORITY.HIGH
            : NOTIFICATION_CONSTANTS.PRIORITY.MEDIUM,
      });
    }
  }

  return scheduled;
}

/**
 * جدولة إشعارات انتهاء صلاحية الوثائق
 * @param {object} document - {id, type, expiryDate, ownerId}
 * @returns {Array} - قائمة الإشعارات المجدولة
 */
function scheduleDocumentExpiryNotifications(document) {
  if (!document || !document.expiryDate) {
    return [];
  }

  const expiryDate = new Date(document.expiryDate);
  const now = new Date();
  const scheduled = [];

  for (const daysBeforeExpiry of NOTIFICATION_CONSTANTS.TIMING.DOCUMENT_EXPIRY_DAYS) {
    const sendAt = new Date(expiryDate.getTime() - daysBeforeExpiry * 24 * 60 * 60 * 1000);

    if (sendAt > now) {
      const priority =
        daysBeforeExpiry <= 7
          ? NOTIFICATION_CONSTANTS.PRIORITY.URGENT
          : daysBeforeExpiry <= 30
            ? NOTIFICATION_CONSTANTS.PRIORITY.HIGH
            : NOTIFICATION_CONSTANTS.PRIORITY.MEDIUM;

      scheduled.push({
        type: NOTIFICATION_CONSTANTS.TYPES.DOCUMENT_EXPIRY,
        recipientId: document.ownerId,
        sendAt: sendAt.toISOString(),
        daysBeforeExpiry,
        documentId: document.id,
        documentType: document.type,
        priority,
        channels:
          daysBeforeExpiry <= 7
            ? [
                NOTIFICATION_CONSTANTS.CHANNELS.SMS,
                NOTIFICATION_CONSTANTS.CHANNELS.EMAIL,
                NOTIFICATION_CONSTANTS.CHANNELS.PUSH,
              ]
            : [NOTIFICATION_CONSTANTS.CHANNELS.EMAIL, NOTIFICATION_CONSTANTS.CHANNELS.PUSH],
      });
    }
  }

  return scheduled;
}

// ========================================
// RATE LIMITING
// ========================================

/**
 * التحقق من تجاوز حد الإشعارات للمستخدم
 * @param {string} userId - معرف المستخدم
 * @param {string} channel - قناة الإشعار
 * @param {Array} sentNotifications - الإشعارات المرسلة مؤخراً
 * @returns {object} - هل يمكن الإرسال والسبب
 */
function checkNotificationRateLimit(userId, channel, sentNotifications) {
  if (!userId || !channel || !Array.isArray(sentNotifications)) {
    return {
      allowed: true,
      remaining:
        NOTIFICATION_CONSTANTS.RATE_LIMITS[`${channel.toUpperCase()}_PER_USER_PER_DAY`] || 10,
    };
  }

  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  // فلترة إشعارات المستخدم عبر هذه القناة
  const userChannelNotifications = sentNotifications.filter(
    n => n.userId === userId && n.channel === channel
  );

  // الحد اليومي
  const dailyKey = `${channel.toUpperCase()}_PER_USER_PER_DAY`;
  const dailyLimit = NOTIFICATION_CONSTANTS.RATE_LIMITS[dailyKey];

  if (dailyLimit) {
    const sentToday = userChannelNotifications.filter(n => new Date(n.sentAt) >= oneDayAgo).length;

    if (sentToday >= dailyLimit) {
      return {
        allowed: false,
        reason: `تجاوز الحد اليومي: ${sentToday}/${dailyLimit}`,
        remaining: 0,
        resetAt: new Date(oneDayAgo.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      };
    }

    // الحد بالساعة للـ Push
    if (channel === NOTIFICATION_CONSTANTS.CHANNELS.PUSH) {
      const hourlyLimit = NOTIFICATION_CONSTANTS.RATE_LIMITS.PUSH_PER_USER_PER_HOUR;
      const sentThisHour = userChannelNotifications.filter(
        n => new Date(n.sentAt) >= oneHourAgo
      ).length;

      if (sentThisHour >= hourlyLimit) {
        return {
          allowed: false,
          reason: `تجاوز الحد بالساعة: ${sentThisHour}/${hourlyLimit}`,
          remaining: 0,
          resetAt: new Date(oneHourAgo.getTime() + 60 * 60 * 1000).toISOString(),
        };
      }
    }

    return {
      allowed: true,
      remaining:
        dailyLimit - userChannelNotifications.filter(n => new Date(n.sentAt) >= oneDayAgo).length,
    };
  }

  return { allowed: true, remaining: 999 };
}

// ========================================
// NOTIFICATION ANALYTICS
// ========================================

/**
 * تحليل معدلات التسليم والفتح للإشعارات
 * @param {Array} notifications - مصفوفة الإشعارات
 * @returns {object} - تحليل الأداء
 */
function analyzeNotificationDelivery(notifications) {
  if (!Array.isArray(notifications) || notifications.length === 0) {
    return {
      total: 0,
      deliveryRate: 0,
      readRate: 0,
      failureRate: 0,
      byChannel: {},
      byType: {},
    };
  }

  const total = notifications.length;
  const delivered = notifications.filter(
    n => n.status === 'delivered' || n.status === 'read'
  ).length;
  const read = notifications.filter(n => n.status === 'read').length;
  const failed = notifications.filter(n => n.status === 'failed').length;

  const deliveryRate = Math.round((delivered / total) * 100);
  const readRate = Math.round((read / total) * 100);
  const failureRate = Math.round((failed / total) * 100);

  // تحليل حسب القناة
  const byChannel = {};
  for (const channel of Object.values(NOTIFICATION_CONSTANTS.CHANNELS)) {
    const channelNotifs = notifications.filter(n => n.channel === channel);
    if (channelNotifs.length > 0) {
      const channelDelivered = channelNotifs.filter(
        n => n.status === 'delivered' || n.status === 'read'
      ).length;
      byChannel[channel] = {
        total: channelNotifs.length,
        delivered: channelDelivered,
        deliveryRate: Math.round((channelDelivered / channelNotifs.length) * 100),
        failed: channelNotifs.filter(n => n.status === 'failed').length,
      };
    }
  }

  // تحليل حسب النوع
  const byType = {};
  for (const notif of notifications) {
    if (notif.type) {
      if (!byType[notif.type]) {
        byType[notif.type] = { total: 0, delivered: 0, read: 0 };
      }
      byType[notif.type].total++;
      if (notif.status === 'delivered' || notif.status === 'read') {
        byType[notif.type].delivered++;
      }
      if (notif.status === 'read') {
        byType[notif.type].read++;
      }
    }
  }

  // أفضل وأسوأ قناة
  const channelEntries = Object.entries(byChannel);
  const bestChannel = channelEntries.sort((a, b) => b[1].deliveryRate - a[1].deliveryRate)[0];
  const worstChannel = channelEntries.sort((a, b) => a[1].deliveryRate - b[1].deliveryRate)[0];

  return {
    total,
    delivered,
    read,
    failed,
    deliveryRate,
    readRate,
    failureRate,
    byChannel,
    byType,
    bestChannel: bestChannel
      ? { channel: bestChannel[0], rate: bestChannel[1].deliveryRate }
      : null,
    worstChannel: worstChannel
      ? { channel: worstChannel[0], rate: worstChannel[1].deliveryRate }
      : null,
  };
}

/**
 * حساب أفضل وقت لإرسال الإشعارات بناءً على بيانات التفاعل
 * @param {Array} notificationHistory - سجل الإشعارات مع أوقات الفتح
 * @returns {object} - أفضل أوقات الإرسال
 */
function calculateOptimalSendTime(notificationHistory) {
  if (!Array.isArray(notificationHistory) || notificationHistory.length === 0) {
    return {
      bestHour: 10, // الافتراضي: 10 صباحاً
      bestDay: 'sunday',
      hourlyEngagement: {},
    };
  }

  const hourlyRead = {};
  const dailyRead = {};
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

  for (const notif of notificationHistory) {
    if (notif.readAt) {
      const readDate = new Date(notif.readAt);
      const hour = readDate.getHours();
      const day = dayNames[readDate.getDay()];

      hourlyRead[hour] = (hourlyRead[hour] || 0) + 1;
      dailyRead[day] = (dailyRead[day] || 0) + 1;
    }
  }

  // أكثر ساعة تفاعلاً
  const bestHourEntry = Object.entries(hourlyRead).sort((a, b) => b[1] - a[1])[0];
  const bestHour = bestHourEntry ? parseInt(bestHourEntry[0]) : 10;

  // أكثر يوم تفاعلاً
  const bestDayEntry = Object.entries(dailyRead).sort((a, b) => b[1] - a[1])[0];
  const bestDay = bestDayEntry ? bestDayEntry[0] : 'sunday';

  // توزيع التفاعل بالساعة (0-100)
  const maxReads = Math.max(...Object.values(hourlyRead), 1);
  const hourlyEngagement = {};
  for (const [hour, reads] of Object.entries(hourlyRead)) {
    hourlyEngagement[hour] = Math.round((reads / maxReads) * 100);
  }

  return {
    bestHour,
    bestDay,
    hourlyEngagement,
    dailyEngagement: dailyRead,
    totalAnalyzed: notificationHistory.length,
    readCount: Object.values(hourlyRead).reduce((a, b) => a + b, 0),
  };
}

// ========================================
// BATCH NOTIFICATION PROCESSING
// ========================================

/**
 * معالجة دفعة من الإشعارات وتحديد أولوياتها
 * @param {Array} pendingNotifications - الإشعارات المعلقة
 * @returns {object} - الإشعارات مرتبة ومجمعة
 */
function processBatchNotifications(pendingNotifications) {
  if (!Array.isArray(pendingNotifications) || pendingNotifications.length === 0) {
    return { total: 0, batches: [], skipped: 0 };
  }

  const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3, info: 4 };

  // ترتيب حسب الأولوية والوقت
  const sorted = pendingNotifications
    .filter(n => n.status === 'pending' || n.status === 'queued')
    .sort((a, b) => {
      const pa = priorityOrder[a.priority] ?? 4;
      const pb = priorityOrder[b.priority] ?? 4;
      if (pa !== pb) return pa - pb;
      return new Date(a.scheduledAt || 0) - new Date(b.scheduledAt || 0);
    });

  const skipped = pendingNotifications.length - sorted.length;

  // تجميع بالقناة لإرسال دفعي
  const batches = [];
  const byChannel = {};

  for (const notif of sorted) {
    const channel = notif.channel || NOTIFICATION_CONSTANTS.CHANNELS.IN_APP;
    if (!byChannel[channel]) byChannel[channel] = [];
    byChannel[channel].push(notif);
  }

  for (const [channel, notifs] of Object.entries(byChannel)) {
    batches.push({
      channel,
      count: notifs.length,
      notifications: notifs,
      urgent: notifs.filter(n => n.priority === 'urgent').length,
      estimatedProcessingMinutes: Math.ceil(notifs.length / 100), // 100 إشعار في الدقيقة
    });
  }

  // ترتيب الدفعات: الأعلى أولوية أولاً
  batches.sort((a, b) => b.urgent - a.urgent);

  return {
    total: sorted.length,
    batches,
    skipped,
    byPriority: {
      urgent: sorted.filter(n => n.priority === 'urgent').length,
      high: sorted.filter(n => n.priority === 'high').length,
      medium: sorted.filter(n => n.priority === 'medium').length,
      low: sorted.filter(n => n.priority === 'low').length,
      info: sorted.filter(n => n.priority === 'info').length,
    },
  };
}

// ========================================
// NOTIFICATION TEMPLATES
// ========================================

/**
 * بناء محتوى الإشعار من القالب والبيانات
 * @param {string} type - نوع الإشعار
 * @param {object} data - البيانات الديناميكية
 * @param {string} language - اللغة (ar/en)
 * @returns {object} - العنوان والرسالة
 */
function buildNotificationContent(type, data, language = 'ar') {
  if (!type) {
    return { title: '', body: '', isValid: false };
  }

  const templates = {
    ar: {
      [NOTIFICATION_CONSTANTS.TYPES.APPOINTMENT_REMINDER]: {
        title: 'تذكير بموعدك',
        body: `تذكير: لديك موعد ${data?.serviceName || 'علاجي'} غداً الساعة ${data?.time || ''}`,
      },
      [NOTIFICATION_CONSTANTS.TYPES.APPOINTMENT_CONFIRMED]: {
        title: 'تأكيد الموعد',
        body: `تم تأكيد موعدك بتاريخ ${data?.date || ''} الساعة ${data?.time || ''}`,
      },
      [NOTIFICATION_CONSTANTS.TYPES.APPOINTMENT_CANCELLED]: {
        title: 'إلغاء الموعد',
        body: `تم إلغاء موعدك بتاريخ ${data?.date || ''}. سيتم التواصل معك لإعادة الجدولة`,
      },
      [NOTIFICATION_CONSTANTS.TYPES.PAYMENT_DUE]: {
        title: 'فاتورة مستحقة',
        body: `لديك فاتورة مستحقة بمبلغ ${data?.amount || ''} ريال. يُرجى السداد قبل ${data?.dueDate || ''}`,
      },
      [NOTIFICATION_CONSTANTS.TYPES.PAYMENT_RECEIVED]: {
        title: 'تم استلام الدفعة',
        body: `تم استلام دفعتك بمبلغ ${data?.amount || ''} ريال بنجاح`,
      },
      [NOTIFICATION_CONSTANTS.TYPES.DOCUMENT_EXPIRY]: {
        title: 'انتهاء صلاحية وثيقة',
        body: `وثيقة ${data?.documentName || ''} ستنتهي صلاحيتها خلال ${data?.daysLeft || ''} يوم`,
      },
      [NOTIFICATION_CONSTANTS.TYPES.WAITLIST_AVAILABLE]: {
        title: 'موعد متاح من قائمة الانتظار',
        body: `يوجد موعد متاح لـ ${data?.serviceName || ''}. العرض ينتهي خلال 4 ساعات`,
      },
      [NOTIFICATION_CONSTANTS.TYPES.GOAL_ACHIEVED]: {
        title: 'تحقيق هدف علاجي 🎉',
        body: `تهانينا! تم تحقيق الهدف: ${data?.goalName || ''}`,
      },
      [NOTIFICATION_CONSTANTS.TYPES.TRANSPORT_UPDATE]: {
        title: 'تحديث النقل',
        body: `السيارة في طريقها إليك. الوصول المتوقع: ${data?.eta || ''} دقيقة`,
      },
      [NOTIFICATION_CONSTANTS.TYPES.SYSTEM_ALERT]: {
        title: 'تنبيه النظام',
        body: data?.message || 'يوجد تنبيه يستدعي انتباهك',
      },
    },
    en: {
      [NOTIFICATION_CONSTANTS.TYPES.APPOINTMENT_REMINDER]: {
        title: 'Appointment Reminder',
        body: `Reminder: You have a ${data?.serviceName || 'therapy'} appointment tomorrow at ${data?.time || ''}`,
      },
      [NOTIFICATION_CONSTANTS.TYPES.PAYMENT_DUE]: {
        title: 'Payment Due',
        body: `You have an outstanding invoice of ${data?.amount || ''} SAR due on ${data?.dueDate || ''}`,
      },
    },
  };

  const langTemplates = templates[language] || templates.ar;
  const template = langTemplates[type];

  if (!template) {
    return {
      title: type,
      body: JSON.stringify(data || {}),
      isValid: false,
      warning: 'No template found for this type',
    };
  }

  return {
    title: template.title,
    body: template.body,
    isValid: true,
    type,
    language,
  };
}

// ========================================
// NOTIFICATION PREFERENCES
// ========================================

/**
 * التحقق من تفضيلات المستخدم قبل الإرسال
 * @param {object} userPreferences - تفضيلات المستخدم
 * @param {object} notification - الإشعار المراد إرساله
 * @returns {object} - هل يجب الإرسال وعبر أي قنوات
 */
function checkUserNotificationPreferences(userPreferences, notification) {
  if (!userPreferences || !notification) {
    return { shouldSend: true, channels: [NOTIFICATION_CONSTANTS.CHANNELS.IN_APP] };
  }

  // فحص الوضع الصامت
  if (userPreferences.quietMode) {
    // في الوضع الصامت، الإشعارات العاجلة فقط تُرسل
    if (notification.priority !== NOTIFICATION_CONSTANTS.PRIORITY.URGENT) {
      return {
        shouldSend: false,
        reason: 'quiet_mode_active',
        channels: [],
      };
    }
  }

  // فحص ساعات عدم الإزعاج
  if (userPreferences.doNotDisturbStart && userPreferences.doNotDisturbEnd) {
    const now = new Date();
    const currentHour = now.getHours();
    const dndStart = parseInt(userPreferences.doNotDisturbStart.split(':')[0]);
    const dndEnd = parseInt(userPreferences.doNotDisturbEnd.split(':')[0]);

    let inDnD = false;
    if (dndStart <= dndEnd) {
      inDnD = currentHour >= dndStart && currentHour < dndEnd;
    } else {
      // عبر منتصف الليل
      inDnD = currentHour >= dndStart || currentHour < dndEnd;
    }

    if (inDnD && notification.priority !== NOTIFICATION_CONSTANTS.PRIORITY.URGENT) {
      return {
        shouldSend: false,
        reason: 'do_not_disturb',
        channels: [],
        retryAt: `${userPreferences.doNotDisturbEnd}`,
      };
    }
  }

  // تصفية القنوات حسب التفضيلات
  const allowedChannels = notification.channels?.filter(channel => {
    const prefKey = `${channel}Enabled`;
    return userPreferences[prefKey] !== false; // الافتراضي: مفعل
  }) || [NOTIFICATION_CONSTANTS.CHANNELS.IN_APP];

  // اللغة المفضلة
  const language = userPreferences.language || 'ar';

  return {
    shouldSend: allowedChannels.length > 0,
    channels: allowedChannels,
    language,
    reason: allowedChannels.length === 0 ? 'all_channels_disabled' : null,
  };
}

// ========================================
// NOTIFICATION STATISTICS
// ========================================

/**
 * حساب إحصائيات الإشعارات لفترة زمنية
 * @param {Array} notifications - مصفوفة الإشعارات
 * @param {object} period - {start, end}
 * @returns {object} - إحصائيات شاملة
 */
function calculateNotificationStats(notifications, period) {
  if (!Array.isArray(notifications) || notifications.length === 0) {
    return {
      total: 0,
      sent: 0,
      delivered: 0,
      read: 0,
      failed: 0,
      pending: 0,
    };
  }

  // فلترة حسب الفترة
  let filtered = notifications;
  if (period?.start || period?.end) {
    filtered = notifications.filter(n => {
      const date = new Date(n.createdAt || n.sentAt || 0);
      if (period.start && date < new Date(period.start)) return false;
      if (period.end && date > new Date(period.end)) return false;
      return true;
    });
  }

  const statusCounts = {};
  for (const status of Object.values(NOTIFICATION_CONSTANTS.STATUS)) {
    statusCounts[status] = filtered.filter(n => n.status === status).length;
  }

  const total = filtered.length;
  const sent = filtered.filter(n => ['sent', 'delivered', 'read'].includes(n.status)).length;

  return {
    total,
    sent,
    delivered: statusCounts.delivered + statusCounts.read,
    read: statusCounts.read,
    failed: statusCounts.failed,
    pending: statusCounts.pending + statusCounts.queued,
    cancelled: statusCounts.cancelled,
    deliveryRate:
      total > 0 ? Math.round(((statusCounts.delivered + statusCounts.read) / total) * 100) : 0,
    readRate: total > 0 ? Math.round((statusCounts.read / total) * 100) : 0,
    failureRate: total > 0 ? Math.round((statusCounts.failed / total) * 100) : 0,
    byType: _countByField(filtered, 'type'),
    byChannel: _countByField(filtered, 'channel'),
    byPriority: _countByField(filtered, 'priority'),
  };
}

function _countByField(arr, field) {
  return arr.reduce((acc, item) => {
    const key = item[field] || 'unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

// ========================================
// EXPORTS
// ========================================
module.exports = {
  NOTIFICATION_CONSTANTS,
  // Priority
  calculateNotificationPriority,
  // Scheduling
  scheduleAppointmentReminders,
  scheduleDocumentExpiryNotifications,
  // Rate Limiting
  checkNotificationRateLimit,
  // Analytics
  analyzeNotificationDelivery,
  calculateOptimalSendTime,
  // Batch
  processBatchNotifications,
  // Content
  buildNotificationContent,
  // Preferences
  checkUserNotificationPreferences,
  // Statistics
  calculateNotificationStats,
};
