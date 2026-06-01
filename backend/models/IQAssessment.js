'use strict';

/**
 * IQAssessment.js — W714 score-entry model for SB5 and Wechsler IQ assessments.
 *
 * Stores examiner-entered standard scores (FSIQ + primary indices),
 * classification bands, clinical interpretation, and episode linkage.
 * NO copyrighted items or conversion tables are stored.
 *
 * Workflow:
 *   1. Examiner (licensed psychologist) administers test on official kit
 *   2. Examiner enters final standard scores here (FSIQ + indices)
 *   3. System auto-computes classification band + severity tier
 *   4. Clinical supervisor reviews, adds recommendations
 *   5. Report generated (diagnosis-aid; does not replace formal report)
 */

const mongoose = require('mongoose');
// cbahi-standards.registry does not export CBAHI_COMPLIANCE_MARKERS; use inline constant.

const INSTRUMENT_TYPES = ['SB5', 'WECHSLER'];
const EDITIONS = ['WPPSI-IV', 'WISC-V', 'WAIS-IV', 'N/A']; // for SB5 only

const iqAssessmentSchema = new mongoose.Schema(
  {
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
    },
    episodeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Episode',
      required: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
    },

    // ── Assessment metadata ──
    instrumentType: {
      type: String,
      enum: INSTRUMENT_TYPES,
      required: true, // 'SB5' or 'WECHSLER'
    },
    edition: {
      type: String,
      enum: EDITIONS,
      default: 'N/A',
      required: true, // 'WAIS-IV' etc for Wechsler; 'N/A' for SB5
    },
    examinerName: {
      type: String,
      required: true,
    },
    examinerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    assessmentDate: {
      type: Date,
      required: true,
    },

    // ── Examiner-entered standard scores (ONLY these; no raw responses stored) ──
    fullScaleIQ: {
      type: Number,
      min: 40,
      max: 160,
      required: true,
    },

    // Primary factor indices (optional but encouraged for clinical depth)
    indices: {
      // SB5: fluidReasoning, knowledge, quantitative, visualSpatial, workingMemory
      // Wechsler: vci (verbal comprehension), vsi (visual spatial), fri (fluid reasoning),
      //           wmi (working memory), psi (processing speed)
      type: Map,
      of: {
        type: Number,
        min: 40,
        max: 160,
      },
      default: new Map(),
    },

    // ── Auto-computed classification (from registry.interpret()) ──
    classificationBand: {
      type: String,
      enum: [
        'very_superior',
        'superior',
        'high_average',
        'average',
        'low_average',
        'borderline',
        'extremely_low',
      ],
      required: true,
    },
    severityTier: {
      type: String,
      enum: ['L0', 'L1', 'L2', 'L4'],
      required: true,
    },
    label_ar: String,
    label_en: String,
    severity: {
      type: String,
      enum: ['normal', 'mild', 'severe', 'critical'],
      required: true,
    },

    // CBAHI compliance marker
    complianceMarker: {
      type: String,
      enum: ['PSY_IQ_ASSESSMENT_PSYCHOMETRY_005'],
      default: 'PSY_IQ_ASSESSMENT_PSYCHOMETRY_005',
    },

    // ── Clinical interpretation & recommendations ──
    clinicalInterpretation: {
      ar: String,
      en: String,
    },
    recommendations: {
      ar: String,
      en: String,
    },
    supervisorNotes: {
      ar: String,
      en: String,
    },
    supervisorId: mongoose.Schema.Types.ObjectId,
    supervisorReviewedAt: Date,

    // ── Audit trail ──
    createdBy: mongoose.Schema.Types.ObjectId,
    updatedBy: mongoose.Schema.Types.ObjectId,
  },
  {
    timestamps: true,
    collection: 'iq-assessments',
  }
);

// Ensure instrument + edition combination is valid
iqAssessmentSchema.path('edition').validate(function (v) {
  if (this.instrumentType === 'SB5') {
    return v === 'N/A'; // SB5 has only one edition
  }
  if (this.instrumentType === 'WECHSLER') {
    return ['WPPSI-IV', 'WISC-V', 'WAIS-IV'].includes(v);
  }
  return true;
}, 'Invalid edition for this instrument type');

// FSIQ < 70 → intellectual disability range; flag for urgent review
iqAssessmentSchema.path('fullScaleIQ').validate(function (v) {
  // No hard reject; just allow but flag in severe tier
  return true;
});

module.exports =
  mongoose.models.IQAssessment || mongoose.model('IQAssessment', iqAssessmentSchema);
