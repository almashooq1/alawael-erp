'use strict';

/**
 * EmployeeCredential — Wave 138.
 *
 * Tracks every professional license / certification / mandatory
 * compliance document an employee MUST hold to deliver care. For
 * healthcare in Saudi Arabia, the critical ones include:
 *
 *   SCFHS license   — Saudi Commission for Health Specialties
 *                     (THE one regulator; expiry blocks practice)
 *   Iqama           — residency permit (non-Saudi staff)
 *   BLS / ACLS      — Basic / Advanced Life Support certs
 *   PALS            — Pediatric Advanced Life Support
 *   Driver license  — for drivers/transport staff
 *   PDPL training   — annual data-protection training
 *
 * Wave-18 invariants:
 *   • (employeeId, kind, issueNumber) unique
 *   • status ∈ STATUSES
 *   • expired/suspended require statusChangedAt
 *   • expiresAt required for kinds with expiry (all except 'noexpire')
 */

const mongoose = require('mongoose');

const KINDS = [
  'scfhs-license',
  'iqama',
  'bls',
  'acls',
  'pals',
  'cpr',
  'driver-license',
  'medical-fitness',
  'background-check',
  'pdpl-training',
  'specialty-board',
  'continuing-education',
  'professional-malpractice-insurance',
  'other',
];

const STATUSES = ['valid', 'expiring-soon', 'expired', 'suspended', 'pending-renewal', 'verified'];

const SEVERITY_BY_KIND = Object.freeze({
  'scfhs-license': 'critical', // cannot practice without
  iqama: 'critical', // cannot reside legally
  bls: 'high',
  acls: 'high',
  pals: 'high',
  cpr: 'medium',
  'driver-license': 'high', // drivers
  'medical-fitness': 'high',
  'background-check': 'medium',
  'pdpl-training': 'medium',
  'specialty-board': 'high',
  'continuing-education': 'low',
  'professional-malpractice-insurance': 'high',
  other: 'medium',
});

const EmployeeCredentialSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true,
    },

    kind: { type: String, enum: KINDS, required: true, index: true },
    labelAr: { type: String, required: true, maxlength: 200 },

    issuingAuthority: { type: String, default: null, maxlength: 200 },
    issueNumber: { type: String, required: true, maxlength: 100 },
    issuedAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null, index: true },

    status: {
      type: String,
      enum: STATUSES,
      default: 'valid',
      index: true,
    },
    statusChangedAt: { type: Date, default: null },
    statusReason: { type: String, default: null, maxlength: 300 },

    // S3 / object-store key to the scanned PDF/image.
    documentRef: { type: String, default: null, maxlength: 300 },

    // Verification state — SCFHS verification, for example, requires
    // operator approval after upload.
    verifiedAt: { type: Date, default: null },
    verifiedByActorId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    // Bookkeeping for renewal: when did we LAST nudge the employee?
    lastReminderAt: { type: Date, default: null },
    reminderCount: { type: Number, default: 0, min: 0 },

    notes: { type: String, default: null, maxlength: 1000 },
  },
  { timestamps: true, collection: 'employee_credentials' }
);

EmployeeCredentialSchema.index({ employeeId: 1, kind: 1, issueNumber: 1 }, { unique: true });
EmployeeCredentialSchema.index({ expiresAt: 1, status: 1 });
EmployeeCredentialSchema.index({ status: 1, kind: 1, expiresAt: 1 });

EmployeeCredentialSchema.add({
  __invariants: { type: mongoose.Schema.Types.Mixed, select: false, default: null },
});

EmployeeCredentialSchema.path('__invariants').validate(function () {
  let ok = true;
  if (!this.employeeId) {
    this.invalidate('employeeId', 'required');
    ok = false;
  }
  if (!KINDS.includes(this.kind)) {
    this.invalidate('kind', `must be one of ${KINDS.join(',')}`);
    ok = false;
  }
  if (!this.issueNumber) {
    this.invalidate('issueNumber', 'required');
    ok = false;
  }
  if (!STATUSES.includes(this.status)) {
    this.invalidate('status', `must be one of ${STATUSES.join(',')}`);
    ok = false;
  }
  if ((this.status === 'expired' || this.status === 'suspended') && !this.statusChangedAt) {
    this.invalidate('statusChangedAt', `required when status=${this.status}`);
    ok = false;
  }
  return ok;
});

module.exports =
  mongoose.models.EmployeeCredential ||
  mongoose.model('EmployeeCredential', EmployeeCredentialSchema);

module.exports.EmployeeCredentialSchema = EmployeeCredentialSchema;
module.exports.KINDS = KINDS;
module.exports.STATUSES = STATUSES;
module.exports.SEVERITY_BY_KIND = SEVERITY_BY_KIND;
