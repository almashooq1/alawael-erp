'use strict';
const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema({
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
  email: {
    type: String,
    unique: true,
    sparse: true,
  },
  phone: {
    type: String,
    required: true,
  },
  gender: {
    type: String,
    enum: ['male', 'female'],
  },
  dateOfBirth: Date,
  licenseNumber: {
    type: String,
    required: true,
    unique: true,
  },
  licenseCategory: {
    type: String,
    enum: ['B', 'C', 'D', 'D1'],
    required: true,
  },
  licenseExpiry: {
    type: Date,
    required: true,
  },
  licenseStatus: {
    type: String,
    enum: ['valid', 'expired', 'suspended'],
    default: 'valid',
  },
  address: String,
  city: String,
  nationality: String,
  document: {
    nationalIdNo: String,
    passportNo: String,
  },
  bloodType: String,
  emergencyContact: {
    name: String,
    phone: String,
    relationship: String,
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'on_leave', 'suspended'],
    default: 'active',
  },
  assignedBus: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bus',
  },
  routes: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Route',
    },
  ],
  rating: {
    type: Number,
    default: 5,
    min: 1,
    max: 5,
  },
  safetyTrainingDate: Date,
  safetyTrainingExpiry: Date,
  firstAidCertificateDate: Date,
  firstAidCertificateExpiry: Date,
  backgroundCheckDate: Date,
  backgroundCheckStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  salaryInfo: {
    monthlySalary: Number,
    allowances: Number,
    paymentMethod: String,
    accountNo: String,
  },
  attendance: [
    {
      date: Date,
      status: { type: String, enum: ['present', 'absent', 'late', 'leave'] },
      checkInTime: Date,
      checkOutTime: Date,
    },
  ],
  violations: [
    {
      date: Date,
      type: String,
      severity: { type: String, enum: ['minor', 'major', 'critical'] },
      description: String,
      action: String,
      fineAmount: Number,
    },
  ],
  documents: {
    licenseImage: String,
    nationalIdImage: String,
    photoFile: String,
    medicalExaminationDate: Date,
    medicalExaminationExpiry: Date,
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.models.Driver || mongoose.model('Driver', driverSchema);
