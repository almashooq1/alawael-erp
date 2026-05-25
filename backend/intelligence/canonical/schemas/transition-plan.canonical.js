'use strict';
/**
 * Canonical TransitionPlan — module: Life-Stage Transitions.
 *
 * Multi-cycle bridge plan between life stages (early-intervention →
 * school → vocational → independent). See
 * `backend/models/TransitionPlan.js` (W361).
 */

const { z, ObjectIdLike, IsoDateLoose, AuditEnvelope } = require('../_primitives');

const TransitionType = z.enum([
  'early_to_school',
  'school_to_secondary',
  'school_to_work',
  'rehab_to_community',
  'dependent_to_independent',
]);

const TransitionStatus = z.enum([
  'draft',
  'readiness_assessed',
  'in_progress',
  'completed',
  'paused',
  'cancelled',
]);

const TransitionDomain = z.enum([
  'self_care',
  'communication',
  'social',
  'cognitive',
  'vocational',
  'life_skills',
]);

const MilestoneStatus = z.enum(['pending', 'in_progress', 'achieved', 'missed', 'cancelled']);

const DomainScore = z.object({
  domain: TransitionDomain,
  score: z.number().int().min(1).max(5),
});

const Milestone = z.object({
  title: z.string().min(1),
  domain: TransitionDomain.optional(),
  dueDate: IsoDateLoose,
  achievedAt: IsoDateLoose.optional(),
  status: MilestoneStatus,
});

const TransitionPlan = z.object({
  _id: ObjectIdLike.optional(),

  beneficiaryId: ObjectIdLike,
  branchId: ObjectIdLike.optional(),

  transitionType: TransitionType,
  status: TransitionStatus,

  currentAgeMonths: z.number().int().nonnegative().optional(),
  currentPlacement: z.string().optional(),
  targetPlacement: z.string().optional(),
  plannedTransitionDate: IsoDateLoose.optional(),
  actualTransitionDate: IsoDateLoose.optional(),

  domainScores: z.array(DomainScore).optional(),
  compositeReadinessScore: z.number().min(1).max(5).optional(),
  readinessAssessedAt: IsoDateLoose.optional(),

  milestones: z.array(Milestone).optional(),

  linkedCarePlanVersionId: ObjectIdLike.optional(),
  linkedIepId: ObjectIdLike.optional(),

  transitionLeadId: ObjectIdLike.optional(),

  ...AuditEnvelope.shape,
});

module.exports = {
  name: 'TransitionPlan',
  modulePath: 'Life-Stage Transitions',
  mongooseModelName: 'TransitionPlan',
  schema: TransitionPlan,
};
