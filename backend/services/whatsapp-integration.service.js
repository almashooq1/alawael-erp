/* eslint-disable no-unused-vars */
/**
 * ═══════════════════════════════════════════════════════════════
 * 🔗 WhatsApp Integration Service - خدمة تكامل الواتساب
 * Unified WhatsApp integration hub connecting ALL project systems
 * ═══════════════════════════════════════════════════════════════
 *
 * Bridges between the WhatsApp communication module and:
 *  - Appointments & Therapy Sessions (reminders)
 *  - Employee Affairs / HR (leave, salary, documents)
 *  - Notification Center (omni-channel dispatch)
 *  - Real-time WebSocket push
 *  - Government Integration notifications
 *  - Supply Chain / Order notifications
 */

const logger = require('../utils/logger');
const {
  whatsappService,
  WhatsAppTemplates,
  InteractiveBuilders,
  sendWhatsAppNotification,
  sendWhatsAppText,
} = require('../communication/whatsapp-service');

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const INTEGRATION_CONFIG = {
  // Reminder timing (minutes before)
  reminders: {
    appointment: { first: 1440, second: 60 }, // 24h + 1h before
    session: { first: 1440, second: 60 }, // 24h + 1h before
    payment: { first: 4320, second: 1440 }, // 3 days + 1 day before
  },
  // Queue processing
  queue: {
    batchSize: 10,
    delayBetweenBatches: 2000, // ms
    retryAttempts: 3,
    retryDelay: 5000, // ms
    processingInterval: 60000, // check every 1 min
  },
  // Rate limiting
  rateLimit: {
    maxPerMinute: 20,
    maxPerHour: 200,
    maxPerDay: 2000,
  },
};

// ═══════════════════════════════════════════════════════════════
// MESSAGE QUEUE (MongoDB-backed)
// ═══════════════════════════════════════════════════════════════

/** @type {import('mongoose').Model|null} */
let QueueModel = null;

const QueueSchema = {
  type: { type: String, required: true, index: true },
  to: { type: String, required: true },
  payload: { type: Object, required: true },
  status: {
    type: String,
    enum: ['pending', 'processing', 'sent', 'failed', 'cancelled'],
    default: 'pending',
    index: true,
  },
  priority: { type: Number, default: 5, index: true },
  scheduledFor: { type: Date, index: true },
  attempts: { type: Number, default: 0 },
  maxAttempts: { type: Number, default: 3 },
  lastError: { type: String },
  metadata: {
    sourceSystem: String,
    sourceId: String,
    userId: String,
    correlationId: String,
  },
  result: { type: Object },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  processedAt: { type: Date },
};

// ═══════════════════════════════════════════════════════════════
// CORE INTEGRATION CLASS
// ═══════════════════════════════════════════════════════════════

class WhatsAppIntegrationService {
  constructor() {
    this.wsManager = null;
    this.isProcessing = false;
    this.processingTimer = null;
    this._initialized = false;

    // Rate limit tracking
    this._sentThisMinute = 0;
    this._sentThisHour = 0;
    this._sentToday = 0;
    this._minuteReset = Date.now() + 60000;
    this._hourReset = Date.now() + 3600000;
    this._dayReset = Date.now() + 86400000;
  }

  // ─── INITIALIZATION ───────────────────────────────────────────

  /**
   * Initialize with MongoDB connection and optional WebSocket manager
   */
  async initialize(connection, wsManager = null) {
    if (this._initialized) return;

    this.wsManager = wsManager;

    // Create queue model
    if (connection) {
      const mongoose = require('mongoose');
      try {
        QueueModel = connection.model('WhatsAppQueue');
      } catch {
        QueueModel = connection.model(
          'WhatsAppQueue',
          new mongoose.Schema(QueueSchema, { timestamps: true })
        );
      }
    }

    this._initialized = true;
    logger.info('✅ WhatsApp Integration Service initialized');
  }

  /**
   * Start automated queue processing
   */
  startProcessing() {
    if (this.processingTimer) return;

    this.processingTimer = setInterval(
      () => this.processQueue(),
      INTEGRATION_CONFIG.queue.processingInterval
    );
    logger.info('✅ WhatsApp queue processing started');
  }

  /**
   * Stop queue processing
   */
  stopProcessing() {
    if (this.processingTimer) {
      clearInterval(this.processingTimer);
      this.processingTimer = null;
    }
  }

  // ─── RATE LIMITING ────────────────────────────────────────────

  _checkRateLimit() {
    const now = Date.now();
    if (now > this._minuteReset) {
      this._sentThisMinute = 0;
      this._minuteReset = now + 60000;
    }
    if (now > this._hourReset) {
      this._sentThisHour = 0;
      this._hourReset = now + 3600000;
    }
    if (now > this._dayReset) {
      this._sentToday = 0;
      this._dayReset = now + 86400000;
    }

    if (this._sentThisMinute >= INTEGRATION_CONFIG.rateLimit.maxPerMinute) return false;
    if (this._sentThisHour >= INTEGRATION_CONFIG.rateLimit.maxPerHour) return false;
    if (this._sentToday >= INTEGRATION_CONFIG.rateLimit.maxPerDay) return false;
    return true;
  }

  _trackSend() {
    this._sentThisMinute++;
    this._sentThisHour++;
    this._sentToday++;
  }

  // ═══════════════════════════════════════════════════════════════
  // 📅 APPOINTMENTS & THERAPY SESSIONS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Send appointment reminder via WhatsApp
   * @param {Object} appointment - { beneficiary, therapist, date, startTime, location, type }
   */
  async sendAppointmentReminder(appointment) {
    const phone = appointment.beneficiary?.phone || appointment.phone;
    if (!phone) {
      logger.warn('[WhatsApp Integration] No phone for appointment reminder');
      return { success: false, error: 'NO_PHONE' };
    }

    const patientName = appointment.beneficiary?.name || appointment.patientName || 'المستفيد';
    const doctorName = appointment.therapist?.name || appointment.therapistName || 'المعالج';
    const date = this._formatDate(appointment.date);
    const time = appointment.startTime || this._formatTime(appointment.date);
    const location = appointment.location || appointment.room || 'العيادة';

    const template = WhatsAppTemplates.APPOINTMENT_REMINDER(
      patientName,
      doctorName,
      date,
      time,
      location
    );

    return this._sendWithTracking(phone, 'template', {
      template,
      sourceSystem: 'appointments',
      sourceId: appointment._id?.toString(),
    });
  }

  /**
   * Send therapy session reminder
   * @param {Object} session - TherapySession document
   */
  async sendSessionReminder(session) {
    const phone = session.beneficiary?.phone || session.phone;
    if (!phone) {
      logger.warn('[WhatsApp Integration] No phone for session reminder');
      return { success: false, error: 'NO_PHONE' };
    }

    const patientName = session.beneficiary?.name || session.patientName || 'المستفيد';
    const therapistName = session.therapist?.name || session.therapistName || 'المعالج';
    const date = this._formatDate(session.date);
    const time = session.startTime || this._formatTime(session.date);
    const location = session.room || session.location || 'غرفة العلاج';

    const template = WhatsAppTemplates.APPOINTMENT_REMINDER(
      patientName,
      therapistName,
      date,
      time,
      location
    );

    return this._sendWithTracking(phone, 'template', {
      template,
      sourceSystem: 'therapy-sessions',
      sourceId: session._id?.toString(),
    });
  }

  /**
   * Send appointment confirmation
   */
  async sendAppointmentConfirmation(appointment) {
    const phone = appointment.beneficiary?.phone || appointment.phone;
    if (!phone) return { success: false, error: 'NO_PHONE' };

    const patientName = appointment.beneficiary?.name || 'المستفيد';
    const doctorName = appointment.therapist?.name || 'المعالج';
    const date = this._formatDate(appointment.date);
    const time = appointment.startTime || '';

    const message =
      `✅ تم تأكيد موعدك\n\n` +
      `👤 المعالج: ${doctorName}\n` +
      `📅 التاريخ: ${date}\n` +
      `⏰ الوقت: ${time}\n` +
      `📍 المكان: ${appointment.location || 'العيادة'}\n\n` +
      `نتمنى لك الشفاء العاجل 🌿`;

    return this._sendWithTracking(phone, 'text', {
      text: message,
      sourceSystem: 'appointments',
      sourceId: appointment._id?.toString(),
    });
  }

  /**
   * Send appointment cancellation notice
   */
  async sendAppointmentCancellation(appointment, reason = '') {
    const phone = appointment.beneficiary?.phone || appointment.phone;
    if (!phone) return { success: false, error: 'NO_PHONE' };

    const date = this._formatDate(appointment.date);
    const time = appointment.startTime || '';

    const message =
      `❌ تم إلغاء الموعد\n\n` +
      `📅 التاريخ: ${date}\n` +
      `⏰ الوقت: ${time}\n` +
      (reason ? `📝 السبب: ${reason}\n` : '') +
      `\nيرجى التواصل معنا لحجز موعد جديد.`;

    return this._sendWithTracking(phone, 'text', {
      text: message,
      sourceSystem: 'appointments',
      sourceId: appointment._id?.toString(),
    });
  }

  /**
   * Send session completion summary to guardian/parent
   */
  async sendSessionSummary(session, guardianPhone) {
    const phone = guardianPhone || session.guardian?.phone;
    if (!phone) return { success: false, error: 'NO_PHONE' };

    const date = this._formatDate(session.date);
    const goals = session.goals?.filter(g => g.achieved).length || 0;
    const totalGoals = session.goals?.length || 0;

    const message =
      `📋 ملخص الجلسة العلاجية\n\n` +
      `📅 التاريخ: ${date}\n` +
      `👨‍⚕️ المعالج: ${session.therapist?.name || 'المعالج'}\n` +
      `🎯 الأهداف المحققة: ${goals}/${totalGoals}\n` +
      (session.notes ? `📝 ملاحظات: ${session.notes.substring(0, 200)}\n` : '') +
      `\nللمزيد من التفاصيل، يرجى مراجعة بوابة أولياء الأمور.`;

    return this._sendWithTracking(phone, 'text', {
      text: message,
      sourceSystem: 'therapy-sessions',
      sourceId: session._id?.toString(),
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // 👨‍💼 EMPLOYEE AFFAIRS / HR
  // ═══════════════════════════════════════════════════════════════

  /**
   * Send leave status update
   */
  async sendLeaveStatusUpdate(employee, leaveData) {
    const phone = employee.phone || employee.contactInfo?.phone;
    if (!phone) return { success: false, error: 'NO_PHONE' };

    const template = WhatsAppTemplates.LEAVE_STATUS(
      employee.name || 'الموظف',
      leaveData.status || 'تحت المراجعة',
      this._formatDate(leaveData.startDate),
      this._formatDate(leaveData.endDate),
      leaveData.reason || ''
    );

    return this._sendWithTracking(phone, 'template', {
      template,
      sourceSystem: 'employee-affairs',
      sourceId: leaveData._id?.toString(),
    });
  }

  /**
   * Send salary credited notification
   */
  async sendSalaryNotification(employee, salaryData) {
    const phone = employee.phone || employee.contactInfo?.phone;
    if (!phone) return { success: false, error: 'NO_PHONE' };

    const template = WhatsAppTemplates.SALARY_CREDITED(
      employee.name || 'الموظف',
      salaryData.amount?.toString() || '0',
      salaryData.month || this._getCurrentMonth()
    );

    return this._sendWithTracking(phone, 'template', {
      template,
      sourceSystem: 'employee-affairs',
      sourceId: salaryData._id?.toString(),
    });
  }

  /**
   * Send document ready notification
   */
  async sendDocumentReady(user, documentData) {
    const phone = user.phone || user.contactInfo?.phone;
    if (!phone) return { success: false, error: 'NO_PHONE' };

    const template = WhatsAppTemplates.DOCUMENT_READY(
      documentData.name || 'مستند',
      documentData.type || 'مستند'
    );

    return this._sendWithTracking(phone, 'template', {
      template,
      sourceSystem: 'documents',
      sourceId: documentData._id?.toString(),
    });
  }

  /**
   * Send attendance alert (late/absent)
   */
  async sendAttendanceAlert(employee, alertData) {
    const phone = employee.phone || employee.contactInfo?.phone;
    if (!phone) return { success: false, error: 'NO_PHONE' };

    const alertType = alertData.type === 'late' ? 'تأخير' : 'غياب';
    const message =
      `⚠️ تنبيه حضور\n\n` +
      `👤 الموظف: ${employee.name}\n` +
      `📅 التاريخ: ${this._formatDate(alertData.date || new Date())}\n` +
      `📋 النوع: ${alertType}\n` +
      (alertData.notes ? `📝 ملاحظات: ${alertData.notes}\n` : '') +
      `\nيرجى مراجعة شؤون الموظفين.`;

    return this._sendWithTracking(phone, 'text', {
      text: message,
      sourceSystem: 'attendance',
      sourceId: alertData._id?.toString(),
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // 💰 PAYMENTS & INVOICES
  // ═══════════════════════════════════════════════════════════════

  /**
   * Send payment reminder
   */
  async sendPaymentReminder(invoiceData) {
    const phone = invoiceData.phone || invoiceData.customer?.phone;
    if (!phone) return { success: false, error: 'NO_PHONE' };

    const template = WhatsAppTemplates.PAYMENT_REMINDER(
      invoiceData.invoiceNumber || invoiceData._id?.toString() || 'N/A',
      invoiceData.amount?.toString() || '0',
      this._formatDate(invoiceData.dueDate)
    );

    return this._sendWithTracking(phone, 'template', {
      template,
      sourceSystem: 'finance',
      sourceId: invoiceData._id?.toString(),
    });
  }

  /**
   * Send payment confirmation
   */
  async sendPaymentConfirmation(paymentData) {
    const phone = paymentData.phone || paymentData.customer?.phone;
    if (!phone) return { success: false, error: 'NO_PHONE' };

    const message =
      `✅ تم تأكيد الدفع\n\n` +
      `💰 المبلغ: ${paymentData.amount} ريال\n` +
      `📄 رقم الفاتورة: ${paymentData.invoiceNumber || 'N/A'}\n` +
      `📅 التاريخ: ${this._formatDate(new Date())}\n` +
      `🧾 رقم المرجع: ${paymentData.referenceNumber || 'N/A'}\n\n` +
      `شكراً لكم.`;

    return this._sendWithTracking(phone, 'text', {
      text: message,
      sourceSystem: 'finance',
      sourceId: paymentData._id?.toString(),
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // 📦 SUPPLY CHAIN / ORDERS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Send order confirmation
   */
  async sendOrderConfirmation(orderData) {
    const phone = orderData.phone || orderData.customer?.phone;
    if (!phone) return { success: false, error: 'NO_PHONE' };

    const template = WhatsAppTemplates.ORDER_CONFIRMATION(
      orderData.orderId || orderData._id?.toString() || 'N/A',
      orderData.totalAmount?.toString() || '0',
      this._formatDate(orderData.deliveryDate || orderData.expectedDate)
    );

    return this._sendWithTracking(phone, 'template', {
      template,
      sourceSystem: 'supply-chain',
      sourceId: orderData._id?.toString(),
    });
  }

  /**
   * Send order status update
   */
  async sendOrderStatusUpdate(orderData) {
    const phone = orderData.phone || orderData.customer?.phone;
    if (!phone) return { success: false, error: 'NO_PHONE' };

    const statusMap = {
      processing: 'قيد المعالجة',
      shipped: 'تم الشحن',
      delivered: 'تم التوصيل',
      cancelled: 'تم الإلغاء',
    };

    const statusText = statusMap[orderData.status] || orderData.status;

    const message =
      `📦 تحديث حالة الطلب\n\n` +
      `📋 رقم الطلب: ${orderData.orderId || 'N/A'}\n` +
      `📊 الحالة: ${statusText}\n` +
      (orderData.trackingNumber ? `🔍 رقم التتبع: ${orderData.trackingNumber}\n` : '') +
      (orderData.estimatedDelivery
        ? `📅 التسليم المتوقع: ${this._formatDate(orderData.estimatedDelivery)}\n`
        : '');

    return this._sendWithTracking(phone, 'text', {
      text: message,
      sourceSystem: 'supply-chain',
      sourceId: orderData._id?.toString(),
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // 🏛️ GOVERNMENT INTEGRATION
  // ═══════════════════════════════════════════════════════════════

  /**
   * Send government document status update
   */
  async sendGovDocumentUpdate(user, docData) {
    const phone = user.phone || user.contactInfo?.phone;
    if (!phone) return { success: false, error: 'NO_PHONE' };

    const statusMap = {
      submitted: 'تم التقديم',
      under_review: 'تحت المراجعة',
      approved: 'تمت الموافقة',
      rejected: 'مرفوض',
      completed: 'مكتمل',
    };

    const message =
      `🏛️ تحديث المعاملة الحكومية\n\n` +
      `📄 المعاملة: ${docData.name || docData.type}\n` +
      `📊 الحالة: ${statusMap[docData.status] || docData.status}\n` +
      `📅 التاريخ: ${this._formatDate(new Date())}\n` +
      (docData.referenceNumber ? `🔖 رقم المرجع: ${docData.referenceNumber}\n` : '') +
      (docData.notes ? `📝 ملاحظات: ${docData.notes}\n` : '');

    return this._sendWithTracking(phone, 'text', {
      text: message,
      sourceSystem: 'government',
      sourceId: docData._id?.toString(),
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // 👋 ONBOARDING & WELCOME
  // ═══════════════════════════════════════════════════════════════

  /**
   * Send welcome message to new user
   */
  async sendWelcomeMessage(user) {
    const phone = user.phone || user.contactInfo?.phone;
    if (!phone) return { success: false, error: 'NO_PHONE' };

    const template = WhatsAppTemplates.WELCOME(user.name || 'المستخدم');

    return this._sendWithTracking(phone, 'template', {
      template,
      sourceSystem: 'onboarding',
      sourceId: user._id?.toString(),
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // 🔔 GENERIC NOTIFICATION BRIDGE
  // ═══════════════════════════════════════════════════════════════

  /**
   * Send generic WhatsApp notification (used by NotificationCenter)
   * @param {string} phone - Phone number
   * @param {string} message - Message text
   * @param {Object} options - { title, type, priority, metadata }
   * @returns {Promise<Object>}
   */
  async sendNotification(phone, message, options = {}) {
    if (!phone) return { success: false, error: 'NO_PHONE' };

    // If title provided, use NOTIFICATION template
    if (options.title) {
      const template = WhatsAppTemplates.NOTIFICATION(options.title, message);
      return this._sendWithTracking(phone, 'template', {
        template,
        sourceSystem: options.sourceSystem || 'notification-center',
        sourceId: options.sourceId,
      });
    }

    // Plain text message
    return this._sendWithTracking(phone, 'text', {
      text: message,
      sourceSystem: options.sourceSystem || 'notification-center',
      sourceId: options.sourceId,
    });
  }

  /**
   * Send interactive message with quick reply buttons
   */
  async sendInteractiveButtons(phone, bodyText, buttons, options = {}) {
    if (!phone) return { success: false, error: 'NO_PHONE' };

    const interactive = InteractiveBuilders.quickReply(bodyText, buttons);
    return this._sendWithTracking(phone, 'interactive', {
      interactive,
      sourceSystem: options.sourceSystem || 'system',
      sourceId: options.sourceId,
    });
  }

  /**
   * Send interactive list message
   */
  async sendInteractiveList(phone, bodyText, buttonText, sections, options = {}) {
    if (!phone) return { success: false, error: 'NO_PHONE' };

    const interactive = InteractiveBuilders.list(bodyText, buttonText, sections);
    return this._sendWithTracking(phone, 'interactive', {
      interactive,
      sourceSystem: options.sourceSystem || 'system',
      sourceId: options.sourceId,
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // 📤 BULK NOTIFICATIONS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Send bulk notification to multiple recipients
   */
  async sendBulkNotification(recipients, messageOrTemplate, options = {}) {
    const results = {
      total: recipients.length,
      queued: 0,
      failed: 0,
      errors: [],
    };

    for (const recipient of recipients) {
      const phone = typeof recipient === 'string' ? recipient : recipient.phone;
      if (!phone) {
        results.failed++;
        results.errors.push({ recipient, error: 'NO_PHONE' });
        continue;
      }

      try {
        if (options.useQueue) {
          await this.enqueue(
            'bulk_notification',
            phone,
            {
              ...(typeof messageOrTemplate === 'string'
                ? { text: messageOrTemplate }
                : messageOrTemplate),
              sourceSystem: options.sourceSystem || 'bulk',
            },
            options.scheduledFor
          );
          results.queued++;
        } else {
          if (typeof messageOrTemplate === 'string') {
            await this.sendNotification(phone, messageOrTemplate, options);
          } else {
            await this._sendWithTracking(phone, 'template', {
              ...messageOrTemplate,
              sourceSystem: options.sourceSystem || 'bulk',
            });
          }
          results.queued++;
        }
      } catch (error) {
        results.failed++;
        results.errors.push({ phone, error: error.message });
      }
    }

    return results;
  }

  // ═══════════════════════════════════════════════════════════════
  // ⏰ AUTOMATED REMINDER PROCESSING
  // ═══════════════════════════════════════════════════════════════

  /**
   * Process pending reminders from AppointmentService
   * Call this from a cron job or queue processor
   */
  async processReminders(appointmentService) {
    if (!appointmentService) {
      logger.warn('[WhatsApp Integration] No appointment service provided');
      return { processed: 0, sent: 0, failed: 0 };
    }

    const pending = await appointmentService.getPendingReminders();
    const results = { processed: pending.length, sent: 0, failed: 0, errors: [] };

    for (const item of pending) {
      try {
        let result;

        if (item.itemType === 'session') {
          result = await this.sendSessionReminder({
            _id: item.itemId,
            beneficiary: item.beneficiary,
            therapist: item.therapist,
            date: item.scheduledFor,
            startTime: item.reminder?.time,
            phone: item.beneficiary?.phone,
          });
        } else {
          result = await this.sendAppointmentReminder({
            _id: item.itemId,
            beneficiary: item.beneficiary,
            therapist: item.therapist,
            date: item.scheduledFor,
            startTime: item.reminder?.time,
            phone: item.beneficiary?.phone,
          });
        }

        if (result.success) {
          // Find reminder index
          const reminderIndex = item.reminder?.index ?? 0;
          await appointmentService.markReminderSent(item.itemType, item.itemId, reminderIndex);
          results.sent++;
        } else {
          results.failed++;
          results.errors.push({ itemId: item.itemId, error: result.error });
        }
      } catch (error) {
        results.failed++;
        results.errors.push({ itemId: item.itemId, error: error.message });
        logger.error(`[WhatsApp Integration] Reminder error: ${error.message}`);
      }
    }

    logger.info(`[WhatsApp Integration] Reminders: ${results.sent}/${results.processed} sent`);
    return results;
  }

  // ═══════════════════════════════════════════════════════════════
  // 📤 QUEUE MANAGEMENT
  // ═══════════════════════════════════════════════════════════════

  /**
   * Enqueue a message for later delivery
   */
  async enqueue(type, to, payload, scheduledFor = null, priority = 5) {
    if (!QueueModel) {
      // Fallback: send immediately
      return this._sendDirect(to, payload);
    }

    const item = await QueueModel.create({
      type,
      to,
      payload,
      priority,
      scheduledFor: scheduledFor || new Date(),
      metadata: {
        sourceSystem: payload.sourceSystem,
        sourceId: payload.sourceId,
        correlationId: `q_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
      },
    });

    return { success: true, queued: true, queueId: item._id };
  }

  /**
   * Process queued messages
   */
  async processQueue() {
    if (this.isProcessing || !QueueModel) return { processed: 0 };
    this.isProcessing = true;

    try {
      const now = new Date();
      const { batchSize, retryAttempts } = INTEGRATION_CONFIG.queue;

      // Find pending items ready to send
      const items = await QueueModel.find({
        status: { $in: ['pending', 'failed'] },
        scheduledFor: { $lte: now },
        attempts: { $lt: retryAttempts },
      })
        .sort({ priority: 1, scheduledFor: 1 })
        .limit(batchSize);

      let processed = 0;

      for (const item of items) {
        if (!this._checkRateLimit()) {
          logger.warn('[WhatsApp Integration] Rate limit reached, stopping queue processing');
          break;
        }

        try {
          item.status = 'processing';
          item.attempts += 1;
          item.updatedAt = new Date();
          await item.save();

          const result = await this._sendDirect(item.to, item.payload);

          item.status = 'sent';
          item.result = result;
          item.processedAt = new Date();
          await item.save();

          processed++;
        } catch (error) {
          item.status = 'failed';
          item.lastError = error.message;
          await item.save();
          logger.error(`[WhatsApp Queue] Failed: ${error.message}`);
        }
      }

      return { processed, total: items.length };
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    if (!QueueModel) return null;

    const [pending, processing, sent, failed] = await Promise.all([
      QueueModel.countDocuments({ status: 'pending' }),
      QueueModel.countDocuments({ status: 'processing' }),
      QueueModel.countDocuments({ status: 'sent' }),
      QueueModel.countDocuments({ status: 'failed' }),
    ]);

    return { pending, processing, sent, failed, total: pending + processing + sent + failed };
  }

  // ═══════════════════════════════════════════════════════════════
  // 🔌 WEBSOCKET REAL-TIME EVENTS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Push WhatsApp event to frontend via WebSocket
   */
  _emitRealtime(event, data) {
    if (!this.wsManager) return;

    try {
      // Emit to WhatsApp admin room
      this.wsManager.emitToRoom('whatsapp:admin', `whatsapp:${event}`, data);

      // If user-specific, emit to user
      if (data.userId) {
        this.wsManager.emitToUser(data.userId, `whatsapp:${event}`, data);
      }
    } catch (error) {
      logger.error(`[WhatsApp WS] Emit error: ${error.message}`);
    }
  }

  /**
   * Notify frontend about incoming message
   */
  notifyIncomingMessage(messageData) {
    this._emitRealtime('message:incoming', {
      messageId: messageData.messageId,
      from: messageData.from,
      type: messageData.type,
      preview: messageData.content?.text?.substring(0, 100) || '[وسائط]',
      conversationId: messageData.conversationId,
      timestamp: new Date(),
    });
  }

  /**
   * Notify frontend about message status change
   */
  notifyStatusUpdate(statusData) {
    this._emitRealtime('message:status', {
      messageId: statusData.messageId,
      status: statusData.status,
      timestamp: statusData.timestamp,
    });
  }

  /**
   * Notify frontend about send result
   */
  notifySendResult(sendData) {
    this._emitRealtime('message:sent', {
      messageId: sendData.messageId,
      to: sendData.to,
      success: sendData.success,
      timestamp: new Date(),
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // 🔐 WEBHOOK SIGNATURE VERIFICATION
  // ═══════════════════════════════════════════════════════════════

  /**
   * Verify webhook signature (X-Hub-Signature-256)
   */
  static verifyWebhookSignature(rawBody, signature) {
    if (!signature) return false;

    const appSecret = process.env.WHATSAPP_APP_SECRET;
    if (!appSecret) {
      logger.warn('[WhatsApp] No APP_SECRET configured, skipping signature verification');
      return true; // Allow in dev mode
    }

    const expectedSig =
      'sha256=' + require('crypto').createHmac('sha256', appSecret).update(rawBody).digest('hex');

    try {
      return require('crypto').timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig));
    } catch (e) {
      // Buffer length mismatch means invalid signature
      return false;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 🔧 INTERNAL HELPERS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Send with tracking, WebSocket notification, and error handling
   */
  async _sendWithTracking(phone, type, payload) {
    if (!this._checkRateLimit()) {
      // Queue instead of rejecting
      return this.enqueue(type, phone, payload);
    }

    try {
      const result = await this._sendDirect(phone, payload);
      this._trackSend();

      // Notify frontend
      this.notifySendResult({
        messageId: result.messageId,
        to: phone,
        success: true,
      });

      return { success: true, ...result };
    } catch (error) {
      logger.error(`[WhatsApp Integration] Send failed to ${phone}: ${error.message}`);

      this.notifySendResult({
        to: phone,
        success: false,
        error: error.message,
      });

      return { success: false, error: error.message };
    }
  }

  /**
   * Direct send via whatsappService
   */
  async _sendDirect(phone, payload) {
    if (payload.template) {
      // Template message
      const tmpl = payload.template;
      return whatsappService.sendTemplate(phone, tmpl.name || tmpl, tmpl.components || [], {
        language: tmpl.language?.code,
      });
    } else if (payload.interactive) {
      return whatsappService.sendInteractive(phone, payload.interactive);
    } else if (payload.text) {
      return whatsappService.sendText(phone, payload.text);
    } else if (payload.image) {
      return whatsappService.sendImage(phone, payload.image.url, payload.image.caption);
    } else if (payload.document) {
      return whatsappService.sendDocument(
        phone,
        payload.document.url,
        payload.document.filename,
        payload.document.caption
      );
    } else {
      throw new Error('Unknown message payload type');
    }
  }

  // ─── DATE/TIME FORMATTERS ─────────────────────────────────────

  _formatDate(date) {
    if (!date) return 'غير محدد';
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'غير محدد';
    return d.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      calendar: 'gregory',
    });
  }

  _formatTime(date) {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('ar-SA', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }

  _getCurrentMonth() {
    return new Date().toLocaleDateString('ar-SA', { month: 'long', year: 'numeric' });
  }
}

// ═══════════════════════════════════════════════════════════════
// SINGLETON & EXPORTS
// ═══════════════════════════════════════════════════════════════

const whatsappIntegration = new WhatsAppIntegrationService();

module.exports = {
  WhatsAppIntegrationService,
  whatsappIntegration,
  INTEGRATION_CONFIG,
};
