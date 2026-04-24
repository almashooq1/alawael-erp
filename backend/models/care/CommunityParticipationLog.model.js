'use strict';

/**
 * CommunityParticipationLog.model.js — Phase 17 Commit 6 (4.0.88).
 *
 * One document per community-participation event a beneficiary
 * took part in (volunteering, employment, religious activity,
 * social event, etc.). Optional link to a CommunityPartner
 * (from Phase 17 C4).
 *
 * Auto-numbered `CPL-YYYY-NNNNN`.
 */

const mongoose = require('mongoose');
const {
  PARTICIPATION_TYPES,
  SUPPORT_LEVELS,
  PARTICIPATION_OUTCOMES,
} = require('../../config/care/independence.registry');

const skillObservedSchema = new mongoose.Schema(
  {
    skill: { type: String, required: true },
    level: { type: String, default: null }, // free text — 'emerging', 'confident', etc.
  },
  { _id: false }
);

const communityParticipationLogSchema = new mongoose.Schema(
  {
    logNumber: { type: String, required: true, unique: true, uppercase: true },

    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
      index: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      default: null,
      index: true,
    },
    caseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SocialCase',
      default: null,
      index: true,
    },

    activityType: { type: String, enum: PARTICIPATION_TYPES, required: true, index: true },
    title: { type: String, default: null }, // "Volunteered at school event"
    description: { type: String, default: null },

    occurredAt: { type: Date, required: true, index: true },
    durationMinutes: { type: Number, default: null },
    location: { type: String, default: null },

    // Link to C4 partner
    partnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CommunityPartner',
      default: null,
      index: true,
    },
    partnerNameSnapshot: { type: String, default: null },

    // Staff companion
    supportLevel: { type: String, enum: SUPPORT_LEVELS, default: 'moderate' },
    accompaniedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    accompaniedByNameSnapshot: { type: String, default: null },

    outcome: { type: String, enum: PARTICIPATION_OUTCOMES, default: 'neutral' },
    skillsObserved: { type: [skillObservedSchema], default: [] },
    challengesNoted: { type: String, default: null },
    beneficiarySatisfaction: { type: Number, min: 1, max: 5, default: null },

    notes: { type: String, default: null },
    photoUrls: { type: [String], default: [] },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    deleted_at: { type: Date, default: null },
  },
  { timestamps: true, collection: 'care_community_participation' }
);

communityParticipationLogSchema.index({ beneficiaryId: 1, occurredAt: -1 });
communityParticipationLogSchema.index({ branchId: 1, activityType: 1, occurredAt: -1 });
communityParticipationLogSchema.index({ partnerId: 1, occurredAt: -1 });

communityParticipationLogSchema.pre('validate', async function () {
  if (this.logNumber) return;
  const year = (this.occurredAt || new Date()).getUTCFullYear();
  const Model = mongoose.model('CommunityParticipationLog');
  const count = await Model.countDocuments({
    logNumber: { $regex: `^CPL-${year}-` },
  });
  this.logNumber = `CPL-${year}-${String(count + 1).padStart(5, '0')}`;
});

communityParticipationLogSchema.set('toJSON', { virtuals: true });
communityParticipationLogSchema.set('toObject', { virtuals: true });

const CommunityParticipationLog =
  mongoose.models.CommunityParticipationLog ||
  mongoose.model('CommunityParticipationLog', communityParticipationLogSchema);

module.exports = CommunityParticipationLog;
