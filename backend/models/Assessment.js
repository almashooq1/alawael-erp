/* eslint-disable no-unused-vars */
/**
 * ProgramAssessment Model
 *
 * نموذج تقييم البرامج التأهيلية
 * يختلف عن assessment.model.js (تقييم الحالات)
 * يرتبط بالبرنامج التأهيلي وجلساته
 */
const mongoose = require('mongoose');

const programAssessmentSchema = new mongoose.Schema(
  {
    // Core
    title: {
      type: String,
      required: true,
      index: true,
    },
    description: String,
    type: {
      type: String,
      enum: ['baseline', 'progress', 'final', 'periodic'],
      required: true,
      index: true,
    },

    // Relationships
    programId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DisabilityProgram',
      required: true,
      index: true,
    },
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    therapistId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DisabilitySession',
    },

    // Assessment Details
    assessmentDate: {
      type: Date,
      required: true,
      index: -1,
    },
    duration: Number, // minutes
    location: String,

    // Assessment Results
    results: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    score: {
      type: Number,
      min: 0,
      max: 100,
    },
    scoreBreakdown: [
      {
        category: String,
        score: Number,
        maxScore: Number,
        percentage: Number,
        notes: String,
      },
    ],

    // ── Enhanced Scoring & Analytics ──
    weightedScore: {
      type: Number,
      min: 0,
      max: 100,
      description: 'الدرجة الموزونة بناءً على أوزان الفئات',
    },
    // فاصل الثقة 95% للدرجة
    confidenceInterval: {
      lower: Number,
      upper: Number,
    },
    standardError: {
      type: Number,
      description: 'الخطأ المعياري للقياس',
    },
    zScore: {
      type: Number,
      description: 'الدرجة المعيارية (Z-Score)',
    },
    percentileRank: {
      type: Number,
      min: 0,
      max: 100,
      description: 'الترتيب المئيني',
    },

    // Observations
    observations: String,
    strengths: [String],
    areasForImprovement: [String],
    recommendations: [String],
    feedback: String,

    // ── Clinical Observations (Enhanced) ──
    clinicalObservations: {
      attention: {
        type: String,
        enum: ['excellent', 'good', 'fair', 'poor', 'very_poor'],
      },
      motivation: {
        type: String,
        enum: ['high', 'moderate', 'low', 'none'],
      },
      cooperation: {
        type: String,
        enum: ['excellent', 'good', 'fair', 'poor', 'resistant'],
      },
      fatigue: {
        type: String,
        enum: ['none', 'mild', 'moderate', 'severe'],
      },
      emotionalState: String,
      environmentalFactors: String,
      notes: String,
    },

    // Tool Used
    assessmentTool: String,
    toolVersion: String,
    instrumentUsed: [String],

    // Changes from Previous
    previousScore: Number,
    scoreChange: Number,
    improvement: Boolean,

    // ── Trend Analytics (Enhanced) ──
    trendData: {
      direction: {
        type: String,
        enum: ['improving', 'stable', 'declining', 'fluctuating'],
      },
      slope: Number,
      rSquared: Number,
      predictedNext: Number,
      consecutiveImprove: { type: Number, default: 0 },
      consecutiveDecline: { type: Number, default: 0 },
    },

    // Status & Follow-up
    status: {
      type: String,
      enum: ['pending', 'completed', 'reviewed', 'archived'],
      default: 'completed',
      index: true,
    },
    reviewed: Boolean,
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedDate: Date,
    reviewNotes: String,

    // ── Goal Alignment (Enhanced) ──
    goalAlignment: [
      {
        goalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Goal' },
        goalName: String,
        targetScore: Number,
        achievedScore: Number,
        gapPercentage: Number,
        status: {
          type: String,
          enum: ['not_started', 'in_progress', 'on_track', 'at_risk', 'achieved', 'exceeded'],
        },
      },
    ],

    // Metadata
    createdAt: {
      type: Date,
      default: Date.now,
      index: -1,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: 'program_assessments',
  }
);

// Indexes for common queries
programAssessmentSchema.index({ programId: 1, beneficiaryId: 1 });
programAssessmentSchema.index({ beneficiaryId: 1, assessmentDate: -1 });
programAssessmentSchema.index({ type: 1, status: 1 });
programAssessmentSchema.index({ therapistId: 1, assessmentDate: -1 });

// ── Virtuals ──
programAssessmentSchema.virtual('improvementPercentage').get(function () {
  if (!this.previousScore || this.previousScore === 0) return null;
  return (((this.score - this.previousScore) / this.previousScore) * 100).toFixed(2);
});

programAssessmentSchema.virtual('goalAchievementRate').get(function () {
  if (!this.goalAlignment || this.goalAlignment.length === 0) return null;
  const achieved = this.goalAlignment.filter(
    g => g.status === 'achieved' || g.status === 'exceeded'
  ).length;
  return ((achieved / this.goalAlignment.length) * 100).toFixed(1);
});

// ── Methods ──
programAssessmentSchema.methods.calculateWeightedScore = function () {
  if (!this.scoreBreakdown || this.scoreBreakdown.length === 0) return this.score;

  const totalWeight = this.scoreBreakdown.reduce((sum, b) => sum + (b.maxScore || 0), 0);
  if (totalWeight === 0) return this.score;

  const weighted = this.scoreBreakdown.reduce((sum, b) => {
    const pct = b.maxScore ? (b.score / b.maxScore) * 100 : 0;
    return sum + pct * (b.maxScore / totalWeight);
  }, 0);

  this.weightedScore = Math.round(weighted * 100) / 100;
  return this.weightedScore;
};

programAssessmentSchema.methods.calculateZScore = function (mean, stdDev) {
  if (!mean || !stdDev || stdDev === 0) return null;
  this.zScore = ((this.score - mean) / stdDev).toFixed(4);
  return parseFloat(this.zScore);
};

programAssessmentSchema.methods.calculatePercentile = function (mean, stdDev) {
  const z = this.calculateZScore(mean, stdDev);
  if (z === null) return null;
  // Approximation of CDF using logistic function
  this.percentileRank = Math.round((1 / (1 + Math.exp(-1.7 * z))) * 100);
  return this.percentileRank;
};

// ── Statics ──
programAssessmentSchema.statics.getTrendForBeneficiary = async function (
  beneficiaryId,
  programId,
  limit = 10
) {
  const results = await this.find({ beneficiaryId, programId, status: { $ne: 'archived' } })
    .sort({ assessmentDate: 1 })
    .limit(limit)
    .select('score assessmentDate type scoreBreakdown');

  if (results.length < 2) return { trend: 'insufficient_data', data: results };

  // Calculate trend using simple linear regression
  const n = results.length;
  const xs = results.map((_, i) => i);
  const ys = results.map(r => r.score || 0);
  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = ys.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((sum, x, i) => sum + x * ys[i], 0);
  const sumXX = xs.reduce((sum, x) => sum + x * x, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // R² calculation
  const meanY = sumY / n;
  const ssReg = xs.reduce((sum, x) => sum + Math.pow(slope * x + intercept - meanY, 2), 0);
  const ssTot = ys.reduce((sum, y) => sum + Math.pow(y - meanY, 2), 0);
  const rSquared = ssTot > 0 ? ssReg / ssTot : 0;

  let direction = 'stable';
  if (slope > 1) direction = 'improving';
  else if (slope < -1) direction = 'declining';
  else if (Math.abs(rSquared) < 0.3) direction = 'fluctuating';

  return {
    trend: direction,
    slope: Math.round(slope * 100) / 100,
    rSquared: Math.round(rSquared * 1000) / 1000,
    predictedNext: Math.round((slope * n + intercept) * 100) / 100,
    dataPoints: results.map(r => ({
      date: r.assessmentDate,
      score: r.score,
      type: r.type,
    })),
    totalChange: ys[ys.length - 1] - ys[0],
    averageScore: Math.round((sumY / n) * 100) / 100,
  };
};

programAssessmentSchema.statics.getDomainAnalysis = async function (beneficiaryId, programId) {
  const results = await this.find({
    beneficiaryId,
    programId,
    status: { $ne: 'archived' },
    'scoreBreakdown.0': { $exists: true },
  })
    .sort({ assessmentDate: -1 })
    .limit(5);

  if (results.length === 0) return { domains: [] };

  const domainMap = {};
  results.forEach(r => {
    (r.scoreBreakdown || []).forEach(b => {
      if (!domainMap[b.category]) {
        domainMap[b.category] = { scores: [], maxScore: b.maxScore };
      }
      domainMap[b.category].scores.push(b.score);
    });
  });

  const domains = Object.entries(domainMap).map(([category, data]) => {
    const avg = data.scores.reduce((a, b) => a + b, 0) / data.scores.length;
    const latest = data.scores[0];
    const oldest = data.scores[data.scores.length - 1];
    return {
      category,
      averageScore: Math.round(avg * 100) / 100,
      latestScore: latest,
      maxScore: data.maxScore,
      percentage: data.maxScore ? Math.round((avg / data.maxScore) * 100) : null,
      trend: latest > oldest ? 'improving' : latest < oldest ? 'declining' : 'stable',
      assessmentCount: data.scores.length,
    };
  });

  return {
    domains: domains.sort((a, b) => (b.percentage || 0) - (a.percentage || 0)),
    strongestDomain: domains[0]?.category || null,
    weakestDomain: domains[domains.length - 1]?.category || null,
  };
};

// Pre-save middleware
programAssessmentSchema.pre('save', function (next) {
  this.updatedAt = new Date();

  // Auto-calculate weighted score
  if (this.scoreBreakdown && this.scoreBreakdown.length > 0) {
    this.calculateWeightedScore();
  }

  // Auto-compute improvement flag
  if (this.previousScore != null && this.score != null) {
    this.scoreChange = this.score - this.previousScore;
    this.improvement = this.scoreChange > 0;
  }

  next();
});

module.exports =
  mongoose.models.ProgramAssessment || mongoose.model('ProgramAssessment', programAssessmentSchema);
