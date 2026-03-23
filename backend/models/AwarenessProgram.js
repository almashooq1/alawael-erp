/* eslint-disable no-unused-vars */
/**
 * AwarenessProgram Model — نموذج برامج التوعية المجتمعية بحقوق ذوي الإعاقة
 *
 * Manages community awareness campaigns and programs focused on
 * disability rights, inclusion, and social acceptance.
 */
const mongoose = require('mongoose');

const campaignMaterialSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    materialType: {
      type: String,
      enum: [
        'brochure',
        'video',
        'poster',
        'article',
        'infographic',
        'presentation',
        'social_media',
        'radio',
        'tv_spot',
      ],
      required: true,
    },
    language: { type: String, default: 'ar' },
    url: String,
    description: String,
    downloadCount: { type: Number, default: 0 },
    isAccessible: { type: Boolean, default: true },
  },
  { _id: true }
);

const workshopSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: String,
    date: { type: Date, required: true },
    duration: Number, // minutes
    venue: String,
    isVirtual: { type: Boolean, default: false },
    virtualLink: String,
    facilitator: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    maxAttendees: Number,
    registeredAttendees: { type: Number, default: 0 },
    actualAttendees: { type: Number, default: 0 },
    targetAudience: {
      type: String,
      enum: [
        'general_public',
        'employers',
        'educators',
        'healthcare',
        'government',
        'families',
        'youth',
        'media',
      ],
    },
    satisfactionScore: { type: Number, min: 0, max: 5 },
    knowledgeGainScore: { type: Number, min: 0, max: 100 },
    status: {
      type: String,
      enum: ['planned', 'confirmed', 'in_progress', 'completed', 'cancelled'],
      default: 'planned',
    },
  },
  { _id: true }
);

const awarenessProgramSchema = new mongoose.Schema(
  {
    // ─── Program Info ──────────────────────────────────────────────────
    title: {
      type: String,
      required: [true, 'عنوان البرنامج مطلوب'],
      trim: true,
      index: true,
    },
    titleAr: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'وصف البرنامج مطلوب'],
    },
    descriptionAr: String,

    // ─── Program Type & Focus ──────────────────────────────────────────
    programType: {
      type: String,
      enum: [
        'awareness_campaign',
        'workshop_series',
        'media_campaign',
        'school_program',
        'workplace_program',
        'community_event',
        'online_campaign',
        'conference',
        'training_program',
      ],
      required: true,
      index: true,
    },
    focusAreas: [
      {
        type: String,
        enum: [
          'disability_rights',
          'accessibility',
          'inclusive_education',
          'employment_rights',
          'social_inclusion',
          'anti_discrimination',
          'assistive_technology',
          'mental_health_awareness',
          'caregiver_support',
          'legal_rights',
          'universal_design',
          'early_intervention',
        ],
      },
    ],
    targetAudience: [
      {
        type: String,
        enum: [
          'general_public',
          'employers',
          'educators',
          'healthcare_professionals',
          'government_officials',
          'families',
          'youth',
          'media',
          'religious_leaders',
          'community_leaders',
        ],
      },
    ],

    // ─── Schedule ──────────────────────────────────────────────────────
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    isOngoing: { type: Boolean, default: false },

    // ─── Workshops & Materials ─────────────────────────────────────────
    workshops: [workshopSchema],
    materials: [campaignMaterialSchema],

    // ─── Partnerships ──────────────────────────────────────────────────
    partnerOrganizations: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CivilPartnership',
      },
    ],
    sponsors: [
      {
        name: String,
        contribution: String,
        amount: Number,
      },
    ],

    // ─── Geographic Coverage ───────────────────────────────────────────
    coverageArea: {
      type: String,
      enum: ['local', 'city', 'regional', 'national', 'international'],
      default: 'local',
    },
    targetRegions: [String],
    targetCities: [String],

    // ─── Impact & Metrics ──────────────────────────────────────────────
    targetReach: { type: Number, default: 0 },
    actualReach: { type: Number, default: 0 },
    socialMediaImpressions: { type: Number, default: 0 },
    mediaAppearances: { type: Number, default: 0 },
    totalWorkshopsCompleted: { type: Number, default: 0 },
    averageSatisfaction: { type: Number, min: 0, max: 5, default: 0 },
    preKnowledgeScore: { type: Number, min: 0, max: 100 },
    postKnowledgeScore: { type: Number, min: 0, max: 100 },
    attitudeChangePercentage: { type: Number, min: 0, max: 100 },

    // ─── Survey Results ────────────────────────────────────────────────
    surveyResults: {
      totalResponses: { type: Number, default: 0 },
      awarenessIncrease: { type: Number, min: 0, max: 100 },
      attitudeImprovement: { type: Number, min: 0, max: 100 },
      knowledgeGain: { type: Number, min: 0, max: 100 },
      willActDifferently: { type: Number, min: 0, max: 100 },
    },

    // ─── Budget ────────────────────────────────────────────────────────
    budget: {
      allocated: { type: Number, default: 0 },
      spent: { type: Number, default: 0 },
      currency: { type: String, default: 'SAR' },
    },

    // ─── Compliance with Disability Laws ───────────────────────────────
    legalReferences: [
      {
        lawName: String,
        articleNumber: String,
        description: String,
      },
    ],

    // ─── Status ────────────────────────────────────────────────────────
    status: {
      type: String,
      enum: ['draft', 'planned', 'active', 'completed', 'suspended', 'cancelled'],
      default: 'draft',
      index: true,
    },

    // ─── Media ─────────────────────────────────────────────────────────
    coverImage: String,
    gallery: [String],
    videoLinks: [String],
    tags: [String],

    // ─── Audit ─────────────────────────────────────────────────────────
    programManager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// ─── Indexes ─────────────────────────────────────────────────────────────────
awarenessProgramSchema.index({ programType: 1, status: 1 });
awarenessProgramSchema.index({ startDate: 1, endDate: 1 });
awarenessProgramSchema.index({ focusAreas: 1 });
awarenessProgramSchema.index({ status: 1, createdAt: -1 });
awarenessProgramSchema.index({ coverageArea: 1, status: 1 });

// ─── Pre-save: recalculate totals ────────────────────────────────────────────
awarenessProgramSchema.pre('save', function (next) {
  if (this.workshops && this.workshops.length > 0) {
    this.totalWorkshopsCompleted = this.workshops.filter(w => w.status === 'completed').length;
    const ratedWorkshops = this.workshops.filter(w => w.satisfactionScore > 0);
    if (ratedWorkshops.length > 0) {
      this.averageSatisfaction =
        ratedWorkshops.reduce((sum, w) => sum + w.satisfactionScore, 0) / ratedWorkshops.length;
    }
  }
  next();
});

module.exports = mongoose.models.AwarenessProgram || mongoose.model('AwarenessProgram', awarenessProgramSchema);
