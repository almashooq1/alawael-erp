/**
 * CctvFaceIdentity — enrolled face for recognition.
 *
 * Backed either by Hikvision face library (faceLibId/faceId on device)
 * or by our own embedding store. We store the device IDs for sync and
 * an opaque embedding for our own matcher.
 */
'use strict';

const mongoose = require('mongoose');

const faceIdentitySchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    kind: {
      type: String,
      enum: ['employee', 'beneficiary', 'parent', 'vendor', 'visitor', 'banned', 'vip'],
      required: true,
      index: true,
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      sparse: true,
      index: true,
    },
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      sparse: true,
      index: true,
    },
    parentUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', sparse: true },

    sampleImages: [
      {
        storageKey: { type: String },
        url: { type: String },
        capturedAt: { type: Date },
        quality: { type: Number, min: 0, max: 1 },
      },
    ],
    embedding: {
      vector: [{ type: Number }],
      model: { type: String, default: 'arcface-r100' },
      dim: { type: Number, default: 512 },
    },

    deviceSync: [
      {
        nvrId: { type: mongoose.Schema.Types.ObjectId, ref: 'CctvNvr' },
        faceLibId: { type: String },
        faceId: { type: String },
        syncedAt: { type: Date },
        syncState: { type: String, enum: ['pending', 'synced', 'failed'], default: 'pending' },
      },
    ],

    consentSignatureRef: { type: String },
    consentExpiresAt: { type: Date },

    allowedZones: [{ type: String }],
    deniedZones: [{ type: String }],
    triggerAlert: { type: Boolean, default: false },
    alertRuleId: { type: String },

    status: { type: String, enum: ['active', 'disabled'], default: 'active', index: true },
  },
  { timestamps: true }
);

faceIdentitySchema.index({ kind: 1, status: 1 });

module.exports =
  mongoose.models.CctvFaceIdentity || mongoose.model('CctvFaceIdentity', faceIdentitySchema);
