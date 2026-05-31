'use strict';
/**
 * Canonical AdjunctTherapySession — module: Therapy Sessions.
 *
 * One adjunct therapy session (hydrotherapy/hippotherapy/animal-assisted)
 * with a medical-clearance gate. See
 * `backend/models/AdjunctTherapySession.js` (W693).
 */

const { z, ObjectIdLike, IsoDateLoose, AuditEnvelope } = require('../_primitives');

const Modality = z.enum(['hydrotherapy', 'hippotherapy', 'animal_assisted']);
const Status = z.enum(['scheduled', 'completed', 'cancelled', 'no_show']);
const Readiness = z.enum(['not_assessed', 'emerging', 'ready']);
const Response = z.enum(['positive', 'neutral', 'distressed', 'refused']);
const AnimalType = z.enum(['horse', 'dog', 'other', 'none']);

const AdjunctTherapySession = z.object({
  _id: ObjectIdLike.optional(),

  beneficiaryId: ObjectIdLike,
  branchId: ObjectIdLike.optional(),
  carePlanVersionId: ObjectIdLike.optional(),
  therapistId: ObjectIdLike.optional(),

  modality: Modality,
  sessionDate: IsoDateLoose,
  durationMinutes: z.number().int().min(0).max(240).optional(),

  medicalCleared: z.boolean().optional(),
  clearedDate: IsoDateLoose.optional(),
  contraindications: z.string().optional(),
  readinessLevel: Readiness.optional(),

  activities: z.array(z.string()).optional(),
  skillsTargeted: z.array(z.string()).optional(),
  beneficiaryResponse: Response.optional(),

  animalType: AnimalType.optional(),
  waterTemperatureC: z.number().min(20).max(42).optional(),

  incidentDuringSession: z.boolean().optional(),

  status: Status,
  cancelReason: z.string().optional(),

  ...AuditEnvelope.shape,
});

module.exports = {
  name: 'AdjunctTherapySession',
  modulePath: 'Therapy Sessions',
  mongooseModelName: 'AdjunctTherapySession',
  schema: AdjunctTherapySession,
};
