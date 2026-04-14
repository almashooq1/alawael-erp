'use strict';

const mongoose = require('mongoose');

// ============================
// 5. نموذج مقاييس إضافية سريعة (Quick Assessment)
// ============================
const QuickAssessmentSchema = new mongoose.Schema(
  {
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BeneficiaryProfile',
      required: true,
    },

    assessmentType: {
      type: String,
      enum: ['DAILY_LIVING', 'BEHAVIORAL_CHECKLIST', 'PROGRESS_TRACKING', 'INTAKE_SCREENING'],
      required: true,
    },

    items: [
      {
        itemCode: String,
        question: String,
        response: String,
        score: Number,
        notes: String,
        date: Date,
      },
    ],

    totalScore: Number,

    maxScore: Number,

    percentageScore: {
      type: Number,
      min: 0,
      max: 100,
    },

    level: String,

    performedBy: mongoose.Schema.Types.ObjectId,

    date: { type: Date, default: Date.now },

    linkedResult: mongoose.Schema.Types.ObjectId,

    // ── Enhanced Quick Assessment Fields ──
    duration: {
      type: Number,
      description: 'مدة التقييم بالدقائق',
    },

    environment: {
      type: String,
      enum: ['CLASSROOM', 'THERAPY_ROOM', 'HOME', 'OUTDOOR', 'CLINIC', 'OTHER'],
    },

    observations: {
      cooperation: { type: String, enum: ['excellent', 'good', 'fair', 'poor'] },
      attention: { type: String, enum: ['excellent', 'good', 'fair', 'poor'] },
      notes: String,
    },

    previousScoreRef: {
      assessmentId: mongoose.Schema.Types.ObjectId,
      score: Number,
      date: Date,
    },

    changeFromPrevious: {
      absoluteChange: Number,
      percentageChange: Number,
      direction: { type: String, enum: ['improved', 'stable', 'declined'] },
    },

    createdAt: { type: Date, default: Date.now },
  },
  { collection: 'quick_assessments' }
);

// ============================
// Virtuals
// ============================

// QuickAssessment: auto-calculate percentage
QuickAssessmentSchema.virtual('autoPercentage').get(function () {
  if (this.percentageScore != null) return this.percentageScore;
  if (this.totalScore != null && this.maxScore) {
    return Math.round((this.totalScore / this.maxScore) * 100);
  }
  return null;
});

// ============================
// Instance Methods
// ============================

/**
 * QuickAssessment: Auto-calculate total score from items
 */
QuickAssessmentSchema.methods.calculateTotalScore = function () {
  if (!this.items || this.items.length === 0) return;

  this.totalScore = this.items.reduce((sum, item) => sum + (item.score || 0), 0);
  if (this.maxScore && this.maxScore > 0) {
    this.percentageScore = Math.round((this.totalScore / this.maxScore) * 100);
  }
  return this.totalScore;
};

// ============================
// Static Methods
// ============================

/**
 * QuickAssessment: Aggregate stats by type
 */
QuickAssessmentSchema.statics.getStatsByType = async function (beneficiaryId) {
  return this.aggregate([
    { $match: { beneficiaryId } },
    {
      $group: {
        _id: '$assessmentType',
        count: { $sum: 1 },
        avgScore: { $avg: '$totalScore' },
        latestDate: { $max: '$date' },
        avgPercentage: { $avg: '$percentageScore' },
      },
    },
    { $sort: { latestDate: -1 } },
  ]);
};

// ============================
// Pre-save hooks
// ============================

// Auto-calculate QuickAssessment totals
QuickAssessmentSchema.pre('save', function (next) {
  if (this.items && this.items.length > 0 && this.totalScore == null) {
    this.totalScore = this.items.reduce((sum, item) => sum + (item.score || 0), 0);
  }
  if (this.totalScore != null && this.maxScore && this.maxScore > 0) {
    this.percentageScore = Math.round((this.totalScore / this.maxScore) * 100);
  }
  next();
});

// Auto-compute change from previous for QuickAssessment
QuickAssessmentSchema.pre('save', async function (next) {
  if (this.isNew && this.previousScoreRef?.score != null) {
    const prevScore = this.previousScoreRef.score;
    const currentScore = this.totalScore || 0;
    this.changeFromPrevious = {
      absoluteChange: currentScore - prevScore,
      percentageChange: prevScore ? Math.round(((currentScore - prevScore) / prevScore) * 100) : 0,
      direction:
        currentScore > prevScore ? 'improved' : currentScore < prevScore ? 'declined' : 'stable',
    };
  }
  next();
});

// ============================
// Indexes
// ============================
QuickAssessmentSchema.index({ beneficiaryId: 1, date: -1 });
QuickAssessmentSchema.index({ assessmentType: 1 });
QuickAssessmentSchema.index({ performedBy: 1 });

const QuickAssessment =
  mongoose.models.QuickAssessment || mongoose.model('QuickAssessment', QuickAssessmentSchema);

module.exports = QuickAssessment;
