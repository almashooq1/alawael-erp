/**
 * Notification Center - مركز الإشعارات
 * Enterprise Notification Management for Alawael ERP
 */

const mongoose = require('mongoose');

/**
 * Notification Configuration
 */
const notificationConfig = {
  // Channels
  channels: ['in_app', 'email', 'sms', 'push', 'slack', 'webhook'],
  
  // Priorities
  priorities: ['low', 'normal', 'high', 'urgent'],
  
  // Retention
  retention: {
    read: 30, // days
    unread: 90, // days
  },
  
  // Rate limits
  rateLimits: {
    perUser: 100, // per hour
    perTenant: 1000, // per hour
  },
};

/**
 * Notification Template Schema
 */
const NotificationTemplateSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  category: String,
  
  // Content
  title: { type: String, required: true },
  body: { type: String, required: true },
  
  // Variables
  variables: [{
    name: String,
    description: String,
    defaultValue: mongoose.Schema.Types.Mixed,
  }],
  
  // Channels
  channels: [{
    channel: { type: String, enum: notificationConfig.channels },
    enabled: { type: Boolean, default: true },
    template: String, // Override template for specific channel
  }],
  
  // Default settings
  defaults: {
    priority: { type: String, enum: notificationConfig.priorities, default: 'normal' },
    icon: String,
    color: String,
    actionUrl: String,
  },
  
  // Localization
  translations: {
    ar: { title: String, body: String },
    en: { title: String, body: String },
  },
  
  // Metadata
  isActive: { type: Boolean, default: true },
  tenantId: String,
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
}, {
  collection: 'notification_templates',
});

/**
 * Notification Schema
 */
const NotificationSchema = new mongoose.Schema({
  // Template reference
  templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'NotificationTemplate' },
  templateName: String,
  
  // Content
  title: { type: String, required: true },
  body: { type: String, required: true },
  data: mongoose.Schema.Types.Mixed,
  
  // Recipient
  recipient: {
    userId: { type: String, required: true },
    email: String,
    phone: String,
    deviceTokens: [String],
  },
  
  // Channel
  channel: { type: String, enum: notificationConfig.channels, default: 'in_app' },
  
  // Priority
  priority: { type: String, enum: notificationConfig.priorities, default: 'normal' },
  
  // Status
  status: { type: String, enum: ['pending', 'sent', 'delivered', 'read', 'failed'], default: 'pending' },
  
  // Read status
  isRead: { type: Boolean, default: false },
  readAt: Date,
  
  // Delivery
  sentAt: Date,
  deliveredAt: Date,
  
  // Retry
  retryCount: { type: Number, default: 0 },
  lastError: String,
  
  // Scheduling
  scheduledAt: Date,
  
  // Expiry
  expiresAt: Date,
  
  // Action
  actionUrl: String,
  actionText: String,
  
  // Metadata
  icon: String,
  color: String,
  image: String,
  sound: String,
  
  // Reference
  referenceType: String, // e.g., 'order', 'invoice', 'user'
  referenceId: String,
  
  // Tenant
  tenantId: String,
  
  // Timestamps
  createdAt: { type: Date, default: Date.now, expires: '90d' },
}, {
  collection: 'notifications',
});

// Indexes
NotificationSchema.index({ 'recipient.userId': 1, createdAt: -1 });
NotificationSchema.index({ status: 1, scheduledAt: 1 });
NotificationSchema.index({ tenantId: 1 });

/**
 * Notification Preferences Schema
 */
const NotificationPreferencesSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  tenantId: String,
  
  // Global preferences
  enabled: { type: Boolean, default: true },
  
  // Channel preferences
  channels: {
    in_app: { type: Boolean, default: true },
    email: { type: Boolean, default: true },
    sms: { type: Boolean, default: false },
    push: { type: Boolean, default: true },
  },
  
  // Category preferences
  categories: [{
    category: String,
    enabled: { type: Boolean, default: true },
    channels: mongoose.Schema.Types.Mixed,
  }],
  
  // Quiet hours
  quietHours: {
    enabled: { type: Boolean, default: false },
    start: String, // "22:00"
    end: String, // "08:00"
    timezone: { type: String, default: 'Asia/Riyadh' },
  },
  
  // Digest settings
  digest: {
    enabled: { type: Boolean, default: false },
    frequency: { type: String, enum: ['hourly', 'daily', 'weekly'], default: 'daily' },
    lastSent: Date,
  },
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date,
}, {
  collection: 'notification_preferences',
});

// Unique index
NotificationPreferencesSchema.index({ userId: 1, tenantId: 1 }, { unique: true });

/**
 * Notification Center Class
 */
class NotificationCenter {
  constructor() {
    this.Notification = null;
    this.NotificationTemplate = null;
    this.NotificationPreferences = null;
    this.channelProviders = new Map();
  }
  
  /**
   * Initialize
   */
  async initialize(connection) {
    this.Notification = connection.model('Notification', NotificationSchema);
    this.NotificationTemplate = connection.model('NotificationTemplate', NotificationTemplateSchema);
    this.NotificationPreferences = connection.model('NotificationPreferences', NotificationPreferencesSchema);
    
    // Register default providers
    this.registerDefaultProviders();
    
    // Create default templates
    await this.createDefaultTemplates();
    
    console.log('✅ Notification Center initialized');
  }
  
  /**
   * Register default providers
   */
  registerDefaultProviders() {
    // In-app provider
    this.registerProvider('in_app', async (notification) => {
      // Store in database (already done)
      return { delivered: true, channel: 'in_app' };
    });
    
    // Email provider placeholder
    this.registerProvider('email', async (notification) => {
      // Would use email service
      console.log(`Sending email to ${notification.recipient.email}`);
      return { delivered: true, channel: 'email' };
    });
    
    // SMS provider placeholder
    this.registerProvider('sms', async (notification) => {
      console.log(`Sending SMS to ${notification.recipient.phone}`);
      return { delivered: true, channel: 'sms' };
    });
    
    // Push provider placeholder
    this.registerProvider('push', async (notification) => {
      console.log(`Sending push to ${notification.recipient.userId}`);
      return { delivered: true, channel: 'push' };
    });
    
    // Webhook provider
    this.registerProvider('webhook', async (notification) => {
      if (notification.data?.webhookUrl) {
        const axios = require('axios');
        await axios.post(notification.data.webhookUrl, notification);
      }
      return { delivered: true, channel: 'webhook' };
    });
  }
  
  /**
   * Register provider
   */
  registerProvider(channel, handler) {
    this.channelProviders.set(channel, handler);
  }
  
  /**
   * Create default templates
   */
  async createDefaultTemplates() {
    const templates = [
      {
        name: 'welcome',
        category: 'user',
        title: 'مرحباً بك في الأهداف!',
        body: 'مرحباً {{name}}، نشكرك على انضمامك إلينا.',
        variables: [{ name: 'name', description: 'اسم المستخدم' }],
        channels: [
          { channel: 'in_app', enabled: true },
          { channel: 'email', enabled: true },
        ],
        defaults: { priority: 'normal', icon: 'welcome', color: '#4CAF50' },
      },
      {
        name: 'password_reset',
        category: 'security',
        title: 'إعادة تعيين كلمة المرور',
        body: 'تم طلب إعادة تعيين كلمة المرور. الرمز: {{code}}',
        variables: [{ name: 'code', description: 'رمز التحقق' }],
        channels: [
          { channel: 'email', enabled: true },
          { channel: 'sms', enabled: true },
        ],
        defaults: { priority: 'high', icon: 'security', color: '#FF9800' },
      },
      {
        name: 'order_created',
        category: 'orders',
        title: 'طلب جديد',
        body: 'تم إنشاء طلب جديد رقم {{orderNumber}}',
        variables: [
          { name: 'orderNumber', description: 'رقم الطلب' },
        ],
        channels: [
          { channel: 'in_app', enabled: true },
          { channel: 'email', enabled: true },
        ],
        defaults: { priority: 'normal', icon: 'order', color: '#2196F3' },
      },
      {
        name: 'invoice_paid',
        category: 'finance',
        title: 'تم دفع الفاتورة',
        body: 'تم دفع الفاتورة رقم {{invoiceNumber}} بمبلغ {{amount}}',
        variables: [
          { name: 'invoiceNumber', description: 'رقم الفاتورة' },
          { name: 'amount', description: 'المبلغ' },
        ],
        channels: [
          { channel: 'in_app', enabled: true },
          { channel: 'email', enabled: true },
        ],
        defaults: { priority: 'normal', icon: 'payment', color: '#4CAF50' },
      },
      {
        name: 'low_stock',
        category: 'inventory',
        title: 'مخزون منخفض',
        body: 'المنتج {{productName}} وصل للحد الأدنى ({{quantity}} متبقي)',
        variables: [
          { name: 'productName', description: 'اسم المنتج' },
          { name: 'quantity', description: 'الكمية المتبقية' },
        ],
        channels: [{ channel: 'in_app', enabled: true }],
        defaults: { priority: 'high', icon: 'warning', color: '#F44336' },
      },
      {
        name: 'task_assigned',
        category: 'tasks',
        title: 'مهمة جديدة',
        body: 'تم تعيين مهمة "{{taskTitle}}" لك',
        variables: [{ name: 'taskTitle', description: 'عنوان المهمة' }],
        channels: [
          { channel: 'in_app', enabled: true },
          { channel: 'email', enabled: true },
        ],
        defaults: { priority: 'normal', icon: 'task', color: '#9C27B0' },
      },
    ];
    
    for (const template of templates) {
      const existing = await this.NotificationTemplate.findOne({ name: template.name });
      if (!existing) {
        await this.NotificationTemplate.create(template);
      }
    }
  }
  
  /**
   * Send notification
   */
  async send(options) {
    const {
      templateName,
      recipient,
      data = {},
      channels = ['in_app'],
      priority = 'normal',
      scheduledAt,
      referenceType,
      referenceId,
      tenantId,
    } = options;
    
    // Get template if specified
    let template = null;
    if (templateName) {
      template = await this.NotificationTemplate.findOne({ name: templateName, isActive: true });
    }
    
    // Build notification content
    const notification = {
      templateId: template?._id,
      templateName,
      title: this.interpolate(template?.title || options.title, data),
      body: this.interpolate(template?.body || options.body, data),
      data,
      recipient,
      channel: channels[0],
      priority: template?.defaults?.priority || priority,
      icon: template?.defaults?.icon || options.icon,
      color: template?.defaults?.color || options.color,
      actionUrl: options.actionUrl || template?.defaults?.actionUrl,
      referenceType,
      referenceId,
      tenantId,
      scheduledAt,
      expiresAt: scheduledAt ? new Date(scheduledAt.getTime() + 7 * 24 * 60 * 60 * 1000) : undefined,
    };
    
    // Create notification
    const notificationDoc = await this.Notification.create(notification);
    
    // Send through channels
    if (!scheduledAt || scheduledAt <= new Date()) {
      await this.deliver(notificationDoc, channels);
    }
    
    return notificationDoc;
  }
  
  /**
   * Deliver notification
   */
  async deliver(notification, channels) {
    for (const channel of channels) {
      const provider = this.channelProviders.get(channel);
      if (provider) {
        try {
          notification.channel = channel;
          const result = await provider(notification);
          
          notification.status = 'sent';
          notification.sentAt = new Date();
          await notification.save();
          
        } catch (error) {
          notification.status = 'failed';
          notification.lastError = error.message;
          notification.retryCount += 1;
          await notification.save();
        }
      }
    }
  }
  
  /**
   * Interpolate variables
   */
  interpolate(template, data) {
    if (!template) return '';
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] !== undefined ? data[key] : match;
    });
  }
  
  /**
   * Get user notifications
   */
  async getUserNotifications(userId, options = {}) {
    const filter = { 'recipient.userId': userId };
    if (options.unreadOnly) filter.isRead = false;
    if (options.status) filter.status = options.status;
    
    return this.Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(options.limit || 50);
  }
  
  /**
   * Mark as read
   */
  async markAsRead(notificationId) {
    return this.Notification.findByIdAndUpdate(
      notificationId,
      { isRead: true, readAt: new Date(), status: 'read' },
      { new: true }
    );
  }
  
  /**
   * Mark all as read
   */
  async markAllAsRead(userId) {
    return this.Notification.updateMany(
      { 'recipient.userId': userId, isRead: false },
      { isRead: true, readAt: new Date(), status: 'read' }
    );
  }
  
  /**
   * Get unread count
   */
  async getUnreadCount(userId) {
    return this.Notification.countDocuments({
      'recipient.userId': userId,
      isRead: false,
    });
  }
  
  /**
   * Delete notification
   */
  async deleteNotification(notificationId) {
    return this.Notification.findByIdAndDelete(notificationId);
  }
  
  /**
   * Get user preferences
   */
  async getPreferences(userId, tenantId) {
    let preferences = await this.NotificationPreferences.findOne({ userId, tenantId });
    if (!preferences) {
      preferences = await this.NotificationPreferences.create({ userId, tenantId });
    }
    return preferences;
  }
  
  /**
   * Update preferences
   */
  async updatePreferences(userId, tenantId, updates) {
    return this.NotificationPreferences.findOneAndUpdate(
      { userId, tenantId },
      { ...updates, updatedAt: new Date() },
      { upsert: true, new: true }
    );
  }
  
  /**
   * Create template
   */
  async createTemplate(template) {
    return this.NotificationTemplate.create(template);
  }
  
  /**
   * List templates
   */
  async listTemplates(category = null) {
    const filter = { isActive: true };
    if (category) filter.category = category;
    return this.NotificationTemplate.find(filter);
  }
  
  /**
   * Process scheduled notifications
   */
  async processScheduled() {
    const notifications = await this.Notification.find({
      status: 'pending',
      scheduledAt: { $lte: new Date() },
    });
    
    for (const notification of notifications) {
      await this.deliver(notification, [notification.channel]);
    }
    
    return { processed: notifications.length };
  }
  
  /**
   * Send bulk notifications
   */
  async sendBulk(recipients, options) {
    const results = [];
    
    for (const recipient of recipients) {
      try {
        const notification = await this.send({
          ...options,
          recipient,
        });
        results.push({ recipient: recipient.userId, success: true, notificationId: notification._id });
      } catch (error) {
        results.push({ recipient: recipient.userId, success: false, error: error.message });
      }
    }
    
    return results;
  }
  
  /**
   * Get notification statistics
   */
  async getStats(tenantId, startDate, endDate) {
    const stats = await this.Notification.aggregate([
      {
        $match: {
          tenantId,
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: {
            status: '$status',
            channel: '$channel',
          },
          count: { $sum: 1 },
        },
      },
    ]);
    
    return stats;
  }
}

// Singleton instance
const notificationCenter = new NotificationCenter();

module.exports = {
  NotificationCenter,
  notificationCenter,
  notificationConfig,
};