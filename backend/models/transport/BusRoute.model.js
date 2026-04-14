'use strict';
const mongoose = require('mongoose');

const routeSchema = new mongoose.Schema({
  routeCode: {
    type: String,
    required: true,
    unique: true,
  },
  routeName: {
    type: String,
    required: true,
  },
  description: String,
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
  },
  stops: [
    {
      stopNumber: Number,
      stopName: {
        type: String,
        required: true,
      },
      location: {
        latitude: Number,
        longitude: Number,
        address: String,
        areaName: String,
      },
      estimatedArrivalTime: String,
      waitTime: Number,
      order: Number,
      pickupStudents: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Student',
        },
      ],
      dropoffStudents: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Student',
        },
      ],
    },
  ],
  startPoint: {
    name: String,
    location: {
      latitude: Number,
      longitude: Number,
      address: String,
    },
  },
  endPoint: {
    name: String,
    location: {
      latitude: Number,
      longitude: Number,
      address: String,
    },
  },
  scheduleType: {
    type: String,
    enum: ['daily', 'weekdays', 'weekends', 'custom'],
    default: 'daily',
  },
  operatingDays: [String],
  morningShift: {
    startTime: String,
    endTime: String,
    estimatedDuration: Number,
    assignedBus: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bus',
    },
    assignedDriver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Driver',
    },
    fee: Number,
  },
  eveningShift: {
    startTime: String,
    endTime: String,
    estimatedDuration: Number,
    assignedBus: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bus',
    },
    assignedDriver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Driver',
    },
    fee: Number,
  },
  totalStudents: Number,
  averageOccupancy: Number,
  routeGeometry: {
    type: { type: String, enum: ['LineString'], default: 'LineString' },
    coordinates: [[Number]],
  },
  routeDistance: Number,
  estimatedTravelTime: Number,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.models.Route || mongoose.model('Route', routeSchema);
