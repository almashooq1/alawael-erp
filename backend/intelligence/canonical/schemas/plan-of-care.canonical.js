'use strict';
/**
 * Canonical PlanOfCare — module: Plans of Care.
 *
 * The structured therapeutic plan for one episode: goals, frequency,
 * approvals. The detailed goal entities live in `Goal` (separate model);
 * here we describe the plan envelope.
 */

const { z, ObjectIdLike, IsoDateLoose, AuditEnvelope } = require('../_primitives');

const PlanStatus = z.enum([
  'draft',
  'pending_review',
  'pending_approval',
  'active',
  'on_hold',
  'completed',
  'cancelled',
  'superseded',
]);

const PlanOfCare = z.object({
  _id: ObjectIdLike.optional(),

  beneficiaryId: ObjectIdLike,
  episodeId: ObjectIdLike,

  version: z.number().int().positive().optional(),
  status: PlanStatus,

  startDate: IsoDateLoose,
  expectedEndDate: IsoDateLoose.optional(),

  // Frequency rule (canonical: weekly sessions; details in extension).
  sessionsPerWeek: z.number().int().positive().optional(),

  approvedBy: ObjectIdLike.optional(),
  approvedAt: IsoDateLoose.optional(),

  // High-level reason for plan change (drives reason-codes governance).
  changeReason: z.string().optional(),

  ...AuditEnvelope.shape,
});

module.exports = {
  name: 'PlanOfCare',
  modulePath: 'Plans of Care',
  mongooseModelName: 'CarePlan',
  schema: PlanOfCare,
  mongooseFieldMap: {
    // legacy CarePlan may name `episodeId` differently
  },
};
