const mongoose = require('mongoose');
const moment = require('moment');

/**
 * DocumentVersion Schema
 * Manages version history, collaboration, workflow, and sharing of documents
 */
const DocumentVersionSchema = new mongoose.Schema(
  {
    // Document Reference
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: true
    },

    // Version Tracking
    versionNumber: {
      type: Number,
      required: true,
      default: 1,
    },

    // Content
    title: {
      type: String,
      required: true,
    },

    content: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },

    contentType: {
      type: String,
      enum: ['text', 'html', 'json', 'binary', 'markdown'],
      default: 'text',
    },

    contentSize: {
      type: Number,
      default: 0,
    },

    // Change Tracking
    changeDescription: String,

    changes: [
      {
        field: String,
        oldValue: mongoose.Schema.Types.Mixed,
        newValue: mongoose.Schema.Types.Mixed,
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // User Attribution
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    // Workflow Status
    status: {
      type: String,
      enum: ['draft', 'review', 'published', 'archived'],
      default: 'draft',
    },

    publishedAt: Date,
    publishedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    // Edit Sessions (Collaborative Editing)
    editSessions: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        startTime: {
          type: Date,
          default: Date.now,
        },
        endTime: Date,
        cursorPosition: Number,
        status: {
          type: String,
          enum: ['active', 'paused', 'ended'],
          default: 'active',
        },
      },
    ],

    // Sharing & Permissions
    sharedWith: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        permission: {
          type: String,
          enum: ['view', 'comment', 'edit'],
          default: 'view',
        },
        sharedAt: {
          type: Date,
          default: Date.now,
        },
        sharedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      },
    ],

    // Comments
    comments: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        comment: String,
        timestamp: {
          type: Date,
          default: Date.now,
        },
        position: Number,
        resolved: {
          type: Boolean,
          default: false,
        },
      },
    ],

    // Metadata
    tags: [String],

    category: String,

    metadata: {
      wordCount: Number,
      pageCount: Number,
      estimatedReadTime: Number, // in minutes
      externalLinks: [String],
      internalReferences: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Document',
        },
      ],
      language: {
        type: String,
        default: 'ar',
      },
    },

    isPublic: {
      type: Boolean,
      default: false,
    },

    // Timestamps
    createdAt: {
      type: Date,
      default: Date.now
    },

    updatedAt: {
      type: Date,
      default: Date.now,
    },

    deletedAt: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
DocumentVersionSchema.index({ documentId: 1, versionNumber: -1 });
DocumentVersionSchema.index({ createdBy: 1, createdAt: -1 });
DocumentVersionSchema.index({ status: 1, createdAt: -1 });
DocumentVersionSchema.index({ tags: 1 });

// Virtuals
DocumentVersionSchema.virtual('isDraft').get(function () {
  return this.status === 'draft';
});

DocumentVersionSchema.virtual('isPublished').get(function () {
  return this.status === 'published';
});

DocumentVersionSchema.virtual('isArchived').get(function () {
  return this.status === 'archived';
});

DocumentVersionSchema.virtual('canBeEdited').get(function () {
  return this.isDraft || this.status === 'review';
});

DocumentVersionSchema.virtual('activeEditorsCount').get(function () {
  return this.editSessions.filter(s => s.status === 'active').length;
});

DocumentVersionSchema.virtual('sharedWithCount').get(function () {
  return this.sharedWith.length;
});

DocumentVersionSchema.virtual('unresolvedCommentsCount').get(function () {
  return this.comments.filter(c => !c.resolved).length;
});

// Instance Methods
DocumentVersionSchema.methods.shareWith = async function (userId, permission = 'view', sharedBy) {
  const alreadyShared = this.sharedWith.find(s => s.userId.toString() === userId.toString());

  if (alreadyShared) {
    alreadyShared.permission = permission;
  } else {
    this.sharedWith.push({
      userId,
      permission,
      sharedBy,
    });
  }

  return this.save();
};

DocumentVersionSchema.methods.revokeAccess = async function (userId) {
  this.sharedWith = this.sharedWith.filter(s => s.userId.toString() !== userId.toString());
  return this.save();
};

DocumentVersionSchema.methods.addComment = async function (userId, comment, position) {
  this.comments.push({
    userId,
    comment,
    position,
  });
  return this.save();
};

DocumentVersionSchema.methods.resolveComment = async function (commentId) {
  const comment = this.comments.id(commentId);
  if (comment) {
    comment.resolved = true;
  }
  return this.save();
};

DocumentVersionSchema.methods.startEditSession = async function (userId) {
  const activeSession = this.editSessions.find(
    s => s.userId.toString() === userId.toString() && s.status === 'active'
  );

  if (activeSession) {
    return activeSession;
  }

  const newSession = {
    userId,
    status: 'active',
  };

  this.editSessions.push(newSession);
  return this.save();
};

DocumentVersionSchema.methods.endEditSession = async function (userId) {
  const session = this.editSessions.find(
    s => s.userId.toString() === userId.toString() && s.status === 'active'
  );

  if (session) {
    session.status = 'ended';
    session.endTime = new Date();
  }

  return this.save();
};

DocumentVersionSchema.methods.getChangesSummary = function () {
  return {
    totalChanges: this.changes.length,
    changedFields: [...new Set(this.changes.map(c => c.field))],
    lastChange: this.changes[this.changes.length - 1] || null,
  };
};

DocumentVersionSchema.methods.getStatistics = function () {
  return {
    versionNumber: this.versionNumber,
    status: this.status,
    contentSize: this.contentSize,
    wordCount: this.metadata?.wordCount || 0,
    readTime: this.metadata?.estimatedReadTime || 0,
    activeEditors: this.activeEditorsCount,
    sharedWith: this.sharedWithCount,
    pendingComments: this.unresolvedCommentsCount,
  };
};

// Static Methods
DocumentVersionSchema.statics.findLatestVersion = async function (documentId) {
  return this.findOne({ documentId })
    .sort({ versionNumber: -1 })
    .populate('createdBy', 'email username')
    .populate('publishedBy', 'email username')
    .exec();
};

DocumentVersionSchema.statics.findVersionByNumber = async function (documentId, versionNumber) {
  return this.findOne({ documentId, versionNumber })
    .populate('createdBy', 'email username')
    .populate('updatedBy', 'email username')
    .exec();
};

DocumentVersionSchema.statics.getVersionHistory = async function (documentId, options = {}) {
  const { limit = 20, skip = 0, sortBy = 'versionNumber', order = 'desc' } = options;

  const query = { documentId, deletedAt: { $exists: false } };
  const sortObj = { [sortBy]: order === 'desc' ? -1 : 1 };

  const [versions, total] = await Promise.all([
    this.find(query)
      .sort(sortObj)
      .limit(limit)
      .skip(skip)
      .populate('createdBy', 'email username')
      .exec(),
    this.countDocuments(query),
  ]);

  return {
    versions,
    total,
    pages: Math.ceil(total / limit),
    currentPage: Math.ceil(skip / limit) + 1,
  };
};

DocumentVersionSchema.statics.getPublishedVersions = async function (documentId) {
  return this.find({ documentId, status: 'published', deletedAt: { $exists: false } })
    .sort({ versionNumber: -1 })
    .populate('createdBy', 'email username')
    .populate('publishedBy', 'email username')
    .exec();
};

// Middleware
DocumentVersionSchema.pre('save', function (next) {
  this.updatedAt = new Date();

  // Calculate content size
  if (this.content) {
    this.contentSize = JSON.stringify(this.content).length;
  }

  next();
});

// Soft delete support
DocumentVersionSchema.pre('find', function () {
  this.where({ deletedAt: { $exists: false } });
});

DocumentVersionSchema.pre('findOne', function () {
  this.where({ deletedAt: { $exists: false } });
});

const DocumentVersion = mongoose.model('DocumentVersion', DocumentVersionSchema);

module.exports = DocumentVersion;
