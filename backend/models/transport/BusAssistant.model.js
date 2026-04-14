'use strict';
const mongoose = require('mongoose');

const busAssistantSchema = new mongoose.Schema({
  employeeId: {
    type: String,
    required: true,
    unique: true,
  },
  firstName: {
    type: String,
    required: true,
  },
  lastName: {
    type: String,
    required: true,
  },
  email: String,
  phone: {
    type: String,
    required: true,
  },
  gender: {
    type: String,
    enum: ['male', 'female'],
  },
  dateOfBirth: Date,
  assignedBus: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bus',
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'on_leave'],
    default: 'active',
  },
  qualifications: [String],
  firstAidTraining: {
    date: Date,
    expiry: Date,
    certificateNo: String,
  },
  childSafetyTraining: {
    date: Date,
    expiry: Date,
    certificateNo: String,
  },
  backgroundCheckStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.models.BusAssistant || mongoose.model('BusAssistant', busAssistantSchema);
