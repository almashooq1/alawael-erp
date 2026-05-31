'use strict';
/**
 * Canonical SensoryDietProgram — module: Therapy Programs.
 *
 * A scheduled sensory-diet plan + Snoezelen session log. See
 * `backend/models/SensoryDietProgram.js` (W691).
 */

const { z, ObjectIdLike, IsoDateLoose, AuditEnvelope } = require('../_primitives');

const Status = z.enum(['active', 'on_hold', 'completed', 'discontinued']);
const SensorySystem = z.enum([
  'proprioceptive',
  'vestibular',
  'tactile',
  'visual',
  'auditory',
  'oral',
  'interoceptive',
]);
const Purpose = z.enum(['alerting', 'calming', 'organizing']);
const RegulationOutcome = z.enum(['regulated', 'partially_regulated', 'no_change', 'escalated']);

const SensoryDietProgram = z.object({
  _id: ObjectIdLike.optional(),

  beneficiaryId: ObjectIdLike,
  branchId: ObjectIdLike.optional(),
  carePlanVersionId: ObjectIdLike.optional(),
  therapistId: ObjectIdLike.optional(),

  status: Status,
  startDate: IsoDateLoose.optional(),
  reviewDate: IsoDateLoose.optional(),

  goals: z.array(z.string()).optional(),
  activities: z
    .array(
      z.object({
        name: z.string(),
        sensorySystem: SensorySystem,
        purpose: Purpose,
        frequency: z.string().optional(),
        durationMinutes: z.number().min(0).max(240).optional(),
      })
    )
    .optional(),
  snoezelenSessions: z
    .array(
      z.object({
        date: IsoDateLoose,
        regulationOutcome: RegulationOutcome,
        stimuliUsed: z.array(z.string()).optional(),
      })
    )
    .optional(),

  discontinueReason: z.string().optional(),

  ...AuditEnvelope.shape,
});

module.exports = {
  name: 'SensoryDietProgram',
  modulePath: 'Therapy Programs',
  mongooseModelName: 'SensoryDietProgram',
  schema: SensoryDietProgram,
};
