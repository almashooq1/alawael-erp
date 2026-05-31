'use strict';
/**
 * Canonical DttSession — module: Therapy Sessions.
 *
 * One ABA discrete-trial training session with trial-by-trial data. See
 * `backend/models/DttSession.js` (W689).
 */

const { z, ObjectIdLike, IsoDateLoose, AuditEnvelope } = require('../_primitives');

const ProgramArea = z.enum([
  'communication',
  'social',
  'motor',
  'academic',
  'self_help',
  'play',
  'behavior_reduction',
]);
const Status = z.enum(['scheduled', 'completed', 'cancelled', 'no_show']);
const PromptLevel = z.enum([
  'full_physical',
  'partial_physical',
  'modeling',
  'gestural',
  'verbal',
  'independent',
]);
const Response = z.enum(['correct', 'incorrect', 'no_response']);

const DttSession = z.object({
  _id: ObjectIdLike.optional(),

  beneficiaryId: ObjectIdLike,
  branchId: ObjectIdLike.optional(),
  carePlanVersionId: ObjectIdLike.optional(),
  therapistId: ObjectIdLike.optional(),

  sessionDate: IsoDateLoose,
  durationMinutes: z.number().int().min(0).max(480).optional(),
  programArea: ProgramArea,

  targets: z
    .array(
      z.object({
        targetName: z.string(),
        curriculumRef: z.string().optional(),
        masteryCriterionPct: z.number().min(0).max(100).optional(),
        masteryAchieved: z.boolean().optional(),
        trials: z.array(z.object({ promptLevel: PromptLevel, response: Response })).optional(),
      })
    )
    .optional(),

  status: Status,
  cancelReason: z.string().optional(),

  ...AuditEnvelope.shape,
});

module.exports = {
  name: 'DttSession',
  modulePath: 'Therapy Sessions',
  mongooseModelName: 'DttSession',
  schema: DttSession,
};
