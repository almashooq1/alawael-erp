'use strict';

const mongoose = require('mongoose');

// ── Screening Tool Result (sub-schema used by DevelopmentalScreening) ──
const screeningToolResultSchema = new mongoose.Schema(
  {
    toolName: { type: String, required: true },
    toolNameAr: { type: String },
    toolType: {
      type: String,
      enum: [
        'ASQ_3',
        'ASQ_SE',
        'DENVER_II',
        'BAYLEY_III',
        'M_CHAT_R',
        'PEDS',
        'AGES_STAGES',
        'CDCL',
        'PALSI',
        'CUSTOM',
      ],
    },
    domain: {
      type: String,
      enum: [
        'COMMUNICATION',
        'GROSS_MOTOR',
        'FINE_MOTOR',
        'PROBLEM_SOLVING',
        'PERSONAL_SOCIAL',
        'COGNITIVE',
        'ADAPTIVE',
        'SOCIO_EMOTIONAL',
        'SENSORY',
        'ALL',
      ],
    },
    rawScore: { type: Number },
    standardScore: { type: Number },
    percentile: { type: Number, min: 0, max: 100 },
    ageEquivalent: { type: Number }, // months
    cutoffResult: {
      type: String,
      enum: ['ABOVE_CUTOFF', 'MONITORING_ZONE', 'BELOW_CUTOFF', 'AT_RISK', 'TYPICAL'],
    },
    notes: { type: String },
  },
  { _id: true }
);

const developmentalScreeningSchema = new mongoose.Schema(
  {
    screeningNumber: { type: String, unique: true },
    child: { type: mongoose.Schema.Types.ObjectId, ref: 'EarlyInterventionChild', required: true },

    // ── Screening Details ──
    screeningDate: { type: Date, required: true },
    childAgeMonths: { type: Number, required: true }, // Age at screening in months
    screeningType: {
      type: String,
      enum: ['INITIAL', 'FOLLOW_UP', 'PERIODIC', 'REFERRAL_BASED', 'RE_EVALUATION'],
      default: 'INITIAL',
    },

    // ── Results by Tool ──
    toolResults: [screeningToolResultSchema],

    // ── Overall Assessment ──
    overallResult: {
      type: String,
      enum: ['TYPICAL', 'AT_RISK', 'DELAYED', 'SIGNIFICANT_DELAY', 'INCONCLUSIVE'],
      required: true,
    },
    delayedDomains: [
      {
        type: String,
        enum: [
          'COMMUNICATION',
          'GROSS_MOTOR',
          'FINE_MOTOR',
          'PROBLEM_SOLVING',
          'PERSONAL_SOCIAL',
          'COGNITIVE',
          'ADAPTIVE',
          'SOCIO_EMOTIONAL',
          'SENSORY',
        ],
      },
    ],
    developmentalAge: { type: Number }, // months
    developmentalQuotient: { type: Number }, // DQ = (developmental age / chronological age) × 100

    // ── Recommendations ──
    recommendation: {
      type: String,
      enum: [
        'NO_ACTION',
        'RESCREEN',
        'MONITOR',
        'REFER_EVALUATION',
        'REFER_INTERVENTION',
        'IMMEDIATE_INTERVENTION',
      ],
    },
    rescreenDate: { type: Date },
    referralGenerated: { type: Boolean, default: false },
    referralId: { type: mongoose.Schema.Types.ObjectId, ref: 'EarlyReferral' },

    // ── Screener ──
    screener: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    screenerNotes: { type: String },
    parentConcerns: { type: String },
    parentConsentObtained: { type: Boolean, default: false },
    parentConsentDate: { type: Date },

    // ── Location ──
    screeningLocation: {
      type: String,
      enum: ['HOSPITAL', 'CLINIC', 'HOME', 'CENTER', 'COMMUNITY_EVENT', 'VIRTUAL'],
    },
    facilityName: { type: String },

    // ── Status ──
    status: {
      type: String,
      enum: ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NEEDS_FOLLOW_UP'],
      default: 'SCHEDULED',
    },

    attachments: [
      {
        name: String,
        fileUrl: String,
        uploadDate: { type: Date, default: Date.now },
      },
    ],

    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

developmentalScreeningSchema.pre('save', async function (next) {
  if (!this.screeningNumber) {
    const count = await mongoose.model('DevelopmentalScreening').countDocuments();
    this.screeningNumber = `SCR-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

developmentalScreeningSchema.index({ child: 1, screeningDate: -1 });
developmentalScreeningSchema.index({ overallResult: 1 });
developmentalScreeningSchema.index({ status: 1 });
developmentalScreeningSchema.index({ screener: 1 });
developmentalScreeningSchema.index({ organization: 1 });

const DevelopmentalScreening =
  mongoose.models.DevelopmentalScreening ||
  mongoose.model('DevelopmentalScreening', developmentalScreeningSchema);

module.exports = DevelopmentalScreening;
