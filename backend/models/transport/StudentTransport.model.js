'use strict';
const mongoose = require('mongoose');

const studentTransportSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
  },
  registrationNumber: {
    type: String,
    unique: true,
    required: true,
  },
  currentRoute: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Route',
    required: true,
  },
  shift: {
    type: String,
    enum: ['morning', 'evening', 'both'],
    required: true,
  },
  pickupPoint: {
    name: String,
    location: {
      latitude: Number,
      longitude: Number,
      address: String,
    },
  },
  dropoffPoint: {
    name: String,
    location: {
      latitude: Number,
      longitude: Number,
      address: String,
    },
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'waiting_approval'],
    default: 'waiting_approval',
  },
  monthlyFee: Number,
  paidAmount: Number,
  balanceDue: Number,
  paymentStatus: {
    type: String,
    enum: ['paid', 'partial', 'unpaid', 'overdue'],
    default: 'unpaid',
  },
  parentContact: {
    name: String,
    phone: String,
    email: String,
  },
  emergencyContact: {
    name: String,
    phone: String,
    relationship: String,
  },
  medicalInformation: {
    allergies: String,
    medicines: String,
    specialNeeds: String,
    emergencyMedicalNo: String,
  },
  attendanceRecords: [
    {
      date: Date,
      boardingPoint: String,
      dropoffTime: Date,
      attended: Boolean,
      notes: String,
    },
  ],
  registrationDate: { type: Date, default: Date.now },
  approvalDate: Date,
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AdminUser',
  },
  expiryDate: Date,
  renewalHistory: [
    {
      renewalDate: Date,
      renewalYear: Number,
      approvalDate: Date,
    },
  ],
  notes: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports =
  mongoose.models.StudentTransport || mongoose.model('StudentTransport', studentTransportSchema);
