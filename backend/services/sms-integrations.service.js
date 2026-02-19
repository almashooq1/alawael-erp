/**
 * SMS Integration Service
 * Twilio SMS and WhatsApp Integration
 *
 * Features:
 * - SMS sending via Twilio
 * - WhatsApp messages
 * - SMS delivery tracking
 * - Bulk SMS
 * - SMS templates
 */

const twilio = require('twilio');
const AuditLogger = require('./audit-logger');

class SMSIntegrationService {
  constructor() {
    // Initialize Twilio
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      this.client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      this.enabled = true;
    }

    this.logger = new AuditLogger('SMSIntegration');
    this.defaultPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
    this.whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER;
    this.accountSid = process.env.TWILIO_ACCOUNT_SID;
  }

  /**
   * Send SMS
   */
  async sendSMS(phoneNumber, message, options = {}) {
    if (!this.enabled) {
      return this.mockSendSMS(phoneNumber, message);
    }

    try {
      const { from = this.defaultPhoneNumber, mediaUrl = null } = options;

      const messageData = {
        body: message,
        from,
        to: this.formatPhoneNumber(phoneNumber),
      };

      if (mediaUrl) {
        messageData.mediaUrl = [mediaUrl];
      }

      const result = await this.client.messages.create(messageData);

      this.logger.log('info', 'SMS sent', {
        to: phoneNumber,
        messageSid: result.sid,
        status: result.status,
      });

      return {
        success: true,
        messageSid: result.sid,
        status: result.status,
        to: phoneNumber,
        provider: 'twilio',
      };
    } catch (error) {
      this.logger.log('error', 'Failed to send SMS', {
        error: error.message,
        to: phoneNumber,
      });
      throw error;
    }
  }

  /**
   * Send WhatsApp Message
   */
  async sendWhatsApp(phoneNumber, message, options = {}) {
    if (!this.enabled) {
      return this.mockSendWhatsApp(phoneNumber, message);
    }

    try {
      const { from = this.whatsappNumber } = options;

      const result = await this.client.messages.create({
        body: message,
        from: `whatsapp:${from}`,
        to: `whatsapp:${this.formatPhoneNumber(phoneNumber)}`,
      });

      this.logger.log('info', 'WhatsApp message sent', {
        to: phoneNumber,
        messageSid: result.sid,
        status: result.status,
      });

      return {
        success: true,
        messageSid: result.sid,
        status: result.status,
        to: phoneNumber,
        provider: 'twilio_whatsapp',
      };
    } catch (error) {
      this.logger.log('error', 'Failed to send WhatsApp message', {
        error: error.message,
        to: phoneNumber,
      });
      throw error;
    }
  }

  /**
   * Send WhatsApp with Media
   */
  async sendWhatsAppMedia(phoneNumber, mediaUrl, caption = '', options = {}) {
    if (!this.enabled) {
      return this.mockSendWhatsApp(phoneNumber, caption);
    }

    try {
      const { from = this.whatsappNumber } = options;

      const result = await this.client.messages.create({
        from: `whatsapp:${from}`,
        to: `whatsapp:${this.formatPhoneNumber(phoneNumber)}`,
        mediaUrl: mediaUrl,
      });

      this.logger.log('info', 'WhatsApp media sent', {
        to: phoneNumber,
        mediaUrl,
        messageSid: result.sid,
      });

      return {
        success: true,
        messageSid: result.sid,
        status: result.status,
        to: phoneNumber,
        provider: 'twilio_whatsapp',
      };
    } catch (error) {
      this.logger.log('error', 'Failed to send WhatsApp media', { error: error.message });
      throw error;
    }
  }

  /**
   * Send Bulk SMS
   */
  async sendBulkSMS(phoneNumbers, message, options = {}) {
    try {
      const results = [];

      for (const phoneNumber of phoneNumbers) {
        try {
          const result = await this.sendSMS(phoneNumber, message, options);
          results.push({ phoneNumber, ...result });
        } catch (error) {
          results.push({ phoneNumber, success: false, error: error.message });
        }
      }

      this.logger.log('info', 'Bulk SMS sent', {
        total: phoneNumbers.length,
        successful: results.filter(r => r.success).length,
      });

      return {
        success: true,
        results,
        summary: {
          total: phoneNumbers.length,
          successful: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length,
        },
      };
    } catch (error) {
      this.logger.log('error', 'Bulk SMS failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Send Verification Code
   */
  async sendVerificationCode(phoneNumber, code, options = {}) {
    const message = `Your verification code is: ${code}. Do not share this code with anyone.`;
    return this.sendSMS(phoneNumber, message, options);
  }

  /**
   * Send OTP
   */
  async sendOTP(phoneNumber, otp, options = {}) {
    const message = `Your one-time password (OTP) is: ${otp}. Valid for 10 minutes.`;
    return this.sendSMS(phoneNumber, message, options);
  }

  /**
   * Send Alert SMS
   */
  async sendAlertSMS(phoneNumber, alertMessage, options = {}) {
    const message = `🚨 Alert: ${alertMessage}`;
    return this.sendSMS(phoneNumber, message, options);
  }

  /**
   * Send Appointment Reminder
   */
  async sendAppointmentReminder(phoneNumber, appointmentData, options = {}) {
    const { title, dateTime, location } = appointmentData;
    const message = `Reminder: ${title} on ${dateTime} at ${location}`;
    return this.sendSMS(phoneNumber, message, options);
  }

  /**
   * Send Delivery Status
   */
  async sendDeliveryStatus(phoneNumber, trackingData, options = {}) {
    const { trackingId, status, estimatedDelivery } = trackingData;
    const message = `Your package (${trackingId}) is ${status}. Estimated delivery: ${estimatedDelivery}`;
    return this.sendSMS(phoneNumber, message, options);
  }

  /**
   * Get Message Status
   */
  async getMessageStatus(messageSid) {
    if (!this.enabled) {
      return { success: true, status: 'delivered', messageSid };
    }

    try {
      const message = await this.client.messages(messageSid).fetch();

      this.logger.log('info', 'Message status retrieved', {
        messageSid,
        status: message.status,
      });

      return {
        success: true,
        messageSid: message.sid,
        status: message.status,
        to: message.to,
        from: message.from,
        price: message.price,
      };
    } catch (error) {
      this.logger.log('error', 'Failed to get message status', { error: error.message });
      throw error;
    }
  }

  /**
   * Get Account Balance
   */
  async getAccountBalance() {
    if (!this.enabled) {
      return { success: true, balance: 'N/A (mock mode)', currency: 'USD' };
    }

    try {
      const account = await this.client.api.accounts(this.accountSid).fetch();

      return {
        success: true,
        balance: account.balance,
        currency: account.currencyCode,
        status: account.status,
      };
    } catch (error) {
      this.logger.log('error', 'Failed to get account balance', { error: error.message });
      throw error;
    }
  }

  /**
   * Format Phone Number to E.164
   */
  formatPhoneNumber(phoneNumber) {
    // Remove any non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, '');

    // If doesn't start with +, add +1 (US/Canada)
    if (!phoneNumber.startsWith('+')) {
      return `+1${cleaned}`;
    }

    return `+${cleaned}`;
  }

  /**
   * Mock Send SMS (for testing/development)
   */
  mockSendSMS(phoneNumber, message) {
    this.logger.log('info', 'SMS sent (mock mode)', { to: phoneNumber });
    return {
      success: true,
      messageSid: `MOCK-${Date.now()}`,
      status: 'queued',
      to: phoneNumber,
      provider: 'mock',
    };
  }

  /**
   * Mock Send WhatsApp
   */
  mockSendWhatsApp(phoneNumber, message) {
    this.logger.log('info', 'WhatsApp message sent (mock mode)', { to: phoneNumber });
    return {
      success: true,
      messageSid: `MOCK-WA-${Date.now()}`,
      status: 'queued',
      to: phoneNumber,
      provider: 'mock_whatsapp',
    };
  }
}

module.exports = new SMSIntegrationService();
