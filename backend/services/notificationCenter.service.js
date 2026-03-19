/* eslint-disable no-unused-vars */
const logger = require('../utils/logger');
const { whatsappIntegration } = require('./whatsapp-integration.service');
const { emailIntegration } = require('./email-integration.service');

class NotificationCenterService {
  /**
   * Omni-Channel Dispatcher
   * decide channel preference: SMS vs WhatsApp vs Email
   */
  static async sendNotification(recipient, type, message) {
    const preferences = recipient.preferences || { sms: true, whatsapp: true, email: true };

    const results = [];

    // 1. WhatsApp (Priority for Appts & Urgent)
    if (preferences.whatsapp && (type === 'APPOINTMENT' || type === 'URGENT')) {
      const status = await this.sendWhatsApp(recipient.phone, message, { type });
      results.push({ channel: 'WhatsApp', status });
    }

    // 2. SMS (Fallback)
    if (preferences.sms && !results.find(r => r.channel === 'WhatsApp' && r.status === 'SENT')) {
      const status = await this.sendSMS(recipient.phone, message);
      results.push({ channel: 'SMS', status });
    }

    // 3. Email (For Receipts/Reports)
    if (preferences.email || type === 'REPORT') {
      const status = await this.sendEmail(recipient.email, 'AlAwael Notification', message);
      results.push({ channel: 'Email', status });
    }

    return results;
  }

  /**
   * Send WhatsApp message via integration service
   * Connected to real WhatsApp Business API
   */
  static async sendWhatsApp(phone, msg, options = {}) {
    if (!phone) {
      logger.warn('[NotificationCenter] No phone number provided for WhatsApp');
      return 'FAILED';
    }

    try {
      const result = await whatsappIntegration.sendNotification(phone, msg, {
        sourceSystem: 'notification-center',
        title: options.title,
        type: options.type,
      });

      if (result.success) {
        logger.info(`[WhatsApp] Sent to ${phone}`);
        return 'SENT';
      }

      logger.warn(`[WhatsApp] Failed to send to ${phone}: ${result.error}`);
      return 'FAILED';
    } catch (error) {
      logger.error(`[WhatsApp] Error sending to ${phone}: ${error.message}`);
      return 'FAILED';
    }
  }

  static async sendSMS(phone, msg) {
    logger.info(`[SMS] Sending to ${phone}: ${msg}`);
    return 'SENT';
  }

  static async sendEmail(email, subject, body) {
    if (!email) {
      logger.warn('[NotificationCenter] No email address provided for Email');
      return 'FAILED';
    }

    try {
      const result = await emailIntegration.sendNotification(email, {
        title: subject,
        message: body,
      });

      if (result.success) {
        logger.info(`[Email] Sent to ${email}: ${subject}`);
        return 'SENT';
      }

      logger.warn(`[Email] Failed to send to ${email}: ${result.error}`);
      return 'FAILED';
    } catch (error) {
      logger.error(`[Email] Error sending to ${email}: ${error.message}`);
      return 'FAILED';
    }
  }
}

module.exports = NotificationCenterService;
