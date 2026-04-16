'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

// ─── Main Schema ──────────────────────────────────────────────────────────────

const FamilyNeedsSurveySchema = new Schema(
  {
    beneficiary: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    respondent_name: { type: String, required: true },
    respondent_relationship: {
      type: String,
      enum: ['mother', 'father', 'sibling', 'grandparent', 'guardian', 'other'],
      required: true,
    },
    assessor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch' },
    assessment_date: { type: Date, default: Date.now },

    // ── 6 مجالات احتياج (35 بند)
    domains: {
      // 1. المعلومات Information Needs
      information_needs: {
        items: [
          {
            item_ar: String,
            need_level: { type: Number, enum: [1, 2, 3] }, // 1=لا أحتاج, 2=غير متأكد, 3=أحتاج بشدة
          },
        ],
        total_score: Number,
        priority_level: String,
      },
      // 2. الدعم الأسري Family & Social Support
      family_support: {
        items: [{ item_ar: String, need_level: { type: Number, enum: [1, 2, 3] } }],
        total_score: Number,
        priority_level: String,
      },
      // 3. الموارد المالية Financial Needs
      financial_needs: {
        items: [{ item_ar: String, need_level: { type: Number, enum: [1, 2, 3] } }],
        total_score: Number,
        priority_level: String,
      },
      // 4. شرح للآخرين Explaining to Others
      explaining_to_others: {
        items: [{ item_ar: String, need_level: { type: Number, enum: [1, 2, 3] } }],
        total_score: Number,
        priority_level: String,
      },
      // 5. رعاية الطفل Childcare
      childcare: {
        items: [{ item_ar: String, need_level: { type: Number, enum: [1, 2, 3] } }],
        total_score: Number,
        priority_level: String,
      },
      // 6. الدعم المهني Professional Support
      professional_support: {
        items: [{ item_ar: String, need_level: { type: Number, enum: [1, 2, 3] } }],
        total_score: Number,
        priority_level: String,
      },
    },

    total_needs_score: { type: Number },
    priority_domains: [String],

    // ── أسئلة مفتوحة
    open_questions: {
      greatest_concern_ar: String,
      most_helpful_service_ar: String,
      additional_needs_ar: String,
    },

    // ── خطة الاستجابة
    response_plan: {
      identified_needs: [
        {
          need_ar: String,
          domain: String,
          action_plan_ar: String,
          responsible: String,
          target_date: Date,
        },
      ],
      follow_up_date: Date,
    },

    status: { type: String, enum: ['draft', 'completed', 'action_planned'], default: 'draft' },
  },
  { timestamps: true, collection: 'family_needs_surveys' }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

FamilyNeedsSurveySchema.index({ beneficiary: 1, assessment_date: -1 });
FamilyNeedsSurveySchema.index({ branch: 1, status: 1, createdAt: -1 });

// ─── Static Methods ───────────────────────────────────────────────────────────

FamilyNeedsSurveySchema.statics.paginate = async function (filter = {}, options = {}) {
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

FamilyNeedsSurveySchema.statics.latestFor = function (beneficiaryId) {
  return this.findOne({ beneficiary: beneficiaryId, status: { $ne: 'deleted' } })
    .sort({ createdAt: -1 })
    .populate('assessor', 'name role')
    .lean();
};

// ─── Export ───────────────────────────────────────────────────────────────────

const FamilyNeedsSurvey =
  mongoose.models.FamilyNeedsSurvey || mongoose.model('FamilyNeedsSurvey', FamilyNeedsSurveySchema);

module.exports = FamilyNeedsSurvey;
