'use strict';
/**
 * DddRiskStratification Model
 * Auto-extracted from services/dddRiskStratification.js
 */
const mongoose = require('mongoose');

const watchlistSchema = new mongoose.Schema(
  {
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
      index: true,
    },
    episodeId: { type: mongoose.Schema.Types.ObjectId, ref: 'EpisodeOfCare', index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, index: true },

    /* Risk classification */
    riskTier: {
      type: String,
      enum: ['tier_1_critical', 'tier_2_high', 'tier_3_elevated', 'tier_4_moderate'],
      required: true,
      index: true,
    },
    compositeRiskScore: { type: Number, min: 0, max: 100, required: true },

    /* Risk factor breakdown */
    factorScores: {
      clinical: { type: Number, min: 0, max: 100, default: 0 },
      operational: { type: Number, min: 0, max: 100, default: 0 },
      social: { type: Number, min: 0, max: 100, default: 0 },
      safety: { type: Number, min: 0, max: 100, default: 0 },
      trajectory: { type: Number, min: 0, max: 100, default: 0 },
    },

    /* Trajectory */
    trajectory: {
      type: String,
      enum: ['rapidly_worsening', 'worsening', 'stable', 'improving', 'rapidly_improving'],
      default: 'stable',
    },
    previousScores: [
      {
        score: Number,
        date: Date,
        tier: String,
      },
    ],

    /* Alerts */
    activeAlerts: [
      {
        alertType: String,
        severity: { type: String, enum: ['info', 'warning', 'critical'] },
        message: String,
        triggeredAt: { type: Date, default: Date.now },
        acknowledged: { type: Boolean, default: false },
      },
    ],

    /* Assignment */
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    assignedRole: String,
    reviewFrequency: {
      type: String,
      enum: ['daily', 'weekly', 'biweekly', 'monthly'],
      default: 'weekly',
    },
    nextReviewDate: Date,
    lastReviewedAt: Date,
    lastReviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewNotes: String,

    /* Status */
    status: {
      type: String,
      enum: ['active', 'under_review', 'improving', 'resolved', 'escalated'],
      default: 'active',
      index: true,
    },
    addedReason: String,
    resolvedAt: Date,
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    resolutionNote: String,

    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

watchlistSchema.index({ riskTier: 1, branchId: 1, status: 1 });
watchlistSchema.index({ compositeRiskScore: -1 });

const DDDWatchlist =
  mongoose.models.DDDWatchlist || mongoose.model('DDDWatchlist', watchlistSchema);

/* ═══════════════════════════════════════════════════════════════════════
   2. Risk Factor Weights & Thresholds
   ═══════════════════════════════════════════════════════════════════════ */
const RISK_WEIGHTS = {
  clinical: 0.35,
  operational: 0.2,
  social: 0.15,
  safety: 0.2,
  trajectory: 0.1,
};

const TIER_THRESHOLDS = {
  tier_1_critical: 75,
  tier_2_high: 55,
  tier_3_elevated: 35,
  tier_4_moderate: 15,
};

module.exports = {
  DDDWatchlist,
};
