/**
 * Parent Portal Models — نماذج بوابة ولي الأمر
 * البرومبت 21: parent_otps, parent_devices, parent_messages, parent_complaints
 */

const mongoose = require('mongoose');

// ─── ParentOtp ───────────────────────────────────────────────────────────────
const parentOtpSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true, maxlength: 20 },
    otp: { type: String, required: true }, // hashed
    purpose: {
      type: String,
      default: 'login',
      enum: ['login', 'change_phone', 'add_guardian'],
    },
    attempts: { type: Number, default: 0, min: 0, max: 10 },
    isVerified: { type: Boolean, default: false },
    expiresAt: { type: Date, required: true },
    verifiedAt: { type: Date, default: null },
    ipAddress: { type: String, default: null },
  },
  { timestamps: true }
);

parentOtpSchema.index({ phone: 1, otp: 1, isVerified: 1 });
parentOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

// ─── ParentDevice ─────────────────────────────────────────────────────────────
const parentDeviceSchema = new mongoose.Schema(
  {
    guardianId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Guardian',
      required: true,
    },
    deviceToken: { type: String, unique: true, required: true }, // FCM token
    deviceType: {
      type: String,
      enum: ['android', 'ios', 'web'],
      default: 'web',
    },
    deviceName: { type: String, default: null },
    osVersion: { type: String, default: null },
    appVersion: { type: String, default: null },
    isActive: { type: Boolean, default: true },
    notificationPreferences: {
      sessionReminders: { type: Boolean, default: true },
      sessionReports: { type: Boolean, default: true },
      transportUpdates: { type: Boolean, default: true },
      financial: { type: Boolean, default: true },
      announcements: { type: Boolean, default: true },
      quietHours: {
        start: { type: String, default: '22:00' },
        end: { type: String, default: '07:00' },
      },
    },
    lastActiveAt: { type: Date, default: null },
  },
  { timestamps: true }
);

parentDeviceSchema.index({ guardianId: 1, isActive: 1 });

// ─── ParentMessage ───────────────────────────────────────────────────────────
const parentMessageSchema = new mongoose.Schema(
  {
    guardianId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Guardian',
      required: true,
    },
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      default: null,
    },
    recipientType: { type: String, default: null }, // 'specialist', 'administration'
    recipientId: { type: mongoose.Schema.Types.ObjectId, default: null },
    subject: { type: String, default: null, maxlength: 200 },
    body: { type: String, required: true, maxlength: 2000 },
    direction: {
      type: String,
      required: true,
      enum: ['inbound', 'outbound'], // inbound=parent→center, outbound=center→parent
    },
    messageType: {
      type: String,
      default: 'general',
      enum: [
        'general',
        'appointment_request',
        'schedule_change',
        'leave_request',
        'inquiry',
        'complaint',
        'suggestion',
      ],
    },
    attachments: [
      {
        filename: String,
        path: String,
        mimeType: String,
        size: Number,
      },
    ],
    isRead: { type: Boolean, default: false },
    readAt: { type: Date, default: null },
    repliedToId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ParentMessage',
      default: null,
    },
    status: {
      type: String,
      default: 'active',
      enum: ['active', 'archived', 'resolved'],
    },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

parentMessageSchema.index({ guardianId: 1, direction: 1, isRead: 1 });
parentMessageSchema.index({ recipientType: 1, recipientId: 1 });

// ─── ParentComplaint ─────────────────────────────────────────────────────────
const parentComplaintSchema = new mongoose.Schema(
  {
    guardianId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Guardian',
      required: true,
    },
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      default: null,
    },
    type: {
      type: String,
      required: true,
      enum: ['complaint', 'suggestion', 'inquiry'],
    },
    category: {
      type: String,
      required: true,
      enum: [
        'service_quality',
        'staff',
        'facilities',
        'scheduling',
        'transport',
        'billing',
        'other',
      ],
    },
    subject: { type: String, required: true, maxlength: 200 },
    description: { type: String, required: true, maxlength: 3000 },
    attachments: [
      {
        filename: String,
        path: String,
        mimeType: String,
        size: Number,
      },
    ],
    priority: {
      type: String,
      default: 'medium',
      enum: ['low', 'medium', 'high'],
    },
    status: {
      type: String,
      default: 'submitted',
      enum: ['submitted', 'under_review', 'in_progress', 'resolved', 'closed'],
    },
    ticketNumber: { type: String, unique: true },
    resolution: { type: String, default: null },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    resolvedAt: { type: Date, default: null },
    satisfactionRating: { type: Number, min: 1, max: 5, default: null },
    satisfactionFeedback: { type: String, default: null },
    isAnonymous: { type: Boolean, default: false },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

parentComplaintSchema.index({ guardianId: 1, status: 1 });
parentComplaintSchema.index({ status: 1, priority: 1 });

// ─── ParentNotification ──────────────────────────────────────────────────────
const parentNotificationSchema = new mongoose.Schema(
  {
    guardianId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Guardian',
      required: true,
    },
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      default: null,
    },
    type: {
      type: String,
      enum: [
        'session_reminder',
        'session_report',
        'transport_update',
        'new_invoice',
        'new_message',
        'assessment_result',
        'appointment_confirmed',
        'appointment_cancelled',
        'general',
      ],
      default: 'general',
    },
    title: { type: String, required: true },
    body: { type: String, required: true },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    isRead: { type: Boolean, default: false },
    readAt: { type: Date, default: null },
    channel: {
      type: String,
      enum: ['push', 'sms', 'email', 'whatsapp', 'in_app'],
      default: 'push',
    },
    sentAt: { type: Date, default: null },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
  },
  { timestamps: true }
);

parentNotificationSchema.index({ guardianId: 1, isRead: 1, createdAt: -1 });

module.exports = {
  ParentOtp: mongoose.models.ParentOtp || mongoose.model('ParentOtp', parentOtpSchema),
  ParentDevice: mongoose.models.ParentDevice || mongoose.model('ParentDevice', parentDeviceSchema),
  ParentMessage:
    mongoose.models.ParentMessage || mongoose.model('ParentMessage', parentMessageSchema),
  ParentComplaint:
    mongoose.models.ParentComplaint || mongoose.model('ParentComplaint', parentComplaintSchema),
  ParentNotification:
    mongoose.models.ParentNotification ||
    mongoose.model('ParentNotification', parentNotificationSchema),
};
