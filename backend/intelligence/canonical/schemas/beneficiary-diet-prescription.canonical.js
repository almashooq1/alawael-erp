'use strict';
/**
 * Canonical BeneficiaryDietPrescription — module: Clinical Diet Orders.
 *
 * Per-beneficiary IDDSI dysphagia prescription + NPO + enteral feeding +
 * allergens. See `backend/models/BeneficiaryDietPrescription.js` (W368).
 */

const { z, ObjectIdLike, IsoDateLoose, AuditEnvelope } = require('../_primitives');

const FoodIddsi = z.union([
  z.literal(0),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
  z.literal(7),
]);
const DrinkIddsi = z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3), z.literal(4)]);

const PrescriberDiscipline = z.enum([
  'speech_language_pathologist',
  'registered_dietitian',
  'physician',
  'gastroenterologist',
  'pediatrician',
]);

const RxStatus = z.enum(['draft', 'active', 'on_hold', 'discontinued']);

const EnteralRoute = z.enum(['ng', 'og', 'gt', 'jt', 'gjt']);
const EnteralDelivery = z.enum(['bolus', 'continuous', 'intermittent', 'gravity']);

const Allergen = z.enum([
  'gluten',
  'dairy',
  'nuts',
  'eggs',
  'soy',
  'fish',
  'shellfish',
  'sesame',
  'other',
]);

const EnteralFeeding = z.object({
  active: z.boolean(),
  route: EnteralRoute.optional(),
  deliveryMode: EnteralDelivery.optional(),
  formulaName: z.string().optional(),
  ratePerHour: z.number().nonnegative().optional(),
  bolusVolumeMl: z.number().nonnegative().optional(),
  bolusFrequencyPerDay: z.number().nonnegative().optional(),
  flushVolumeMl: z.number().nonnegative().optional(),
  flushFrequency: z.string().optional(),
});

const BeneficiaryDietPrescription = z.object({
  _id: ObjectIdLike.optional(),

  beneficiaryId: ObjectIdLike,
  branchId: ObjectIdLike.optional(),

  // IDDSI
  foodIddsiLevel: FoodIddsi.optional(),
  drinkIddsiLevel: DrinkIddsi.optional(),
  textureRestrictions: z.array(z.string()).optional(),
  chewingAbility: z.enum(['none', 'limited', 'partial', 'normal']).optional(),

  // NPO
  npo: z.boolean().optional(),
  npoReason: z.string().optional(),
  npoStartedAt: IsoDateLoose.optional(),
  npoExpectedEndAt: IsoDateLoose.optional(),

  // Allergens + restrictions
  allergensToAvoid: z.array(Allergen).optional(),
  dietaryRestrictions: z.array(z.string()).optional(),
  foodPreferences: z.array(z.string()).optional(),

  // Caloric targets
  targetCaloriesPerDay: z.number().nonnegative().optional(),
  targetProteinGramsPerDay: z.number().nonnegative().optional(),
  fluidRestrictionMlPerDay: z.number().nonnegative().optional(),

  // Enteral
  enteralFeeding: EnteralFeeding.optional(),

  // Feeding assistance
  feedingAssistanceLevel: z
    .enum(['independent', 'verbal_cues', 'partial_assist', 'full_assist'])
    .optional(),
  positioningNotes: z.string().optional(),

  // Prescriber audit
  prescribedBy: ObjectIdLike.optional(),
  prescriberDiscipline: PrescriberDiscipline.optional(),
  prescribedAt: IsoDateLoose.optional(),
  nextReviewDue: IsoDateLoose.optional(),

  status: RxStatus,
  discontinuationReason: z.string().optional(),

  linkedCarePlanVersionId: ObjectIdLike.optional(),

  ...AuditEnvelope.shape,
});

module.exports = {
  name: 'BeneficiaryDietPrescription',
  modulePath: 'Clinical Diet Orders',
  mongooseModelName: 'BeneficiaryDietPrescription',
  schema: BeneficiaryDietPrescription,
};
