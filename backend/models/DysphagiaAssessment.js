'use strict';

/**
 * DysphagiaAssessment — W670.
 *
 * "تقييم البلع / عُسر البلع" — SLP-led swallowing-safety evaluation for
 * day-rehab beneficiaries with a neurological / developmental risk of
 * dysphagia (cerebral palsy GMFCS IV–V, Down syndrome, post-TBI, syndromic
 * presentations). Aspiration is a life-threatening risk, so the swallow
 * physiology — distinct from WHAT the kid eats — must be a first-class,
 * longitudinal clinical record.
 *
 * Why a dedicated model (not BeneficiaryDietPrescription, not ClinicalAssessment):
 *   • BeneficiaryDietPrescription captures the OUTPUT (texture/consistency to
 *     serve). This captures the swallow EXAM that justifies it — screening
 *     tool, aspiration/penetration risk, signs observed per consistency.
 *     A diet change must be evidence-based: link via `dietPrescriptionId`.
 *   • IDDSI is the international standard (food levels 3–7, drink levels 0–4);
 *     a generic assessment can't encode the per-consistency trial result.
 *   • Aspiration-risk + silent-aspiration flags drive an NPO (nil-by-mouth)
 *     operational decision and a referral — neither fits a generic score.
 *   • Longitudinal: re-assessment after thickener trial / botox / growth is
 *     the progress marker ("advanced from IDDSI-4 purée to IDDSI-5 minced").
 *
 * Wave-18 invariants:
 *   • screeningTool ∈ TOOLS ; recommendedIddsiFood ∈ IDDSI_FOOD (or '')
 *   • aspirationRisk ∈ RISK_LEVELS
 *   • npoRecommended=true → npoReason required
 *   • aspirationRisk='high' → slpReferral required (cannot leave high risk
 *     un-actioned)
 *   • silentAspirationSuspected=true → instrumentalAssessmentRecommended=true
 *     (silent aspiration can ONLY be confirmed instrumentally — VFSS/FEES)
 *   • status=finalized → assessedBy + assessedAt required
 *   • reassessmentDue (when set) must be ≥ date
 */

const mongoose = require('mongoose');

// Bedside / clinical swallow screening tools usable WITHOUT instrumentation.
const TOOLS = [
  'bedside_swallow_exam', // clinical bedside evaluation (CSE)
  'eat_10', // Eating Assessment Tool-10 (self/proxy report)
  'gusss', // Gugging Swallowing Screen
  'three_oz_water', // 3-oz water swallow test
  'dysphagia_disorder_survey', // DDS — for intellectual disability populations
  'observation_only', // mealtime observation, no formal tool
];

// IDDSI 2019 framework. Food: levels 3–7. Drinks: levels 0–4.
const IDDSI_FOOD = [
  'iddsi_3_liquidised',
  'iddsi_4_pureed',
  'iddsi_5_minced_moist',
  'iddsi_6_soft_bite_sized',
  'iddsi_7_regular',
  'iddsi_7_easy_chew',
];
const IDDSI_DRINK = [
  'iddsi_0_thin',
  'iddsi_1_slightly_thick',
  'iddsi_2_mildly_thick',
  'iddsi_3_moderately_thick',
  'iddsi_4_extremely_thick',
];

const RISK_LEVELS = ['none', 'low', 'moderate', 'high'];
const FEEDING_ROUTES = ['oral', 'oral_with_modifications', 'oral_plus_enteral', 'enteral_only'];
const POSITIONS = ['upright_90', 'semi_reclined', 'side_lying', 'supported_seating', 'other'];
const STATUSES = ['draft', 'finalized'];

// Clinical signs observed during a swallow trial (multi-select).
const SWALLOW_SIGNS = [
  'cough',
  'throat_clear',
  'wet_gurgly_voice',
  'multiple_swallows',
  'residue_in_mouth',
  'drooling',
  'nasal_regurgitation',
  'eyes_watering',
  'colour_change',
  'reduced_alertness',
  'refusal',
  'prolonged_meal_time',
];

const DysphagiaAssessmentSchema = new mongoose.Schema(
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
    // The diet prescription this swallow exam justifies / triggered.
    dietPrescriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BeneficiaryDietPrescription',
      default: null,
    },

    date: { type: Date, required: true, index: true },
    reason: { type: String, default: '', maxlength: 300 }, // intake screen / post-incident / routine

    screeningTool: { type: String, enum: TOOLS, required: true, index: true },

    // Per-consistency trial results: what was tried + what was observed.
    trials: {
      type: [
        new mongoose.Schema(
          {
            consistency: { type: String, default: '', maxlength: 60 }, // e.g. iddsi_4_pureed / thin liquid
            amount: { type: String, default: '', maxlength: 60 }, // teaspoon / sip / cup
            signs: {
              type: [String],
              default: () => [],
              validate: {
                validator: arr => arr.every(s => SWALLOW_SIGNS.includes(s)),
                message: 'invalid swallow sign',
              },
            },
            tolerated: { type: Boolean, default: true },
            note: { type: String, default: '', maxlength: 200 },
          },
          { _id: false }
        ),
      ],
      default: () => [],
    },

    // Risk ratings (the safety verdict).
    aspirationRisk: { type: String, enum: RISK_LEVELS, default: 'none', index: true },
    penetrationRisk: { type: String, enum: RISK_LEVELS, default: 'none' },
    silentAspirationSuspected: { type: Boolean, default: false },

    // Recommendation (the actionable output — mirrors into diet prescription).
    recommendedIddsiFood: { type: String, enum: IDDSI_FOOD.concat(['']), default: '' },
    recommendedIddsiDrink: { type: String, enum: IDDSI_DRINK.concat(['']), default: '' },
    feedingRoute: { type: String, enum: FEEDING_ROUTES, default: 'oral' },
    recommendedPosition: { type: String, enum: POSITIONS, default: 'upright_90' },
    pacingStrategies: { type: [String], default: () => [] }, // small bites, chin tuck, alternate solid/liquid…

    npoRecommended: { type: Boolean, default: false }, // nil-by-mouth pending instrumental
    npoReason: { type: String, default: '', maxlength: 300 },

    // Onward clinical action.
    slpReferral: { type: Boolean, default: false },
    instrumentalAssessmentRecommended: { type: Boolean, default: false }, // VFSS / FEES
    instrumentalType: { type: String, default: '', maxlength: 40 }, // 'VFSS' | 'FEES' | ''

    reassessmentDue: { type: Date, default: null },

    notes: { type: String, default: '', maxlength: 1000 },

    assessedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    assessedByName: { type: String, default: '', maxlength: 100 },
    assessedAt: { type: Date, default: null },

    status: { type: String, enum: STATUSES, default: 'draft', index: true },
  },
  { timestamps: true, collection: 'dysphagia_assessments' }
);

DysphagiaAssessmentSchema.index({ beneficiaryId: 1, date: -1 });
DysphagiaAssessmentSchema.index({ branchId: 1, date: -1 });
DysphagiaAssessmentSchema.index({ aspirationRisk: 1, date: -1 });
DysphagiaAssessmentSchema.index({ npoRecommended: 1, date: -1 });
DysphagiaAssessmentSchema.index({ status: 1, date: -1 });

DysphagiaAssessmentSchema.add({
  __invariants: { type: mongoose.Schema.Types.Mixed, select: false, default: null },
});

DysphagiaAssessmentSchema.path('__invariants').validate(function () {
  let ok = true;
  if (!TOOLS.includes(this.screeningTool)) {
    this.invalidate('screeningTool', `must be one of ${TOOLS.join(',')}`);
    ok = false;
  }
  if (!RISK_LEVELS.includes(this.aspirationRisk)) {
    this.invalidate('aspirationRisk', `must be one of ${RISK_LEVELS.join(',')}`);
    ok = false;
  }
  if (this.npoRecommended && !String(this.npoReason || '').trim()) {
    this.invalidate('npoReason', 'npoReason required when npoRecommended=true');
    ok = false;
  }
  // A high aspiration risk MUST be actioned — never silently shelved.
  if (this.aspirationRisk === 'high' && !this.slpReferral) {
    this.invalidate('slpReferral', 'slpReferral required when aspirationRisk=high');
    ok = false;
  }
  // Silent aspiration cannot be confirmed at bedside — force instrumental.
  if (this.silentAspirationSuspected && !this.instrumentalAssessmentRecommended) {
    this.invalidate(
      'instrumentalAssessmentRecommended',
      'instrumental assessment (VFSS/FEES) required when silent aspiration is suspected'
    );
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

/**
 * Operational helper — an unsafe-swallow flag for dashboards / alert rules:
 * high aspiration risk, suspected silent aspiration, or an active NPO order.
 * Surfaced as a virtual so consumers don't re-derive the rule.
 */
DysphagiaAssessmentSchema.virtual('isUnsafeSwallow').get(function () {
  return this.aspirationRisk === 'high' || this.silentAspirationSuspected || this.npoRecommended;
});

DysphagiaAssessmentSchema.set('toJSON', { virtuals: true });
DysphagiaAssessmentSchema.set('toObject', { virtuals: true });

// ─── W1065: unified-core linkage — dysphagia assessment finalized ───────────
// Milestone = the swallow assessment transitions to 'finalized'. Emits a
// timeline event so the beneficiary's swallow-safety record (and any unsafe
// verdict) is visible on the unified core. Non-callback hook style.
DysphagiaAssessmentSchema.pre('save', function flagDysphagiaFinalized() {
  this.$__dysphagiaFinalizedNow =
    this.status === 'finalized' && (this.isNew || this.isModified('status'));
});

DysphagiaAssessmentSchema.post('save', function emitDysphagiaAssessmentFinalized(doc) {
  if (!doc.$__dysphagiaFinalizedNow) return;
  try {
    const { integrationBus } = require('../integration/systemIntegrationBus');
    integrationBus.publish('dysphagia-assessment', 'dysphagia_assessment.finalized', {
      assessmentId: String(doc._id),
      beneficiaryId: doc.beneficiaryId ? String(doc.beneficiaryId) : undefined,
      ...(doc.branchId ? { branchId: String(doc.branchId) } : {}),
      screeningTool: doc.screeningTool,
      aspirationRisk: doc.aspirationRisk,
      npoRecommended: !!doc.npoRecommended,
      unsafe: !!doc.isUnsafeSwallow,
      recommendedIddsiFood: doc.recommendedIddsiFood || '',
      finalizedAt: doc.assessedAt || doc.updatedAt || new Date(),
    });
  } catch (err) {
    // best-effort; never block the save on an event-bus issue
    void err;
  }
});

module.exports =
  mongoose.models.DysphagiaAssessment ||
  mongoose.model('DysphagiaAssessment', DysphagiaAssessmentSchema);

module.exports.TOOLS = TOOLS;
module.exports.IDDSI_FOOD = IDDSI_FOOD;
module.exports.IDDSI_DRINK = IDDSI_DRINK;
module.exports.RISK_LEVELS = RISK_LEVELS;
module.exports.FEEDING_ROUTES = FEEDING_ROUTES;
module.exports.POSITIONS = POSITIONS;
module.exports.STATUSES = STATUSES;
module.exports.SWALLOW_SIGNS = SWALLOW_SIGNS;
