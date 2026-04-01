/**
 * NotificationLog Model — سجل الإشعارات المُرسلة
 * Rehab-ERP v2.0
 */

const mongoose = require('mongoose');

const notificationLogSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title_ar: { type: String, required: true },
    title_en: { type: String },
    body_ar: { type: String, required: true },
    body_en: { type: String },

    notification_type: {
      type: String,
      enum: [
        'assessment_due',
        'session_reminder',
        'appointment_confirmed',
        'appointment_cancelled',
        'plan_update',
        'payment_due',
        'invoice_created',
        'leave_approved',
        'leave_rejected',
        'task_assigned',
        'announcement',
        'system_alert',
        'transport_eta',
        'goal_achieved',
        'report_ready',
        'custom',
      ],
      default: 'custom',
    },

    channel: { type: String, enum: ['in_app', 'email', 'sms', 'whatsapp', 'push'], required: true },

    // الكيان المرتبط
    reference_type: { type: String }, // 'Assessment', 'Appointment', 'Invoice'...
    reference_id: { type: mongoose.Schema.Types.ObjectId },

    // الحالة
    status: {
      type: String,
      enum: ['pending', 'sent', 'delivered', 'read', 'failed', 'bounced'],
      default: 'pending',
    },
    sent_at: { type: Date },
    delivered_at: { type: Date },
    read_at: { type: Date },
    failed_reason: { type: String },

    // البيانات الإضافية
    metadata: { type: mongoose.Schema.Types.Mixed },
    action_url: { type: String }, // رابط الإجراء عند النقر

    branch_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deleted_at: { type: Date, default: null },
  },
  { timestamps: true }
);

notificationLogSchema.index({ user_id: 1, status: 1, createdAt: -1 });
notificationLogSchema.index({ user_id: 1, read_at: 1 });
notificationLogSchema.index({ reference_type: 1, reference_id: 1 });
notificationLogSchema.index({ deleted_at: 1 });

module.exports =
  mongoose.models.NotificationLog || mongoose.model('NotificationLog', notificationLogSchema);
