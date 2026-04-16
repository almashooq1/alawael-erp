'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

// ─── Main Schema ──────────────────────────────────────────────────────────────

const SaudiScreeningSchema = new Schema(
  {
    beneficiary: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    assessor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch' },
    assessment_date: { type: Date, default: Date.now },
    age_months: { type: Number, required: true, min: 0, max: 72 },

    // ── 5 مجالات نمائية
    domains: {
      gross_motor: {
        items: [
          {
            age_band: String, // "0-3m", "3-6m", etc.
            milestone_ar: String,
            achieved: Boolean,
            concern: Boolean,
          },
        ],
        score: Number,
        age_equivalent_months: Number,
        delay_months: Number,
        status: { type: String, enum: ['on_track', 'monitor', 'concern', 'delay'] },
      },
      fine_motor: {
        items: [{ age_band: String, milestone_ar: String, achieved: Boolean, concern: Boolean }],
        score: Number,
        age_equivalent_months: Number,
        delay_months: Number,
        status: { type: String, enum: ['on_track', 'monitor', 'concern', 'delay'] },
      },
      language_communication: {
        items: [{ age_band: String, milestone_ar: String, achieved: Boolean, concern: Boolean }],
        score: Number,
        age_equivalent_months: Number,
        delay_months: Number,
        status: { type: String, enum: ['on_track', 'monitor', 'concern', 'delay'] },
      },
      cognitive: {
        items: [{ age_band: String, milestone_ar: String, achieved: Boolean, concern: Boolean }],
        score: Number,
        age_equivalent_months: Number,
        delay_months: Number,
        status: { type: String, enum: ['on_track', 'monitor', 'concern', 'delay'] },
      },
      social_emotional: {
        items: [{ age_band: String, milestone_ar: String, achieved: Boolean, concern: Boolean }],
        score: Number,
        age_equivalent_months: Number,
        delay_months: Number,
        status: { type: String, enum: ['on_track', 'monitor', 'concern', 'delay'] },
      },
    },

    // ── الأسئلة الإضافية (مخاوف الوالدين)
    parent_concerns: {
      has_concerns: Boolean,
      concern_areas: [String],
      concern_details_ar: String,
    },

    // ── علامات إنذار Red Flags
    red_flags: [
      {
        flag_ar: String,
        domain: String,
        severity: { type: String, enum: ['yellow', 'red'] }, // أصفر=مراقبة, أحمر=تحويل فوري
      },
    ],

    // ── النتيجة الكلية
    overall_result: {
      status: { type: String, enum: ['normal', 'at_risk', 'delayed', 'significantly_delayed'] },
      status_ar: String,
      domains_at_risk: [String],
      referral_needed: Boolean,
      referral_specialties: [String],
      rescreening_date: Date,
      recommendations_ar: [String],
    },

    status: { type: String, enum: ['draft', 'completed', 'referred'], default: 'draft' },
  },
  { timestamps: true, collection: 'saudi_developmental_screenings' }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

SaudiScreeningSchema.index({ beneficiary: 1, assessment_date: -1 });
SaudiScreeningSchema.index({ branch: 1, status: 1, createdAt: -1 });

// ─── Static Methods ───────────────────────────────────────────────────────────

SaudiScreeningSchema.statics.paginate = async function (filter = {}, options = {}) {
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

SaudiScreeningSchema.statics.latestFor = function (beneficiaryId) {
  return this.findOne({ beneficiary: beneficiaryId, status: { $ne: 'deleted' } })
    .sort({ createdAt: -1 })
    .populate('assessor', 'name role')
    .lean();
};

// ─── Export ───────────────────────────────────────────────────────────────────

const SaudiDevelopmentalScreening =
  mongoose.models.SaudiDevelopmentalScreening ||
  mongoose.model('SaudiDevelopmentalScreening', SaudiScreeningSchema);

module.exports = SaudiDevelopmentalScreening;
