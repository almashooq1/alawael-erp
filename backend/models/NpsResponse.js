/**
 * NpsResponse — Net Promoter Score response from a guardian.
 *
 * CBAHI requires periodic measurement of family satisfaction. NPS is
 * the lowest-friction instrument that produces a defensible number:
 *
 *   "How likely are you to recommend Al-Awael to another family?"
 *   0 = Not at all,  10 = Extremely likely
 *
 * Standard buckets:
 *   • 0–6  detractors
 *   • 7–8  passives
 *   • 9–10 promoters
 *   NPS = %promoters − %detractors  (range −100..+100)
 *
 * One response per (guardian, beneficiary, surveyKey) — surveyKey is
 * a campaign identifier (e.g., "2026-Q2") so re-surveys don't conflict
 * but are still bucketable per-period.
 *
 * Free-text comment is stored separately so the standalone NPS number
 * stays clean for trending while qualitative themes feed back to ops.
 */

'use strict';

const mongoose = require('mongoose');

const NpsResponseSchema = new mongoose.Schema(
  {
    surveyKey: { type: String, required: true, trim: true, index: true },
    guardianId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Guardian',
      required: true,
      index: true,
    },
    beneficiaryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary', index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', index: true },

    score: { type: Number, required: true, min: 0, max: 10 },
    bucket: { type: String, enum: ['detractor', 'passive', 'promoter'], required: true },

    comment: { type: String, trim: true, maxlength: 2000 },

    // Optional follow-up sub-scores (CBAHI checklist questions)
    subScores: [
      {
        question: { type: String, required: true },
        score: { type: Number, min: 0, max: 10 },
      },
    ],

    submittedAt: { type: Date, default: Date.now, index: true },
    sourceChannel: {
      type: String,
      enum: ['web', 'mobile', 'whatsapp', 'sms', 'email', 'in_person'],
      default: 'web',
    },
    locale: { type: String, default: 'ar' },
  },
  { timestamps: true }
);

// One response per (campaign, guardian, beneficiary) — re-surveys use a new key.
NpsResponseSchema.index(
  { surveyKey: 1, guardianId: 1, beneficiaryId: 1 },
  { unique: true, partialFilterExpression: { beneficiaryId: { $exists: true } } }
);

// Bucket-by-branch dashboards.
NpsResponseSchema.index({ branchId: 1, submittedAt: -1, bucket: 1 });

// ── W1085: unified-core producer ───────────────────────────────────
// Emit nps_response.recorded for a NEW response tied to a beneficiary so
// the family-satisfaction signal lands on that beneficiary's core timeline.
// Beneficiary is optional on this model — branch-only responses don't fire.
// Non-callback (W483).
NpsResponseSchema.pre('save', function flagNpsRecorded() {
  this.$__npsRecorded = this.isNew && !!this.beneficiaryId;
});

NpsResponseSchema.post('save', function emitNpsRecorded(doc) {
  if (!doc.$__npsRecorded) return;
  try {
    const { integrationBus } = require('../integration/systemIntegrationBus');
    integrationBus.publish('nps-response', 'nps_response.recorded', {
      responseId: String(doc._id),
      beneficiaryId: String(doc.beneficiaryId),
      ...(doc.branchId ? { branchId: String(doc.branchId) } : {}),
      surveyKey: doc.surveyKey || null,
      score: typeof doc.score === 'number' ? doc.score : null,
      bucket: doc.bucket || null,
      submittedAt: doc.submittedAt || doc.createdAt || new Date(),
    });
  } catch (_e) {
    /* bus optional in some contexts */
  }
});

module.exports = mongoose.models.NpsResponse || mongoose.model('NpsResponse', NpsResponseSchema);
