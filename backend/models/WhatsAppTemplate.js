/**
 * WhatsApp Template Model
 * نموذج قوالب رسائل WhatsApp
 *
 * Tracks approved WhatsApp message templates and their status.
 */

'use strict';

const mongoose = require('mongoose');

const templateComponentSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['header', 'body', 'footer', 'button'], required: true },
    format: {
      type: String,
      enum: ['text', 'image', 'video', 'document', 'location'],
      default: 'text',
    },
    text: { type: String, maxlength: 1024 },
    example: { type: mongoose.Schema.Types.Mixed }, // Example values for template approval
    buttons: [
      {
        type: {
          type: String,
          enum: ['quick_reply', 'url', 'phone_number'],
          default: 'quick_reply',
        },
        text: { type: String, maxlength: 25 },
        url: { type: String },
        phoneNumber: { type: String },
      },
    ],
  },
  { _id: false }
);

const whatsAppTemplateSchema = new mongoose.Schema(
  {
    // Template identity
    name: { type: String, required: true, unique: true, index: true },
    namespace: { type: String, default: 'alawael', index: true },
    language: { type: String, default: 'ar', index: true },
    category: {
      type: String,
      enum: ['MARKETING', 'UTILITY', 'AUTHENTICATION'],
      default: 'UTILITY',
    },

    // Template content
    components: [templateComponentSchema],
    bodyText: { type: String, required: true },
    headerText: { type: String },
    footerText: { type: String },
    variables: [{ type: String }], // List of variable names {{1}}, {{2}}, etc.

    // Approval status
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'disabled', 'paused'],
      default: 'pending',
      index: true,
    },
    rejectionReason: { type: String },
    approvedAt: { type: Date },
    rejectedAt: { type: Date },

    // Provider-specific IDs
    providerIds: {
      ultramsg: { type: String },
      twilio: { type: String },
      meta: { type: String },
    },

    // Usage tracking
    usageCount: { type: Number, default: 0 },
    lastUsedAt: { type: Date },

    // Metadata
    description: { type: String },
    tags: [{ type: String, index: true }],
    isActive: { type: Boolean, default: true, index: true },
    isSystem: { type: Boolean, default: false }, // System templates cannot be deleted

    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
whatsAppTemplateSchema.index({ namespace: 1, language: 1, status: 1 });
// tags index is provided by `index: true` on the field definition — no separate index()
whatsAppTemplateSchema.index({ isActive: 1, status: 1 });

// Virtual
whatsAppTemplateSchema.virtual('isApproved').get(function () {
  return this.status === 'approved' && this.isActive;
});

// Static methods
whatsAppTemplateSchema.statics.findActive = function () {
  return this.find({ isActive: true, status: 'approved' }).sort({ name: 1 });
};

whatsAppTemplateSchema.statics.findByTag = function (tag) {
  return this.find({ tags: tag, isActive: true, status: 'approved' });
};

whatsAppTemplateSchema.statics.incrementUsage = function (templateId) {
  return this.findByIdAndUpdate(
    templateId,
    { $inc: { usageCount: 1 }, $set: { lastUsedAt: new Date() } },
    { new: true }
  );
};

whatsAppTemplateSchema.statics.renderBody = function (template, params = {}) {
  let body = template.bodyText;
  Object.entries(params).forEach(([key, value]) => {
    const placeholder = key.startsWith('{{') ? key : `{{${key}}}`;
    body = body.replace(new RegExp(placeholder, 'g'), String(value));
  });
  return body;
};

// Predefined system templates (seed data helpers)
whatsAppTemplateSchema.statics.SYSTEM_TEMPLATES = [
  {
    name: 'appointment_reminder_24h',
    bodyText: 'تذكير: جلسة {{sessionType}} لـ {{patientName}} غداً الساعة {{time}}.',
    tags: ['appointment', 'reminder'],
    category: 'UTILITY',
  },
  {
    name: 'appointment_reminder_1h',
    bodyText: 'تذكير: جلسة {{sessionType}} لـ {{patientName}} تبدأ خلال ساعة ({{time}}).',
    tags: ['appointment', 'reminder'],
    category: 'UTILITY',
  },
  {
    name: 'report_ready',
    bodyText: 'تقرير {{reportType}} لـ {{patientName}} جاهز. {{link}}',
    tags: ['report', 'notification'],
    category: 'UTILITY',
  },
  {
    name: 'payment_due',
    bodyText: 'فاتورة {{month}} لـ {{patientName}} بقيمة {{amount}} ر.س مستحقة. {{link}}',
    tags: ['payment', 'billing'],
    category: 'UTILITY',
  },
  {
    name: 'payment_confirmation',
    bodyText: 'تم استلام دفع بقيمة {{amount}} ر.س. شكراً لثقتكم.',
    tags: ['payment', 'confirmation'],
    category: 'UTILITY',
  },
  {
    name: 'welcome_new_beneficiary',
    bodyText: 'أهلاً بكم في مركز الأوائل. {{patientName}} مسجل بنجاح. رقم الملف: {{fileNumber}}.',
    tags: ['onboarding', 'welcome'],
    category: 'UTILITY',
  },
  {
    name: 'otp_verification',
    bodyText: 'رمز التحقق: {{code}}. صالح لـ {{ttl}} دقائق. لا تشاركه مع أحد.',
    tags: ['auth', 'otp'],
    category: 'AUTHENTICATION',
  },
  {
    name: 'telehealth_link',
    bodyText: 'رابط جلسة التيليميديس: {{link}} (تبدأ خلال {{minutes}} دقيقة).',
    tags: ['telehealth', 'session'],
    category: 'UTILITY',
  },
  {
    name: 'session_no_show',
    bodyText: '{{patientName}} لم يحضر جلسة {{date}}. هل تحتاج إعادة جدولة؟ {{link}}',
    tags: ['session', 'no_show'],
    category: 'UTILITY',
  },
  {
    name: 'home_program',
    bodyText: 'تمرينات {{patientName}}: {{instructions}} {{link}}',
    tags: ['home_program', 'therapy'],
    category: 'UTILITY',
  },
  {
    name: 'care_plan_update',
    bodyText: 'تحديث خطة {{patientName}}. إنجازات: {{achievements}}. أهداف قادمة: {{nextGoals}}.',
    tags: ['care_plan', 'progress'],
    category: 'UTILITY',
  },
  {
    name: 'emergency_alert',
    bodyText: '🔴 تنبيه: {{patientName}} — {{situation}}. الدرجة: {{urgency}}.',
    tags: ['emergency', 'alert'],
    category: 'UTILITY',
  },
];

module.exports =
  mongoose.models.WhatsAppTemplate || mongoose.model('WhatsAppTemplate', whatsAppTemplateSchema);
