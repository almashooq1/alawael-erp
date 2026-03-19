/**
 * Administrative Communications Enhanced Models
 * نماذج محسّنة للاتصالات الإدارية - ميزات متقدمة
 *
 * New Features:
 *  1. Digital Signatures (التوقيع الإلكتروني)
 *  2. Internal Notes (الملاحظات الداخلية)
 *  3. Custom Reminders (التذكيرات المخصصة)
 *  4. Linked Tasks (المهام المرتبطة)
 *  5. Delivery Tracking (تتبع التسليم)
 *  6. Referrals (الإحالات)
 *  7. Comments/Discussion (التعليقات والمناقشة)
 *  8. Stamps & Watermarks (الأختام والعلامات المائية)
 *  9. Favorites/Pins (المفضلة والتثبيت)
 * 10. QR Codes (رموز QR)
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

// ══════════════════════════════════════════════════════════════════════════════
//  1. Digital Signatures — التوقيعات الإلكترونية
// ══════════════════════════════════════════════════════════════════════════════
const DigitalSignatureSchema = new Schema(
  {
    correspondenceId: {
      type: Schema.Types.ObjectId,
      ref: 'Correspondence',
      required: true,
      index: true,
    },
    signerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    signerName: { type: String, required: true },
    signerTitle: String, // المسمى الوظيفي
    signerDepartment: String,
    signatureType: {
      type: String,
      enum: ['approval', 'acknowledgment', 'witness', 'authorization', 'certification'],
      default: 'approval',
    },
    signatureData: {
      // بيانات التوقيع المشفرة (Base64 للتوقيع المرئي)
      imageData: String,
      // بصمة التوقيع (hash)
      hash: String,
      algorithm: { type: String, default: 'SHA-256' },
      // عنوان IP الموقّع
      ipAddress: String,
      userAgent: String,
    },
    stampId: { type: Schema.Types.ObjectId, ref: 'OfficialStamp' },
    status: {
      type: String,
      enum: ['pending', 'signed', 'revoked', 'expired'],
      default: 'pending',
    },
    signedAt: Date,
    revokedAt: Date,
    revokedReason: String,
    expiresAt: Date,
    order: { type: Number, default: 0 }, // ترتيب التوقيع
    isRequired: { type: Boolean, default: true },
    notes: String,
  },
  { timestamps: true, collection: 'digital_signatures' }
);

DigitalSignatureSchema.index({ correspondenceId: 1, signerId: 1 });
DigitalSignatureSchema.index({ status: 1 });

// ══════════════════════════════════════════════════════════════════════════════
//  2. Internal Notes — الملاحظات الداخلية
// ══════════════════════════════════════════════════════════════════════════════
const InternalNoteSchema = new Schema(
  {
    correspondenceId: {
      type: Schema.Types.ObjectId,
      ref: 'Correspondence',
      required: true,
      index: true,
    },
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    authorName: String,
    content: { type: String, required: true, maxlength: 5000 },
    noteType: {
      type: String,
      enum: ['general', 'important', 'action_required', 'follow_up', 'private'],
      default: 'general',
    },
    visibility: {
      type: String,
      enum: ['private', 'department', 'all_participants', 'admins_only'],
      default: 'all_participants',
    },
    // المستخدمون المحددون بالاسم (لملاحظات خاصة)
    visibleTo: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    mentions: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    isPinned: { type: Boolean, default: false },
    attachments: [
      {
        fileName: String,
        filePath: String,
        fileSize: Number,
        mimeType: String,
      },
    ],
    parentNoteId: { type: Schema.Types.ObjectId, ref: 'InternalNote' }, // ملاحظة رد
    isEdited: { type: Boolean, default: false },
    editedAt: Date,
  },
  { timestamps: true, collection: 'correspondence_internal_notes' }
);

InternalNoteSchema.index({ correspondenceId: 1, createdAt: -1 });

// ══════════════════════════════════════════════════════════════════════════════
//  3. Custom Reminders — التذكيرات المخصصة
// ══════════════════════════════════════════════════════════════════════════════
const CorrespondenceReminderSchema = new Schema(
  {
    correspondenceId: {
      type: Schema.Types.ObjectId,
      ref: 'Correspondence',
      required: true,
      index: true,
    },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    message: String,
    reminderDate: { type: Date, required: true },
    repeatType: {
      type: String,
      enum: ['none', 'daily', 'weekly', 'monthly'],
      default: 'none',
    },
    repeatEndDate: Date,
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
    },
    notifyVia: {
      type: [String],
      enum: ['system', 'email', 'sms', 'whatsapp'],
      default: ['system'],
    },
    status: {
      type: String,
      enum: ['active', 'triggered', 'snoozed', 'dismissed', 'completed'],
      default: 'active',
    },
    triggeredAt: Date,
    snoozedUntil: Date,
    snoozeCount: { type: Number, default: 0 },
  },
  { timestamps: true, collection: 'correspondence_reminders' }
);

CorrespondenceReminderSchema.index({ userId: 1, status: 1 });
CorrespondenceReminderSchema.index({ reminderDate: 1, status: 1 });

// ══════════════════════════════════════════════════════════════════════════════
//  4. Linked Tasks — المهام المرتبطة
// ══════════════════════════════════════════════════════════════════════════════
const LinkedTaskSchema = new Schema(
  {
    correspondenceId: {
      type: Schema.Types.ObjectId,
      ref: 'Correspondence',
      required: true,
      index: true,
    },
    title: { type: String, required: true },
    description: String,
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    assignedToName: String,
    assignedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    assignedByName: String,
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
    },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'cancelled', 'overdue'],
      default: 'pending',
    },
    dueDate: Date,
    completedAt: Date,
    completionNotes: String,
    progress: { type: Number, min: 0, max: 100, default: 0 },
    checklist: [
      {
        item: String,
        isCompleted: { type: Boolean, default: false },
        completedAt: Date,
      },
    ],
    tags: [String],
    watchers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true, collection: 'correspondence_linked_tasks' }
);

LinkedTaskSchema.index({ correspondenceId: 1 });
LinkedTaskSchema.index({ assignedTo: 1, status: 1 });
LinkedTaskSchema.index({ dueDate: 1, status: 1 });

// ══════════════════════════════════════════════════════════════════════════════
//  5. Delivery Tracking — تتبع التسليم
// ══════════════════════════════════════════════════════════════════════════════
const DeliveryTrackingSchema = new Schema(
  {
    correspondenceId: {
      type: Schema.Types.ObjectId,
      ref: 'Correspondence',
      required: true,
      index: true,
    },
    recipientId: { type: Schema.Types.ObjectId, ref: 'User' },
    recipientName: String,
    recipientEntity: String, // الجهة المستلمة
    deliveryMethod: {
      type: String,
      enum: ['electronic', 'hand_delivery', 'mail', 'fax', 'courier', 'registered_mail'],
      default: 'electronic',
    },
    status: {
      type: String,
      enum: [
        'pending',
        'sent',
        'in_transit',
        'delivered',
        'read',
        'acknowledged',
        'returned',
        'failed',
      ],
      default: 'pending',
    },
    sentAt: Date,
    deliveredAt: Date,
    readAt: Date,
    acknowledgedAt: Date,
    returnedAt: Date,
    failureReason: String,
    // تفاصيل التسليم اليدوي
    manualDelivery: {
      deliveredBy: String,
      receiverName: String,
      receiverSignature: String, // Base64
      deliveryLocation: String,
      idNumber: String,
    },
    // تتبع البريد
    trackingNumber: String,
    courierName: String,
    // إيصال الاستلام
    receiptNumber: String,
    receiptImage: String,
    notes: String,
  },
  { timestamps: true, collection: 'correspondence_delivery_tracking' }
);

DeliveryTrackingSchema.index({ correspondenceId: 1, recipientId: 1 });
DeliveryTrackingSchema.index({ status: 1 });

// ══════════════════════════════════════════════════════════════════════════════
//  6. Referrals — الإحالات
// ══════════════════════════════════════════════════════════════════════════════
const ReferralSchema = new Schema(
  {
    correspondenceId: {
      type: Schema.Types.ObjectId,
      ref: 'Correspondence',
      required: true,
      index: true,
    },
    referredBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    referredByName: String,
    referredTo: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    referredToName: String,
    referredToDepartment: String,
    referralType: {
      type: String,
      enum: [
        'for_action',
        'for_review',
        'for_information',
        'for_opinion',
        'for_follow_up',
        'for_archive',
      ],
      default: 'for_action',
    },
    instructions: String, // تعليمات الإحالة
    deadline: Date,
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'in_progress', 'completed', 'returned', 'declined'],
      default: 'pending',
    },
    responseNotes: String,
    respondedAt: Date,
    completedAt: Date,
    // سلسلة الإحالات
    parentReferralId: { type: Schema.Types.ObjectId, ref: 'CorrespondenceReferral' },
    isEscalated: { type: Boolean, default: false },
    escalatedAt: Date,
    escalationReason: String,
  },
  { timestamps: true, collection: 'correspondence_referrals' }
);

ReferralSchema.index({ correspondenceId: 1 });
ReferralSchema.index({ referredTo: 1, status: 1 });
ReferralSchema.index({ referredBy: 1 });

// ══════════════════════════════════════════════════════════════════════════════
//  7. Comments/Discussion — التعليقات والمناقشة
// ══════════════════════════════════════════════════════════════════════════════
const CorrespondenceCommentSchema = new Schema(
  {
    correspondenceId: {
      type: Schema.Types.ObjectId,
      ref: 'Correspondence',
      required: true,
      index: true,
    },
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    authorName: String,
    content: { type: String, required: true, maxlength: 3000 },
    parentCommentId: { type: Schema.Types.ObjectId, ref: 'CorrespondenceComment' },
    mentions: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    reactions: [
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User' },
        type: { type: String, enum: ['like', 'agree', 'disagree', 'important', 'resolved'] },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    isResolved: { type: Boolean, default: false },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: Date,
    isEdited: { type: Boolean, default: false },
    editedAt: Date,
    isDeleted: { type: Boolean, default: false },
    deletedAt: Date,
  },
  { timestamps: true, collection: 'correspondence_comments' }
);

CorrespondenceCommentSchema.index({ correspondenceId: 1, createdAt: -1 });

// ══════════════════════════════════════════════════════════════════════════════
//  8. Official Stamps — الأختام الرسمية
// ══════════════════════════════════════════════════════════════════════════════
const OfficialStampSchema = new Schema(
  {
    name: { type: String, required: true },
    nameAr: { type: String, required: true },
    stampType: {
      type: String,
      enum: [
        'official_seal',
        'department_stamp',
        'received_stamp',
        'approved_stamp',
        'confidential_stamp',
        'urgent_stamp',
        'custom',
      ],
      required: true,
    },
    imageData: { type: String, required: true }, // Base64 image
    department: String,
    branch: String,
    isActive: { type: Boolean, default: true },
    usagePermissions: [
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User' },
        role: String,
      },
    ],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    usageCount: { type: Number, default: 0 },
  },
  { timestamps: true, collection: 'official_stamps' }
);

// ══════════════════════════════════════════════════════════════════════════════
//  9. Favorites/Pins — المفضلة والتثبيت
// ══════════════════════════════════════════════════════════════════════════════
const CorrespondenceFavoriteSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    correspondenceId: { type: Schema.Types.ObjectId, ref: 'Correspondence', required: true },
    label: String, // تصنيف مخصص
    color: {
      type: String,
      enum: ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'none'],
      default: 'none',
    },
    isPinned: { type: Boolean, default: false },
    notes: String,
    folder: String, // مجلد مخصص
  },
  { timestamps: true, collection: 'correspondence_favorites' }
);

CorrespondenceFavoriteSchema.index({ userId: 1, correspondenceId: 1 }, { unique: true });

// ══════════════════════════════════════════════════════════════════════════════
// 10. QR Code Tracking — تتبع رموز QR
// ══════════════════════════════════════════════════════════════════════════════
const QRCodeTrackingSchema = new Schema(
  {
    correspondenceId: {
      type: Schema.Types.ObjectId,
      ref: 'Correspondence',
      required: true,
      index: true,
    },
    qrData: { type: String, required: true },
    qrImageBase64: String,
    purpose: {
      type: String,
      enum: ['verification', 'tracking', 'delivery_confirmation', 'quick_access'],
      default: 'verification',
    },
    scans: [
      {
        scannedBy: String,
        scannedAt: { type: Date, default: Date.now },
        ipAddress: String,
        location: String,
        device: String,
      },
    ],
    expiresAt: Date,
    isActive: { type: Boolean, default: true },
    generatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, collection: 'correspondence_qr_codes' }
);

// ══════════════════════════════════════════════════════════════════════════════
// 11. Correspondence Labels/Tags — التصنيفات والعلامات
// ══════════════════════════════════════════════════════════════════════════════
const CorrespondenceLabelSchema = new Schema(
  {
    name: { type: String, required: true },
    nameAr: { type: String, required: true },
    color: { type: String, default: '#3b82f6' },
    icon: String,
    description: String,
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    isSystem: { type: Boolean, default: false }, // system labels can't be deleted
    usageCount: { type: Number, default: 0 },
    scope: {
      type: String,
      enum: ['personal', 'department', 'organization'],
      default: 'organization',
    },
  },
  { timestamps: true, collection: 'correspondence_labels' }
);

// ══════════════════════════════════════════════════════════════════════════════
// 12. Forward Records — سجل إعادة التوجيه
// ══════════════════════════════════════════════════════════════════════════════
const ForwardRecordSchema = new Schema(
  {
    correspondenceId: {
      type: Schema.Types.ObjectId,
      ref: 'Correspondence',
      required: true,
      index: true,
    },
    forwardedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    forwardedByName: String,
    forwardedTo: [
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User' },
        name: String,
        email: String,
        department: String,
        isExternal: { type: Boolean, default: false },
      },
    ],
    reason: String,
    additionalMessage: String,
    includeAttachments: { type: Boolean, default: true },
    includeHistory: { type: Boolean, default: false },
    confidentialityOverride: {
      type: String,
      enum: ['keep_original', 'public', 'internal', 'confidential'],
      default: 'keep_original',
    },
  },
  { timestamps: true, collection: 'correspondence_forward_records' }
);

// ══════════════════════════════════════════════════════════════════════════════
// Create Models
// ══════════════════════════════════════════════════════════════════════════════
const DigitalSignature = mongoose.model('DigitalSignature', DigitalSignatureSchema);
const InternalNote = mongoose.model('InternalNote', InternalNoteSchema);
const CorrespondenceReminder = mongoose.model(
  'CorrespondenceReminder',
  CorrespondenceReminderSchema
);
const LinkedTask = mongoose.model('LinkedTask', LinkedTaskSchema);
const DeliveryTracking = mongoose.model('DeliveryTracking', DeliveryTrackingSchema);
const CorrespondenceReferral = mongoose.model('CorrespondenceReferral', ReferralSchema);
const CorrespondenceComment = mongoose.model('CorrespondenceComment', CorrespondenceCommentSchema);
const OfficialStamp = mongoose.model('OfficialStamp', OfficialStampSchema);
const CorrespondenceFavorite = mongoose.model(
  'CorrespondenceFavorite',
  CorrespondenceFavoriteSchema
);
const QRCodeTracking = mongoose.model('QRCodeTracking', QRCodeTrackingSchema);
const CorrespondenceLabel = mongoose.model('CorrespondenceLabel', CorrespondenceLabelSchema);
const ForwardRecord = mongoose.model('ForwardRecord', ForwardRecordSchema);

module.exports = {
  // Models
  DigitalSignature,
  InternalNote,
  CorrespondenceReminder,
  LinkedTask,
  DeliveryTracking,
  CorrespondenceReferral,
  CorrespondenceComment,
  OfficialStamp,
  CorrespondenceFavorite,
  QRCodeTracking,
  CorrespondenceLabel,
  ForwardRecord,

  // Schemas (for testing)
  DigitalSignatureSchema,
  InternalNoteSchema,
  CorrespondenceReminderSchema,
  LinkedTaskSchema,
  DeliveryTrackingSchema,
  ReferralSchema,
  CorrespondenceCommentSchema,
  OfficialStampSchema,
  CorrespondenceFavoriteSchema,
  QRCodeTrackingSchema,
  CorrespondenceLabelSchema,
  ForwardRecordSchema,
};
