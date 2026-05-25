'use strict';

/**
 * BeneficiaryDietPrescription — Wave 368.
 *
 * "وصفة النظام الغذائي" — per-beneficiary CLINICAL diet prescription:
 * dysphagia level (IDDSI 0-4), texture restrictions, liquid consistency,
 * allergens to avoid, NPO orders, enteral feeding parameters, prescribed
 * by SLP/RD/MD.
 *
 * Distinct from `kitchen.model.js` which is the MENU CATALOG (what the
 * kitchen prepares) — this model is what the BENEFICIARY CAN EAT. Meal
 * events (`routes/beneficiary-meals.routes.js` W179) validate against
 * this prescription at serve-time.
 *
 * Mandatory for any beneficiary with dysphagia (cerebral palsy, post-
 * stroke, Down syndrome with feeding concerns, ASD with sensory feeding
 * issues), NPO orders, allergies, or tube feeding.
 *
 * IDDSI framework (International Dysphagia Diet Standardisation Initiative):
 *   Foods:    0=thin liquid, 3=liquidised, 4=pureed, 5=minced & moist,
 *             6=soft & bite-sized, 7=easy to chew / regular
 *   Drinks:   0=thin, 1=slightly thick, 2=mildly thick, 3=moderately thick,
 *             4=extremely thick
 *
 * Wave-18 invariants:
 *   • Either npo=true OR (foodIddsiLevel + drinkIddsiLevel set) — must
 *     have a coherent prescription
 *   • npo=true ⇒ no foodIddsiLevel + no drinkIddsiLevel + npoStartedAt
 *     required + npoReason required
 *   • enteralFeeding.active=true ⇒ enteralFeeding.{route, formulaName,
 *     ratePerHour} required
 *   • prescribedBy + prescribedAt + prescriberDiscipline required when
 *     status=active
 *   • status=active requires nextReviewDue (default 90d from prescribedAt)
 */

const mongoose = require('mongoose');

// IDDSI ranges
const FOOD_IDDSI = [0, 3, 4, 5, 6, 7]; // skipping 1+2 which are drinks-only
const DRINK_IDDSI = [0, 1, 2, 3, 4];

const ENTERAL_ROUTES = ['ng', 'og', 'gt', 'jt', 'gjt']; // naso/oro-gastric, gastrostomy, etc.
const ENTERAL_DELIVERY = ['bolus', 'continuous', 'intermittent', 'gravity'];

const PRESCRIBER_DISCIPLINES = [
  'speech_language_pathologist',
  'registered_dietitian',
  'physician',
  'gastroenterologist',
  'pediatrician',
];

const STATUSES = ['draft', 'active', 'on_hold', 'discontinued'];

// Allergens align with kitchen.model.js
const ALLERGENS = [
  'gluten',
  'dairy',
  'nuts',
  'eggs',
  'soy',
  'fish',
  'shellfish',
  'sesame',
  'other',
];

const EnteralFeedingSchema = new mongoose.Schema(
  {
    active: { type: Boolean, default: false },
    route: { type: String, enum: ENTERAL_ROUTES.concat([null]), default: null },
    deliveryMode: { type: String, enum: ENTERAL_DELIVERY.concat([null]), default: null },
    formulaName: { type: String, default: '', maxlength: 200 },
    ratePerHour: { type: Number, default: null, min: 0, max: 500 }, // ml/hr
    bolusVolumeMl: { type: Number, default: null, min: 0, max: 1000 },
    bolusFrequencyPerDay: { type: Number, default: null, min: 0, max: 24 },
    flushVolumeMl: { type: Number, default: null, min: 0, max: 500 },
    flushFrequency: { type: String, default: '', maxlength: 100 },
    additivesNotes: { type: String, default: '', maxlength: 500 },
    tubeInsertedAt: { type: Date, default: null },
  },
  { _id: false }
);

const BeneficiaryDietPrescriptionSchema = new mongoose.Schema(
  {
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
      unique: true, // one active prescription per beneficiary
      index: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      default: null,
      index: true,
    },

    // ── IDDSI prescription ───────────────────────────────────────
    foodIddsiLevel: { type: Number, enum: FOOD_IDDSI.concat([null]), default: null },
    drinkIddsiLevel: { type: Number, enum: DRINK_IDDSI.concat([null]), default: null },
    textureRestrictions: { type: [String], default: () => [] }, // soft, no-crumbs, no-hard, etc.
    chewingAbility: {
      type: String,
      enum: ['none', 'limited', 'partial', 'normal', null],
      default: null,
    },

    // ── NPO orders ───────────────────────────────────────────────
    npo: { type: Boolean, default: false }, // Nil Per Os
    npoReason: { type: String, default: '', maxlength: 500 },
    npoStartedAt: { type: Date, default: null },
    npoExpectedEndAt: { type: Date, default: null },

    // ── Allergens + restrictions ────────────────────────────────
    allergensToAvoid: { type: [String], default: () => [] }, // values from ALLERGENS
    dietaryRestrictions: { type: [String], default: () => [] }, // halal-only, no-pork, vegetarian
    foodPreferences: { type: [String], default: () => [] },

    // ── Caloric / nutritional targets ───────────────────────────
    targetCaloriesPerDay: { type: Number, default: null, min: 0, max: 10000 },
    targetProteinGramsPerDay: { type: Number, default: null, min: 0, max: 500 },
    fluidRestrictionMlPerDay: { type: Number, default: null, min: 0, max: 10000 },

    // ── Enteral / tube feeding ──────────────────────────────────
    enteralFeeding: { type: EnteralFeedingSchema, default: () => ({}) },

    // ── Behavioral feeding considerations ───────────────────────
    behavioralNotes: { type: String, default: '', maxlength: 1000 },
    feedingAssistanceLevel: {
      type: String,
      enum: ['independent', 'verbal_cues', 'partial_assist', 'full_assist', null],
      default: null,
    },
    positioningNotes: { type: String, default: '', maxlength: 500 },

    // ── Prescriber audit ────────────────────────────────────────
    prescribedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    prescribedByName: { type: String, default: '', maxlength: 100 },
    prescriberDiscipline: {
      type: String,
      enum: PRESCRIBER_DISCIPLINES.concat([null]),
      default: null,
    },
    prescribedAt: { type: Date, default: null },
    nextReviewDue: { type: Date, default: null, index: true },
    lastReviewedAt: { type: Date, default: null },

    // ── Lifecycle ───────────────────────────────────────────────
    status: { type: String, enum: STATUSES, default: 'draft', required: true, index: true },
    discontinuationReason: { type: String, default: '', maxlength: 500 },

    linkedCarePlanVersionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CarePlanVersion',
      default: null,
    },

    notes: { type: String, default: '', maxlength: 2000 },
  },
  { timestamps: true, collection: 'beneficiary_diet_prescriptions' }
);

BeneficiaryDietPrescriptionSchema.index({ branchId: 1, status: 1 });
BeneficiaryDietPrescriptionSchema.index({ nextReviewDue: 1, status: 1 });

BeneficiaryDietPrescriptionSchema.add({
  __invariants: { type: mongoose.Schema.Types.Mixed, select: false, default: null },
});

BeneficiaryDietPrescriptionSchema.path('__invariants').validate(function () {
  let ok = true;

  // Either NPO or IDDSI prescribed (can't be neither for an active record)
  if (this.status === 'active') {
    const hasIddsi = this.foodIddsiLevel != null || this.drinkIddsiLevel != null;
    const hasEnteral = this.enteralFeeding && this.enteralFeeding.active;
    if (!this.npo && !hasIddsi && !hasEnteral) {
      this.invalidate(
        'foodIddsiLevel',
        'active prescription must have NPO, IDDSI levels, or enteral feeding active'
      );
      ok = false;
    }
  }

  // NPO state integrity
  if (this.npo) {
    if (this.foodIddsiLevel != null || this.drinkIddsiLevel != null) {
      this.invalidate('foodIddsiLevel', 'IDDSI levels cannot be set when NPO=true');
      ok = false;
    }
    if (!this.npoStartedAt) {
      this.invalidate('npoStartedAt', 'npoStartedAt required when NPO=true');
      ok = false;
    }
    if (!String(this.npoReason || '').trim()) {
      this.invalidate('npoReason', 'npoReason required when NPO=true');
      ok = false;
    }
  }

  // Enteral feeding integrity
  if (this.enteralFeeding && this.enteralFeeding.active) {
    if (!this.enteralFeeding.route) {
      this.invalidate('enteralFeeding.route', 'route required when enteral feeding active');
      ok = false;
    }
    if (!String(this.enteralFeeding.formulaName || '').trim()) {
      this.invalidate(
        'enteralFeeding.formulaName',
        'formulaName required when enteral feeding active'
      );
      ok = false;
    }
    if (this.enteralFeeding.deliveryMode === 'continuous' && !this.enteralFeeding.ratePerHour) {
      this.invalidate('enteralFeeding.ratePerHour', 'ratePerHour required for continuous feeding');
      ok = false;
    }
  }

  // Prescriber audit when active
  if (this.status === 'active') {
    if (!this.prescribedBy && !String(this.prescribedByName || '').trim()) {
      this.invalidate('prescribedBy', 'prescriber required when active');
      ok = false;
    }
    if (!this.prescribedAt) {
      this.invalidate('prescribedAt', 'prescribedAt required when active');
      ok = false;
    }
    if (!this.prescriberDiscipline) {
      this.invalidate('prescriberDiscipline', 'prescriberDiscipline required when active');
      ok = false;
    }
    if (!this.nextReviewDue) {
      this.invalidate('nextReviewDue', 'nextReviewDue required when active');
      ok = false;
    }
  }

  // Allergens whitelist check
  if (Array.isArray(this.allergensToAvoid)) {
    for (const a of this.allergensToAvoid) {
      if (!ALLERGENS.includes(a)) {
        this.invalidate('allergensToAvoid', `unknown allergen: ${a}`);
        ok = false;
        break;
      }
    }
  }

  // Discontinued requires reason
  if (this.status === 'discontinued' && !String(this.discontinuationReason || '').trim()) {
    this.invalidate('discontinuationReason', 'discontinuationReason required');
    ok = false;
  }

  return ok;
});

BeneficiaryDietPrescriptionSchema.virtual('reviewOverdue').get(function () {
  return !!(
    this.status === 'active' &&
    this.nextReviewDue &&
    new Date(this.nextReviewDue) < new Date()
  );
});

BeneficiaryDietPrescriptionSchema.virtual('isEnteral').get(function () {
  return !!(this.enteralFeeding && this.enteralFeeding.active);
});

BeneficiaryDietPrescriptionSchema.set('toJSON', { virtuals: true });
BeneficiaryDietPrescriptionSchema.set('toObject', { virtuals: true });

module.exports =
  mongoose.models.BeneficiaryDietPrescription ||
  mongoose.model('BeneficiaryDietPrescription', BeneficiaryDietPrescriptionSchema);

module.exports.FOOD_IDDSI = FOOD_IDDSI;
module.exports.DRINK_IDDSI = DRINK_IDDSI;
module.exports.ENTERAL_ROUTES = ENTERAL_ROUTES;
module.exports.ENTERAL_DELIVERY = ENTERAL_DELIVERY;
module.exports.PRESCRIBER_DISCIPLINES = PRESCRIBER_DISCIPLINES;
module.exports.STATUSES = STATUSES;
module.exports.ALLERGENS = ALLERGENS;
