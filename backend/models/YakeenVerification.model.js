/**
 * YakeenVerification — persistent audit of every identity verification we
 * requested against the Saudi civil registry via Yakeen (absherAdapter).
 *
 * Why persist at all (the adapter already returns a live result)?
 *   1. PDPL + audit: a regulator asking "did you verify guardian X on 2026-04-24?"
 *      needs an answer that's faster than re-calling Yakeen (which costs money
 *      + has rate limits + would trip the rate limiter under audit pressure).
 *   2. Caching: re-verifying the same nationalId + DOB combination inside a
 *      short window is wasted API cost. Service layer consults this cache
 *      before calling the adapter.
 *   3. Linking: the row gets linked to the thing that needed the verification
 *      (guardian admission, employee onboarding, beneficiary consent signer).
 */

'use strict';

const mongoose = require('mongoose');

const CONTEXTS = [
  'guardian_admission',
  'employee_onboarding',
  'beneficiary_consent_signer',
  'nafath_signing',
  'adhoc',
];
const RESULTS = ['match', 'mismatch', 'not_found', 'unknown'];

const YakeenVerificationSchema = new mongoose.Schema(
  {
    nationalIdHash: { type: String, required: true, index: true },
    lastFour: { type: String, required: true }, // stored plain for operator UI only
    nameChecked: { type: Boolean, default: false },
    dobChecked: { type: Boolean, default: false },

    context: { type: String, enum: CONTEXTS, default: 'adhoc', index: true },
    contextEntityType: { type: String, default: null },
    contextEntityId: { type: String, default: null, index: true },

    result: { type: String, enum: RESULTS, required: true, index: true },
    message: { type: String, default: null },

    attributes: {
      fullName_ar: String,
      firstName_ar: String,
      lastName_ar: String,
      gender: String,
      dateOfBirthHijri: String,
      dateOfBirthGregorian: Date,
      nationality: String,
      isAlive: Boolean,
    },

    mode: { type: String, enum: ['mock', 'live'], default: 'mock' },
    latencyMs: { type: Number, default: null },
    circuitOpen: { type: Boolean, default: false },

    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    ipHash: { type: String, default: null },
    userAgent: { type: String, default: null },
  },
  { timestamps: true, collection: 'yakeenVerifications' }
);

YakeenVerificationSchema.index({ nationalIdHash: 1, createdAt: -1 });
YakeenVerificationSchema.index({ context: 1, contextEntityId: 1, createdAt: -1 });

const YakeenVerification =
  mongoose.models.YakeenVerification ||
  mongoose.model('YakeenVerification', YakeenVerificationSchema);

module.exports = YakeenVerification;
module.exports.CONTEXTS = CONTEXTS;
module.exports.RESULTS = RESULTS;
