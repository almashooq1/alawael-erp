/* eslint-disable no-unused-vars */
/**
 * CivilPartnership Model — نموذج الشراكات مع منظمات المجتمع المدني
 *
 * Tracks partnerships with NGOs, civil society organizations, government bodies,
 * and private sector entities for community integration programs.
 */
const mongoose = require('mongoose');

const contactPersonSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    title: String,
    email: String,
    phone: String,
    isPrimary: { type: Boolean, default: false },
  },
  { _id: false }
);

const agreementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    signedDate: Date,
    expiryDate: Date,
    documentUrl: String,
    terms: String,
    status: {
      type: String,
      enum: ['draft', 'active', 'expired', 'terminated', 'renewed'],
      default: 'draft',
    },
  },
  { _id: true }
);

const civilPartnershipSchema = new mongoose.Schema(
  {
    // ─── Organization Details ──────────────────────────────────────────
    organizationName: {
      type: String,
      required: [true, 'اسم المنظمة مطلوب'],
      trim: true,
      index: true,
    },
    organizationNameAr: {
      type: String,
      trim: true,
    },
    organizationType: {
      type: String,
      enum: [
        'ngo',
        'government',
        'private_sector',
        'academic',
        'international',
        'charity',
        'cooperative',
        'professional_association',
        'community_based',
      ],
      required: [true, 'نوع المنظمة مطلوب'],
      index: true,
    },
    registrationNumber: {
      type: String,
      unique: true,
      sparse: true,
    },
    description: String,
    descriptionAr: String,
    website: String,
    logo: String,

    // ─── Contact Information ───────────────────────────────────────────
    contactPersons: [contactPersonSchema],
    address: {
      street: String,
      city: String,
      region: String,
      postalCode: String,
      country: { type: String, default: 'SA' },
    },
    email: String,
    phone: String,

    // ─── Partnership Details ───────────────────────────────────────────
    partnershipType: {
      type: String,
      enum: ['strategic', 'operational', 'financial', 'technical', 'educational', 'research'],
      required: true,
    },
    partnershipScope: [
      {
        type: String,
        enum: [
          'sports_programs',
          'cultural_activities',
          'vocational_training',
          'awareness_campaigns',
          'disability_rights',
          'accessibility_consulting',
          'employment_support',
          'healthcare',
          'education',
          'technology',
          'transportation',
          'housing',
        ],
      },
    ],
    startDate: { type: Date, required: true },
    endDate: Date,
    isOngoing: { type: Boolean, default: false },

    // ─── Agreements & Documents ────────────────────────────────────────
    agreements: [agreementSchema],
    memorandumOfUnderstanding: {
      documentUrl: String,
      signedDate: Date,
      expiryDate: Date,
    },

    // ─── Financial ─────────────────────────────────────────────────────
    financialContribution: {
      type: { type: String, enum: ['monetary', 'in-kind', 'both', 'none'], default: 'none' },
      annualAmount: { type: Number, default: 0 },
      currency: { type: String, default: 'SAR' },
      description: String,
    },

    // ─── Activities & Programs ─────────────────────────────────────────
    linkedActivities: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CommunityActivity',
      },
    ],
    linkedAwarenessPrograms: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AwarenessProgram',
      },
    ],
    jointPrograms: [
      {
        name: String,
        description: String,
        startDate: Date,
        endDate: Date,
        status: {
          type: String,
          enum: ['planned', 'active', 'completed', 'cancelled'],
          default: 'planned',
        },
        beneficiariesServed: { type: Number, default: 0 },
      },
    ],

    // ─── Evaluation & Performance ──────────────────────────────────────
    performanceScore: { type: Number, min: 0, max: 100, default: 0 },
    lastEvaluationDate: Date,
    evaluationNotes: String,
    keyAchievements: [String],
    challenges: [String],

    // ─── Status ────────────────────────────────────────────────────────
    status: {
      type: String,
      enum: ['prospective', 'active', 'inactive', 'suspended', 'terminated', 'renewed'],
      default: 'prospective',
      index: true,
    },
    statusReason: String,

    // ─── Audit ─────────────────────────────────────────────────────────
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    tags: [String],
  },
  {
    timestamps: true,
  }
);

// ─── Indexes ─────────────────────────────────────────────────────────────────
civilPartnershipSchema.index({ organizationType: 1, status: 1 });
civilPartnershipSchema.index({ partnershipType: 1, status: 1 });
civilPartnershipSchema.index({ startDate: 1, endDate: 1 });
civilPartnershipSchema.index({ 'address.city': 1 });
civilPartnershipSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.models.CivilPartnership || mongoose.model('CivilPartnership', civilPartnershipSchema);
