'use strict';

/**
 * PhysiotherapyAssessment — W672.
 *
 * "تقييم العلاج الطبيعي" — objective PT measurement for day-rehab beneficiaries
 * (cerebral palsy, post-TBI, neuromuscular, post-ortho). The platform has
 * generic TherapySession logging + GAS goals, but no structured capture of the
 * PT clinical metrics that justify a programme and demonstrate progress for
 * accreditation / insurance: range of motion per joint, muscle tone (Modified
 * Ashworth), strength (MRC/Oxford), and gait.
 *
 * Why a dedicated model (not TherapySession, not generic OutcomeMeasure):
 *   • ROM is a per-joint × per-movement matrix (active + passive degrees) — an
 *     embedded measurement array, not a single score a session note can hold.
 *   • Modified Ashworth (0,1,1+,2,3,4) is the standard spasticity grade and is
 *     PT-specific; a generic assessment can't validate the value set.
 *   • Strength uses the MRC/Oxford 0–5 grade per muscle group.
 *   • Gait observation (assistive device, pattern, deviations, distance) drives
 *     the mobility goal and is the headline progress marker ("10m unaided").
 *   • Serial comparison (baseline → review) is the whole point — captured via
 *     `assessmentType` (initial/progress/discharge) so pre/post is queryable.
 *
 * Wave-18 invariants:
 *   • assessmentType ∈ ASSESSMENT_TYPES
 *   • every romMeasurements[].ashworth (when set) ∈ ASHWORTH_SCORES
 *   • every strength[].grade (when set) ∈ STRENGTH_GRADES
 *   • mobilityStatus ∈ MOBILITY_STATUS
 *   • gaitAssessed=true → gaitPattern required
 *   • assessmentType='discharge' → goalsSummary required (can't discharge with
 *     no outcome statement)
 *   • status=finalized → assessedBy + assessedAt required
 */

const mongoose = require('mongoose');

const ASSESSMENT_TYPES = ['initial', 'progress', 'discharge'];

// Modified Ashworth Scale — spasticity grading. '1+' is a real, distinct grade.
const ASHWORTH_SCORES = ['0', '1', '1+', '2', '3', '4'];

// MRC / Oxford manual muscle test grade.
const STRENGTH_GRADES = ['0', '1', '2', '3', '3+', '4', '4+', '5'];

const MOBILITY_STATUS = [
  'independent',
  'independent_with_aid',
  'supervision',
  'minimal_assist',
  'moderate_assist',
  'maximal_assist',
  'dependent',
  'non_ambulant',
];

const GAIT_PATTERNS = [
  'normal',
  'antalgic',
  'spastic_diplegic',
  'spastic_hemiplegic',
  'crouch',
  'toe_walking',
  'ataxic',
  'trendelenburg',
  'steppage',
  'other',
];

const ASSISTIVE_GAIT_DEVICES = [
  'none',
  'walker',
  'rollator',
  'crutches',
  'quad_cane',
  'cane',
  'afos',
  'kafos',
  'wheelchair',
  'other',
];

const STATUSES = ['draft', 'finalized'];

// A single joint ROM reading (active + passive degrees) + optional spasticity.
const RomMeasurementSchema = new mongoose.Schema(
  {
    joint: { type: String, default: '', maxlength: 40 }, // e.g. knee_R, elbow_L, ankle_R
    movement: { type: String, default: '', maxlength: 40 }, // flexion, extension, abduction…
    activeRomDeg: { type: Number, default: null, min: -30, max: 360 },
    passiveRomDeg: { type: Number, default: null, min: -30, max: 360 },
    ashworth: { type: String, default: '' }, // validated in __invariants against ASHWORTH_SCORES
    note: { type: String, default: '', maxlength: 120 },
  },
  { _id: false }
);

// A single muscle-group strength reading (MRC grade).
const StrengthMeasurementSchema = new mongoose.Schema(
  {
    muscleGroup: { type: String, default: '', maxlength: 40 },
    side: { type: String, default: '', maxlength: 10 }, // L / R / bilateral
    grade: { type: String, default: '' }, // validated against STRENGTH_GRADES
    note: { type: String, default: '', maxlength: 120 },
  },
  { _id: false }
);

const PhysiotherapyAssessmentSchema = new mongoose.Schema(
  {
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
      index: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      default: null,
      index: true,
    },
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BeneficiarySection',
      default: null,
    },
    carePlanVersionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CarePlanVersion',
      default: null,
    },

    date: { type: Date, required: true, index: true },
    assessmentType: { type: String, enum: ASSESSMENT_TYPES, default: 'initial', index: true },
    reason: { type: String, default: '', maxlength: 300 },

    // Clinical observation context.
    posturalObservation: { type: String, default: '', maxlength: 500 },
    toneSummary: { type: String, default: '', maxlength: 300 },

    romMeasurements: { type: [RomMeasurementSchema], default: () => [] },
    strength: { type: [StrengthMeasurementSchema], default: () => [] },

    // Balance / coordination quick flags.
    sittingBalance: { type: String, default: '', maxlength: 40 }, // none/poor/fair/good
    standingBalance: { type: String, default: '', maxlength: 40 },

    // Gait.
    mobilityStatus: { type: String, enum: MOBILITY_STATUS, default: 'non_ambulant', index: true },
    gaitAssessed: { type: Boolean, default: false },
    gaitPattern: { type: String, enum: GAIT_PATTERNS.concat(['']), default: '' },
    assistiveGaitDevice: { type: String, enum: ASSISTIVE_GAIT_DEVICES, default: 'none' },
    gaitDeviations: { type: [String], default: () => [] },
    walkingDistanceMeters: { type: Number, default: null, min: 0, max: 100000 },

    // Standardized PT outcome instruments (free key/value — GMFM-66, TUG, 6MWT…).
    standardizedScores: {
      type: [
        new mongoose.Schema(
          {
            instrument: { type: String, default: '', maxlength: 40 },
            score: { type: String, default: '', maxlength: 40 },
            note: { type: String, default: '', maxlength: 120 },
          },
          { _id: false }
        ),
      ],
      default: () => [],
    },

    goalsSummary: { type: String, default: '', maxlength: 1000 },
    recommendations: { type: String, default: '', maxlength: 1000 },
    homeProgramGiven: { type: Boolean, default: false },
    reassessmentDue: { type: Date, default: null },

    notes: { type: String, default: '', maxlength: 1000 },

    assessedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    assessedByName: { type: String, default: '', maxlength: 100 },
    assessedAt: { type: Date, default: null },

    status: { type: String, enum: STATUSES, default: 'draft', index: true },
  },
  { timestamps: true, collection: 'physiotherapy_assessments' }
);

PhysiotherapyAssessmentSchema.index({ beneficiaryId: 1, date: -1 });
PhysiotherapyAssessmentSchema.index({ branchId: 1, date: -1 });
PhysiotherapyAssessmentSchema.index({ assessmentType: 1, date: -1 });
PhysiotherapyAssessmentSchema.index({ status: 1, date: -1 });

PhysiotherapyAssessmentSchema.add({
  __invariants: { type: mongoose.Schema.Types.Mixed, select: false, default: null },
});

PhysiotherapyAssessmentSchema.path('__invariants').validate(function () {
  let ok = true;
  if (!ASSESSMENT_TYPES.includes(this.assessmentType)) {
    this.invalidate('assessmentType', `must be one of ${ASSESSMENT_TYPES.join(',')}`);
    ok = false;
  }
  if (!MOBILITY_STATUS.includes(this.mobilityStatus)) {
    this.invalidate('mobilityStatus', `must be one of ${MOBILITY_STATUS.join(',')}`);
    ok = false;
  }
  // Validate embedded clinical grade value-sets (empty = not measured = allowed).
  for (const m of this.romMeasurements || []) {
    if (m.ashworth && !ASHWORTH_SCORES.includes(m.ashworth)) {
      this.invalidate('romMeasurements', `ashworth must be one of ${ASHWORTH_SCORES.join(',')}`);
      ok = false;
      break;
    }
  }
  for (const s of this.strength || []) {
    if (s.grade && !STRENGTH_GRADES.includes(s.grade)) {
      this.invalidate('strength', `strength grade must be one of ${STRENGTH_GRADES.join(',')}`);
      ok = false;
      break;
    }
  }
  if (this.gaitAssessed && !String(this.gaitPattern || '').trim()) {
    this.invalidate('gaitPattern', 'gaitPattern required when gaitAssessed=true');
    ok = false;
  }
  // A discharge assessment must state the outcome — no silent discharge.
  if (this.assessmentType === 'discharge' && !String(this.goalsSummary || '').trim()) {
    this.invalidate('goalsSummary', 'goalsSummary required for a discharge assessment');
    ok = false;
  }
  if (this.reassessmentDue && this.date && this.reassessmentDue < this.date) {
    this.invalidate('reassessmentDue', 'reassessmentDue must be >= assessment date');
    ok = false;
  }
  if (this.status === 'finalized') {
    if (!this.assessedBy && !String(this.assessedByName || '').trim()) {
      this.invalidate('assessedBy', 'assessor required to finalize');
      ok = false;
    }
    if (!this.assessedAt) {
      this.invalidate('assessedAt', 'assessedAt required to finalize');
      ok = false;
    }
  }
  return ok;
});

/** Count of joints measured — quick completeness signal for dashboards. */
PhysiotherapyAssessmentSchema.virtual('jointsMeasured').get(function () {
  return Array.isArray(this.romMeasurements) ? this.romMeasurements.length : 0;
});

PhysiotherapyAssessmentSchema.set('toJSON', { virtuals: true });
PhysiotherapyAssessmentSchema.set('toObject', { virtuals: true });

// ── Unified-core linkage (W1047) — native pre-compile hooks (W954-safe).
// On the draft→finalized flip → physiotherapy_assessment timeline row.
PhysiotherapyAssessmentSchema.post('init', function () {
  this.$__prevStatus = this.status;
});
PhysiotherapyAssessmentSchema.post('save', function (doc) {
  try {
    if (doc.status !== 'finalized' || this.$__prevStatus === 'finalized') return;
    const { integrationBus } = require('../integration/systemIntegrationBus');
    if (!integrationBus || typeof integrationBus.publish !== 'function' || !doc.beneficiaryId) return;
    Promise.resolve(
      integrationBus.publish('clinical-assessment', 'physiotherapy.assessment_finalized', {
        physiotherapyAssessmentId: String(doc._id),
        beneficiaryId: String(doc.beneficiaryId),
        assessmentType: doc.assessmentType,
      })
    ).catch(() => {});
  } catch (_) {
    /* never block persistence */
  }
});

module.exports =
  mongoose.models.PhysiotherapyAssessment ||
  mongoose.model('PhysiotherapyAssessment', PhysiotherapyAssessmentSchema);

module.exports.ASSESSMENT_TYPES = ASSESSMENT_TYPES;
module.exports.ASHWORTH_SCORES = ASHWORTH_SCORES;
module.exports.STRENGTH_GRADES = STRENGTH_GRADES;
module.exports.MOBILITY_STATUS = MOBILITY_STATUS;
module.exports.GAIT_PATTERNS = GAIT_PATTERNS;
module.exports.ASSISTIVE_GAIT_DEVICES = ASSISTIVE_GAIT_DEVICES;
module.exports.STATUSES = STATUSES;
