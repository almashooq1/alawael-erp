/**
 * نماذج بوابة ولي الأمر
 * Parent Portal Models
 * AlAwael ERP — Disability Rehabilitation Center Management System
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

// ─── 1. ParentOTP — رموز التحقق ───────────────────────────────────────────
const ParentOTPSchema = new Schema(
  {
    phone: { type: String, required: true, trim: true },
    otp: { type: String, required: true }, // مشفر bcrypt
    purpose: {
      type: String,
      enum: ['login', 'change_phone', 'add_guardian'],
      default: 'login',
    },
    attempts: { type: Number, default: 0, max: 5 },
    isVerified: { type: Boolean, default: false },
    expiresAt: { type: Date, required: true },
    verifiedAt: { type: Date, default: null },
    ipAddress: { type: String, default: null },
  },
  { timestamps: true }
);

ParentOTPSchema.index({ phone: 1, isVerified: 1 });
ParentOTPSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL auto-delete

ParentOTPSchema.statics.createOtp = async function (
  phone,
  otp,
  purpose = 'login',
  ipAddress = null
) {
  const bcrypt = require('bcryptjs');
  const hashed = await bcrypt.hash(otp, 10);
  return this.create({
    phone,
    otp: hashed,
    purpose,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 دقائق
    ipAddress,
  });
};

ParentOTPSchema.methods.verify = async function (otp) {
  const bcrypt = require('bcryptjs');
  if (this.isVerified) return false;
  if (this.expiresAt < new Date()) return false;
  if (this.attempts >= 5) return false;
  const match = await bcrypt.compare(otp, this.otp);
  if (!match) {
    this.attempts += 1;
    await this.save();
    return false;
  }
  this.isVerified = true;
  this.verifiedAt = new Date();
  await this.save();
  return true;
};

// ─── 2. ParentDevice — أجهزة ولي الأمر للإشعارات ───────────────────────
const ParentDeviceSchema = new Schema(
  {
    guardianId: { type: Schema.Types.ObjectId, ref: 'Guardian', required: true },
    deviceToken: { type: String, required: true, unique: true }, // FCM token
    deviceType: { type: String, enum: ['android', 'ios', 'web'], default: 'web' },
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
        enabled: { type: Boolean, default: false },
        start: { type: String, default: '22:00' },
        end: { type: String, default: '07:00' },
      },
    },
    lastActiveAt: { type: Date, default: null },
  },
  { timestamps: true }
);

ParentDeviceSchema.index({ guardianId: 1, isActive: 1 });

// ─── 3. ParentMessage — رسائل ولي الأمر ───────────────────────────────────
const ParentMessageSchema = new Schema(
  {
    guardianId: { type: Schema.Types.ObjectId, ref: 'Guardian', required: true },
    beneficiaryId: { type: Schema.Types.ObjectId, ref: 'Beneficiary', default: null },
    recipientType: {
      type: String,
      enum: ['specialist', 'administration', 'system'],
      default: 'administration',
    },
    recipientId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    subject: { type: String, default: null, maxlength: 200 },
    body: { type: String, required: true, maxlength: 2000 },
    direction: {
      type: String,
      enum: ['inbound', 'outbound'], // inbound = من ولي الأمر، outbound = من المركز
      required: true,
    },
    messageType: {
      type: String,
      enum: [
        'general',
        'appointment_request',
        'schedule_change',
        'leave_request',
        'inquiry',
        'complaint',
        'suggestion',
      ],
      default: 'general',
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
    repliedToId: { type: Schema.Types.ObjectId, ref: 'ParentMessage', default: null },
    status: {
      type: String,
      enum: ['active', 'archived', 'resolved'],
      default: 'active',
    },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

ParentMessageSchema.index({ guardianId: 1, direction: 1, isRead: 1 });
ParentMessageSchema.index({ recipientType: 1, recipientId: 1 });

// ─── 4. ParentComplaint — شكاوى ومقترحات ────────────────────────────────
const ParentComplaintSchema = new Schema(
  {
    ticketNumber: { type: String, unique: true }, // CMP-20260101-0001
    guardianId: { type: Schema.Types.ObjectId, ref: 'Guardian', required: true },
    beneficiaryId: { type: Schema.Types.ObjectId, ref: 'Beneficiary', default: null },
    type: {
      type: String,
      enum: ['complaint', 'suggestion', 'inquiry'],
      required: true,
    },
    category: {
      type: String,
      enum: [
        'service_quality',
        'staff',
        'facilities',
        'scheduling',
        'transport',
        'billing',
        'other',
      ],
      required: true,
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
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: ['submitted', 'under_review', 'in_progress', 'resolved', 'closed'],
      default: 'submitted',
    },
    resolution: { type: String, default: null },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    resolvedAt: { type: Date, default: null },
    satisfactionRating: { type: Number, min: 1, max: 5, default: null },
    satisfactionFeedback: { type: String, default: null },
    isAnonymous: { type: Boolean, default: false },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', default: null },
    deletedAt: { type: Date, default: null },
    responses: [
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User' },
        message: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

ParentComplaintSchema.index({ guardianId: 1, status: 1 });
ParentComplaintSchema.index({ status: 1, priority: 1 });

// توليد رقم التذكرة تلقائياً
ParentComplaintSchema.pre('save', async function (next) {
  if (!this.ticketNumber) {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const count = await this.constructor.countDocuments({
      createdAt: { $gte: new Date(today.setHours(0, 0, 0, 0)) },
    });
    this.ticketNumber = `CMP-${dateStr}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

// ─── 5. QueuedNotification — إشعارات مؤجلة (ساعات الهدوء) ───────────────
const QueuedNotificationSchema = new Schema(
  {
    guardianId: { type: Schema.Types.ObjectId, ref: 'Guardian', required: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    data: { type: Schema.Types.Mixed, default: {} },
    sendAfter: { type: Date, required: true },
    isSent: { type: Boolean, default: false },
    sentAt: { type: Date, default: null },
  },
  { timestamps: true }
);

QueuedNotificationSchema.index({ sendAfter: 1, isSent: 1 });

// ─── الصادرات ──────────────────────────────────────────────────────────────
const ParentOTP = mongoose.models.ParentOTP || mongoose.model('ParentOTP', ParentOTPSchema);
const ParentDevice =
  mongoose.models.ParentDevice || mongoose.model('ParentDevice', ParentDeviceSchema);
const ParentMessage =
  mongoose.models.ParentMessage || mongoose.model('ParentMessage', ParentMessageSchema);
const ParentComplaint =
  mongoose.models.ParentComplaint || mongoose.model('ParentComplaint', ParentComplaintSchema);
const QueuedNotification =
  mongoose.models.QueuedNotification ||
  mongoose.model('QueuedNotification', QueuedNotificationSchema);

module.exports = {
  ParentOTP,
  ParentDevice,
  ParentMessage,
  ParentComplaint,
  QueuedNotification,
};
