'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

// ─── Main Schema ──────────────────────────────────────────────────────────────

const SRS2AssessmentSchema = new Schema(
  {
    beneficiary: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    assessor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch' },
    assessment_date: { type: Date, default: Date.now },
    age_months: { type: Number, required: true, min: 30, max: 216 },
    respondent: { type: String, enum: ['parent', 'teacher'], default: 'parent' },
    form_type: { type: String, enum: ['preschool', 'school_age', 'adult'], default: 'school_age' },

    items: [
      {
        item_number: { type: Number, required: true },
        subscale: {
          type: String,
          enum: [
            'social_awareness',
            'social_cognition',
            'social_communication',
            'social_motivation',
            'restricted_interests',
          ],
        },
        question_ar: String,
        response: { type: Number, enum: [1, 2, 3, 4] }, // 1=غير صحيح, 2=صحيح أحياناً, 3=صحيح غالباً, 4=صحيح دائماً تقريباً
        is_reversed: { type: Boolean, default: false },
      },
    ],

    // ── درجات السلالم الفرعية
    subscale_scores: {
      social_awareness: { raw: Number, t_score: Number },
      social_cognition: { raw: Number, t_score: Number },
      social_communication: { raw: Number, t_score: Number },
      social_motivation: { raw: Number, t_score: Number },
      restricted_interests: { raw: Number, t_score: Number },
    },

    // ── الدرجة الكلية SRS Total Score
    total_raw_score: { type: Number },
    total_t_score: { type: Number },

    // ── التصنيف
    // T≤59: طبيعي, 60-65: خفيف, 66-75: متوسط, ≥76: شديد
    severity_classification: {
      type: String,
      enum: ['within_normal', 'mild', 'moderate', 'severe'],
    },
    severity_classification_ar: String,

    // ── مؤشر DSM-5
    dsm5_compatible: {
      social_communication_deficits: { type: Boolean },
      restricted_repetitive_behaviors: { type: Boolean },
    },

    auto_recommendations: {
      social_skills_training: { type: Boolean },
      priority_areas: [String],
      suggested_interventions: [String],
    },

    status: { type: String, enum: ['draft', 'completed', 'reviewed'], default: 'draft' },
    notes: { type: String },
  },
  { timestamps: true, collection: 'srs2_assessments' }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

SRS2AssessmentSchema.index({ beneficiary: 1, assessment_date: -1 });
SRS2AssessmentSchema.index({ branch: 1, status: 1, createdAt: -1 });
SRS2AssessmentSchema.index({ notes: 'text' });

// ─── Pre-save Hook ────────────────────────────────────────────────────────────

SRS2AssessmentSchema.pre('save', function (next) {
  if (typeof this.total_t_score === 'number' && !this.severity_classification) {
    const t = this.total_t_score;
    if (t <= 59) {
      this.severity_classification = 'within_normal';
      this.severity_classification_ar = 'ضمن الحدود الطبيعية';
    } else if (t <= 65) {
      this.severity_classification = 'mild';
      this.severity_classification_ar = 'خفيف';
    } else if (t <= 75) {
      this.severity_classification = 'moderate';
      this.severity_classification_ar = 'متوسط';
    } else {
      this.severity_classification = 'severe';
      this.severity_classification_ar = 'شديد';
    }
  }
  next();
});

// ─── Virtuals ─────────────────────────────────────────────────────────────────

SRS2AssessmentSchema.virtual('severity_summary').get(function () {
  return `${this.severity_classification_ar || this.severity_classification} — T=${this.total_t_score}`;
});

SRS2AssessmentSchema.set('toJSON', { virtuals: true });
SRS2AssessmentSchema.set('toObject', { virtuals: true });

// ─── Static Methods ───────────────────────────────────────────────────────────

SRS2AssessmentSchema.statics.paginate = async function (filter = {}, options = {}) {
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

SRS2AssessmentSchema.statics.latestFor = function (beneficiaryId) {
  return this.findOne({ beneficiary: beneficiaryId, status: { $ne: 'deleted' } })
    .sort({ createdAt: -1 })
    .populate('assessor', 'name role')
    .lean();
};

// ─── Export ───────────────────────────────────────────────────────────────────

const SRS2Assessment =
  mongoose.models.SRS2Assessment || mongoose.model('SRS2Assessment', SRS2AssessmentSchema);

module.exports = SRS2Assessment;
