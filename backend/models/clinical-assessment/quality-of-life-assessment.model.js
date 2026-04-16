'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

// ─── Main Schema ──────────────────────────────────────────────────────────────

const QualityOfLifeSchema = new Schema(
  {
    beneficiary: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    assessor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch' },
    assessment_date: { type: Date, default: Date.now },
    respondent: {
      type: String,
      enum: ['self', 'parent_proxy', 'caregiver_proxy'],
      default: 'parent_proxy',
    },

    // ── 4 مجالات WHOQOL + مجال الإعاقة
    domains: {
      physical_health: {
        items: [
          {
            item_ar: String,
            item_en: String,
            score: { type: Number, min: 1, max: 5 }, // 1=سيء جداً -> 5=ممتاز
          },
        ],
        raw_score: Number,
        transformed_score: Number, // 0-100
      },
      psychological: {
        items: [{ item_ar: String, item_en: String, score: { type: Number, min: 1, max: 5 } }],
        raw_score: Number,
        transformed_score: Number,
      },
      social_relationships: {
        items: [{ item_ar: String, item_en: String, score: { type: Number, min: 1, max: 5 } }],
        raw_score: Number,
        transformed_score: Number,
      },
      environment: {
        items: [{ item_ar: String, item_en: String, score: { type: Number, min: 1, max: 5 } }],
        raw_score: Number,
        transformed_score: Number,
      },
      disability_specific: {
        items: [{ item_ar: String, item_en: String, score: { type: Number, min: 1, max: 5 } }],
        raw_score: Number,
        transformed_score: Number,
      },
    },

    overall_qol: { type: Number, min: 1, max: 5 },
    overall_health_satisfaction: { type: Number, min: 1, max: 5 },
    total_transformed_score: { type: Number }, // 0-100

    interpretation: {
      level: { type: String, enum: ['very_poor', 'poor', 'moderate', 'good', 'very_good'] },
      level_ar: String,
      strongest_domain: String,
      weakest_domain: String,
      improvement_areas: [String],
    },

    comparison_with_previous: {
      previous_id: { type: Schema.Types.ObjectId },
      previous_score: Number,
      change: Number,
      trend: { type: String, enum: ['improved', 'stable', 'declined'] },
      clinically_significant: Boolean,
    },

    status: { type: String, enum: ['draft', 'completed', 'reviewed'], default: 'draft' },
    notes: { type: String },
  },
  { timestamps: true, collection: 'quality_of_life_assessments' }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

QualityOfLifeSchema.index({ beneficiary: 1, assessment_date: -1 });
QualityOfLifeSchema.index({ branch: 1, status: 1, createdAt: -1 });

// ─── Pre-save Hook ────────────────────────────────────────────────────────────

QualityOfLifeSchema.pre('save', function (next) {
  if (typeof this.total_transformed_score === 'number' && !this.interpretation) {
    const s = this.total_transformed_score;
    if (s >= 80) this.interpretation = 'جودة حياة ممتازة';
    else if (s >= 60) this.interpretation = 'جودة حياة جيدة';
    else if (s >= 40) this.interpretation = 'جودة حياة متوسطة';
    else if (s >= 20) this.interpretation = 'جودة حياة منخفضة';
    else this.interpretation = 'جودة حياة متدنية جداً';
  }
  next();
});

// ─── Virtuals ─────────────────────────────────────────────────────────────────

QualityOfLifeSchema.set('toJSON', { virtuals: true });
QualityOfLifeSchema.set('toObject', { virtuals: true });

// ─── Static Methods ───────────────────────────────────────────────────────────

QualityOfLifeSchema.statics.paginate = async function (filter = {}, options = {}) {
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(100, Math.max(1, options.limit || 20));
  const skip = (page - 1) * limit;
  const sort = options.sort || { createdAt: -1 };
  const [docs, total] = await Promise.all([
    this.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    this.countDocuments(filter),
  ]);
  return {
    docs,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  };
};

QualityOfLifeSchema.statics.latestFor = function (beneficiaryId) {
  return this.findOne({ beneficiary: beneficiaryId, status: { $ne: 'deleted' } })
    .sort({ createdAt: -1 })
    .populate('assessor', 'name role')
    .lean();
};

// ─── Export ───────────────────────────────────────────────────────────────────

const QualityOfLifeAssessment =
  mongoose.models.QualityOfLifeAssessment ||
  mongoose.model('QualityOfLifeAssessment', QualityOfLifeSchema);

module.exports = QualityOfLifeAssessment;
