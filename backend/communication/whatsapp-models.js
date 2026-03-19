/* eslint-disable no-unused-vars */
/**
 * WhatsApp Models - نماذج قاعدة البيانات للوتساب
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Message Schema - نموذج الرسالة
 */
const MessageSchema = new Schema(
  {
    // معرف الرسالة من WhatsApp
    waMessageId: {
      type: String,
      index: true,
      sparse: true,
    },

    // معرف الرسالة الداخلي
    internalId: {
      type: String,
      required: true,
      unique: true,
    },

    // المحادثة
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: 'WhatsAppConversation',
      required: true,
      index: true,
    },

    // المستأجر
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },

    // الاتجاه (inbound/outbound)
    direction: {
      type: String,
      enum: ['inbound', 'outbound'],
      required: true,
    },

    // الحالة
    status: {
      type: String,
      enum: ['pending', 'sent', 'delivered', 'read', 'failed', 'deleted'],
      default: 'pending',
    },

    // نوع الرسالة
    type: {
      type: String,
      enum: [
        'text',
        'image',
        'video',
        'audio',
        'document',
        'location',
        'contact',
        'interactive',
        'template',
        'reaction',
        'system',
      ],
      required: true,
    },

    // المحتوى
    content: {
      text: String,
      mediaUrl: String,
      mediaId: String,
      mimeType: String,
      caption: String,
      filename: String,
      location: {
        latitude: Number,
        longitude: Number,
        name: String,
        address: String,
      },
      contacts: [
        {
          name: String,
          phones: [String],
          emails: [String],
        },
      ],
      interactive: {
        type: String,
        bodyText: String,
        buttonText: String,
        sections: [Schema.Types.Mixed],
      },
      template: {
        name: String,
        language: String,
        components: [Schema.Types.Mixed],
      },
    },

    // المرسل والمستقبل
    from: {
      type: String,
      required: true,
      index: true,
    },
    to: {
      type: String,
      required: true,
      index: true,
    },

    // رد على رسالة
    replyTo: {
      messageId: String,
      type: String,
      text: String,
    },

    // الرد التفاعلي
    interactiveResponse: {
      buttonId: String,
      buttonTitle: String,
      listId: String,
      listTitle: String,
      listDescription: String,
    },

    // التفاعل (reaction)
    reaction: {
      emoji: String,
      messageId: String,
    },

    // الأخطاء
    error: {
      code: String,
      title: String,
      message: String,
      details: Schema.Types.Mixed,
    },

    // المحاولات
    attempts: {
      type: Number,
      default: 0,
    },

    // آخر محاولة
    lastAttemptAt: Date,

    // معلومات إضافية
    metadata: {
      userId: { type: Schema.Types.ObjectId, ref: 'User' },
      relatedId: { type: Schema.Types.ObjectId }, // معرف مرتبط (طلب، موعد، إلخ)
      relatedType: String, // نوع المرجع (order, appointment, invoice, etc.)
      tags: [String],
      priority: { type: String, enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' },
      customData: Schema.Types.Mixed,
    },

    // المجدول
    scheduledAt: Date,
    sentAt: Date,
    deliveredAt: Date,
    readAt: Date,

    // الطابع الزمني
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: 'whatsapp_messages',
  }
);

// الفهارس
MessageSchema.index({ tenantId: 1, conversationId: 1, createdAt: -1 });
MessageSchema.index({ tenantId: 1, status: 1 });
MessageSchema.index({ tenantId: 1, from: 1 });
MessageSchema.index({ tenantId: 1, to: 1 });
MessageSchema.index({ 'metadata.relatedId': 1, 'metadata.relatedType': 1 });
MessageSchema.index({ scheduledAt: 1 }, { sparse: true });

/**
 * Conversation Schema - نموذج المحادثة
 */
const ConversationSchema = new Schema(
  {
    // معرف المحادثة
    conversationId: {
      type: String,
      required: true,
      unique: true,
    },

    // المستأجر
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },

    // رقم الهاتف
    phoneNumber: {
      type: String,
      required: true,
      index: true,
    },

    // اسم جهة الاتصال
    contactName: String,

    // معلومات جهة الاتصال
    contact: {
      waId: String,
      profile: {
        name: String,
      },
    },

    // الحالة
    status: {
      type: String,
      enum: ['new', 'active', 'pending', 'resolved', 'closed', 'blocked'],
      default: 'new',
    },

    // المسؤول عن المحادثة
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },

    // القسم
    department: {
      type: String,
      enum: ['general', 'support', 'sales', 'hr', 'finance', 'operations'],
      default: 'general',
    },

    // الأولوية
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
    },

    // العلامات
    tags: [
      {
        type: String,
      },
    ],

    // آخر رسالة
    lastMessage: {
      type: {
        type: String,
      },
      preview: String,
      timestamp: Date,
      direction: String,
    },

    // إحصائيات
    stats: {
      totalMessages: { type: Number, default: 0 },
      inboundMessages: { type: Number, default: 0 },
      outboundMessages: { type: Number, default: 0 },
      unreadCount: { type: Number, default: 0 },
      responseTime: Number, // متوسط وقت الرد بالدقائق
      firstResponseTime: Number, // وقت أول رد
    },

    // التواريخ
    startedAt: {
      type: Date,
      default: Date.now,
    },
    lastMessageAt: Date,
    closedAt: Date,

    // التقييم
    rating: {
      score: { type: Number, min: 1, max: 5 },
      feedback: String,
      ratedAt: Date,
    },

    // معلومات إضافية
    metadata: {
      source: String, // من أين بدأت المحادثة
      campaign: String,
      customData: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
    collection: 'whatsapp_conversations',
  }
);

// الفهارس
ConversationSchema.index({ tenantId: 1, phoneNumber: 1 });
ConversationSchema.index({ tenantId: 1, status: 1 });
ConversationSchema.index({ tenantId: 1, assignedTo: 1 });
ConversationSchema.index({ tenantId: 1, lastMessageAt: -1 });

/**
 * Template Schema - نموذج القالب
 */
const TemplateSchema = new Schema(
  {
    // اسم القالب
    name: {
      type: String,
      required: true,
    },

    // المستأجر
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },

    // الفئة
    category: {
      type: String,
      enum: ['AUTHENTICATION', 'MARKETING', 'UTILITY', 'transactional', 'promotional'],
      required: true,
    },

    // اللغة
    language: {
      type: String,
      default: 'ar',
      enum: ['ar', 'en', 'ar_SA', 'en_US'],
    },

    // الحالة
    status: {
      type: String,
      enum: ['draft', 'pending', 'approved', 'rejected', 'disabled'],
      default: 'draft',
    },

    // المحتوى
    content: {
      header: {
        type: { type: String, enum: ['text', 'image', 'video', 'document', 'location'] },
        text: String,
        mediaUrl: String,
      },
      body: {
        text: String,
        parameters: [String],
      },
      footer: {
        text: String,
      },
      buttons: [
        {
          type: { type: String, enum: ['QUICK_REPLY', 'URL', 'CALL', 'COPY_CODE'] },
          text: String,
          url: String,
          phoneNumber: String,
          example: [String],
        },
      ],
    },

    // أمثلة
    examples: {
      headerParams: [String],
      bodyParams: [String],
      buttonParams: [Schema.Types.Mixed],
    },

    // معلومات Meta
    metaTemplateId: String,
    metaStatus: String,
    rejectionReason: String,

    // الاستخدام
    usage: {
      totalSent: { type: Number, default: 0 },
      totalDelivered: { type: Number, default: 0 },
      totalRead: { type: Number, default: 0 },
      lastUsedAt: Date,
    },

    // صلاحية القالب
    validFrom: Date,
    validUntil: Date,

    // معلومات إضافية
    description: String,
    tags: [String],
    metadata: Schema.Types.Mixed,
  },
  {
    timestamps: true,
    collection: 'whatsapp_templates',
  }
);

// فهرس فريد
TemplateSchema.index({ tenantId: 1, name: 1 }, { unique: true });

/**
 * OTP Schema - نموذج رمز التحقق
 */
const OTPSchema = new Schema(
  {
    // رقم الهاتف
    phoneNumber: {
      type: String,
      required: true,
      index: true,
    },

    // المستأجر
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },

    // الرمز
    code: {
      type: String,
      required: true,
    },

    // الغرض
    purpose: {
      type: String,
      enum: ['verification', 'login', 'reset_password', 'transaction', 'other'],
      default: 'verification',
    },

    // الحالة
    isUsed: {
      type: Boolean,
      default: false,
    },

    // المحاولات
    attempts: {
      type: Number,
      default: 0,
    },

    // الحد الأقصى للمحاولات
    maxAttempts: {
      type: Number,
      default: 5,
    },

    // تاريخ الانتهاء
    expiresAt: {
      type: Date,
      required: true,
    },

    // وقت الاستخدام
    usedAt: Date,

    // معلومات إضافية
    metadata: {
      ip: String,
      userAgent: String,
      relatedId: Schema.Types.ObjectId,
    },
  },
  {
    timestamps: true,
    collection: 'whatsapp_otps',
  }
);

// الفهارس
OTPSchema.index({ phoneNumber: 1, code: 1 });
OTPSchema.index({ tenantId: 1, phoneNumber: 1, expiresAt: 1 });
OTPSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL

/**
 * BulkMessage Schema - نموذج الرسالة الجماعية
 */
const BulkMessageSchema = new Schema(
  {
    // اسم الحملة
    campaignName: {
      type: String,
      required: true,
    },

    // المستأجر
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },

    // الحالة
    status: {
      type: String,
      enum: [
        'draft',
        'scheduled',
        'processing',
        'running',
        'paused',
        'completed',
        'cancelled',
        'failed',
      ],
      default: 'draft',
    },

    // المستلمين
    recipients: [
      {
        phone: { type: String, required: true },
        name: String,
        variables: Schema.Types.Mixed,
        status: {
          type: String,
          enum: ['pending', 'sent', 'delivered', 'read', 'failed'],
          default: 'pending',
        },
        messageId: String,
        error: String,
        sentAt: Date,
      },
    ],

    // الرسالة
    message: {
      type: {
        type: String,
        enum: ['text', 'template', 'image', 'document'],
        required: true,
      },
      content: Schema.Types.Mixed,
      template: {
        name: String,
        language: String,
        components: [Schema.Types.Mixed],
      },
    },

    // الإعدادات
    settings: {
      batchSize: { type: Number, default: 50 },
      delayBetweenBatches: { type: Number, default: 1000 }, // ms
      stopOnError: { type: Boolean, default: false },
      retryAttempts: { type: Number, default: 3 },
      retryDelay: { type: Number, default: 5000 }, // ms
    },

    // الجدولة
    scheduledAt: Date,
    startedAt: Date,
    completedAt: Date,

    // الإحصائيات
    stats: {
      total: { type: Number, default: 0 },
      sent: { type: Number, default: 0 },
      delivered: { type: Number, default: 0 },
      read: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
      progress: { type: Number, default: 0 }, // percentage
    },

    // أنشئ بواسطة
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    collection: 'whatsapp_bulk_messages',
  }
);

// الفهارس
BulkMessageSchema.index({ tenantId: 1, status: 1 });
BulkMessageSchema.index({ scheduledAt: 1 }, { sparse: true });

/**
 * WebhookEvent Schema - نموذج حدث Webhook
 */
const WebhookEventSchema = new Schema(
  {
    // معرف الحدث
    eventId: {
      type: String,
      required: true,
      unique: true,
    },

    // المستأجر
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      index: true,
    },

    // نوع الحدث
    eventType: {
      type: String,
      enum: ['message', 'status', 'error', 'template', 'account'],
      required: true,
    },

    // البيانات الخام
    rawData: Schema.Types.Mixed,

    // البيانات المعالجة
    processedData: Schema.Types.Mixed,

    // حالة المعالجة
    processed: {
      type: Boolean,
      default: false,
    },

    processedAt: Date,

    // الأخطاء
    error: {
      message: String,
      stack: String,
    },

    // المحاولات
    attempts: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    collection: 'whatsapp_webhook_events',
  }
);

WebhookEventSchema.index({ tenantId: 1, eventType: 1 });
WebhookEventSchema.index({ processed: 1, createdAt: 1 });

// تصدير النماذج
const Message = mongoose.models.WhatsAppMessage || mongoose.model('WhatsAppMessage', MessageSchema);
const Conversation =
  mongoose.models.WhatsAppConversation ||
  mongoose.model('WhatsAppConversation', ConversationSchema);
const Template =
  mongoose.models.WhatsAppTemplate || mongoose.model('WhatsAppTemplate', TemplateSchema);
const OTP = mongoose.models.WhatsAppOTP || mongoose.model('WhatsAppOTP', OTPSchema);
const BulkMessage =
  mongoose.models.WhatsAppBulkMessage || mongoose.model('WhatsAppBulkMessage', BulkMessageSchema);
const WebhookEvent =
  mongoose.models.WhatsAppWebhookEvent ||
  mongoose.model('WhatsAppWebhookEvent', WebhookEventSchema);

module.exports = {
  Message,
  Conversation,
  Template,
  OTP,
  BulkMessage,
  WebhookEvent,

  // Schemas
  MessageSchema,
  ConversationSchema,
  TemplateSchema,
  OTPSchema,
  BulkMessageSchema,
  WebhookEventSchema,
};
