/**
 * DataSubjectRequest — tracks PDPL rights requests:
 *   access | rectification | erasure | restrict | object | portability
 *
 * 30-day SLA per ADR-007.
 */

'use strict';

const mongoose = require('mongoose');
const { TENANT_FIELD } = require('../config/constants');

const REQUEST_TYPES = ['access', 'rectification', 'erasure', 'restrict', 'object', 'portability'];
const STATUSES = [
  'received',
  'verifying_identity',
  'in_progress',
  'fulfilled',
  'rejected',
  'withdrawn',
];
const SLA_DAYS = 30;

const DsrSchema = new mongoose.Schema(
  {
    requestType: { type: String, enum: REQUEST_TYPES, required: true, index: true },
    status: { type: String, enum: STATUSES, required: true, default: 'received', index: true },

    subjectType: {
      type: String,
      enum: ['Beneficiary', 'Guardian', 'Employee', 'User'],
      required: true,
    },
    subjectId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    description: { type: String, required: true },
    attachments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Document' }],

    identityVerifiedAt: { type: Date },
    identityVerifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    resolvedAt: { type: Date },
    resolutionNote: { type: String },
    exportedDocumentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' }, // for access/portability

    slaDeadline: { type: Date, required: true, index: true },
    breachedSla: { type: Boolean, default: false },

    [TENANT_FIELD]: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', index: true },
  },
  { timestamps: true, collection: 'data_subject_requests' }
);

/** Auto-set slaDeadline if not provided. */
DsrSchema.pre('validate', function (next) {
  if (!this.slaDeadline) {
    this.slaDeadline = new Date(Date.now() + SLA_DAYS * 24 * 60 * 60 * 1000);
  }
  next();
});

DsrSchema.methods.isOverdue = function (now = Date.now()) {
  if (this.resolvedAt) return false;
  return this.slaDeadline.getTime() < now;
};

module.exports = {
  DsrSchema,
  REQUEST_TYPES,
  STATUSES,
  SLA_DAYS,
  get model() {
    return mongoose.models.DataSubjectRequest || mongoose.model('DataSubjectRequest', DsrSchema);
  },
};
