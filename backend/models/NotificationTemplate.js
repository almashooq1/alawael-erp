'use strict';

const mongoose = require('mongoose');

/**
 * نموذج قوالب الإشعارات - ثنائية اللغة (عربي/إنجليزي)
 * Notification Templates Model - Bilingual (Arabic/English)
 */
const notificationTemplateSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      // e.g., 'appointment_reminder_24h', 'invoice_due', 'escalation_assigned'
    },
    nameAr: { type: String, required: true, trim: true },
    nameEn: { type: String, required: true, trim: true },
    category: {
      type: String,
      required: true,
      enum: [
        'appointment',
        'billing',
        'hr',
        'transport',
        'clinical',
        'system',
        'quality',
        'inventory',
      ],
    },
    channels: {
      type: [String],
      enum: ['sms', 'whatsapp', 'email', 'push', 'database'],
      default: ['database'],
    },
    subjectAr: { type: String, default: null }, // للإيميل
    subjectEn: { type: String, default: null },
    bodyAr: { type: String, required: true }, // مع متغيرات {{variable}}
    bodyEn: { type: String, required: true },
    whatsappTemplateName: { type: String, default: null }, // اسم القالب المعتمد من Meta
    whatsappTemplateLanguage: { type: String, default: 'ar' },
    variables: { type: [String], default: [] }, // ['beneficiary_name', 'appointment_date', ...]
    defaultData: { type: mongoose.Schema.Types.Mixed, default: null },
    isActive: { type: Boolean, default: true },
    requiresApproval: { type: Boolean, default: false },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
    },
    usageCount: { type: Number, default: 0 },
    lastUsedAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

notificationTemplateSchema.index({ code: 1 });
notificationTemplateSchema.index({ category: 1, isActive: 1 });

/**
 * تعبئة القالب بالمتغيرات
 * @param {string} locale - 'ar' | 'en'
 * @param {object} data - بيانات المتغيرات
 */
notificationTemplateSchema.methods.render = function (locale = 'ar', data = {}) {
  let body = locale === 'ar' ? this.bodyAr : this.bodyEn;
  let subject = locale === 'ar' ? this.subjectAr : this.subjectEn;

  for (const [key, value] of Object.entries(data)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    body = body.replace(regex, value ?? '');
    if (subject) subject = subject.replace(regex, value ?? '');
  }

  return { subject, body };
};

module.exports =
  mongoose.models.NotificationTemplate ||
  mongoose.model('NotificationTemplate', notificationTemplateSchema);
