/**
 * FormSubmission Model — نموذج إرسال النماذج
 * Tracks form submissions, approval workflows, and revision history.
 *
 * @module models/FormSubmission
 * @created 2026-03-14
 */

const mongoose = require('mongoose');

// ═══════════════════════════════════════════════════════════════
// 📐 SUB-SCHEMAS
// ═══════════════════════════════════════════════════════════════

const ApprovalRecordSchema = new mongoose.Schema(
  {
    step: { type: Number, default: 0 },
    role: { type: String, required: true },
    label: String,
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'skipped'],
      default: 'pending',
    },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approverName: String,
    comment: String,
    date: Date,
    autoApproved: { type: Boolean, default: false },
  },
  { _id: false }
);

const AttachmentSchema = new mongoose.Schema(
  {
    filename: { type: String, required: true },
    originalName: String,
    path: String,
    url: String,
    size: Number,
    mimeType: String,
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const RevisionSchema = new mongoose.Schema(
  {
    revisionNumber: { type: Number, required: true },
    data: mongoose.Schema.Types.Mixed,
    changedFields: [String],
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    changedByName: String,
    reason: String,
  },
  { timestamps: true, _id: true }
);

const CommentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    userName: String,
    userRole: String,
    text: { type: String, required: true },
    type: {
      type: String,
      enum: ['comment', 'note', 'request_change', 'system'],
      default: 'comment',
    },
    isInternal: { type: Boolean, default: false }, // Only visible to approvers
  },
  { timestamps: true, _id: true }
);

// ═══════════════════════════════════════════════════════════════
// 📄 MAIN FORM SUBMISSION SCHEMA
// ═══════════════════════════════════════════════════════════════

const FormSubmissionSchema = new mongoose.Schema(
  {
    // Reference
    templateId: { type: String, required: true, index: true },
    templateName: String,
    templateVersion: { type: Number, default: 1 },
    submissionNumber: { type: String, unique: true },

    // Submitter
    submittedBy: {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
      name: String,
      email: String,
      department: String,
      role: String,
      phone: String,
    },

    // Form data
    data: { type: mongoose.Schema.Types.Mixed, required: true },
    formattedData: mongoose.Schema.Types.Mixed, // Pre-rendered display values

    // Status
    status: {
      type: String,
      enum: [
        'draft',
        'submitted',
        'under_review',
        'approved',
        'rejected',
        'cancelled',
        'returned',
        'archived',
      ],
      default: 'submitted',
      index: true,
    },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
    },

    // Approval workflow
    approvals: [ApprovalRecordSchema],
    currentApprovalStep: { type: Number, default: 0 },

    // Attachments
    attachments: [AttachmentSchema],

    // Revision history
    revisions: [RevisionSchema],
    currentRevision: { type: Number, default: 1 },

    // Comments / Discussion
    comments: [CommentSchema],

    // Notes
    notes: String,
    internalNotes: String, // Admin-only notes
    rejectionReason: String,
    returnReason: String,

    // Output
    generatedPdf: {
      url: String,
      generatedAt: Date,
    },

    // Tracking
    viewedByApprover: { type: Boolean, default: false },
    lastViewedAt: Date,
    approvedAt: Date,
    rejectedAt: Date,
    dueDate: Date,

    // Multi-tenancy
    tenantId: String,
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ───────────────────────────────────────────────────────
FormSubmissionSchema.index({ templateId: 1, status: 1 });
FormSubmissionSchema.index({ 'submittedBy.userId': 1, status: 1 });
FormSubmissionSchema.index({ status: 1, createdAt: -1 });
FormSubmissionSchema.index({ tenantId: 1, status: 1 });

// ─── Auto-generate submission number ───────────────────────────────
FormSubmissionSchema.pre('save', async function () {
  if (!this.submissionNumber) {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const rand = Math.floor(10000 + Math.random() * 90000);
    this.submissionNumber = `SUB-${year}${month}-${rand}`;
  }
});

// ─── Virtuals ──────────────────────────────────────────────────────
FormSubmissionSchema.virtual('isOverdue').get(function () {
  if (!this.dueDate) return false;
  return (
    new Date() > this.dueDate &&
    !['approved', 'rejected', 'cancelled', 'archived'].includes(this.status)
  );
});

FormSubmissionSchema.virtual('pendingApprovalCount').get(function () {
  return (this.approvals || []).filter(a => a.status === 'pending').length;
});

FormSubmissionSchema.virtual('daysSinceSubmission').get(function () {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
});

// ─── Methods ───────────────────────────────────────────────────────

/**
 * Approve the current step
 */
FormSubmissionSchema.methods.approveCurrentStep = function (userId, userName, comment) {
  const pending = this.approvals.find(a => a.status === 'pending');
  if (!pending) throw new Error('لا توجد خطوة اعتماد معلقة');

  pending.status = 'approved';
  pending.approvedBy = userId;
  pending.approverName = userName;
  pending.comment = comment;
  pending.date = new Date();
  this.currentApprovalStep += 1;

  // Check if all approved
  const allDone = this.approvals.every(a => a.status === 'approved' || a.status === 'skipped');
  this.status = allDone ? 'approved' : 'under_review';
  if (allDone) this.approvedAt = new Date();

  return this;
};

/**
 * Reject
 */
FormSubmissionSchema.methods.reject = function (userId, userName, comment) {
  const pending = this.approvals.find(a => a.status === 'pending');
  if (pending) {
    pending.status = 'rejected';
    pending.approvedBy = userId;
    pending.approverName = userName;
    pending.comment = comment;
    pending.date = new Date();
  }
  this.status = 'rejected';
  this.rejectionReason = comment;
  this.rejectedAt = new Date();
  return this;
};

/**
 * Return for revision
 */
FormSubmissionSchema.methods.returnForRevision = function (userId, userName, reason) {
  this.status = 'returned';
  this.returnReason = reason;
  this.comments.push({
    userId,
    userName,
    text: reason,
    type: 'request_change',
  });
  return this;
};

/**
 * Save a revision before updating data
 */
FormSubmissionSchema.methods.saveRevision = function (newData, userId, userName, reason) {
  const changedFields = [];
  for (const key of Object.keys(newData)) {
    if (JSON.stringify(this.data[key]) !== JSON.stringify(newData[key])) {
      changedFields.push(key);
    }
  }
  if (changedFields.length === 0) return this;

  this.revisions.push({
    revisionNumber: this.currentRevision,
    data: JSON.parse(JSON.stringify(this.data)),
    changedFields,
    changedBy: userId,
    changedByName: userName,
    reason,
  });
  this.currentRevision += 1;
  this.data = newData;
  return this;
};

// ─── Statics ───────────────────────────────────────────────────────

FormSubmissionSchema.statics.findByUser = function (userId, options = {}) {
  const filter = { 'submittedBy.userId': userId };
  if (options.status) filter.status = options.status;
  if (options.templateId) filter.templateId = options.templateId;
  return this.find(filter).sort({ createdAt: -1 });
};

FormSubmissionSchema.statics.findPending = function (options = {}) {
  const filter = { status: { $in: ['submitted', 'under_review'] } };
  if (options.tenantId) filter.tenantId = options.tenantId;
  return this.find(filter).sort({ priority: -1, createdAt: 1 });
};

FormSubmissionSchema.statics.getStats = function (filter = {}) {
  return this.aggregate([
    { $match: filter },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]);
};

// ─── Export ────────────────────────────────────────────────────────

let FormSubmissionModel;
try {
  FormSubmissionModel = mongoose.model('FormSubmission');
} catch {
  FormSubmissionModel =
    mongoose.models.FormSubmission || mongoose.model('FormSubmission', FormSubmissionSchema);
}

module.exports = FormSubmissionModel;
