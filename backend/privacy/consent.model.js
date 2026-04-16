/**
 * Consent — versioned record of a data subject's consent to a specific purpose.
 *
 * Immutable once issued; "withdraw" is a state change, not an edit of the
 * original record. Each (subject, purpose) pair may have many records;
 * the most recent wins.
 *
 * See ADR-007 § Consent Management and blueprint/04-data-domains.md.
 */

'use strict';

const mongoose = require('mongoose');
const { TENANT_FIELD } = require('../config/constants');

const LEGAL_BASES = [
  'consent',
  'contract',
  'legal_obligation',
  'vital_interest',
  'legitimate_interest',
];
const PURPOSES = [
  'clinical_care',
  'invoicing',
  'photo_directory',
  'research',
  'marketing',
  'third_party_share',
  'cross_border_processing',
];
const STATES = ['granted', 'withdrawn', 'expired'];

const ConsentSchema = new mongoose.Schema(
  {
    subjectType: {
      type: String,
      enum: ['Beneficiary', 'Guardian', 'Employee', 'User'],
      required: true,
    },
    subjectId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },

    purpose: { type: String, enum: PURPOSES, required: true, index: true },
    legalBasis: { type: String, enum: LEGAL_BASES, required: true },

    state: { type: String, enum: STATES, required: true, default: 'granted', index: true },

    noticeVersion: { type: String, required: true }, // which privacy notice was shown
    noticeHash: { type: String, required: true }, // hash of notice text shown

    channel: {
      type: String,
      enum: ['portal', 'in_person', 'whatsapp', 'email', 'phone'],
      required: true,
    },
    collectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    grantedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date },
    withdrawnAt: { type: Date },
    withdrawalReason: { type: String },

    [TENANT_FIELD]: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', index: true },

    evidence: {
      ipAddress: String,
      userAgent: String,
      signatureDocumentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
    },

    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
    collection: 'consents',
  }
);

ConsentSchema.index({ subjectType: 1, subjectId: 1, purpose: 1, grantedAt: -1 });

/** Disallow edits after creation (immutable ledger). */
ConsentSchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate() || {};
  const immutable = [
    'subjectType',
    'subjectId',
    'purpose',
    'legalBasis',
    'noticeHash',
    'grantedAt',
  ];
  const $set = update.$set || update;
  for (const f of immutable) {
    if ($set && Object.prototype.hasOwnProperty.call($set, f)) {
      return next(new Error(`Consent field '${f}' is immutable`));
    }
  }
  next();
});

ConsentSchema.statics.latestFor = function (subjectType, subjectId, purpose) {
  return this.findOne({ subjectType, subjectId, purpose }).sort({ grantedAt: -1 }).exec();
};

module.exports = {
  ConsentSchema,
  LEGAL_BASES,
  PURPOSES,
  STATES,
  // Lazily instantiate the model to avoid duplicate-model errors in tests
  get model() {
    return mongoose.models.Consent || mongoose.model('Consent', ConsentSchema);
  },
};
