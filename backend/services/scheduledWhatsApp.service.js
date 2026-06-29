/**
 * Scheduled WhatsApp Service
 * خدمة إرسال رسائل WhatsApp المجدولة
 *
 * Handles scheduled reminders, recurring notifications,
 * and queue-based message delivery using BullMQ.
 */

'use strict';

const { Queue, Worker } = require('bullmq');
const { getWhatsAppGateway } = require('../integrations/whatsapp/whatsappGateway');
const { QUEUE, MESSAGE_STATUS } = require('../integrations/whatsapp/constants');
const WhatsAppMessage = require('../models/WhatsAppMessage');
const logger = require('../utils/logger');

class ScheduledWhatsAppService {
  constructor() {
    this.gateway = getWhatsAppGateway();
    this.queue = null;
    this.worker = null;
    this.isRunning = false;
  }

  /**
   * Initialize the queue and worker
   */
  async init() {
    if (this.isRunning) return;

    const redis = require('../config/redis');
    if (!redis) {
      logger.warn?.('[scheduled-whatsapp] Redis not available — scheduled messages disabled');
      return;
    }

    this.queue = new Queue(QUEUE.NAME, {
      connection: redis,
      defaultJobOptions: {
        attempts: QUEUE.RETRY_ATTEMPTS,
        backoff: {
          type: 'exponential',
          delay: QUEUE.RETRY_DELAY_MS,
        },
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 500 },
      },
    });

    this.worker = new Worker(
      QUEUE.NAME,
      async (job) => this._processJob(job),
      {
        connection: redis,
        concurrency: QUEUE.CONCURRENCY,
        limiter: {
          max: QUEUE.RATE_LIMIT,
          duration: 1000, // per second
        },
      }
    );

    this.worker.on('completed', (job) => {
      logger.debug?.(`[scheduled-whatsapp] Job ${job.id} completed`);
    });

    this.worker.on('failed', (job, err) => {
      logger.error?.(`[scheduled-whatsapp] Job ${job.id} failed:`, err?.message);
    });

    this.isRunning = true;
    logger.info?.('[scheduled-whatsapp] Service initialized');
  }

  /**
   * Schedule a WhatsApp message
   * @param {object} jobData
   * @param {Date|string} when - When to send (Date or delay string)
   */
  async schedule(jobData, when) {
    if (!this.queue) {
      logger.warn?.('[scheduled-whatsapp] Queue not initialized');
      return { scheduled: false, error: 'queue_not_initialized' };
    }

    const job = await this.queue.add(QUEUE.NAME, jobData, {
      delay: when instanceof Date ? when.getTime() - Date.now() : when,
    });

    return { scheduled: true, jobId: job.id };
  }

  /**
   * Schedule an appointment reminder
   */
  async scheduleAppointmentReminder(appointment, minutesBefore = 60) {
    const reminderTime = new Date(appointment.startTime);
    reminderTime.setMinutes(reminderTime.getMinutes() - minutesBefore);

    if (reminderTime < new Date()) {
      return { scheduled: false, reason: 'too_late' };
    }

    const beneficiary = appointment.beneficiary;
    const guardianPhone = beneficiary?.guardianPhone || beneficiary?.phone;
    if (!guardianPhone) {
      return { scheduled: false, reason: 'no_phone' };
    }

    return this.schedule(
      {
        type: 'appointment_reminder',
        phoneNumber: guardianPhone,
        beneficiaryId: beneficiary._id,
        appointmentId: appointment._id,
        sessionType: appointment.sessionType,
        patientName: beneficiary.firstName,
        date: appointment.date,
        time: appointment.time,
        location: appointment.location,
      },
      reminderTime
    );
  }

  /**
   * Schedule a report ready notification
   */
  async scheduleReportReady(report, beneficiary) {
    const guardianPhone = beneficiary?.guardianPhone || beneficiary?.phone;
    if (!guardianPhone) {
      return { scheduled: false, reason: 'no_phone' };
    }

    return this.schedule(
      {
        type: 'report_ready',
        phoneNumber: guardianPhone,
        beneficiaryId: beneficiary._id,
        reportId: report._id,
        reportType: report.type,
        patientName: beneficiary.firstName,
        link: report.downloadUrl,
      },
      0 // Send immediately
    );
  }

  /**
   * Schedule payment reminder
   */
  async schedulePaymentReminder(invoice, beneficiary, daysBeforeDue = 3) {
    const dueDate = new Date(invoice.dueDate);
    const reminderTime = new Date(dueDate);
    reminderTime.setDate(reminderTime.getDate() - daysBeforeDue);

    const guardianPhone = beneficiary?.guardianPhone || beneficiary?.phone;
    if (!guardianPhone) {
      return { scheduled: false, reason: 'no_phone' };
    }

    return this.schedule(
      {
        type: 'payment_reminder',
        phoneNumber: guardianPhone,
        beneficiaryId: beneficiary._id,
        invoiceId: invoice._id,
        patientName: beneficiary.firstName,
        amount: invoice.amount,
        month: invoice.month,
        link: invoice.paymentUrl,
      },
      reminderTime
    );
  }

  /**
   * Schedule telehealth link
   */
  async scheduleTelehealthLink(appointment, beneficiary) {
    const linkTime = new Date(appointment.startTime);
    linkTime.setMinutes(linkTime.getMinutes() - 10); // Send 10 minutes before

    const guardianPhone = beneficiary?.guardianPhone || beneficiary?.phone;
    if (!guardianPhone) {
      return { scheduled: false, reason: 'no_phone' };
    }

    return this.schedule(
      {
        type: 'telehealth_link',
        phoneNumber: guardianPhone,
        beneficiaryId: beneficiary._id,
        appointmentId: appointment._id,
        patientName: beneficiary.firstName,
        link: appointment.telehealthUrl,
        minutesUntilStart: 10,
      },
      linkTime
    );
  }

  /**
   * Cancel scheduled jobs for an entity
   */
  async cancelScheduledJobs(entityType, entityId) {
    if (!this.queue) return { cancelled: 0 };

    const jobs = await this.queue.getJobs(['waiting', 'delayed']);
    let cancelled = 0;

    for (const job of jobs) {
      const data = job.data || {};
      if (data[`${entityType}Id`] === entityId.toString()) {
        await job.remove();
        cancelled++;
      }
    }

    return { cancelled };
  }

  /**
   * Process a job from the queue
   */
  async _processJob(job) {
    const data = job.data;
    const gateway = this.gateway;

    if (!gateway.isReady()) {
      throw new Error('whatsapp_gateway_not_ready');
    }

    let result;
    switch (data.type) {
      case 'appointment_reminder':
        result = await gateway.sendAppointmentReminder(
          data.phoneNumber,
          data.patientName,
          data.sessionType,
          data.date,
          data.time,
          data.location
        );
        break;

      case 'report_ready':
        result = await gateway.sendReportReady(
          data.phoneNumber,
          data.patientName,
          data.reportType,
          data.link
        );
        break;

      case 'payment_reminder':
        result = await gateway.sendPaymentReminder(
          data.phoneNumber,
          data.patientName,
          data.amount,
          data.month,
          data.link
        );
        break;

      case 'payment_confirmation':
        result = await gateway.sendPaymentConfirmation(
          data.phoneNumber,
          data.patientName,
          data.amount,
          data.transactionId
        );
        break;

      case 'telehealth_link':
        result = await gateway.sendTelehealthLink(
          data.phoneNumber,
          data.patientName,
          data.link,
          data.minutesUntilStart
        );
        break;

      case 'welcome':
        result = await gateway.sendWelcome(
          data.phoneNumber,
          data.patientName,
          data.fileNumber
        );
        break;

      case 'otp':
        result = await gateway.sendOTP(
          data.phoneNumber,
          data.code,
          data.ttlMinutes
        );
        break;

      case 'no_show':
        result = await gateway.sendNoShowFollowUp(
          data.phoneNumber,
          data.patientName,
          data.sessionDate,
          data.reschedulingLink
        );
        break;

      case 'home_program':
        result = await gateway.sendHomeProgram(
          data.phoneNumber,
          data.patientName,
          data.instructions,
          data.link
        );
        break;

      case 'care_plan_update':
        result = await gateway.sendCarePlanUpdate(
          data.phoneNumber,
          data.patientName,
          data.achievements,
          data.nextGoals
        );
        break;

      case 'emergency_alert':
        result = await gateway.sendEmergencyAlert(
          data.phoneNumber,
          data.patientName,
          data.situation,
          data.urgency
        );
        break;

      case 'custom':
        result = await gateway.sendText(data.phoneNumber, data.body, data.options || {});
        break;

      default:
        throw new Error(`unknown_job_type: ${data.type}`);
    }

    // Save the sent message to DB
    if (result.success) {
      await WhatsAppMessage.create({
        provider: gateway.primary?.getName() || 'unknown',
        providerMessageId: result.messageId,
        phoneNumber: data.phoneNumber,
        beneficiaryId: data.beneficiaryId,
        direction: 'outbound',
        type: 'text',
        body: data.body || '',
        tag: data.type,
        status: MESSAGE_STATUS.SENT,
        sentAt: new Date(),
      });
    }

    return result;
  }

  /**
   * Get queue status
   */
  async getQueueStatus() {
    if (!this.queue) {
      return { running: false, jobs: {} };
    }

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
      this.queue.getDelayedCount(),
    ]);

    return {
      running: this.isRunning,
      jobs: { waiting, active, completed, failed, delayed },
    };
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    if (this.worker) {
      await this.worker.close();
    }
    if (this.queue) {
      await this.queue.close();
    }
    this.isRunning = false;
    logger.info?.('[scheduled-whatsapp] Service shut down');
  }
}

// Singleton
let _serviceInstance = null;

function getScheduledWhatsAppService() {
  if (!_serviceInstance) {
    _serviceInstance = new ScheduledWhatsAppService();
  }
  return _serviceInstance;
}

module.exports = {
  ScheduledWhatsAppService,
  getScheduledWhatsAppService,
};
