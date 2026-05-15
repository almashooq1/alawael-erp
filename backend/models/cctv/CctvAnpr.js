/**
 * CctvAnpr — ANPR (license plate) registry.
 *
 * The Hikvision ANPR camera reads plates → we record observations as
 * CctvEvent(type='anpr_plate'). Plates allowed/denied are matched against
 * this registry. Owner can be an employee, parent, vendor.
 */
'use strict';

const mongoose = require('mongoose');

const anprSchema = new mongoose.Schema(
  {
    plate: { type: String, required: true, unique: true, uppercase: true, trim: true },
    plateRegion: { type: String, default: 'SA' },

    ownerKind: {
      type: String,
      enum: ['employee', 'parent', 'vendor', 'visitor', 'denylist'],
      required: true,
    },
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', sparse: true },
    parentUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', sparse: true },
    vendorName: { type: String },
    label: { type: String },

    allowedBranches: [{ type: String, uppercase: true }],
    schedule: {
      daysOfWeek: [{ type: String, enum: ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] }],
      hoursLocal: { from: String, to: String },
    },

    autoOpenGate: { type: Boolean, default: false },
    triggerAlert: { type: Boolean, default: false },

    status: {
      type: String,
      enum: ['active', 'expired', 'revoked'],
      default: 'active',
      index: true,
    },
    validFrom: { type: Date },
    validUntil: { type: Date },
  },
  { timestamps: true }
);

anprSchema.index({ status: 1, ownerKind: 1 });

module.exports = mongoose.models.CctvAnpr || mongoose.model('CctvAnpr', anprSchema);
