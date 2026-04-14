'use strict';
const mongoose = require('mongoose');

const busSchema = new mongoose.Schema({
  busNumber: { type: String, required: true, unique: true, trim: true },
  licensePlate: { type: String, required: true, unique: true },
  capacity: { type: Number, required: true, min: 1, max: 100 },
  model: { type: String, required: true },
  color: String,
  manufacturer: String,
  yearOfManufacture: Number,
  registrationDate: Date,
  status: { type: String, enum: ['active', 'inactive', 'maintenance'], default: 'active' },
  currentRoute: mongoose.Schema.Types.ObjectId,
  driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
  assistant: { type: mongoose.Schema.Types.ObjectId, ref: 'BusAssistant' },
  gpsTracker: {
    enabled: { type: Boolean, default: true },
    deviceId: String,
    lastLocation: { latitude: Number, longitude: Number, timestamp: Date },
  },
  maintenanceSchedule: [
    {
      date: Date,
      type: String,
      cost: Number,
      notes: String,
      completed: Boolean,
      completionDate: Date,
    },
  ],
  documents: {
    registrationCertificate: String,
    insurancePolicyNo: String,
    insuranceExpiry: Date,
    safetyInspectionDate: Date,
    roadworthyCertificate: String,
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.models.Bus || mongoose.model('Bus', busSchema);
