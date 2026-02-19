/**
 * DocumentVersion Model - Phase 3
 * Handles document versioning, history tracking, and collaborative editing
 */

const mongoose = require('mongoose');

const DocumentVersionSchema = new mongoose.Schema(
  {
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
      index: true,
    },
    versionNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    title: String,
    content: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    contentType: {
      type: String,
      enum: ['text', 'html', 'json', 'binary'],
      default: 'text',
    },
    changeDescription: {
      type: String,
      trim: true,
    },

    // Metadata
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    // Change tracking
    changes: [
      {
        field: String,
        oldValue: mongoose.Schema.Types.Mixed,
        newValue: mongoose.Schema.Types.Mixed,
        timestamp: { type: Date, default: Date.now },
      },
    ],

    // Size metrics
    contentSize: {
      type: Number, // in bytes
      default: 0,
    },

    // Collaborative info
    editSessions: [
      {
        userId: mongoose.Schema.Types.ObjectId,
        startTime: Date,
        endTime: Date,
        cursorPosition: Number,
      },
    ],

    // Status
    status: {
      type: String,
      enum: ['draft', 'review', 'published', 'archived'],
      default: 'draft',
    },

    // Publishing
    publishedAt: Date,
    publishedBy: mongoose.Schema.Types.ObjectId,

    // Tags and categorization
    tags: [String],
    category: String,

    // Access control
    isPublic: {
      type: Boolean,
      default: false,
    },
    sharedWith: [
      {
        userId: mongoose.Schema.Types.ObjectId,
        permission: {
          type: String,
          enum: ['view', 'edit', 'comment'],
          default: 'view',
        },
        sharedAt: { type: Date, default: Date.now },
      },
    ],

    // Metadata
    metadata: {
      wordCount: Number,
      pageCount: Number,
      estimatedReadTime: Number, // in minutes
      externalLinks: [String],
      internalReferences: [mongoose.Schema.Types.ObjectId],
    },
  },
  {
    timestamps: true,
    collection: 'document_versions',
  }
);

// Indexes for optimal querying
DocumentVersionSchema.index({ documentId: 1, versionNumber: -1 });
DocumentVersionSchema.index({ createdBy: 1, createdAt: -1 });
DocumentVersionSchema.index({ status: 1, createdAt: -1 });
DocumentVersionSchema.index({ tags: 1 });

// Methods
DocumentVersionSchema.methods.isDraft = function () {
  return this.status === 'draft';
};

DocumentVersionSchema.methods.isPublished = function () {
  return this.status === 'published';
};

DocumentVersionSchema.methods.canBeEdited = function () {
  return this.status === 'draft' || this.status === 'review';
};

DocumentVersionSchema.methods.getChangesSummary = function () {
  return {
    totalChanges: this.changes.length,
    fieldsChanged: [...new Set(this.changes.map(c => c.field))],
    lastChangeAt: this.changes.length > 0 ? this.changes[this.changes.length - 1].timestamp : null,
  };
};

DocumentVersionSchema.methods.shareWith = function (userId, permission = 'view') {
  const existingShare = this.sharedWith.find(s => s.userId?.toString() === userId.toString());
  if (existingShare) {
    existingShare.permission = permission;
  } else {
    this.sharedWith.push({ userId, permission });
  }
  return this;
};

DocumentVersionSchema.methods.revokeAccess = function (userId) {
  this.sharedWith = this.sharedWith.filter(s => s.userId?.toString() !== userId.toString());
  return this;
};

DocumentVersionSchema.methods.getStatistics = function () {
  return {
    versionNumber: this.versionNumber,
    contentSize: this.contentSize,
    metadata: this.metadata,
    status: this.status,
    createdAt: this.createdAt,
    editSessions: this.editSessions.length,
    sharedCount: this.sharedWith.length,
  };
};

// Static methods
DocumentVersionSchema.statics.findLatestVersion = function (documentId) {
  return this.findOne({ documentId }).sort({ versionNumber: -1 });
};

DocumentVersionSchema.statics.findVersionByNumber = function (documentId, versionNumber) {
  return this.findOne({ documentId, versionNumber });
};

DocumentVersionSchema.statics.getVersionHistory = function (documentId, limit = 10) {
  return this.find({ documentId })
    .sort({ versionNumber: -1 })
    .limit(limit)
    .select('-content')
    .lean();
};

const DocumentVersion = mongoose.model('DocumentVersion', DocumentVersionSchema);

module.exports = DocumentVersion;
