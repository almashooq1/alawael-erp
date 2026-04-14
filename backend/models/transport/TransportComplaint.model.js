'use strict';
const mongoose = require('mongoose');

const transportComplaintSchema = new mongoose.Schema({
  complaintId: {
    type: String,
    unique: true,
    required: true,
  },
  complainantType: {
    type: String,
    enum: ['student', 'parent', 'driver', 'admin'],
    required: true,
  },
  complainant: mongoose.Schema.Types.ObjectId,
  studentTransport: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StudentTransport',
  },
  route: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Route',
  },
  bus: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bus',
  },
  complaintType: {
    type: String,
    enum: ['safety', 'behavior', 'late_arrival', 'damage', 'hygiene', 'other'],
    required: true,
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  attachments: [String],
  status: {
    type: String,
    enum: ['open', 'investigating', 'resolved', 'closed'],
    default: 'open',
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AdminUser',
  },
  resolution: String,
  resolutionDate: Date,
  followUpActions: [String],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports =
  mongoose.models.TransportComplaint ||
  mongoose.model('TransportComplaint', transportComplaintSchema);
