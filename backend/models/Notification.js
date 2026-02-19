const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  // User references (support both recipient and userId for compatibility)
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },

  // Core notification fields
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: [
      'info',
      'warning',
      'success',
      'error',
      'INFO',
      'WARNING',
      'SUCCESS',
      'ERROR',
      'TASK',
      'MESSAGE',
    ],
    default: 'info',
  },

  // Visual/Display fields
  icon: {
    type: String,
    default: null,
  },
  link: {
    type: String,
    default: null,
  },
  actions: [
    {
      label: String,
      url: String,
      type: String,
    },
  ],

  // Status fields
  read: {
    type: Boolean,
    default: false,
    index: true,
  },
  isRead: {
    type: Boolean,
    default: false,
    index: true,
  },
  readAt: {
    type: Date,
    default: null,
  },

  // Archival and soft delete
  archived: {
    type: Boolean,
    default: false,
    index: true,
  },
  archivedAt: {
    type: Date,
    default: null,
  },

  // Favorites
  favorite: {
    type: Boolean,
    default: false,
  },

  // Snooze functionality
  snoozed: {
    type: Boolean,
    default: false,
  },
  snoozedUntil: {
    type: Date,
    default: null,
  },

  // Categorization and priority
  category: {
    type: String,
    default: null,
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal',
  },

  // Expiration
  expiresAt: {
    type: Date,
    default: null,
  },

  // Delivery tracking
  retryCount: {
    type: Number,
    default: 0,
  },
  lastRetryAt: {
    type: Date,
    default: null,
  },

  // Extra metadata
  meta: {
    type: mongoose.Schema.Types.Mixed,
  },

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Set recipient = userId for backward compatibility
notificationSchema.pre('save', function (next) {
  if (this.userId && !this.recipient) {
    this.recipient = this.userId;
  }
  if (this.userId) {
    this.read = this.read !== undefined ? this.read : this.isRead;
    this.isRead = this.read;
  }
  next();
});

// Indexes for performance
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, archived: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Notification', notificationSchema);
