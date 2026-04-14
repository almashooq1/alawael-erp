'use strict';
const mongoose = require('mongoose');

const tripReportSchema = new mongoose.Schema({
  reportId: {
    type: String,
    unique: true,
    required: true,
  },
  route: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Route',
    required: true,
  },
  bus: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bus',
    required: true,
  },
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver',
    required: true,
  },
  assistant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BusAssistant',
  },
  tripDate: {
    type: Date,
    required: true,
  },
  shift: {
    type: String,
    enum: ['morning', 'evening'],
    required: true,
  },
  startTime: Date,
  endTime: Date,
  studentsBoarded: Number,
  studentsDropped: Number,
  fuelUsed: Number,
  mileageStart: Number,
  mileageEnd: Number,
  distance: Number,
  incidents: [
    {
      time: Date,
      type: String,
      severity: String,
      description: String,
      location: String,
    },
  ],
  maintenanceIssues: [
    {
      type: String,
      severity: String,
      description: String,
      actionRequired: String,
    },
  ],
  behaviorNotes: String,
  safetyChecks: {
    seatbeltsInspected: Boolean,
    emergencyExitClear: Boolean,
    fireExtinguisherPresent: Boolean,
    busConditionGood: Boolean,
  },
  fuelExpense: Number,
  maintenanceExpense: Number,
  otherExpenses: Number,
  notes: String,
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.models.TripReport || mongoose.model('TripReport', tripReportSchema);
