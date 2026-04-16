'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

const familyCommunicationSchema = new Schema(
  {
    communication_id: {
      type: String,
      unique: true,
      default: () => `COM-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    },

    beneficiary_id: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },

    // معلومات التواصل
    communication_type: {
      type: String,
      enum: [
        'message',
        'announcement',
        'progress_report',
        'appointment_reminder',
        'home_program',
        'feedback_request',
        'meeting_invitation',
        'alert',
      ],
    },

    // المرسل والمستقبل
    sender: {
      sender_id: { type: Schema.Types.ObjectId, ref: 'User' },
      name: String,
      role: String,
    },

    recipients: [
      {
        recipient_id: { type: Schema.Types.ObjectId, ref: 'Guardian' },
        name: String,
        relationship: String,
        contact_method: { type: String, enum: ['email', 'sms', 'app_notification', 'phone'] },
      },
    ],

    // المحتوى
    subject: { type: String, required: true },
    message: { type: String, required: true },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
    },

    // المرفقات
    attachments: [
      {
        file_name: String,
        file_url: String,
        file_type: String,
      },
    ],

    // حالة الإرسال
    delivery_status: [
      {
        recipient_id: { type: Schema.Types.ObjectId },
        status: { type: String, enum: ['pending', 'sent', 'delivered', 'failed', 'read'] },
        sent_at: Date,
        delivered_at: Date,
        read_at: Date,
        failure_reason: String,
      },
    ],

    // الردود
    responses: [
      {
        responder_id: { type: Schema.Types.ObjectId, ref: 'Guardian' },
        responder_name: String,
        response_date: { type: Date, default: Date.now },
        response_content: String,
        response_type: { type: String, enum: ['text', 'voice', 'attachment'] },
        attachment_url: String,
      },
    ],

    // المتابعة
    follow_up: {
      requires_follow_up: { type: Boolean, default: false },
      follow_up_date: Date,
      follow_up_notes: String,
      is_resolved: { type: Boolean, default: false },
    },

    // العلامات
    tags: [String],

    is_archived: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const FamilyCommunication =
  mongoose.models.FamilyCommunication ||
  mongoose.model('FamilyCommunication', familyCommunicationSchema);

module.exports = FamilyCommunication;
