/* eslint-disable no-unused-vars */
/**
 * WhatsApp Service - خدمة الوتساب
 * Enterprise WhatsApp Business API Integration for Alawael ERP
 * Supports: WhatsApp Cloud API, Twilio WhatsApp, Local Gateways
 */

const crypto = require('crypto');
const axios = require('axios');
const logger = require('../utils/logger');

/**
 * WhatsApp Configuration
 */
const whatsappConfig = {
  // Provider selection
  provider: process.env.WHATSAPP_PROVIDER || 'cloud_api', // cloud_api, twilio, local

  // WhatsApp Cloud API (Meta/Facebook)
  cloudApi: {
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID,
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
    webhookVerifyToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN,
    appId: process.env.WHATSAPP_APP_ID,
    appSecret: process.env.WHATSAPP_APP_SECRET,
    apiUrl: 'https://graph.facebook.com/v18.0',
  },

  // Twilio WhatsApp
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    fromNumber: process.env.TWILIO_WHATSAPP_NUMBER,
  },

  // Local Gateway (for Saudi providers)
  local: {
    apiUrl: process.env.WHATSAPP_API_URL,
    apiKey: process.env.WHATSAPP_API_KEY,
    instanceId: process.env.WHATSAPP_INSTANCE_ID,
  },

  // Default settings
  defaults: {
    countryCode: '966',
    businessName: process.env.BUSINESS_NAME || 'الأهداف',
    replyTimeout: 24 * 60 * 60 * 1000, // 24 hours
  },

  // Rate limiting
  rateLimit: {
    maxPerMinute: 20,
    maxPerHour: 200,
    maxPerDay: 2000,
  },

  // Templates
  templates: {
    namespace: process.env.WHATSAPP_TEMPLATE_NAMESPACE,
    languageCode: 'ar',
  },
};

/**
 * WhatsApp Message Log Schema
 */
const WhatsAppLogSchema = {
  messageId: { type: String, required: true, unique: true },
  conversationId: { type: String, index: true },
  from: { type: String },
  to: { type: String, required: true },
  direction: { type: String, enum: ['inbound', 'outbound'], required: true },
  type: {
    type: String,
    enum: [
      'text',
      'template',
      'image',
      'video',
      'document',
      'audio',
      'location',
      'contacts',
      'interactive',
      'button',
    ],
    default: 'text',
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'delivered', 'read', 'failed', 'rejected'],
    default: 'pending',
  },
  content: {
    text: String,
    mediaUrl: String,
    mediaId: String,
    filename: String,
    caption: String,
    location: { latitude: Number, longitude: Number, name: String, address: String },
    contacts: Array,
    template: { name: String, language: String, components: Array },
    interactive: { type: String, body: Object, action: Object },
  },
  template: {
    name: String,
    language: String,
    category: String,
  },
  metadata: {
    userId: String,
    tenantId: String,
    correlationId: String,
    relatedTo: { type: String, refPath: 'relatedModel' },
    relatedModel: String,
    tags: [String],
  },
  timestamps: {
    queuedAt: Date,
    sentAt: Date,
    deliveredAt: Date,
    readAt: Date,
    failedAt: Date,
  },
  error: {
    code: String,
    message: String,
    details: Object,
  },
  provider: String,
  providerId: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
};

/**
 * WhatsApp Conversation Schema
 */
const ConversationSchema = {
  conversationId: { type: String, required: true, unique: true },
  phoneNumber: { type: String, required: true, index: true },
  contactName: String,
  status: {
    type: String,
    enum: ['active', 'pending', 'resolved', 'closed', 'blocked'],
    default: 'active',
  },
  assignedTo: { type: String, ref: 'User' },
  department: String,
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  lastMessageAt: Date,
  lastMessageText: String,
  unreadCount: { type: Number, default: 0 },
  tags: [String],
  metadata: {
    userId: String,
    tenantId: String,
    leadSource: String,
    customerType: String,
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
};

/**
 * WhatsApp Service Class
 */
class WhatsAppService {
  constructor() {
    this.client = null;
    this.WhatsAppLog = null;
    this.Conversation = null;
    this.provider = whatsappConfig.provider;
    this.messageQueue = [];
    this.webhookHandlers = {};
  }

  /**
   * Initialize WhatsApp service
   */
  async initialize(connection) {
    // Create client based on provider
    switch (this.provider) {
      case 'cloud_api':
        this.client = this.createCloudApiClient();
        break;
      case 'twilio':
        this.client = this.createTwilioClient();
        break;
      default:
        this.client = this.createLocalClient();
    }

    // Initialize models
    if (connection) {
      const mongoose = require('mongoose');
      this.WhatsAppLog = connection.model('WhatsAppLog', new mongoose.Schema(WhatsAppLogSchema));
      this.Conversation = connection.model(
        'WhatsAppConversation',
        new mongoose.Schema(ConversationSchema)
      );
    }

    logger.info(`✅ WhatsApp service initialized (${this.provider})`);
  }

  /**
   * Create Cloud API client (Meta/Facebook)
   */
  createCloudApiClient() {
    return {
      type: 'cloud_api',
      phoneNumberId: whatsappConfig.cloudApi.phoneNumberId,
      accessToken: whatsappConfig.cloudApi.accessToken,
      apiUrl: whatsappConfig.cloudApi.apiUrl,
    };
  }

  /**
   * Create Twilio client
   */
  createTwilioClient() {
    const twilio = require('twilio');
    return {
      type: 'twilio',
      client: twilio(whatsappConfig.twilio.accountSid, whatsappConfig.twilio.authToken),
      fromNumber: whatsappConfig.twilio.fromNumber,
    };
  }

  /**
   * Create local gateway client
   */
  createLocalClient() {
    return {
      type: 'local',
      apiUrl: whatsappConfig.local.apiUrl,
      apiKey: whatsappConfig.local.apiKey,
      instanceId: whatsappConfig.local.instanceId,
    };
  }

  /**
   * Send text message
   */
  async sendText(to, text, options = {}) {
    return this.send({
      to,
      type: 'text',
      content: { text },
      ...options,
    });
  }

  /**
   * Send template message
   */
  async sendTemplate(to, templateName, components = [], options = {}) {
    return this.send({
      to,
      type: 'template',
      content: {
        template: {
          name: templateName,
          language: { code: options.language || whatsappConfig.templates.languageCode },
          components,
        },
      },
      ...options,
    });
  }

  /**
   * Send image message
   */
  async sendImage(to, imageUrl, caption = null, options = {}) {
    return this.send({
      to,
      type: 'image',
      content: {
        mediaUrl: imageUrl,
        caption,
      },
      ...options,
    });
  }

  /**
   * Send document message
   */
  async sendDocument(to, documentUrl, filename, caption = null, options = {}) {
    return this.send({
      to,
      type: 'document',
      content: {
        mediaUrl: documentUrl,
        filename,
        caption,
      },
      ...options,
    });
  }

  /**
   * Send video message
   */
  async sendVideo(to, videoUrl, caption = null, options = {}) {
    return this.send({
      to,
      type: 'video',
      content: {
        mediaUrl: videoUrl,
        caption,
      },
      ...options,
    });
  }

  /**
   * Send audio message
   */
  async sendAudio(to, audioUrl, options = {}) {
    return this.send({
      to,
      type: 'audio',
      content: {
        mediaUrl: audioUrl,
      },
      ...options,
    });
  }

  /**
   * Send location message
   */
  async sendLocation(to, latitude, longitude, name, address, options = {}) {
    return this.send({
      to,
      type: 'location',
      content: {
        location: { latitude, longitude, name, address },
      },
      ...options,
    });
  }

  /**
   * Send contacts message
   */
  async sendContacts(to, contacts, options = {}) {
    return this.send({
      to,
      type: 'contacts',
      content: { contacts },
      ...options,
    });
  }

  /**
   * Send interactive message (buttons or lists)
   */
  async sendInteractive(to, interactive, options = {}) {
    return this.send({
      to,
      type: 'interactive',
      content: { interactive },
      ...options,
    });
  }

  /**
   * Send message - Core method
   */
  async send(options) {
    const { to, type = 'text', content = {}, metadata = {}, replyTo = null } = options;

    // Format phone number
    const formattedPhone = this.formatPhoneNumber(to);

    // Generate message ID
    const messageId = this.generateMessageId();

    // Get or create conversation
    const conversationId = await this.getOrCreateConversation(formattedPhone);

    // Log message
    if (this.WhatsAppLog) {
      await this.WhatsAppLog.create({
        messageId,
        conversationId,
        to: formattedPhone,
        direction: 'outbound',
        type,
        content,
        status: 'pending',
        metadata,
        provider: this.provider,
        timestamps: { queuedAt: new Date() },
      });
    }

    try {
      let result;

      switch (this.client.type) {
        case 'cloud_api':
          result = await this.sendViaCloudApi(formattedPhone, type, content, replyTo);
          break;
        case 'twilio':
          result = await this.sendViaTwilio(formattedPhone, type, content);
          break;
        default:
          result = await this.sendViaLocal(formattedPhone, type, content);
      }

      // Update log
      if (this.WhatsAppLog) {
        await this.WhatsAppLog.updateOne(
          { messageId },
          {
            status: 'sent',
            providerId: result.id,
            'timestamps.sentAt': new Date(),
            updatedAt: new Date(),
          }
        );
      }

      // Update conversation
      await this.updateConversation(conversationId, {
        lastMessageAt: new Date(),
        lastMessageText: this.getMessagePreview(type, content),
      });

      return {
        success: true,
        messageId,
        providerId: result.id,
        conversationId,
      };
    } catch (error) {
      // Update log with error
      if (this.WhatsAppLog) {
        await this.WhatsAppLog.updateOne(
          { messageId },
          {
            status: 'failed',
            error: {
              code: error.code || 'UNKNOWN',
              message: 'فشل إرسال الرسالة',
              details: {},
            },
            'timestamps.failedAt': new Date(),
            updatedAt: new Date(),
          }
        );
      }

      throw error;
    }
  }

  /**
   * Send via WhatsApp Cloud API
   */
  async sendViaCloudApi(to, type, content, replyTo = null) {
    const url = `${this.client.apiUrl}/${this.client.phoneNumberId}/messages`;

    const messageData = this.buildCloudApiMessage(to, type, content, replyTo);

    const response = await axios.post(url, messageData, {
      headers: {
        Authorization: `Bearer ${this.client.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    return {
      id: response.data.messages?.[0]?.id || response.data.message_id,
      data: response.data,
    };
  }

  /**
   * Build Cloud API message payload
   */
  buildCloudApiMessage(to, type, content, replyTo = null) {
    const message = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: to,
    };

    if (replyTo) {
      message.context = { message_id: replyTo };
    }

    switch (type) {
      case 'text':
        message.type = 'text';
        message.text = { body: content.text, preview_url: true };
        break;

      case 'template':
        message.type = 'template';
        message.template = content.template;
        break;

      case 'image':
        message.type = 'image';
        message.image = {
          ...(content.mediaId ? { id: content.mediaId } : { link: content.mediaUrl }),
          caption: content.caption,
        };
        break;

      case 'video':
        message.type = 'video';
        message.video = {
          ...(content.mediaId ? { id: content.mediaId } : { link: content.mediaUrl }),
          caption: content.caption,
        };
        break;

      case 'document':
        message.type = 'document';
        message.document = {
          ...(content.mediaId ? { id: content.mediaId } : { link: content.mediaUrl }),
          filename: content.filename,
          caption: content.caption,
        };
        break;

      case 'audio':
        message.type = 'audio';
        message.audio = content.mediaId ? { id: content.mediaId } : { link: content.mediaUrl };
        break;

      case 'location':
        message.type = 'location';
        message.location = content.location;
        break;

      case 'contacts':
        message.type = 'contacts';
        message.contacts = content.contacts;
        break;

      case 'interactive':
        message.type = 'interactive';
        message.interactive = content.interactive;
        break;

      default:
        throw new Error(`Unsupported message type: ${type}`);
    }

    return message;
  }

  /**
   * Send via Twilio
   */
  async sendViaTwilio(to, type, content) {
    const from = `whatsapp:${this.client.fromNumber}`;
    const toNumber = `whatsapp:${to}`;

    const messageData = { from, to: toNumber };

    switch (type) {
      case 'text':
        messageData.body = content.text;
        break;
      case 'image':
        messageData.mediaUrl = content.mediaUrl;
        messageData.body = content.caption;
        break;
      case 'video':
        messageData.mediaUrl = content.mediaUrl;
        messageData.body = content.caption;
        break;
      case 'document':
        messageData.mediaUrl = content.mediaUrl;
        messageData.body = content.caption || content.filename;
        break;
      default:
        messageData.body = JSON.stringify(content);
    }

    const result = await this.client.client.messages.create(messageData);

    return {
      id: result.sid,
      data: result,
    };
  }

  /**
   * Send via local gateway
   */
  async sendViaLocal(to, type, content) {
    const payload = {
      apiKey: this.client.apiKey,
      instanceId: this.client.instanceId,
      to: to,
      type: type,
    };

    switch (type) {
      case 'text':
        payload.message = content.text;
        break;
      case 'image':
        payload.image = content.mediaUrl;
        payload.caption = content.caption;
        break;
      case 'document':
        payload.document = content.mediaUrl;
        payload.filename = content.filename;
        break;
      default:
        payload.message = JSON.stringify(content);
    }

    const response = await axios.post(this.client.apiUrl, payload);

    return {
      id: response.data.messageId || response.data.id,
      data: response.data,
    };
  }

  /**
   * Send bulk messages
   */
  async sendBulk(recipients, message, options = {}) {
    const results = [];
    const { delay = 1000, batchSize = 10 } = options;

    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);

      const batchResults = await Promise.allSettled(
        batch.map(recipient =>
          this.send({
            to: recipient.phone || recipient,
            type: typeof message === 'object' ? message.type : 'text',
            content: typeof message === 'function' ? message(recipient) : message,
            metadata: { ...options.metadata, batchIndex: i },
          })
        )
      );

      results.push(
        ...batchResults.map((r, idx) => ({
          phone: batch[idx].phone || batch[idx],
          ...(r.status === 'fulfilled' ? r.value : { success: false, error: r.reason?.message }),
        }))
      );

      // Delay between batches
      if (i + batchSize < recipients.length) {
        await this.delay(delay);
      }
    }

    return results;
  }

  /**
   * Process incoming webhook
   */
  async processWebhook(payload) {
    const { entry } = payload;

    if (!entry || !entry[0]) {
      return { success: false, error: 'Invalid webhook payload' };
    }

    const changes = entry[0].changes;
    if (!changes || !changes[0]) {
      return { success: false, error: 'No changes in webhook payload' };
    }

    const value = changes[0].value;
    const messages = value.messages || [];
    const statuses = value.statuses || [];

    const results = [];

    // Process incoming messages
    for (const message of messages) {
      try {
        const result = await this.handleIncomingMessage(message, value);
        results.push(result);
      } catch (error) {
        logger.error('WhatsApp incoming message handling failed:', error.message);
        results.push({ success: false, messageId: message.id, error: 'فشل معالجة الرسالة' });
      }
    }

    // Process status updates
    for (const status of statuses) {
      try {
        await this.handleStatusUpdate(status);
      } catch (error) {
        logger.error('Status update error:', error);
      }
    }

    return { success: true, processed: results };
  }

  /**
   * Handle incoming message
   */
  async handleIncomingMessage(message, metadata) {
    const {
      id,
      from,
      timestamp,
      type,
      text,
      image,
      video,
      document,
      audio,
      location,
      contacts,
      interactive,
      context,
    } = message;

    const conversationId = await this.getOrCreateConversation(from);

    // Build content
    const content = {};
    switch (type) {
      case 'text':
        content.text = text?.body;
        break;
      case 'image':
        content.mediaId = image?.id;
        content.caption = image?.caption;
        content.mediaUrl = image?.url || (await this.getMediaUrl(image?.id));
        break;
      case 'video':
        content.mediaId = video?.id;
        content.caption = video?.caption;
        break;
      case 'document':
        content.mediaId = document?.id;
        content.filename = document?.filename;
        content.caption = document?.caption;
        break;
      case 'audio':
        content.mediaId = audio?.id;
        break;
      case 'location':
        content.location = location;
        break;
      case 'contacts':
        content.contacts = contacts;
        break;
      case 'interactive':
        content.interactive = interactive;
        break;
    }

    // Log incoming message
    if (this.WhatsAppLog) {
      await this.WhatsAppLog.create({
        messageId: id,
        conversationId,
        from,
        to: whatsappConfig.cloudApi.phoneNumberId,
        direction: 'inbound',
        type,
        content,
        status: 'delivered',
        metadata: {
          context: context?.id,
          replyTo: context?.id,
        },
        provider: this.provider,
        providerId: id,
        timestamps: {
          sentAt: new Date(parseInt(timestamp) * 1000),
          deliveredAt: new Date(),
        },
      });
    }

    // Update conversation
    await this.updateConversation(conversationId, {
      lastMessageAt: new Date(),
      lastMessageText: this.getMessagePreview(type, content),
      $inc: { unreadCount: 1 },
    });

    // Trigger webhook handlers
    await this.triggerWebhookHandler('message', {
      messageId: id,
      conversationId,
      from,
      type,
      content,
      metadata,
    });

    return { success: true, messageId: id, conversationId };
  }

  /**
   * Handle status update
   */
  async handleStatusUpdate(status) {
    const { id, status: messageStatus, timestamp, recipient_id, errors } = status;

    if (this.WhatsAppLog) {
      const updateData = {
        status: messageStatus,
        updatedAt: new Date(),
      };

      // Map WhatsApp status to internal status
      const statusMap = {
        sent: { 'timestamps.sentAt': new Date(parseInt(timestamp) * 1000) },
        delivered: { 'timestamps.deliveredAt': new Date(parseInt(timestamp) * 1000) },
        read: { 'timestamps.readAt': new Date(parseInt(timestamp) * 1000) },
        failed: {
          'timestamps.failedAt': new Date(),
          error: errors?.[0] || { message: 'Unknown error' },
        },
      };

      if (statusMap[messageStatus]) {
        Object.assign(updateData, statusMap[messageStatus]);
      }

      await this.WhatsAppLog.updateOne({ providerId: id }, updateData);
    }

    // Trigger webhook handlers
    await this.triggerWebhookHandler('status', {
      messageId: id,
      status: messageStatus,
      recipientId: recipient_id,
      timestamp: new Date(parseInt(timestamp) * 1000),
      errors,
    });

    return { success: true };
  }

  /**
   * Verify webhook
   */
  verifyWebhook(mode, token, challenge) {
    const verifyToken = whatsappConfig.cloudApi.webhookVerifyToken;

    if (mode === 'subscribe' && token === verifyToken) {
      return { success: true, challenge };
    }

    return { success: false, error: 'Verification failed' };
  }

  /**
   * Register webhook handler
   */
  on(event, handler) {
    if (!this.webhookHandlers[event]) {
      this.webhookHandlers[event] = [];
    }
    this.webhookHandlers[event].push(handler);
  }

  /**
   * Trigger webhook handlers
   */
  async triggerWebhookHandler(event, data) {
    const handlers = this.webhookHandlers[event] || [];
    for (const handler of handlers) {
      try {
        await handler(data);
      } catch (error) {
        logger.error(`Webhook handler error (${event}):`, error);
      }
    }
  }

  /**
   * Get or create conversation
   */
  async getOrCreateConversation(phoneNumber) {
    if (!this.Conversation) {
      return `conv_${phoneNumber}`;
    }

    let conversation = await this.Conversation.findOne({ phoneNumber });

    if (!conversation) {
      conversation = await this.Conversation.create({
        conversationId: `conv_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
        phoneNumber,
        status: 'active',
        lastMessageAt: new Date(),
      });
    }

    return conversation.conversationId;
  }

  /**
   * Update conversation
   */
  async updateConversation(conversationId, updates) {
    if (!this.Conversation) return;

    await this.Conversation.updateOne(
      { conversationId },
      { $set: { ...updates, updatedAt: new Date() } }
    );
  }

  /**
   * Get media URL
   */
  async getMediaUrl(mediaId) {
    if (!mediaId) return null;

    try {
      const url = `${this.client.apiUrl}/${mediaId}`;
      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${this.client.accessToken}`,
        },
      });
      return response.data.url;
    } catch (error) {
      logger.error('Error getting media URL:', error);
      return null;
    }
  }

  /**
   * Download media
   */
  async downloadMedia(mediaUrl) {
    try {
      const response = await axios.get(mediaUrl, {
        headers: {
          Authorization: `Bearer ${this.client.accessToken}`,
        },
        responseType: 'arraybuffer',
      });
      return response.data;
    } catch (error) {
      logger.error('Error downloading media:', error);
      throw error;
    }
  }

  /**
   * Upload media
   */
  async uploadMedia(filePathOrBuffer, filename) {
    const FormData = require('form-data');
    const fs = require('fs');

    const formData = new FormData();

    if (Buffer.isBuffer(filePathOrBuffer)) {
      formData.append('file', filePathOrBuffer, { filename });
    } else {
      formData.append('file', fs.createReadStream(filePathOrBuffer));
    }

    formData.append('messaging_product', 'whatsapp');
    formData.append('type', 'image'); // or video, document

    const url = `${this.client.apiUrl}/${this.client.phoneNumberId}/media`;

    const response = await axios.post(url, formData, {
      headers: {
        Authorization: `Bearer ${this.client.accessToken}`,
        ...formData.getHeaders(),
      },
    });

    return response.data;
  }

  /**
   * Mark message as read
   */
  async markAsRead(messageId) {
    const url = `${this.client.apiUrl}/${this.client.phoneNumberId}/messages`;

    await axios.post(
      url,
      {
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId,
      },
      {
        headers: {
          Authorization: `Bearer ${this.client.accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return { success: true };
  }

  /**
   * Format phone number
   */
  formatPhoneNumber(phone) {
    // Remove all non-digits
    let cleaned = phone.replace(/\D/g, '');

    // Remove leading zeros
    cleaned = cleaned.replace(/^0+/, '');

    // Add country code if not present
    if (!cleaned.startsWith(whatsappConfig.defaults.countryCode)) {
      cleaned = whatsappConfig.defaults.countryCode + cleaned;
    }

    return cleaned;
  }

  /**
   * Generate message ID
   */
  generateMessageId() {
    return `wa_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  /**
   * Get message preview
   */
  getMessagePreview(type, content) {
    switch (type) {
      case 'text':
        return content.text?.substring(0, 100);
      case 'image':
        return content.caption || '[صورة]';
      case 'video':
        return content.caption || '[فيديو]';
      case 'document':
        return content.filename || content.caption || '[مستند]';
      case 'audio':
        return '[رسالة صوتية]';
      case 'location':
        return `[موقع] ${content.location?.name || ''}`;
      case 'contacts':
        return '[جهة اتصال]';
      case 'interactive':
        return content.interactive?.body?.text?.substring(0, 100) || '[رسالة تفاعلية]';
      default:
        return '[رسالة]';
    }
  }

  /**
   * Delay helper
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get message statistics
   */
  async getStats(options = {}) {
    if (!this.WhatsAppLog) return null;

    const { startDate, endDate, tenantId } = options;

    const match = { direction: 'outbound' };
    if (tenantId) match['metadata.tenantId'] = tenantId;
    if (startDate || endDate) {
      match.createdAt = {};
      if (startDate) match.createdAt.$gte = new Date(startDate);
      if (endDate) match.createdAt.$lte = new Date(endDate);
    }

    const byStatus = await this.WhatsAppLog.aggregate([
      { $match: match },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const byType = await this.WhatsAppLog.aggregate([
      { $match: match },
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ]);

    const total = await this.WhatsAppLog.countDocuments(match);
    const delivered = byStatus.find(s => s._id === 'delivered')?.count || 0;
    const read = byStatus.find(s => s._id === 'read')?.count || 0;

    return {
      total,
      delivered,
      read,
      deliveryRate: total > 0 ? ((delivered / total) * 100).toFixed(2) : 0,
      readRate: delivered > 0 ? ((read / delivered) * 100).toFixed(2) : 0,
      byStatus: byStatus.reduce((acc, s) => {
        acc[s._id] = s.count;
        return acc;
      }, {}),
      byType: byType.reduce((acc, t) => {
        acc[t._id] = t.count;
        return acc;
      }, {}),
    };
  }

  /**
   * Get conversations
   */
  async getConversations(options = {}) {
    if (!this.Conversation) return [];

    const { status, assignedTo, limit = 50, skip = 0 } = options;

    const query = {};
    if (status) query.status = status;
    if (assignedTo) query.assignedTo = assignedTo;

    return this.Conversation.find(query).sort({ lastMessageAt: -1 }).skip(skip).limit(limit);
  }

  /**
   * Get conversation messages
   */
  async getConversationMessages(conversationId, options = {}) {
    if (!this.WhatsAppLog) return [];

    const { limit = 100, skip = 0, before, after } = options;

    const query = { conversationId };
    if (before) query.createdAt = { $lt: new Date(before) };
    if (after) query.createdAt = { $gt: new Date(after) };

    return this.WhatsAppLog.find(query).sort({ createdAt: 1 }).skip(skip).limit(limit);
  }
}

// Singleton instance
const whatsappService = new WhatsAppService();

/**
 * WhatsApp Message Templates - Predefined Arabic Templates
 */
const WhatsAppTemplates = {
  // Authentication
  OTP_VERIFICATION: (otp, expiry = 5) => ({
    name: 'otp_verification',
    language: { code: 'ar' },
    components: [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: otp },
          { type: 'text', text: String(expiry) },
        ],
      },
    ],
  }),

  // Welcome
  WELCOME: name => ({
    name: 'welcome_message',
    language: { code: 'ar' },
    components: [
      {
        type: 'body',
        parameters: [{ type: 'text', text: name }],
      },
    ],
  }),

  // Order confirmation
  ORDER_CONFIRMATION: (orderId, amount, deliveryDate) => ({
    name: 'order_confirmation',
    language: { code: 'ar' },
    components: [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: orderId },
          { type: 'text', text: amount },
          { type: 'text', text: deliveryDate },
        ],
      },
    ],
  }),

  // Appointment reminder
  APPOINTMENT_REMINDER: (patientName, doctorName, date, time, location) => ({
    name: 'appointment_reminder',
    language: { code: 'ar' },
    components: [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: patientName },
          { type: 'text', text: doctorName },
          { type: 'text', text: date },
          { type: 'text', text: time },
          { type: 'text', text: location },
        ],
      },
    ],
  }),

  // Payment reminder
  PAYMENT_REMINDER: (invoiceNumber, amount, dueDate) => ({
    name: 'payment_reminder',
    language: { code: 'ar' },
    components: [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: invoiceNumber },
          { type: 'text', text: amount },
          { type: 'text', text: dueDate },
        ],
      },
    ],
  }),

  // Leave request
  LEAVE_STATUS: (employeeName, status, startDate, endDate, reason = '') => ({
    name: 'leave_status',
    language: { code: 'ar' },
    components: [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: employeeName },
          { type: 'text', text: status },
          { type: 'text', text: startDate },
          { type: 'text', text: endDate },
          ...(reason ? [{ type: 'text', text: reason }] : []),
        ],
      },
    ],
  }),

  // Salary credited
  SALARY_CREDITED: (employeeName, amount, month) => ({
    name: 'salary_credited',
    language: { code: 'ar' },
    components: [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: employeeName },
          { type: 'text', text: amount },
          { type: 'text', text: month },
        ],
      },
    ],
  }),

  // Document ready
  DOCUMENT_READY: (documentName, documentType) => ({
    name: 'document_ready',
    language: { code: 'ar' },
    components: [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: documentName },
          { type: 'text', text: documentType },
        ],
      },
    ],
  }),

  // Generic notification
  NOTIFICATION: (title, message) => ({
    name: 'notification',
    language: { code: 'ar' },
    components: [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: title },
          { type: 'text', text: message },
        ],
      },
    ],
  }),
};

/**
 * Interactive Message Builders
 */
const InteractiveBuilders = {
  // Quick reply buttons
  quickReply: (bodyText, buttons) => ({
    type: 'button',
    body: { text: bodyText },
    action: {
      buttons: buttons.map((btn, index) => ({
        type: 'reply',
        reply: { id: btn.id || `btn_${index}`, title: btn.title },
      })),
    },
  }),

  // List message
  list: (bodyText, buttonText, sections) => ({
    type: 'list',
    body: { text: bodyText },
    action: {
      button: buttonText,
      sections: sections.map(section => ({
        title: section.title,
        rows: section.rows.map(row => ({
          id: row.id,
          title: row.title,
          description: row.description,
        })),
      })),
    },
  }),

  // Call to action
  callToAction: (bodyText, buttonText, url) => ({
    type: 'cta_url',
    body: { text: bodyText },
    action: {
      name: 'cta_url',
      parameters: {
        display_text: buttonText,
        url: url,
      },
    },
  }),

  // Location request
  locationRequest: bodyText => ({
    type: 'location_request_message',
    body: { text: bodyText },
    action: {
      name: 'send_location',
    },
  }),
};

/**
 * Helper functions
 */
const sendWhatsAppOTP = async (phoneNumber, otp, expiry = 5) => {
  return whatsappService.sendTemplate(phoneNumber, WhatsAppTemplates.OTP_VERIFICATION(otp, expiry));
};

const sendWhatsAppNotification = async (phoneNumber, title, message) => {
  return whatsappService.sendTemplate(phoneNumber, WhatsAppTemplates.NOTIFICATION(title, message));
};

const sendWhatsAppText = async (phoneNumber, text, options = {}) => {
  return whatsappService.sendText(phoneNumber, text, options);
};

const sendWhatsAppImage = async (phoneNumber, imageUrl, caption = null) => {
  return whatsappService.sendImage(phoneNumber, imageUrl, caption);
};

const sendWhatsAppDocument = async (phoneNumber, documentUrl, filename, caption = null) => {
  return whatsappService.sendDocument(phoneNumber, documentUrl, filename, caption);
};

module.exports = {
  WhatsAppService,
  whatsappService,
  whatsappConfig,
  WhatsAppTemplates,
  InteractiveBuilders,
  sendWhatsAppOTP,
  sendWhatsAppNotification,
  sendWhatsAppText,
  sendWhatsAppImage,
  sendWhatsAppDocument,
};
