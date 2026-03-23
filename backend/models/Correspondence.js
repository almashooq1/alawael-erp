/**
 * Correspondence.js — المراسلات الإدارية
 * Incoming / outgoing correspondence tracking model.
 */
const mongoose = require('mongoose');

/* ═══ Sub-schemas ════════════════════════════════════════════════════════════ */

const routingStepSchema = new mongoose.Schema(
  {
    fromUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    fromName: String,
    fromDept: String,
    toUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    toName: String,
    toDept: String,
    action: { type: String, enum: ['forwarded', 'assigned', 'escalated', 'returned', 'noted'] },
    notes: String,
    timestamp: { type: Date, default: Date.now },
    isCompleted: { type: Boolean, default: false },
    completedAt: Date,
  },
  { _id: true }
);

const attachmentSchema = new mongoose.Schema(
  {
    fileName: { type: String, required: true },
    fileUrl: String,
    fileType: String,
    fileSize: Number,
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const followUpSchema = new mongoose.Schema(
  {
    note: { type: String, required: true },
    dueDate: Date,
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    assignedName: String,
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'overdue'],
      default: 'pending',
    },
    completedAt: Date,
    createdAt: { type: Date, default: Date.now },
    createdBy: String,
  },
  { _id: true }
);

const auditEntrySchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: [
        'created',
        'updated',
        'received',
        'forwarded',
        'assigned',
        'escalated',
        'completed',
        'archived',
        'returned',
        'replied',
        'follow_up_added',
        'follow_up_completed',
      ],
    },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    performerName: String,
    details: String,
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

/* ═══ Main Schema ════════════════════════════════════════════════════════════ */

const correspondenceSchema = new mongoose.Schema(
  {
    // ── Identification ─────────────────────────────────────────────────────
    referenceNumber: {
      type: String,
      unique: true,
      required: true,
    },

    // ── Direction ──────────────────────────────────────────────────────────
    direction: {
      type: String,
      required: true,
      enum: ['incoming', 'outgoing'], // وارد / صادر
      index: true,
    },

    // ── Type ───────────────────────────────────────────────────────────────
    correspondenceType: {
      type: String,
      required: true,
      enum: [
        'letter', // خطاب
        'fax', // فاكس
        'email', // بريد إلكتروني
        'report', // تقرير
        'invoice', // فاتورة
        'contract', // عقد
        'complaint', // شكوى
        'request', // طلب
        'notification', // إشعار
        'other', // أخرى
      ],
    },

    // ── Content ────────────────────────────────────────────────────────────
    subject: { type: String, required: true },
    body: String,
    summary: String,

    // ── Parties ────────────────────────────────────────────────────────────
    // Incoming: sender is external, receiver is internal
    // Outgoing: sender is internal, receiver is external
    senderName: { type: String, required: true },
    senderOrg: String,
    senderDepartment: String,
    senderContact: String, // phone/email

    receiverName: { type: String, required: true },
    receiverOrg: String,
    receiverDepartment: String,
    receiverContact: String,

    // ── Classification ─────────────────────────────────────────────────────
    category: {
      type: String,
      enum: [
        'administrative',
        'financial',
        'hr',
        'legal',
        'medical',
        'technical',
        'academic',
        'general',
      ],
      default: 'general',
    },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
    },
    confidentiality: {
      type: String,
      enum: ['public', 'internal', 'confidential', 'top_secret'],
      default: 'internal',
    },

    // ── Status ─────────────────────────────────────────────────────────────
    status: {
      type: String,
      enum: [
        'received', // تم الاستلام
        'under_processing', // قيد المعالجة
        'forwarded', // تم التحويل
        'pending_reply', // بانتظار الرد
        'replied', // تم الرد
        'completed', // مكتمل
        'archived', // مؤرشف
        'returned', // مُعاد
      ],
      default: 'received',
      index: true,
    },

    // ── Dates ──────────────────────────────────────────────────────────────
    receivedDate: { type: Date, default: Date.now },
    sentDate: Date,
    dueDate: Date, // الموعد النهائي
    completedDate: Date,
    archivedDate: Date,

    // ── Routing ────────────────────────────────────────────────────────────
    currentHandler: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    currentHandlerName: String,
    currentDepartment: String,
    routingHistory: [routingStepSchema],

    // ── Organization ───────────────────────────────────────────────────────
    department: String,
    branch: String,

    // ── Relations ──────────────────────────────────────────────────────────
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdByName: String,
    attachments: [attachmentSchema],
    followUps: [followUpSchema],
    auditTrail: [auditEntrySchema],

    // ── Linked ─────────────────────────────────────────────────────────────
    linkedCorrespondence: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Correspondence' }],
    linkedDecisionId: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminDecision' },
    externalRefNumber: String, // رقم المرجع الخارجي

    // ── Tags ───────────────────────────────────────────────────────────────
    tags: [String],
    barcode: String,
    qrCode: String,
  },
  { timestamps: true }
);

/* ━━━ Indexes ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
correspondenceSchema.index({ direction: 1, status: 1 });
correspondenceSchema.index({ department: 1 });
correspondenceSchema.index({ currentHandler: 1 });
correspondenceSchema.index({ dueDate: 1 });
correspondenceSchema.index({ createdBy: 1 });
correspondenceSchema.index({
  subject: 'text',
  senderName: 'text',
  receiverName: 'text',
  tags: 'text',
});

/* ━━━ Methods ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
correspondenceSchema.methods.addAuditEntry = function (
  action,
  performerId,
  performerName,
  details
) {
  this.auditTrail.push({ action, performedBy: performerId, performerName, details });
};

/* ━━━ Statics ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
correspondenceSchema.statics.generateRefNumber = async function (direction) {
  const year = new Date().getFullYear();
  const prefix = direction === 'incoming' ? 'IN' : 'OUT';
  const count = await this.countDocuments({
    direction,
    createdAt: { $gte: new Date(`${year}-01-01`), $lt: new Date(`${year + 1}-01-01`) },
  });
  return `${prefix}-${year}-${String(count + 1).padStart(5, '0')}`;
};

module.exports = mongoose.models.Correspondence || mongoose.model('Correspondence', correspondenceSchema);
