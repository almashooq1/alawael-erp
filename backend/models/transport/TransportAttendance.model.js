'use strict';
const mongoose = require('mongoose');

const transportAttendanceSchema = new mongoose.Schema({
  studentTransportId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StudentTransport',
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  shift: {
    type: String,
    enum: ['morning', 'evening'],
    required: true,
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'late', 'excuse'],
    required: true,
  },
  boardingTime: Date,
  dropoffTime: Date,
  boardingPoint: String,
  dropoffPoint: String,
  busId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bus',
  },
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver',
  },
  remarks: String,
  createdAt: { type: Date, default: Date.now },
});

module.exports =
  mongoose.models.TransportAttendance ||
  mongoose.model('TransportAttendance', transportAttendanceSchema);
