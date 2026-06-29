'use strict';
/**
 * CommunicationRecord — سجل التواصل العام (شكاوى / بريد / رسائل)
 * ════════════════════════════════════════════════════════════════════════════
 * Dedicated, branch-scoped, channel-discriminated communication store.
 *
 * WHY THIS EXISTS
 * ---------------
 * The `student-complaints`, `admin-communications`, and `email-v2` route
 * surfaces were originally written against the canonical `Communication`
 * model — but that model is a *formal correspondence* entity that REQUIRES
 * `type`/`sender.name`/`receiver.name`/`sentDate` and restricts `status` to
 * an approval-workflow enum. Every complaint/email write therefore threw a
 * Mongoose ValidationError (→ HTTP 500) and every stats read matched 0 docs.
 *
 * This model is the fit-for-purpose shape those three surfaces actually use:
 * a lightweight ticket/message record keyed by `branchId` + `channel`, with a
 * lifecycle (open → in_progress → resolved / draft → sent) plus assignment,
 * escalation, notes, feedback, and email inbox flags. The canonical
 * `Communication` model is left untouched.
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

const noteSchema = new Schema(
  {
    content: { type: String, required: true, trim: true },
    isInternal: { type: Boolean, default: true },
    addedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const partySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, trim: true },
    email: { type: String, trim: true },
    phone: { type: String, trim: true },
  },
  { _id: false }
);

const communicationRecordSchema = new Schema(
  {
    // Tenant + classification
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', index: true },
    channel: {
      type: String,
      enum: ['complaint', 'email', 'sms', 'whatsapp', 'phone', 'notification', 'other'],
      required: true,
      index: true,
    },
    direction: { type: String, enum: ['inbound', 'outbound'], default: 'inbound', index: true },
    // Free-text classification (complaint category key, etc.) — intentionally not an enum.
    category: { type: String, trim: true },
    priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },

    // Content
    subject: { type: String, trim: true },
    body: { type: String, trim: true },
    attachments: { type: [Schema.Types.Mixed], default: [] },

    // Parties
    sender: { type: partySchema, default: undefined },
    recipient: { type: partySchema, default: undefined },
    cc: { type: Schema.Types.Mixed },
    bcc: { type: Schema.Types.Mixed },
    replyTo: { type: String, trim: true },

    // Lifecycle
    status: {
      type: String,
      enum: ['open', 'pending', 'in_progress', 'resolved', 'draft', 'sent'],
      default: 'open',
      index: true,
    },

    // Assignment
    assignedTo: { type: String, trim: true },
    assignedAt: { type: Date },
    assignedBy: { type: Schema.Types.ObjectId, ref: 'User' },

    // Notes (internal thread)
    notes: { type: [noteSchema], default: [] },

    // Resolution
    resolution: { type: String, trim: true },
    resolvedAt: { type: Date },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    notifySubmitter: { type: Boolean, default: false },

    // Escalation
    isEscalated: { type: Boolean, default: false, index: true },
    escalatedTo: { type: String, trim: true },
    escalationReason: { type: String, trim: true },
    escalatedAt: { type: Date },
    escalatedBy: { type: Schema.Types.ObjectId, ref: 'User' },

    // Reopen
    reopenReason: { type: String, trim: true },
    reopenedAt: { type: Date },
    reopenedBy: { type: Schema.Types.ObjectId, ref: 'User' },

    // Satisfaction feedback
    customerRating: { type: Number, min: 1, max: 5 },
    customerFeedback: { type: String, trim: true },
    feedbackAt: { type: Date },

    // Email send metadata
    sentAt: { type: Date },
    sentBy: { type: Schema.Types.ObjectId, ref: 'User' },

    // Email inbox flags
    isRead: { type: Boolean, default: false },
    readAt: { type: Date },
    readBy: { type: Schema.Types.ObjectId, ref: 'User' },
    isStarred: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
    deletedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Query-shape indexes matching the three route surfaces.
communicationRecordSchema.index({ branchId: 1, channel: 1, status: 1, createdAt: -1 });
communicationRecordSchema.index({ branchId: 1, channel: 1, direction: 1, status: 1 });
communicationRecordSchema.index({ branchId: 1, status: 1, assignedTo: 1 });

module.exports =
  mongoose.models.CommunicationRecord ||
  mongoose.model('CommunicationRecord', communicationRecordSchema);
