'use strict';

/**
 * CommunityLinkage.model.js — Phase 17 Commit 4 (4.0.86).
 *
 * One document per beneficiary-partner linkage. Simple lifecycle:
 * active → paused / ended / cancelled. Captures purpose, dates,
 * outcomes, and qualitative notes.
 *
 * Auto-numbered `CL-YYYY-NNNNN`.
 */

const mongoose = require('mongoose');
const {
  LINKAGE_TYPES,
  LINKAGE_STATUSES,
  LINKAGE_PURPOSES,
} = require('../../config/care/community.registry');

const communityLinkageSchema = new mongoose.Schema(
  {
    linkageNumber: { type: String, required: true, unique: true, uppercase: true },

    // ── the pairing ────────────────────────────────────────────
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
      index: true,
    },
    partnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CommunityPartner',
      required: true,
      index: true,
    },
    partnerNameSnapshot: { type: String, default: null }, // convenience

    // ── optional case linkage ──────────────────────────────────
    caseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SocialCase',
      default: null,
      index: true,
    },

    // ── classification ─────────────────────────────────────────
    linkageType: { type: String, enum: LINKAGE_TYPES, required: true, index: true },
    primaryPurpose: { type: String, enum: LINKAGE_PURPOSES, required: true, index: true },
    secondaryPurposes: { type: [String], default: [] },

    // ── dates ──────────────────────────────────────────────────
    startDate: { type: Date, required: true },
    endDate: { type: Date, default: null },
    expectedEndDate: { type: Date, default: null }, // for ongoing: planned end
    lastContactAt: { type: Date, default: null },

    // ── state ───────────────────────────────────────────────────
    status: {
      type: String,
      enum: LINKAGE_STATUSES,
      default: 'active',
      index: true,
    },
    endedReason: { type: String, default: null },

    // ── content ────────────────────────────────────────────────
    description: { type: String, default: null },
    outcomeNotes: { type: String, default: null },
    contactPersonAtPartner: { type: String, default: null },

    // ── ownership ──────────────────────────────────────────────
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    deleted_at: { type: Date, default: null },
  },
  { timestamps: true, collection: 'care_community_linkages' }
);

communityLinkageSchema.index({ beneficiaryId: 1, status: 1 });
communityLinkageSchema.index({ partnerId: 1, status: 1 });
communityLinkageSchema.index({ beneficiaryId: 1, partnerId: 1 });

communityLinkageSchema.pre('validate', async function () {
  if (this.linkageNumber) return;
  const year = (this.startDate || new Date()).getUTCFullYear();
  const Model = mongoose.model('CommunityLinkage');
  const count = await Model.countDocuments({
    linkageNumber: { $regex: `^CL-${year}-` },
  });
  this.linkageNumber = `CL-${year}-${String(count + 1).padStart(5, '0')}`;
});

communityLinkageSchema.virtual('isActive').get(function () {
  return this.status === 'active';
});

communityLinkageSchema.virtual('durationDays').get(function () {
  const end = this.endDate || new Date();
  return Math.floor((end.getTime() - this.startDate.getTime()) / 86400000);
});

communityLinkageSchema.set('toJSON', { virtuals: true });
communityLinkageSchema.set('toObject', { virtuals: true });

const CommunityLinkage =
  mongoose.models.CommunityLinkage || mongoose.model('CommunityLinkage', communityLinkageSchema);

module.exports = CommunityLinkage;
