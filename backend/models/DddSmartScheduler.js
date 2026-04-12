'use strict';
/**
 * DddSmartScheduler Model
 * Auto-extracted from services/dddSmartScheduler.js
 */
const mongoose = require('mongoose');

const schedRecommendationSchema = new mongoose.Schema(
  {
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
      index: true,
    },
    episodeId: { type: mongoose.Schema.Types.ObjectId, ref: 'EpisodeOfCare', index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, index: true },

    /* Recommendation type */
    recommendationType: {
      type: String,
      enum: [
        'increase_frequency',
        'decrease_frequency',
        'maintain_frequency',
        'reschedule',
        'add_modality',
        'switch_therapist',
        'add_group_session',
        'schedule_assessment',
        'schedule_family_meeting',
        'no_show_mitigation',
        'workload_rebalance',
      ],
      required: true,
    },

    /* Details */
    currentFrequency: { type: Number }, // sessions per week
    recommendedFrequency: { type: Number },
    rationale: String,
    priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'] },
    confidence: { type: Number, min: 0, max: 1 },

    /* No-show prediction */
    noShowProbability: { type: Number, min: 0, max: 1 },
    noShowFactors: [String],
    mitigationStrategy: String,

    /* Scheduling suggestions */
    suggestedSlots: [
      {
        dayOfWeek: { type: Number, min: 0, max: 6 }, // 0=Sunday
        timeSlot: String, // "09:00-10:00"
        therapistId: { type: mongoose.Schema.Types.ObjectId },
        modality: String,
        score: Number, // fit score 0-100
      },
    ],

    /* Status */
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'expired'],
      default: 'pending',
      index: true,
    },
    respondedAt: Date,
    respondedBy: { type: mongoose.Schema.Types.ObjectId },

    evaluatedAt: { type: Date, default: Date.now },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

schedRecommendationSchema.index({ beneficiaryId: 1, status: 1, evaluatedAt: -1 });

const DDDSchedulingRecommendation =
  mongoose.models.DDDSchedulingRecommendation ||
  mongoose.model('DDDSchedulingRecommendation', schedRecommendationSchema);

/* ═══════════════════════════════════════════════════════════════════════
   2. No-Show Prediction
   ═══════════════════════════════════════════════════════════════════════ */

module.exports = {
  DDDSchedulingRecommendation,
};
