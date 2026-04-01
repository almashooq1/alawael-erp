const mongoose = require('mongoose');

const performanceReviewSchema = new mongoose.Schema(
  {
    review_number: { type: String, unique: true },
    employee_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    branch_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    reviewer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    review_period_start: { type: Date, required: true },
    review_period_end: { type: Date, required: true },
    review_type: {
      type: String,
      enum: ['probation', 'annual', 'semi_annual', 'quarterly', 'special'],
      default: 'annual',
    },
    // معايير التقييم (كل معيار من 1-5)
    criteria: [
      {
        name_ar: { type: String },
        name_en: { type: String },
        weight: { type: Number, default: 1 },
        score: { type: Number, min: 1, max: 5 },
        notes: { type: String },
      },
    ],
    total_score: { type: Number },
    weighted_score: { type: Number },
    overall_rating: {
      type: String,
      enum: [
        'excellent',
        'very_good',
        'good',
        'satisfactory',
        'needs_improvement',
        'unsatisfactory',
      ],
    },
    strengths: { type: String },
    areas_for_improvement: { type: String },
    development_plan: { type: String },
    goals_next_period: { type: String },
    employee_comments: { type: String },
    employee_acknowledged: { type: Boolean, default: false },
    employee_acknowledged_at: { type: Date },
    status: {
      type: String,
      enum: ['draft', 'submitted', 'acknowledged', 'finalized'],
      default: 'draft',
    },
    salary_increase_recommended: { type: Boolean, default: false },
    salary_increase_percentage: { type: Number },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deleted_at: { type: Date, default: null },
  },
  { timestamps: true }
);

performanceReviewSchema.pre('save', async function (next) {
  if (!this.review_number) {
    const year = new Date().getFullYear();
    const count = await this.constructor.countDocuments({
      review_number: new RegExp(`^PRV-${year}-`),
    });
    this.review_number = `PRV-${year}-${String(count + 1).padStart(5, '0')}`;
  }
  if (this.criteria && this.criteria.length > 0) {
    const totalWeight = this.criteria.reduce((s, c) => s + (c.weight || 1), 0);
    const weightedSum = this.criteria.reduce((s, c) => s + (c.score || 0) * (c.weight || 1), 0);
    this.weighted_score = totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 10) / 10 : 0;
    this.total_score = this.criteria.reduce((s, c) => s + (c.score || 0), 0) / this.criteria.length;
  }
  next();
});

performanceReviewSchema.index({ employee_id: 1, review_period_end: -1 });
performanceReviewSchema.index({ branch_id: 1, status: 1 });
performanceReviewSchema.index({ deleted_at: 1 });

module.exports = mongoose.model('PerformanceReview', performanceReviewSchema);
