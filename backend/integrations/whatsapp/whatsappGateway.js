/**
 * WhatsApp Gateway
 * البوابة الرئيسية لتكامل WhatsApp
 *
 * Provides a unified API for sending messages, handling templates,
 * managing media, and tracking delivery status.
 */

'use strict';

const { getProviders, sendWithFallback } = require('./providers');
const constants = require('./constants');
const logger = require('../../utils/logger');

class WhatsAppGateway {
  constructor() {
    const { primary, fallback } = getProviders();
    this.primary = primary;
    this.fallback = fallback;
    this.enabled = process.env.WHATSAPP_ENABLED === 'true' && !!(primary || fallback);
    this.stats = {
      sent: 0,
      failed: 0,
      received: 0,
      lastError: null,
    };
  }

  /**
   * Initialize the gateway and validate configuration
   */
  async init() {
    if (!this.enabled) {
      logger.info?.('[whatsapp] Gateway disabled — WHATSAPP_ENABLED is not true or no provider configured');
      return { ready: false, reason: 'disabled' };
    }

    const primaryValidation = this.primary ? this.primary.validateConfig() : { valid: false, error: 'not_configured' };
    if (!primaryValidation.valid && this.fallback) {
      const fallbackValidation = this.fallback.validateConfig();
      if (!fallbackValidation.valid) {
        this.enabled = false;
        logger.error?.('[whatsapp] Both providers invalid:', primaryValidation.error, fallbackValidation.error);
        return { ready: false, reason: 'config_error' };
      }
    }

    logger.info?.('[whatsapp] Gateway initialized — provider:', this.primary?.getName() || 'none', 'fallback:', this.fallback?.getName() || 'none');
    return { ready: true };
  }

  /**
   * Send a text message
   */
  async sendText(to, message, options = {}) {
    return this._sendWithTracking('sendText', to, message, options);
  }

  /**
   * Send a template message
   */
  async sendTemplate(to, templateName, params = {}, language = 'ar') {
    return this._sendWithTracking('sendTemplate', to, templateName, params, language);
  }

  /**
   * Send media (image, video, document, audio)
   */
  async sendMedia(to, mediaUrl, caption = '', type = 'image') {
    return this._sendWithTracking('sendMedia', to, mediaUrl, caption, type);
  }

  /**
   * Send interactive buttons
   */
  async sendInteractiveButtons(to, body, buttons) {
    return this._sendWithTracking('sendInteractiveButtons', to, body, buttons);
  }

  /**
   * Send a list message
   */
  async sendListMessage(to, body, buttonText, sections) {
    return this._sendWithTracking('sendListMessage', to, body, buttonText, sections);
  }

  /**
   * Send an OTP code
   */
  async sendOTP(to, code, ttlMinutes = 10) {
    const message = `رمز التحقق: ${code}\nصالح لـ ${ttlMinutes} دقائق. لا تشاركه مع أحد.`;
    return this.sendText(to, message, { priority: 2, tag: 'otp' });
  }

  /**
   * Send an appointment reminder
   */
  async sendAppointmentReminder(to, patientName, sessionType, date, time, location) {
    const message = `📅 تذكير بموعد\n\nالطفل: ${patientName}\nالجلسة: ${sessionType}\nالتاريخ: ${date}\nالوقت: ${time}${location ? '\nالموقع: ' + location : ''}\n\nنتمنى لكم يوماً مفيداً! 🌟`;
    return this.sendText(to, message, { tag: 'appointment_reminder' });
  }

  /**
   * Send report ready notification
   */
  async sendReportReady(to, patientName, reportType, link) {
    const message = `📋 تقرير جاهز\n\nتقرير ${reportType} لـ ${patientName} جاهز للتحميل.\n\n${link ? 'الرابط: ' + link : 'يرجى مراجعة المركز.'}`;
    return this.sendText(to, message, { tag: 'report_ready' });
  }

  /**
   * Send payment reminder
   */
  async sendPaymentReminder(to, patientName, amount, month, link) {
    const message = `💰 تذكير بالدفع\n\nفاتورة جلسات ${month} لـ ${patientName}\nالمبلغ: ${amount} ر.س\n\n${link ? 'الدفع: ' + link : 'يرجى التوجه إلى المركز.'}`;
    return this.sendText(to, message, { tag: 'payment_reminder' });
  }

  /**
   * Send payment confirmation
   */
  async sendPaymentConfirmation(to, patientName, amount, transactionId) {
    const message = `✅ تم استلام الدفع\n\nالمبلغ: ${amount} ر.س\nلـ: ${patientName}\nرقم العملية: ${transactionId}\n\nشكراً لثقتكم بمركز الأوائل ❤️`;
    return this.sendText(to, message, { tag: 'payment_confirmation' });
  }

  /**
   * Send telehealth link
   */
  async sendTelehealthLink(to, patientName, link, minutesUntilStart) {
    const message = `🔗 جلسة عن بعد\n\nمرحباً ${patientName}\nرابط الجلسة: ${link}\nتبدأ خلال ${minutesUntilStart} دقيقة.\n\nيرجى الدخول قبل 5 دقائق.`;
    return this.sendText(to, message, { tag: 'telehealth_link' });
  }

  /**
   * Send welcome message
   */
  async sendWelcome(to, patientName, fileNumber) {
    const message = `🌟 أهلاً بكم في مركز الأوائل\n\nتم تسجيل ${patientName} بنجاح.\nرقم الملف: ${fileNumber}\n\nنسعد بخدمتكم دائماً 🏥`;
    return this.sendText(to, message, { tag: 'welcome' });
  }

  /**
   * Send home program instructions
   */
  async sendHomeProgram(to, patientName, instructions, link) {
    const message = `🏠 تمرينات منزلية — ${patientName}\n\n${instructions}\n\n${link ? 'الفيديو: ' + link : ''}`;
    return this.sendText(to, message, { tag: 'home_program' });
  }

  /**
   * Send care plan update
   */
  async sendCarePlanUpdate(to, patientName, achievements, nextGoals) {
    const message = `📊 تحديث خطة العلاج — ${patientName}\n\n✅ الإنجازات:\n${achievements.map(a => '• ' + a).join('\n')}\n\n🎯 الأهداف القادمة:\n${nextGoals.map(g => '• ' + g).join('\n')}`;
    return this.sendText(to, message, { tag: 'care_plan_update' });
  }

  /**
   * Send no-show follow-up
   */
  async sendNoShowFollowUp(to, patientName, sessionDate, reschedulingLink) {
    const message = `⚠️ تغيب عن الجلسة\n\n${patientName} لم يحضر جلسة ${sessionDate}.\n\nهل تحتاج إعادة جدولة؟\n${reschedulingLink ? 'الحجز: ' + reschedulingLink : 'يرجى الاتصال بالمركز.'}`;
    return this.sendText(to, message, { tag: 'no_show' });
  }

  /**
   * Send emergency alert to medical team
   */
  async sendEmergencyAlert(to, patientName, situation, urgency) {
    const urgencyEmoji = urgency === 'high' ? '🔴' : '🟠';
    const message = `${urgencyEmoji} تنبيه طوارئ\n\nالمريض: ${patientName}\nالحالة: ${situation}\nالدرجة: ${urgency === 'high' ? 'عالية' : 'متوسطة'}\n\nيرجى التواصل فوراً.`;
    return this.sendText(to, message, { priority: 3, tag: 'emergency_alert' });
  }

  /**
   * Send a message to multiple recipients (bulk)
   */
  async sendBulk(recipients, sendFn) {
    const results = [];
    for (const recipient of recipients) {
      try {
        const result = await sendFn(recipient);
        results.push({ recipient: recipient.phone || recipient, ...result });
      } catch (err) {
        results.push({
          recipient: recipient.phone || recipient,
          success: false,
          error: err?.message || String(err),
        });
      }
    }
    return results;
  }

  /**
   * Check if the gateway is ready
   */
  isReady() {
    return this.enabled && (this.primary?.isEnabled() || this.fallback?.isEnabled());
  }

  /**
   * Get gateway statistics
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = { sent: 0, failed: 0, received: 0, lastError: null };
  }

  /**
   * Run health check on providers
   */
  async healthCheck() {
    const results = [];
    if (this.primary) {
      results.push({
        provider: this.primary.getName(),
        ...(await this.primary.healthCheck()),
      });
    }
    if (this.fallback) {
      results.push({
        provider: this.fallback.getName(),
        ...(await this.fallback.healthCheck()),
      });
    }
    return results;
  }

  // ── Private ────────────────────────────────────────────────────────

  async _sendWithTracking(methodName, ...args) {
    if (!this.isReady()) {
      const error = 'whatsapp_gateway_not_ready';
      logger.warn?.('[whatsapp]', error, { method: methodName });
      this.stats.failed++;
      this.stats.lastError = error;
      return { success: false, error };
    }

    try {
      const result = await sendWithFallback(
        (provider) => provider[methodName](...args),
        this.primary,
        this.fallback
      );

      if (result.success) {
        this.stats.sent++;
      } else {
        this.stats.failed++;
        this.stats.lastError = result.error;
      }

      return result;
    } catch (err) {
      const error = err?.message || String(err);
      this.stats.failed++;
      this.stats.lastError = error;
      logger.error?.('[whatsapp]', error, { method: methodName });
      return { success: false, error };
    }
  }
}

// Singleton instance
let _gatewayInstance = null;

function getWhatsAppGateway() {
  if (!_gatewayInstance) {
    _gatewayInstance = new WhatsAppGateway();
  }
  return _gatewayInstance;
}

module.exports = {
  WhatsAppGateway,
  getWhatsAppGateway,
};
