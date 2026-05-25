'use strict';
/**
 * Canonical SeizureEvent — module: Clinical Safety Events.
 *
 * One observed seizure (or suspected seizure) episode. ILAE 2017
 * simplified classification + status-epilepticus surfacing. See
 * `backend/models/SeizureEvent.js` (W356) for the persistence model.
 */

const { z, ObjectIdLike, IsoDateLoose, AuditEnvelope } = require('../_primitives');

const SeizureType = z.enum([
  'tonic_clonic',
  'absence',
  'focal_aware',
  'focal_impaired',
  'myoclonic',
  'atonic',
  'tonic',
  'unknown',
]);

const ConsciousnessLevel = z.enum(['aware', 'impaired', 'lost']);
const SeizureSeverity = z.enum(['mild', 'moderate', 'severe']);
const SeizureStatus = z.enum(['recorded', 'reviewed']);

const SeizureEvent = z.object({
  _id: ObjectIdLike.optional(),

  beneficiaryId: ObjectIdLike,
  branchId: ObjectIdLike.optional(),
  carePlanVersionId: ObjectIdLike.optional(),

  date: IsoDateLoose,
  startTime: IsoDateLoose,
  endTime: IsoDateLoose.optional(),
  durationSeconds: z.number().int().nonnegative().max(7200).optional(),

  type: SeizureType,
  severity: SeizureSeverity.optional(),
  consciousness: ConsciousnessLevel.optional(),

  injury: z.boolean().optional(),
  ambulanceCalled: z.boolean().optional(),

  // Rescue medication cross-link
  rescueMedicationGivenName: z.string().optional(),
  rescueMedicationMarId: ObjectIdLike.optional(),

  witnessedBy: ObjectIdLike.optional(),
  parentNotifiedAt: IsoDateLoose.optional(),

  status: SeizureStatus,
  reviewedBy: ObjectIdLike.optional(),
  reviewedAt: IsoDateLoose.optional(),

  ...AuditEnvelope.shape,
});

module.exports = {
  name: 'SeizureEvent',
  modulePath: 'Clinical Safety Events',
  mongooseModelName: 'SeizureEvent',
  schema: SeizureEvent,
};
