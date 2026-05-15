/**
 * CctvAccessGrant — explicit, time-bounded permission to view footage.
 *
 * Two main shapes:
 *   1) Staff grant — investigator or auditor gets timeboxed access to a
 *      camera/branch for a stated purpose. Issued by branch manager + DPO.
 *   2) Parent grant — parent gets read-only access to their child's room
 *      during care hours. Includes signed consent and watermark policy.
 */
'use strict';

const mongoose = require('mongoose');

const accessGrantSchema = new mongoose.Schema(
  {
    grantType: {
      type: String,
      enum: [
        'staff_investigation',
        'staff_audit',
        'parent_portal',
        'incident_review',
        'compliance',
        'legal',
      ],
      required: true,
      index: true,
    },

    grantedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    grantedToRole: { type: String },
    grantedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    coGrantedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    scope: {
      branchCode: { type: String, uppercase: true, index: true },
      cameraIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'CctvCamera' }],
      beneficiaryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Beneficiary',
        index: true,
        sparse: true,
      },
      timeRanges: [
        {
          from: { type: Date },
          to: { type: Date },
          daysOfWeek: [{ type: String, enum: ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] }],
          hoursLocal: { from: String, to: String },
        },
      ],
    },

    purpose: { type: String, required: true },
    legalBasis: {
      type: String,
      enum: ['consent', 'legitimate_interest', 'legal_obligation', 'vital_interest'],
      default: 'consent',
    },
    consentSignatureRef: { type: String },
    incidentRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Incident' },

    validFrom: { type: Date, required: true, index: true },
    validUntil: { type: Date, required: true, index: true },

    status: {
      type: String,
      enum: ['pending', 'active', 'expired', 'revoked'],
      default: 'pending',
      index: true,
    },
    revokedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    revokedAt: { type: Date },
    revokedReason: { type: String },

    maxConcurrentSessions: { type: Number, default: 1 },
    requireWatermark: { type: Boolean, default: true },
    allowDownload: { type: Boolean, default: false },
    allowPlayback: { type: Boolean, default: false },
  },
  { timestamps: true }
);

accessGrantSchema.index({ grantedTo: 1, status: 1, validUntil: 1 });
accessGrantSchema.index({ 'scope.branchCode': 1, status: 1 });

accessGrantSchema.methods.isCurrentlyValid = function (now = new Date()) {
  if (this.status !== 'active') return false;
  if (now < this.validFrom || now > this.validUntil) return false;
  if (!Array.isArray(this.scope?.timeRanges) || this.scope.timeRanges.length === 0) return true;
  return this.scope.timeRanges.some(tr => {
    if (tr.from && now < tr.from) return false;
    if (tr.to && now > tr.to) return false;
    if (Array.isArray(tr.daysOfWeek) && tr.daysOfWeek.length > 0) {
      const dow = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][now.getDay()];
      if (!tr.daysOfWeek.includes(dow)) return false;
    }
    if (tr.hoursLocal?.from && tr.hoursLocal?.to) {
      const hhmm = now.toTimeString().slice(0, 5);
      if (hhmm < tr.hoursLocal.from || hhmm > tr.hoursLocal.to) return false;
    }
    return true;
  });
};

module.exports =
  mongoose.models.CctvAccessGrant || mongoose.model('CctvAccessGrant', accessGrantSchema);
