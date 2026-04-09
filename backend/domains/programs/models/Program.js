/**
 * Program — نموذج البرنامج التأهيلي المركزي
 *
 * يمثل برنامجاً تأهيلياً قابلاً للتكرار (Template) يمكن إسناده
 * لمستفيد أو مجموعة عبر ProgramEnrollment.
 *
 * أنواع البرامج:
 *  - individual (فردي)
 *  - group (جماعي)
 *  - home_based (منزلي)
 *  - educational (تعليمي)
 *  - tele_rehab (عن بُعد)
 *  - ar_vr (واقع معزز/افتراضي)
 *  - community (مجتمعي)
 *  - vocational (مهني)
 *
 * @module domains/programs/models/Program
 */

const mongoose = require('mongoose');

// ─── Session Template Sub-schema ────────────────────────────────────────────

const sessionTemplateSchema = new mongoose.Schema(
  {
    order: { type: Number, required: true },
    title: { type: String, required: true },
    title_ar: String,
    description: String,
    duration: { type: Number, default: 45 }, // minutes
    type: {
      type: String,
      enum: [
        'individual',
        'group',
        'family',
        'tele_rehab',
        'ar_vr',
        'home_visit',
        'assessment_session',
      ],
      default: 'individual',
    },
    activities: [
      {
        name: String,
        name_ar: String,
        description: String,
        duration: Number,
        materials: [String],
        instructions: String,
      },
    ],
    objectives: [String],
    materials: [String],
    assessmentMeasures: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Measure' }],
    isOptional: { type: Boolean, default: false },
  },
  { _id: true }
);

// ─── Module Sub-schema (مرحلة البرنامج) ────────────────────────────────────

const programModuleSchema = new mongoose.Schema(
  {
    order: { type: Number, required: true },
    name: { type: String, required: true },
    name_ar: String,
    description: String,
    durationWeeks: Number,
    sessions: [sessionTemplateSchema],
    goals: [
      {
        title: String,
        title_ar: String,
        category: String,
        targetCriteria: String,
      },
    ],
    completionCriteria: String,
  },
  { _id: true }
);

// ─── Main Program Schema ────────────────────────────────────────────────────

const programSchema = new mongoose.Schema(
  {
    // ── Identity ──────────────────────────────────────────────────────
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    name: { type: String, required: true },
    name_ar: { type: String, required: true },
    abbreviation: String,
    version: { type: String, default: '1.0' },

    // ── Classification ────────────────────────────────────────────────
    type: {
      type: String,
      required: true,
      enum: [
        'individual',
        'group',
        'home_based',
        'educational',
        'tele_rehab',
        'ar_vr',
        'community',
        'vocational',
      ],
      index: true,
    },
    category: {
      type: String,
      enum: [
        'physical_therapy',
        'occupational_therapy',
        'speech_therapy',
        'behavioral_therapy',
        'cognitive_therapy',
        'social_skills',
        'life_skills',
        'vocational_training',
        'early_intervention',
        'family_training',
        'sensory_integration',
        'multidisciplinary',
        'educational',
        'recreational',
        'other',
      ],
      index: true,
    },
    specialties: [
      {
        type: String,
        enum: [
          'physical_therapy',
          'occupational_therapy',
          'speech_therapy',
          'psychology',
          'special_education',
          'social_work',
          'nursing',
          'medicine',
          'nutrition',
          'audiology',
        ],
      },
    ],

    // ── Description ───────────────────────────────────────────────────
    description: String,
    description_ar: String,
    objectives: [String],
    objectives_ar: [String],
    targetOutcomes: [String],
    evidenceBase: String,
    evidenceLevel: {
      type: String,
      enum: ['level_1', 'level_2', 'level_3', 'expert_opinion', 'not_established'],
    },

    // ── Applicability ─────────────────────────────────────────────────
    targetPopulation: {
      ageRange: {
        min: Number, // months
        max: Number, // months
      },
      disabilities: [
        {
          type: String,
          enum: [
            'autism',
            'cerebral_palsy',
            'down_syndrome',
            'intellectual_disability',
            'hearing_impairment',
            'visual_impairment',
            'speech_disorder',
            'learning_disability',
            'adhd',
            'physical_disability',
            'multiple_disabilities',
            'developmental_delay',
            'genetic_disorders',
            'neurological_disorders',
            'all',
          ],
        },
      ],
      severityLevels: [
        {
          type: String,
          enum: ['mild', 'moderate', 'severe', 'profound', 'all'],
        },
      ],
      prerequisites: [String],
      contraindications: [String],
    },

    // ── Structure ─────────────────────────────────────────────────────
    durationWeeks: { type: Number, required: true },
    sessionsPerWeek: { type: Number, default: 2 },
    sessionDuration: { type: Number, default: 45 }, // minutes
    totalSessions: Number,
    modules: [programModuleSchema],

    // ── Group Settings ────────────────────────────────────────────────
    groupSettings: {
      minSize: { type: Number, default: 3 },
      maxSize: { type: Number, default: 8 },
      groupingCriteria: [String], // e.g. 'age', 'diagnosis', 'severity'
      requiresHomogeneousGroup: { type: Boolean, default: false },
    },

    // ── Tele-Rehab Settings ───────────────────────────────────────────
    teleRehabSettings: {
      platform: String,
      requiresEquipment: [String],
      bandwidthRequirement: String,
      parentInvolvement: {
        type: String,
        enum: ['required', 'recommended', 'optional'],
        default: 'recommended',
      },
    },

    // ── AR/VR Settings ────────────────────────────────────────────────
    arVrSettings: {
      platform: String,
      hardware: [String],
      softwareVersion: String,
      safetyPrecautions: [String],
      contraindications: [String],
    },

    // ── Linked Measures ───────────────────────────────────────────────
    linkedMeasures: [
      {
        measureId: { type: mongoose.Schema.Types.ObjectId, ref: 'Measure' },
        purpose: {
          type: String,
          enum: ['baseline', 'progress', 'outcome', 'screening'],
        },
        frequency: String, // e.g. 'at_start', 'monthly', 'mid_program', 'at_end'
      },
    ],

    // ── Linked Goals Templates ────────────────────────────────────────
    goalTemplates: [
      {
        title: String,
        title_ar: String,
        category: String,
        level: { type: String, enum: ['long_term', 'short_term', 'session_objective'] },
        targetCriteria: String,
        expectedDuration: String,
      },
    ],

    // ── Resources ─────────────────────────────────────────────────────
    materials: [
      {
        name: String,
        type: { type: String, enum: ['document', 'video', 'image', 'form', 'tool', 'other'] },
        url: String,
        isRequired: { type: Boolean, default: false },
      },
    ],

    // ── Staff Requirements ────────────────────────────────────────────
    staffRequirements: [
      {
        role: String,
        qualification: String,
        isLead: { type: Boolean, default: false },
        hoursPerWeek: Number,
      },
    ],

    // ── Cost ──────────────────────────────────────────────────────────
    estimatedCost: {
      perSession: Number,
      perProgram: Number,
      currency: { type: String, default: 'SAR' },
    },

    // ── Status ────────────────────────────────────────────────────────
    status: {
      type: String,
      enum: ['draft', 'review', 'active', 'suspended', 'archived'],
      default: 'draft',
      index: true,
    },
    publishedAt: Date,
    publishedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // ── Versioning ────────────────────────────────────────────────────
    previousVersion: { type: mongoose.Schema.Types.ObjectId, ref: 'Program' },
    isLatestVersion: { type: Boolean, default: true },

    // ── Audit ─────────────────────────────────────────────────────────
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: Date,

    // ── Multi-tenant ──────────────────────────────────────────────────
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    isGlobal: { type: Boolean, default: false },

    // ── Tags ──────────────────────────────────────────────────────────
    tags: [String],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────

programSchema.index({ type: 1, category: 1, status: 1 });
programSchema.index({ 'targetPopulation.disabilities': 1 });
programSchema.index({ status: 1, isLatestVersion: 1 });
programSchema.index({ tags: 1 });

// ─── Virtuals ─────────────────────────────────────────────────────────────

programSchema.virtual('totalModules').get(function () {
  return this.modules?.length || 0;
});

programSchema.virtual('totalSessionTemplates').get(function () {
  return (this.modules || []).reduce((sum, m) => sum + (m.sessions?.length || 0), 0);
});

// ─── Pre-save ─────────────────────────────────────────────────────────────

programSchema.pre('save', function (next) {
  if (!this.totalSessions && this.durationWeeks && this.sessionsPerWeek) {
    this.totalSessions = this.durationWeeks * this.sessionsPerWeek;
  }
  next();
});

// ─── Statics ──────────────────────────────────────────────────────────────

/**
 * البحث عن برامج مناسبة لمستفيد
 */
programSchema.statics.findApplicable = function (ageInMonths, disabilityType, severity) {
  const query = {
    status: 'active',
    isLatestVersion: true,
  };

  if (ageInMonths != null) {
    query.$or = [
      { 'targetPopulation.ageRange.min': { $exists: false } },
      {
        'targetPopulation.ageRange.min': { $lte: ageInMonths },
        'targetPopulation.ageRange.max': { $gte: ageInMonths },
      },
    ];
  }

  if (disabilityType) {
    query['targetPopulation.disabilities'] = { $in: [disabilityType, 'all'] };
  }

  if (severity) {
    query['targetPopulation.severityLevels'] = { $in: [severity, 'all'] };
  }

  return this.find(query).sort({ name: 1 });
};

/**
 * إحصائيات البرامج
 */
programSchema.statics.getStatistics = async function (branchId) {
  const match = {};
  if (branchId) match.branchId = new mongoose.Types.ObjectId(branchId);

  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: { status: '$status', type: '$type' },
        count: { $sum: 1 },
      },
    },
    {
      $group: {
        _id: '$_id.status',
        types: {
          $push: { type: '$_id.type', count: '$count' },
        },
        total: { $sum: '$count' },
      },
    },
  ]);
};

const Program = mongoose.models.Program || mongoose.model('Program', programSchema);

module.exports = { Program, programSchema };
