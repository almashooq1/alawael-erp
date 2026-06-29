const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * ICFAssessmentLegacy — نموذج تقييم ICF (التمثيل المسطّح: scores + coreSetType)
 * ════════════════════════════════════════════════════════════════════════════
 * DELIBERATELY DISTINCT from the canonical `models/icf/ICFAssessment.model.js`
 * (which registers 'ICFAssessment' with a STRUCTURED representation —
 * assessedItems[] / bodyFunctions / bodyStructures / beneficiaryId / assessorId).
 *
 * This file registers the SEPARATE model name 'ICFAssessmentLegacy' (W1542) on
 * the shared `icfassessments` collection. The two are NOT duplicates to merge —
 * they model ICF differently and carry INCOMPATIBLE required-field contracts
 * (this one keys on `beneficiary` + flat `scores` + `coreSetType`; the canonical
 * requires `title`/`assessmentType`/`beneficiaryId`/`assessorId`). Re-pointing
 * this at the canonical would re-introduce the W1540 ValidationError-500 class.
 * **Decision: keep distinct (ADR-046 Option B). Do NOT consolidate.**
 */
const ICFScoreSchema = new Schema(
  {
    code: {
      type: String,
      required: true,
      trim: true,
    },
    performance: {
      type: Number,
      min: 0,
      max: 9,
      default: 8,
    },
    capacity: {
      type: Number,
      min: 0,
      max: 9,
      default: 8,
    },
    environmental: {
      type: Number,
      min: -4,
      max: 9,
      default: 8,
    },
    notes: {
      type: String,
      trim: true,
    },
    linkedGoals: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Goal',
      },
    ],
  },
  { _id: false }
);

const ICFAssessmentSchema = new Schema(
  {
    beneficiary: {
      type: Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
      index: true,
    },
    assessor: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    coreSetType: {
      type: String,
      enum: ['rehab', 'autism', 'cp', 'custom'],
      default: 'rehab',
      required: true,
    },
    scores: {
      type: Map,
      of: ICFScoreSchema,
      default: new Map(),
    },
    domainScores: {
      bodyFunctions: {
        type: Number,
        min: 0,
        max: 4,
      },
      bodyStructures: {
        type: Number,
        min: 0,
        max: 4,
      },
      activitiesAndParticipation: {
        type: Number,
        min: 0,
        max: 4,
      },
      environmentalFactors: {
        type: Number,
        min: -4,
        max: 4,
      },
      personalFactors: {
        type: Number,
        min: 0,
        max: 4,
      },
    },
    overallScore: {
      type: Number,
      min: 0,
      max: 4,
    },
    status: {
      type: String,
      enum: ['draft', 'completed', 'archived'],
      default: 'draft',
      index: true,
    },
    assessmentDate: {
      type: Date,
      default: Date.now,
      required: true,
      index: true,
    },
    nextAssessmentDate: {
      type: Date,
    },
    notes: {
      type: String,
      trim: true,
    },
    recommendations: [
      {
        priority: {
          type: String,
          enum: ['high', 'medium', 'low'],
        },
        domain: String,
        recommendation: String,
        interventions: [String],
        timeline: String,
      },
    ],
    linkedGoals: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Goal',
      },
    ],
    environmentalBarriers: [
      {
        code: String,
        description: String,
        severity: {
          type: Number,
          min: 1,
          max: 4,
        },
      },
    ],
    environmentalFacilitators: [
      {
        code: String,
        description: String,
        impact: {
          type: Number,
          min: 1,
          max: 4,
        },
      },
    ],
    reliability: {
      type: Number,
      min: 0,
      max: 1,
    },
    standardError: {
      type: Number,
    },
    confidenceInterval: {
      lower: Number,
      upper: Number,
      confidence: Number,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
ICFAssessmentSchema.index({ beneficiary: 1, assessmentDate: -1 });
ICFAssessmentSchema.index({ beneficiary: 1, status: 1 });
ICFAssessmentSchema.index({ assessor: 1, assessmentDate: -1 });
ICFAssessmentSchema.index({ coreSetType: 1, status: 1 });

// Virtuals
ICFAssessmentSchema.virtual('age').get(function () {
  if (!this.assessmentDate) return null;
  const now = new Date();
  const assessmentDate = new Date(this.assessmentDate);
  const diffMs = now - assessmentDate;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Methods
ICFAssessmentSchema.methods.calculateDomainScores = function () {
  const scores = this.scores;
  const domains = {
    bodyFunctions: [],
    bodyStructures: [],
    activitiesAndParticipation: [],
    environmentalFactors: [],
    personalFactors: [],
  };

  // Group scores by domain
  scores.forEach((score, code) => {
    const prefix = code.charAt(0);
    const domainMap = {
      b: 'bodyFunctions',
      s: 'bodyStructures',
      d: 'activitiesAndParticipation',
      e: 'environmentalFactors',
      p: 'personalFactors',
    };

    const domain = domainMap[prefix];
    if (
      domain &&
      score.performance !== undefined &&
      score.performance !== 8 &&
      score.performance !== 9
    ) {
      domains[domain].push(score.performance);
    }
  });

  // Calculate average for each domain
  Object.keys(domains).forEach(domain => {
    const domainScores = domains[domain];
    if (domainScores.length > 0) {
      const sum = domainScores.reduce((a, b) => a + b, 0);
      this.domainScores[domain] = sum / domainScores.length;
    }
  });

  return this.domainScores;
};

ICFAssessmentSchema.methods.calculateOverallScore = function () {
  const domainScores = this.domainScores || {};
  const scores = Object.values(domainScores).filter(score => score !== undefined && score > 0);

  if (scores.length === 0) {
    this.overallScore = 0;
    return 0;
  }

  const sum = scores.reduce((a, b) => a + b, 0);
  this.overallScore = sum / scores.length;
  return this.overallScore;
};

ICFAssessmentSchema.methods.compareWith = function (otherAssessment) {
  const improvements = {};
  const domains = Object.keys(this.domainScores || {});

  domains.forEach(domain => {
    const current = this.domainScores[domain];
    const previous = otherAssessment.domainScores?.[domain];

    if (previous !== undefined && current !== undefined) {
      const change = previous - current; // Lower score = improvement
      const percentage = previous !== 0 ? (change / previous) * 100 : 0;

      improvements[domain] = {
        change: change.toFixed(2),
        percentage: percentage.toFixed(1),
        direction: change < 0 ? 'worsening' : change > 0 ? 'improving' : 'stable',
      };
    }
  });

  return improvements;
};

// Statics
ICFAssessmentSchema.statics.findByPatient = function (patientId, options = {}) {
  const { limit = 10, status, startDate, endDate } = options;

  const query = { beneficiary: patientId };
  if (status) query.status = status;
  if (startDate || endDate) {
    query.assessmentDate = {};
    if (startDate) query.assessmentDate.$gte = new Date(startDate);
    if (endDate) query.assessmentDate.$lte = new Date(endDate);
  }

  return this.find(query)
    .sort({ assessmentDate: -1 })
    .limit(limit)
    .populate('assessor', 'name role')
    .populate('linkedGoals', 'title status');
};

ICFAssessmentSchema.statics.findLatestByPatient = function (patientId) {
  return this.findOne({ beneficiary: patientId, status: 'completed' })
    .sort({ assessmentDate: -1 })
    .populate('assessor', 'name role')
    .populate('linkedGoals', 'title status');
};

ICFAssessmentSchema.statics.getProgressData = function (patientId, timeRange = '6months') {
  const now = new Date();
  const startDate = new Date();

  switch (timeRange) {
    case '1month':
      startDate.setMonth(now.getMonth() - 1);
      break;
    case '3months':
      startDate.setMonth(now.getMonth() - 3);
      break;
    case '6months':
      startDate.setMonth(now.getMonth() - 6);
      break;
    case '1year':
      startDate.setFullYear(now.getFullYear() - 1);
      break;
    default:
      startDate.setMonth(now.getMonth() - 6);
  }

  return this.find({
    beneficiary: patientId,
    status: 'completed',
    assessmentDate: { $gte: startDate, $lte: now },
  })
    .sort({ assessmentDate: 1 })
    .select('assessmentDate overallScore domainScores status');
};

ICFAssessmentSchema.statics.getStatistics = function (options = {}) {
  const { startDate, endDate, coreSetType } = options;
  const query = { status: 'completed' };

  if (startDate || endDate) {
    query.assessmentDate = {};
    if (startDate) query.assessmentDate.$gte = new Date(startDate);
    if (endDate) query.assessmentDate.$lte = new Date(endDate);
  }

  if (coreSetType) query.coreSetType = coreSetType;

  return this.aggregate([
    { $match: query },
    {
      $group: {
        _id: null,
        totalAssessments: { $sum: 1 },
        avgOverallScore: { $avg: '$overallScore' },
        avgBodyFunctions: { $avg: '$domainScores.bodyFunctions' },
        avgBodyStructures: { $avg: '$domainScores.bodyStructures' },
        avgActivities: { $avg: '$domainScores.activitiesAndParticipation' },
        avgEnvironmental: { $avg: '$domainScores.environmentalFactors' },
        avgPersonal: { $avg: '$domainScores.personalFactors' },
      },
    },
  ]);
};

// Pre-save middleware
ICFAssessmentSchema.pre('save', function () {
  if (this.isModified('scores')) {
    this.calculateDomainScores();
    this.calculateOverallScore();
  }
});

// W340 / ADR-021 Pattern D — collision break.
// This assessment-module ICF schema collided with the canonical
// `models/icf/ICFAssessment.model.js`: BOTH registered the model name
// 'ICFAssessment' with INCOMPATIBLE schemas (this one keys on `beneficiary` and
// carries findByPatient/getProgressData/… statics; icf/ keys on `beneficiaryId`).
// `models/index.js` loads icf/ first, so every TOP-LEVEL `require()` of this file
// afterwards threw `Cannot overwrite 'ICFAssessment' model once compiled` — which
// silently unmounted routes/smart-assessment-engine.routes.js (12 clinical scales)
// via safeMount's catch and broke the ICF service cluster
// (sessionICFLinker / icfReportExport / clinicalDashboard / icfGoalIntegration /
//  integratedReport / parentPortal) + routes/mdt-coordination.routes.js.
//
// Fix: register under a DISTINCT model name on the SAME `icfassessments`
// collection (so no data moves). The 8 consumers `require()` this FILE directly,
// so the renamed registration is transparent to them; name-based lookups
// (`mongoose.model('ICFAssessment')`) and `ref: 'ICFAssessment'` now resolve
// deterministically to the canonical icf/ schema. The proper end-state —
// consolidating both clusters onto ONE schema — remains a separate ADR-021 task.
const ICFAssessment =
  mongoose.models.ICFAssessmentLegacy ||
  mongoose.model('ICFAssessmentLegacy', ICFAssessmentSchema, 'icfassessments');

module.exports = ICFAssessment;
