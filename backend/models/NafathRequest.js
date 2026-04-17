/**
 * NafathRequest — tracks a Nafath authentication transaction lifecycle.
 *
 * Real Nafath flow (Saudi national digital identity):
 *   1. Backend POSTs {nationalId, purpose} to Nafath API
 *      → Nafath replies with {transactionId, randomNumber (2-digit)}
 *   2. User opens Nafath mobile app → sees list of pending requests
 *      → taps the request matching the 2-digit number we showed them
 *   3. Backend polls Nafath status until APPROVED/REJECTED/EXPIRED
 *   4. On APPROVED, user is signed into our platform.
 *
 * We also persist this in mock mode so the UI flow works end-to-end in
 * dev, and we have an audit trail for PDPL compliance.
 */

'use strict';

const mongoose = require('mongoose');

const NafathRequestSchema = new mongoose.Schema(
  {
    // Transaction identity
    transactionId: { type: String, required: true, unique: true, index: true },
    randomNumber: { type: String, required: true }, // 2-digit string shown to user

    // Who is authenticating
    nationalId: { type: String, required: true, index: true },
    purpose: {
      type: String,
      enum: ['login', 'register_guardian', 'e_sign', 'consent'],
      default: 'login',
    },

    // Mode
    mode: {
      type: String,
      enum: ['mock', 'live'],
      default: 'mock',
    },

    // Lifecycle
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'ERROR'],
      default: 'PENDING',
      index: true,
    },
    approvedAt: Date,
    rejectedAt: Date,
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },

    // Resolved attributes from Nafath (populated on approval)
    attributes: {
      fullName: String,
      firstName_ar: String,
      lastName_ar: String,
      dateOfBirth: Date,
      phone: String,
      email: String,
    },

    // Session link after approval (issued JWT id we created)
    linkedUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // PDPL-friendly audit
    ipHash: String,
    userAgent: String,
    errorMessage: String,
  },
  { timestamps: true }
);

// TTL — auto-expire after 15 minutes regardless of state
NafathRequestSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

NafathRequestSchema.methods.isActive = function () {
  return this.status === 'PENDING' && this.expiresAt > new Date();
};

module.exports =
  mongoose.models.NafathRequest || mongoose.model('NafathRequest', NafathRequestSchema);
