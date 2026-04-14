'use strict';
const mongoose = require('mongoose');

const transportNotificationSchema = new mongoose.Schema({
  notificationId: {
    type: String,
    unique: true,
    required: true,
  },
  recipientType: {
    type: String,
    enum: ['student', 'parent', 'driver', 'admin', 'all'],
    required: true,
  },
  recipient: mongoose.Schema.Types.ObjectId,
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  notificationType: {
    type: String,
    enum: ['bus_delay', 'bus_arrival', 'route_change', 'fee_payment', 'alert', 'announcement'],
    required: true,
  },
  relatedRoute: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Route',
  },
  relatedBus: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bus',
  },
  sendDate: { type: Date, default: Date.now },
  readDate: Date,
  isRead: { type: Boolean, default: false },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
  },
  attachments: [String],
  createdAt: { type: Date, default: Date.now },
});

module.exports =
  mongoose.models.TransportNotification ||
  mongoose.model('TransportNotification', transportNotificationSchema);
