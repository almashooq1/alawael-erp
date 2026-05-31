'use strict';
/**
 * Canonical ProstheticOrthoticOrder — module: Clinical Devices.
 *
 * One prosthetics/orthotics/seating fabrication-and-fitting order for a
 * beneficiary. Tracks the clinical lifecycle (prescribe → measure →
 * fabricate → fit → deliver → follow-up), distinct from the
 * AssistiveDevice loan/maintenance asset record. See
 * `backend/models/ProstheticOrthoticOrder.js` (W680).
 */

const { z, ObjectIdLike, IsoDateLoose, AuditEnvelope } = require('../_primitives');

const DeviceCategory = z.enum([
  'afo',
  'kafo',
  'spinal_orthosis',
  'upper_limb_orthosis',
  'cranial_orthosis',
  'foot_orthosis',
  'lower_limb_prosthesis',
  'upper_limb_prosthesis',
  'wheelchair_seating',
  'standing_frame',
  'other',
]);

const Stage = z.enum([
  'prescribed',
  'measured',
  'fabrication',
  'fitting',
  'delivered',
  'follow_up',
  'completed',
  'cancelled',
]);

const Laterality = z.enum(['left', 'right', 'bilateral', 'not_applicable']);
const FabricationType = z.enum(['in_house', 'outsourced']);
const FitOutcome = z.enum(['good_fit', 'adjustment_needed', 'refabricate']);

const ProstheticOrthoticOrder = z.object({
  _id: ObjectIdLike.optional(),

  beneficiaryId: ObjectIdLike,
  branchId: ObjectIdLike.optional(),
  carePlanVersionId: ObjectIdLike.optional(),

  deviceCategory: DeviceCategory,
  laterality: Laterality.optional(),
  diagnosis: z.string().optional(),
  clinicalGoal: z.string().optional(),

  prescribedBy: ObjectIdLike.optional(),
  prescribedDate: IsoDateLoose,
  stage: Stage,

  measurementDate: IsoDateLoose.optional(),
  castingRequired: z.boolean().optional(),
  castingDate: IsoDateLoose.optional(),

  fabricationType: FabricationType.optional(),
  vendorName: z.string().optional(),
  estimatedCost: z.number().nonnegative().optional(),

  fittingDate: IsoDateLoose.optional(),
  fitOutcome: FitOutcome.optional(),
  comfortScore: z.number().min(0).max(10).optional(),

  posturalAssessment: z.string().optional(),
  pressureMappingDone: z.boolean().optional(),

  deliveredDate: IsoDateLoose.optional(),
  deliveredDeviceId: ObjectIdLike.optional(),
  followUpDueDate: IsoDateLoose.optional(),

  completedDate: IsoDateLoose.optional(),
  cancelReason: z.string().optional(),

  ...AuditEnvelope.shape,
});

module.exports = {
  name: 'ProstheticOrthoticOrder',
  modulePath: 'Clinical Devices',
  mongooseModelName: 'ProstheticOrthoticOrder',
  schema: ProstheticOrthoticOrder,
};
