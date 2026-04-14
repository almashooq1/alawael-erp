'use strict';

const mongoose = require('mongoose');

// ============================
// 3. نموذج نتائج القياس (Measurement Results)
// ============================
const MeasurementResultSchema = new mongoose.Schema(
  {
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BeneficiaryProfile',
      required: true,
    },

    measurementId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MeasurementMaster',
      required: true,
    },

    typeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MeasurementType',
      required: true,
    },

    administratedBy: {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      name: String,
      certifications: [String],
    },

    dateAdministrated: {
      type: Date,
      required: true,
    },

    // البيانات الأساسية
    rawScore: {
      type: Number,
      required: true,
    },

    standardScore: Number,

    percentileRank: Number,

    ageEquivalent: String,

    gradeEquivalent: String,

    // النتائج حسب المجالات
    domainScores: [
      {
        domainCode: String,
        domainName: String,
        rawScore: Number,
        standardScore: Number,
        percentile: Number,
        level: String, // مثل: ضعيف، متوسط، قوي
      },
    ],

    // المستوى الكلي
    overallLevel: {
      type: String,
      enum: [
        'PROFOUND',
        'SEVERE',
        'MODERATE',
        'MILD',
        'BORDERLINE',
        'AVERAGE',
        'ABOVE_AVERAGE',
        'SUPERIOR',
      ],
      required: true,
    },

    interpretation: {
      summary: String,
      strengths: [String],
      weaknesses: [String],
      recommendations: [String],
      specialNotes: String,
    },

    // ملاحظات السلوك والملاحظات الإكلينيكية
    behavioralObservations: {
      attention: String,
      motivation: String,
      cooperation: String,
      anxiety: String,
      otherObservations: String,
    },

    // قيود الاختبار
    testingLimitations: [String],

    // المتابعة الموصى بها
    recommendedFollowUp: {
      type: String,
      enum: ['NONE', 'AFTER_3_MONTHS', 'AFTER_6_MONTHS', 'AFTER_1_YEAR', 'AS_NEEDED'],
    },

    linkedPrograms: [
      {
        programId: mongoose.Schema.Types.ObjectId,
        matchScore: Number, // درجة التطابق (0-100)
        activationDate: Date,
        reason: String,
      },
    ],

    // حالة النتيجة
    status: {
      type: String,
      enum: ['DRAFT', 'PENDING_REVIEW', 'APPROVED', 'ARCHIVED'],
      default: 'DRAFT',
    },

    approvalInfo: {
      approvedBy: mongoose.Schema.Types.ObjectId,
      approvalDate: Date,
      approvalNotes: String,
    },

    reportDocument: {
      fileUrl: String,
      generatedAt: Date,
      format: {
        type: String,
        enum: ['PDF', 'DOCX', 'HTML'],
      },
    },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },

    // للحفاظ على التاريخ
    isLatest: Boolean,
    previousResultId: mongoose.Schema.Types.ObjectId,
  },
  { collection: 'measurement_results' }
);

// ============================
// Virtuals
// ============================

// MeasurementResult: compute percentage from raw vs max
MeasurementResultSchema.virtual('scorePercentage').get(function () {
  if (!this.rawScore) return null;
  const master = this.measurementId;
  if (!master) return null;
  // Approximate from domain scores
  const totalMax = (this.domainScores || []).reduce((s, d) => s + (d.rawScore || 0), 0);
  return totalMax > 0 ? Math.round((this.rawScore / totalMax) * 100) : null;
});

// ============================
// Instance Methods
// ============================

/**
 * MeasurementResult: Determine interpretation level from type's interpretationLevels
 */
MeasurementResultSchema.methods.interpretScore = async function () {
  const type = this.typeId;
  if (!type || !type.interpretationLevels) return this.overallLevel;

  const levels = type.interpretationLevels;
  for (const lvl of levels) {
    if (this.rawScore >= lvl.minScore && this.rawScore <= lvl.maxScore) {
      this.interpretation = this.interpretation || {};
      this.interpretation.summary = lvl.description;
      return lvl.level;
    }
  }
  return this.overallLevel;
};

/**
 * MeasurementResult: Calculate standard score from norm tables
 */
MeasurementResultSchema.methods.calculateStandardScore = function (normGroup) {
  if (!normGroup || !normGroup.meanScore || !normGroup.standardDeviation) return null;

  const z = (this.rawScore - normGroup.meanScore) / normGroup.standardDeviation;
  // Standard score: mean=100, sd=15 (IQ-style)
  this.standardScore = Math.round(100 + 15 * z);
  // Percentile approximation
  this.percentileRank = Math.round((1 / (1 + Math.exp(-1.7 * z))) * 100);
  return { standardScore: this.standardScore, percentileRank: this.percentileRank, zScore: z };
};

// ============================
// Static Methods
// ============================

/**
 * MeasurementResult: Get trend for beneficiary across measurement type
 */
MeasurementResultSchema.statics.getTrend = async function (beneficiaryId, typeId, limit = 10) {
  const results = await this.find({
    beneficiaryId,
    typeId,
    status: { $in: ['APPROVED', 'PENDING_REVIEW'] },
  })
    .sort({ dateAdministrated: 1 })
    .limit(limit)
    .select('rawScore standardScore percentileRank overallLevel dateAdministrated domainScores');

  if (results.length < 2) return { trend: 'insufficient_data', data: results };

  const scores = results.map(r => r.rawScore);
  const n = scores.length;
  const sumX = (n * (n - 1)) / 2;
  const sumY = scores.reduce((a, b) => a + b, 0);
  const sumXY = scores.reduce((sum, y, i) => sum + i * y, 0);
  const sumXX = scores.reduce((sum, _, i) => sum + i * i, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const meanY = sumY / n;
  const intercept = meanY - slope * (sumX / n);

  const ssReg = scores.reduce((sum, _, i) => sum + Math.pow(slope * i + intercept - meanY, 2), 0);
  const ssTot = scores.reduce((sum, y) => sum + Math.pow(y - meanY, 2), 0);
  const rSquared = ssTot > 0 ? ssReg / ssTot : 0;

  let direction = 'stable';
  if (slope > 0.5) direction = 'improving';
  else if (slope < -0.5) direction = 'declining';

  return {
    trend: direction,
    slope: Math.round(slope * 100) / 100,
    rSquared: Math.round(rSquared * 1000) / 1000,
    predictedNext: Math.round((slope * n + intercept) * 100) / 100,
    totalImprovement: scores[n - 1] - scores[0],
    averageScore: Math.round(meanY * 100) / 100,
    dataPoints: results.map(r => ({
      date: r.dateAdministrated,
      rawScore: r.rawScore,
      standardScore: r.standardScore,
      level: r.overallLevel,
    })),
  };
};

/**
 * MeasurementResult: Dashboard aggregate stats
 */
MeasurementResultSchema.statics.getDashboardStats = async function (filters = {}) {
  const match = {};
  if (filters.beneficiaryId) match.beneficiaryId = filters.beneficiaryId;
  if (filters.status) match.status = filters.status;
  if (filters.fromDate) match.dateAdministrated = { $gte: new Date(filters.fromDate) };

  const [stats] = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalAssessments: { $sum: 1 },
        avgRawScore: { $avg: '$rawScore' },
        avgStandardScore: { $avg: '$standardScore' },
        avgPercentile: { $avg: '$percentileRank' },
        minScore: { $min: '$rawScore' },
        maxScore: { $max: '$rawScore' },
      },
    },
  ]);

  const byLevel = await this.aggregate([
    { $match: match },
    { $group: { _id: '$overallLevel', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  const byType = await this.aggregate([
    { $match: match },
    { $group: { _id: '$typeId', count: { $sum: 1 }, avgScore: { $avg: '$rawScore' } } },
    { $sort: { count: -1 } },
  ]);

  const monthlyTrend = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: {
          year: { $year: '$dateAdministrated' },
          month: { $month: '$dateAdministrated' },
        },
        count: { $sum: 1 },
        avgScore: { $avg: '$rawScore' },
      },
    },
    { $sort: { '_id.year': -1, '_id.month': -1 } },
    { $limit: 12 },
  ]);

  return {
    summary: stats || {
      totalAssessments: 0,
      avgRawScore: 0,
      avgStandardScore: 0,
      avgPercentile: 0,
      minScore: 0,
      maxScore: 0,
    },
    byLevel: byLevel.reduce((obj, l) => ({ ...obj, [l._id]: l.count }), {}),
    byType,
    monthlyTrend,
  };
};

// ============================
// Indexes
// ============================
MeasurementResultSchema.index({ beneficiaryId: 1, dateAdministrated: -1 });
MeasurementResultSchema.index({ beneficiaryId: 1, typeId: 1 });
MeasurementResultSchema.index({ status: 1 });
MeasurementResultSchema.index({ overallLevel: 1 });
MeasurementResultSchema.index({ 'linkedPrograms.programId': 1 });

const MeasurementResult =
  mongoose.models.MeasurementResult || mongoose.model('MeasurementResult', MeasurementResultSchema);

module.exports = MeasurementResult;
