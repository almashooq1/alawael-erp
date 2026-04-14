'use strict';

const mongoose = require('mongoose');

const developmentalMilestoneSchema = new mongoose.Schema(
  {
    child: { type: mongoose.Schema.Types.ObjectId, ref: 'EarlyInterventionChild', required: true },

    domain: {
      type: String,
      enum: [
        'COGNITIVE',
        'COMMUNICATION',
        'GROSS_MOTOR',
        'FINE_MOTOR',
        'SOCIAL_EMOTIONAL',
        'ADAPTIVE',
        'SENSORY',
      ],
      required: true,
    },

    milestone: { type: String, required: true },
    milestoneAr: { type: String },
    expectedAgeMonths: { type: Number, required: true }, // typical age milestone is reached
    actualAgeMonths: { type: Number }, // when child actually reached it

    status: {
      type: String,
      enum: ['NOT_YET', 'EMERGING', 'ACHIEVED', 'SKIPPED', 'REGRESSED', 'NOT_APPLICABLE'],
      default: 'NOT_YET',
    },

    achievedDate: { type: Date },
    assessedDate: { type: Date },
    assessedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // ── Delay Calculation ──
    delayMonths: { type: Number }, // positive = delayed, negative = advanced
    isDelayed: { type: Boolean, default: false },
    delaySeverity: {
      type: String,
      enum: ['NONE', 'MILD', 'MODERATE', 'SEVERE', 'PROFOUND'],
      default: 'NONE',
    },

    supportNeeded: { type: String },
    strategies: [String],
    notes: { type: String },

    // ── Evidence ──
    evidence: [
      {
        type: { type: String, enum: ['OBSERVATION', 'PARENT_REPORT', 'ASSESSMENT', 'VIDEO'] },
        description: String,
        fileUrl: String,
        date: { type: Date, default: Date.now },
        recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      },
    ],

    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

developmentalMilestoneSchema.index({ child: 1, domain: 1 });
developmentalMilestoneSchema.index({ child: 1, expectedAgeMonths: 1 });
developmentalMilestoneSchema.index({ status: 1 });
developmentalMilestoneSchema.index({ isDelayed: 1 });

const DevelopmentalMilestone =
  mongoose.models.DevelopmentalMilestone ||
  mongoose.model('DevelopmentalMilestone', developmentalMilestoneSchema);

module.exports = DevelopmentalMilestone;
