const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  type: {
    type: String,
    enum: ['INFO', 'WARNING', 'SUCCESS', 'ERROR', 'TASK', 'MESSAGE'],
    default: 'INFO',
  },
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  link: {
    type: String, // Optional URL to redirect when clicked
    default: null,
  },
  isRead: {
    type: Boolean,
    default: false,
    index: true,
  },
  meta: {
    // Any extra data
    type: mongoose.Schema.Types.Mixed,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 2592000, // Auto-delete after 30 days
  },
});

// Index for fetching user's unread notifications quickly
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
