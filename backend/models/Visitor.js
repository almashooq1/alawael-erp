/* eslint-disable no-unused-vars */
const mongoose = require('mongoose');

const visitorSchema = new mongoose.Schema(
  {
    visitorId: { type: String, required: true, unique: true, index: true },
    fullName: { type: String, required: true, minlength: 2, maxlength: 100 },
    nationalId: { type: String },
    phone: { type: String },
    email: { type: String },
    company: { type: String },
    purpose: {
      type: String,
      enum: ['meeting', 'delivery', 'maintenance', 'interview', 'inspection', 'personal', 'other'],
      default: 'meeting',
    },
    hostEmployee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    hostName: { type: String },
    hostDepartment: { type: String },
    status: {
      type: String,
      enum: ['pre_registered', 'checked_in', 'checked_out', 'cancelled', 'no_show'],
      default: 'pre_registered',
    },
    badgeNumber: { type: String },
    vehiclePlate: { type: String },
    checkInTime: { type: Date },
    checkOutTime: { type: Date },
    expectedArrival: { type: Date },
    notes: { type: String, maxlength: 500 },
    photo: { type: String },
    idDocument: { type: String },
    belongings: [{ item: String, description: String }],
    registeredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    branch: { type: String, index: true },
  },
  { timestamps: true }
);

visitorSchema.index({ status: 1, checkInTime: -1 });
visitorSchema.index({ expectedArrival: 1 });

module.exports = mongoose.models.Visitor || mongoose.model('Visitor', visitorSchema);
