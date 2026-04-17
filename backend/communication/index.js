/* eslint-disable no-unused-vars */
/**
 * Communication Module - وحدة الاتصالات
 * Unified communication services for Alawael ERP
 * Includes: SMS, Email, WhatsApp, and Administrative Communications
 */

// SMS Service
const {
  SMSService,
  smsService,
  SMSTemplates,
  smsConfig,
  sendOTP: sendSMSOTP,
  verifyOTP,
  sendAlert,
  sendReminder,
} = require('./sms-service');

// Email Service
const {
  EmailService,
  emailService,
  EmailTemplates,
  emailConfig,
  sendEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendOTPEmail,
} = require('./email-service');

// WhatsApp Service
const {
  WhatsAppService,
  whatsappService,
  WhatsAppTemplates,
  whatsappConfig,
  InteractiveBuilders,
  sendWhatsAppOTP,
  sendWhatsAppNotification,
  sendWhatsAppText,
  sendWhatsAppImage,
  sendWhatsAppDocument,
} = require('./whatsapp-service');

// Administrative Communications Service
const {
  AdministrativeCommunicationsService,
  adminCommService,
  Correspondence,
  ExternalEntity,
  CorrespondenceTemplate,
  CorrespondenceAction,
  CorrespondenceType,
  Priority,
  Status,
  ConfidentialityLevel,
  SenderType,
} = require('./administrative-communications-service');

// Routes — only the ones that exist and are actively used
const emailRoutes = require('./email-routes');
const adminCommRoutes = require('./administrative-communications-routes');
const electronicDirectivesRoutes = require('./electronic-directives-routes');

// Models
const {
  Message: WhatsAppMessage,
  Conversation: WhatsAppConversation,
  Template: WhatsAppTemplate,
  OTP: WhatsAppOTP,
  BulkMessage: WhatsAppBulkMessage,
  WebhookEvent: WhatsAppWebhookEvent,
} = require('./whatsapp-models');
const logger = require('../utils/logger');

/**
 * Unified Communication Service
 * Combines all communication channels
 */
class UnifiedCommunicationService {
  constructor() {
    this.sms = smsService;
    this.email = emailService;
    this.whatsapp = whatsappService;
  }

  /**
   * Initialize all services
   */
  async initialize(connection) {
    await Promise.all([
      this.sms.initialize(connection),
      this.email.initialize(connection),
      this.whatsapp.initialize(connection),
    ]);
    logger.info('✅ All communication services initialized');
  }

  /**
   * Send notification via multiple channels
   */
  async sendMultiChannel(options) {
    const {
      channels = ['email', 'sms', 'whatsapp'],
      recipient,
      subject,
      message,
      emailOptions = {},
      smsOptions = {},
      whatsappOptions = {},
    } = options;

    const results = {};
    const errors = [];

    if (channels.includes('email') && recipient.email) {
      try {
        results.email = await this.email.send({
          to: recipient.email,
          subject,
          html: message,
          ...emailOptions,
        });
      } catch (error) {
        logger.error('Email channel send failed:', error.message);
        errors.push({ channel: 'email', error: 'فشل إرسال البريد الإلكتروني' });
      }
    }

    if (channels.includes('sms') && recipient.phone) {
      try {
        results.sms = await this.sms.send({
          to: recipient.phone,
          message: typeof message === 'string' ? message : message.sms || message.text,
          ...smsOptions,
        });
      } catch (error) {
        logger.error('SMS channel send failed:', error.message);
        errors.push({ channel: 'sms', error: 'فشل إرسال الرسالة النصية' });
      }
    }

    if (channels.includes('whatsapp') && recipient.phone) {
      try {
        results.whatsapp = await this.whatsapp.sendText(
          recipient.phone,
          typeof message === 'string' ? message : message.whatsapp || message.text,
          whatsappOptions
        );
      } catch (error) {
        logger.error('WhatsApp channel send failed:', error.message);
        errors.push({ channel: 'whatsapp', error: 'فشل إرسال رسالة واتساب' });
      }
    }

    return {
      success: Object.keys(results).length > 0,
      results,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Send OTP via preferred channel
   */
  async sendOTP(recipient, otp, channel = 'whatsapp') {
    const expiry = 5; // 5 minutes

    switch (channel) {
      case 'whatsapp':
        if (!recipient.phone) throw new Error('Phone number required for WhatsApp');
        return sendWhatsAppOTP(recipient.phone, otp, expiry);

      case 'sms':
        if (!recipient.phone) throw new Error('Phone number required for SMS');
        return sendSMSOTP(recipient.phone, 'verification');

      case 'email':
        if (!recipient.email) throw new Error('Email required for Email OTP');
        return sendOTPEmail(recipient.email, otp);

      default:
        throw new Error(`Unsupported channel: ${channel}`);
    }
  }

  /**
   * Send bulk notifications
   */
  async sendBulkNotifications(recipients, message, channels = ['whatsapp']) {
    const results = [];

    for (const recipient of recipients) {
      try {
        const result = await this.sendMultiChannel({
          channels,
          recipient,
          message,
        });
        results.push({ recipient, ...result });
      } catch (error) {
        logger.error('Bulk send failed for recipient:', error.message);
        results.push({ recipient, success: false, error: 'فشل الإرسال' });
      }
    }

    return results;
  }

  /**
   * Get templates for all channels
   */
  getTemplates() {
    return {
      sms: SMSTemplates,
      email: EmailTemplates,
      whatsapp: WhatsAppTemplates,
    };
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      sms: {
        provider: smsConfig.provider,
        status: this.sms ? 'initialized' : 'not initialized',
      },
      email: {
        provider: process.env.EMAIL_PROVIDER || 'nodemailer',
        status: this.email ? 'initialized' : 'not initialized',
      },
      whatsapp: {
        provider: whatsappConfig.provider,
        status: this.whatsapp ? 'initialized' : 'not initialized',
      },
    };
  }
}

// Singleton instance
const communicationService = new UnifiedCommunicationService();

module.exports = {
  // Services
  UnifiedCommunicationService,
  communicationService,

  // Individual services
  SMSService,
  smsService,
  EmailService,
  emailService,
  WhatsAppService,
  whatsappService,

  // Templates
  SMSTemplates,
  EmailTemplates,
  WhatsAppTemplates,
  InteractiveBuilders,

  // Configuration
  smsConfig,
  emailConfig,
  whatsappConfig,

  // Helper functions - SMS
  sendSMSOTP,
  verifyOTP,
  sendAlert,
  sendReminder,

  // Helper functions - Email
  sendEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendOTPEmail,

  // Helper functions - WhatsApp
  sendWhatsAppOTP,
  sendWhatsAppNotification,
  sendWhatsAppText,
  sendWhatsAppImage,
  sendWhatsAppDocument,

  // Routes
  emailRoutes,
  adminCommRoutes,
  electronicDirectivesRoutes,

  // WhatsApp Models
  WhatsAppMessage,
  WhatsAppConversation,
  WhatsAppTemplate,
  WhatsAppOTP,
  WhatsAppBulkMessage,
  WhatsAppWebhookEvent,
};
