/**
 * Performance Evaluation Model (HR)
 * Modular, extensible performance evaluation for HR system
 */
const mongoose = require('mongoose');

const IndividualEvaluationSchema = new mongoose.Schema({
  evaluatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  evaluationType: {
    type: String,
    enum: ['management', 'peer', 'recipient', 'self'],
    required: true,
  },
  score: Number,
  scores: [
    {
      criteriaId: String,
      criteriaName: String,
      score: { type: Number, min: 1, max: 5 },
      comment: String,
    },
  ],
  comments: String,
  strengths: [String],
  areasForImprovement: [String],
  recommendations: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const PerformanceEvaluationSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  evaluationPeriod: {
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
  },
  evaluations: {
    managementEvaluation: IndividualEvaluationSchema,
    peerEvaluations: [IndividualEvaluationSchema],
    recipientEvaluations: [IndividualEvaluationSchema],
    selfEvaluation: IndividualEvaluationSchema,
  },
  summary: {
    weightedScores: {
      management: Number,
      peers: Number,
      recipients: Number,
      self: Number,
    },
    overallScore: Number,
    overallRating: { type: String, enum: ['ممتاز', 'جيد جداً', 'جيد', 'مقبول', 'ضعيف'] },
    executiveSummary: String,
    keyAchievements: [String],
    mainChallenges: [String],
    promotionRecommended: Boolean,
    trainingNeeds: [String],
    careerPathRecommendation: String,
    salaryAdjustmentRecommended: Boolean,
    salaryAdjustmentPercentage: Number,
  },
  hrNotes: String,
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvalDate: Date,
  status: {
    type: String,
    enum: ['draft', 'in_progress', 'pending_review', 'approved', 'archived'],
    default: 'draft',
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  submittedAt: Date,
  reviewedAt: Date,
});

PerformanceEvaluationSchema.index({ employeeId: 1, 'evaluationPeriod.startDate': -1 });
PerformanceEvaluationSchema.index({ status: 1 });
PerformanceEvaluationSchema.index({ 'summary.overallRating': 1 });

module.exports = mongoose.model('PerformanceEvaluation', PerformanceEvaluationSchema);
