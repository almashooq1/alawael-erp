/**
 * ClinicalRiskScore — نموذج تسجيل المخاطر السريرية
 *
 * يوفر تسجيلاً دورياً لمخاطر المستفيد بناءً على عشرات العوامل
 * (تقدم العلاج، الحضور، التدهور، التوثيق، التواصل الأسري…)
 *
 * @module domains/ai-recommendations/models/ClinicalRiskScore
 */

const mongoose = require('mongoose');

// ─── Risk Factor Sub-Schema ────────────────────────────────────────────────
const riskFactorSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      enum: [
        // Clinical progress
        'no_progress',
        'regression',
        'goal_plateau',
        'missed_milestones',
        // Attendance
        'high_absence',
        'consecutive_absence',
        'late_cancellations',
        // Documentation
        'overdue_assessment',
        'overdue_reassessment',
        'missing_session_notes',
        'incomplete_care_plan',
        // Workflow
        'stalled_phase',
        'overdue_transition',
        'pending_mdt_review',
        // Family
        'low_family_engagement',
        'family_complaint',
        'no_family_contact',
        // Safety
        'behavior_escalation',
        'self_harm_risk',
        'medical_flag',
        // Resource
        'therapist_overload',
        'waitlist_delay',
        'equipment_gap',
      ],
    },
    category: {
      type: String,
      enum: ['clinical', 'attendance', 'documentation', 'workflow', 'family', 'safety', 'resource'],
      required: true,
    },
    weight: { type: Number, default: 1, min: 0, max: 10 },
    score: { type: Number, required: true, min: 0, max: 10 },
    weightedScore: { type: Number }, // weight × score
    evidence: {
      description: String,
      sourceModel: String,
      sourceId: { type: mongoose.Schema.Types.ObjectId },
      measuredAt: Date,
      dataPoints: mongoose.Schema.Types.Mixed,
    },
    isActive: { type: Boolean, default: true },
  },
  { _id: false }
);

// ─── Main Schema ────────────────────────────────────────────────────────────
const clinicalRiskScoreSchema = new mongoose.Schema(
  {
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
      index: true,
    },
    episodeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EpisodeOfCare',
      index: true,
    },

    // ── Composite Score ─────────────────────────────────────────────────────
    totalScore: { type: Number, required: true, min: 0, max: 100, index: true },
    riskLevel: {
      type: String,
      enum: ['low', 'moderate', 'high', 'critical'],
      required: true,
      index: true,
    },
    previousScore: { type: Number, min: 0, max: 100 },
    trend: {
      type: String,
      enum: ['improving', 'stable', 'worsening', 'new'],
      default: 'new',
    },

    // ── Breakdown ───────────────────────────────────────────────────────────
    factors: [riskFactorSchema],

    categoryScores: {
      clinical: { type: Number, default: 0 },
      attendance: { type: Number, default: 0 },
      documentation: { type: Number, default: 0 },
      workflow: { type: Number, default: 0 },
      family: { type: Number, default: 0 },
      safety: { type: Number, default: 0 },
      resource: { type: Number, default: 0 },
    },

    // ── Context ─────────────────────────────────────────────────────────────
    calculatedAt: { type: Date, default: Date.now, index: true },
    calculatedBy: {
      type: String,
      enum: ['system_scheduled', 'system_event', 'manual_request'],
      default: 'system_scheduled',
    },
    triggerEvent: String, // e.g. "session_missed", "assessment_completed"

    // ── Recommendations generated from this score ───────────────────────────
    recommendationIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Recommendation' }],

    // ── Multi-tenant ────────────────────────────────────────────────────────
    branchId: { type: mongoose.Schema.Types.ObjectId, index: true },
    organizationId: { type: mongoose.Schema.Types.ObjectId, index: true },

    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    collection: 'clinical_risk_scores',
  }
);

// ── Indexes ─────────────────────────────────────────────────────────────────
clinicalRiskScoreSchema.index({ beneficiaryId: 1, calculatedAt: -1 });
clinicalRiskScoreSchema.index({ riskLevel: 1, branchId: 1 });
clinicalRiskScoreSchema.index({ totalScore: -1, branchId: 1 });

// ── Virtuals ────────────────────────────────────────────────────────────────
clinicalRiskScoreSchema.virtual('activeFactors').get(function () {
  return (this.factors || []).filter(f => f.isActive);
});

clinicalRiskScoreSchema.virtual('topFactors').get(function () {
  return [...(this.factors || [])]
    .sort((a, b) => (b.weightedScore || 0) - (a.weightedScore || 0))
    .slice(0, 5);
});

// ── Pre-save: compute weighted scores & category scores ─────────────────────
clinicalRiskScoreSchema.pre('save', function (next) {
  if (this.factors && this.factors.length) {
    this.factors.forEach(f => {
      f.weightedScore = (f.weight || 1) * (f.score || 0);
    });

    // Category aggregation
    const cats = {};
    this.factors.forEach(f => {
      if (!cats[f.category]) cats[f.category] = { sum: 0, count: 0 };
      cats[f.category].sum += f.weightedScore;
      cats[f.category].count += 1;
    });
    for (const [cat, { sum, count }] of Object.entries(cats)) {
      if (this.categoryScores && cat in this.categoryScores) {
        this.categoryScores[cat] = count > 0 ? Math.round((sum / count) * 10) / 10 : 0;
      }
    }
  }
  next();
});

module.exports =
  mongoose.models.ClinicalRiskScore || mongoose.model('ClinicalRiskScore', clinicalRiskScoreSchema);
