/**
 * Base WhatsApp Provider
 * الواجهة الأساسية لجميع مزودي WhatsApp
 */

'use strict';

class BaseWhatsAppProvider {
  constructor(config = {}) {
    this.name = 'base';
    this.config = config;
    this.enabled = config.enabled !== false;
  }

  /**
   * Validate the provider configuration
   */
  validateConfig() {
    throw new Error('validateConfig() must be implemented by subclass');
  }

  /**
   * Send a text message
   * @param {string} to - Phone number in international format (9665XXXXXXXX)
   * @param {string} message - Message text
   * @param {object} options - Additional options
   * @returns {Promise<{success: boolean, messageId: string|null, error: string|null}>}
   */
  async sendText(to, message, options = {}) {
    throw new Error('sendText() must be implemented by subclass');
  }

  /**
   * Send a template message
   * @param {string} to - Phone number
   * @param {string} templateName - Template name
   * @param {object} params - Template parameters
   * @param {string} language - Language code (ar, en)
   * @returns {Promise<{success: boolean, messageId: string|null, error: string|null}>}
   */
  async sendTemplate(to, templateName, params = {}, language = 'ar') {
    throw new Error('sendTemplate() must be implemented by subclass');
  }

  /**
   * Send media (image, video, document)
   * @param {string} to - Phone number
   * @param {string} mediaUrl - Public URL of the media
   * @param {string} caption - Optional caption
   * @param {string} type - Media type: image, video, document, audio
   * @returns {Promise<{success: boolean, messageId: string|null, error: string|null}>}
   */
  async sendMedia(to, mediaUrl, caption = '', type = 'image') {
    throw new Error('sendMedia() must be implemented by subclass');
  }

  /**
   * Send an interactive message with buttons
   * @param {string} to - Phone number
   * @param {string} body - Message body
   * @param {Array} buttons - Array of button objects {id, title}
   * @returns {Promise<{success: boolean, messageId: string|null, error: string|null}>}
   */
  async sendInteractiveButtons(to, body, buttons) {
    throw new Error('sendInteractiveButtons() must be implemented by subclass');
  }

  /**
   * Send a list message
   * @param {string} to - Phone number
   * @param {string} body - Message body
   * @param {string} buttonText - List button text
   * @param {Array} sections - Array of sections with rows
   * @returns {Promise<{success: boolean, messageId: string|null, error: string|null}>}
   */
  async sendListMessage(to, body, buttonText, sections) {
    throw new Error('sendListMessage() must be implemented by subclass');
  }

  /**
   * Verify a webhook signature
   * @param {string} signature - Signature from headers
   * @param {string} body - Raw request body
   * @param {string} secret - Webhook secret
   * @returns {boolean}
   */
  verifyWebhookSignature(signature, body, secret) {
    // Default: no signature verification
    return true;
  }

  /**
   * Parse an incoming webhook payload
   * @param {object} payload - Raw webhook body
   * @returns {Array<{type: string, data: object}>} - Parsed events
   */
  parseWebhook(payload) {
    throw new Error('parseWebhook() must be implemented by subclass');
  }

  /**
   * Get delivery status of a message
   * @param {string} messageId - Message ID from the provider
   * @returns {Promise<{status: string, deliveredAt: Date|null, readAt: Date|null}>}
   */
  async getMessageStatus(messageId) {
    // Default: return unknown
    return { status: 'unknown', deliveredAt: null, readAt: null };
  }

  /**
   * Format a phone number to international format
   * @param {string} phone - Raw phone number
   * @returns {string} - Formatted number (9665XXXXXXXX)
   */
  formatPhoneNumber(phone) {
    if (!phone) return '';
    let cleaned = String(phone).replace(/[^\d+]/g, '');
    // Remove leading +
    cleaned = cleaned.replace(/^\+/, '');
    // If starts with 0, replace with 966
    if (cleaned.startsWith('0')) {
      cleaned = '966' + cleaned.substring(1);
    }
    // If starts with 5, add 966
    if (cleaned.startsWith('5')) {
      cleaned = '966' + cleaned;
    }
    return cleaned;
  }

  /**
   * Health check for the provider
   * @returns {Promise<{healthy: boolean, latency: number, error: string|null}>}
   */
  async healthCheck() {
    return { healthy: false, latency: 0, error: 'not_implemented' };
  }

  /**
   * Get provider name
   */
  getName() {
    return this.name;
  }

  /**
   * Check if provider is enabled
   */
  isEnabled() {
    return this.enabled;
  }
}

module.exports = BaseWhatsAppProvider;
