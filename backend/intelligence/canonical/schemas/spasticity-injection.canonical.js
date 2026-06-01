'use strict';
/**
 * Canonical SpasticityInjection — module: Clinical Procedures.
 *
 * One spasticity tone-management injection procedure (botulinum/phenol/ITB)
 * with a per-muscle map + MAS + reassessment clock. See
 * `backend/models/SpasticityInjection.js` (W715).
 */

const { z, ObjectIdLike, IsoDateLoose, AuditEnvelope } = require('../_primitives');

const Agent = z.enum(['botulinum_toxin_a', 'botulinum_toxin_b', 'phenol', 'baclofen_itb', 'other']);
const Status = z.enum(['planned', 'completed', 'cancelled']);
const Side = z.enum(['left', 'right', 'midline']);
const MAS = z.enum(['0', '1', '1+', '2', '3', '4']);

const SpasticityInjection = z.object({
  _id: ObjectIdLike.optional(),

  beneficiaryId: ObjectIdLike,
  branchId: ObjectIdLike.optional(),
  carePlanVersionId: ObjectIdLike.optional(),
  physicianId: ObjectIdLike.optional(),

  agent: Agent,
  brandName: z.string().optional(),
  procedureDate: IsoDateLoose,
  totalDoseUnits: z.number().min(0).max(5000).optional(),

  targetedMuscles: z
    .array(
      z.object({
        muscle: z.string(),
        side: Side,
        doseUnits: z.number().min(0).max(1000).optional(),
        ashworthBefore: MAS.optional(),
      })
    )
    .optional(),
  goals: z.array(z.string()).optional(),

  consentObtained: z.boolean().optional(),
  followUpDueDate: IsoDateLoose.optional(),

  status: Status,
  cancelReason: z.string().optional(),

  ...AuditEnvelope.shape,
});

module.exports = {
  name: 'SpasticityInjection',
  modulePath: 'Clinical Procedures',
  mongooseModelName: 'SpasticityInjection',
  schema: SpasticityInjection,
};
