'use strict';
/**
 * Canonical BehaviorIncident — module: Behavior Management.
 *
 * One observed behavioural incident. Tracks ABC structure (Antecedent,
 * Behavior, Consequence) plus safety + intervention envelope.
 */

const { z, ObjectIdLike, IsoDateLoose, AuditEnvelope } = require('../_primitives');

const BehaviorSeverity = z.enum(['low', 'medium', 'high', 'critical']);

const InterventionLevel = z.enum([
  'verbal_redirect',
  'environmental_change',
  'planned_ignore',
  'sensory_break',
  'restraint_physical',
  'restraint_chemical',
  'seclusion',
  'other',
]);

const BehaviorIncident = z.object({
  _id: ObjectIdLike.optional(),

  beneficiaryId: ObjectIdLike,
  episodeId: ObjectIdLike.optional(),
  reportedBy: ObjectIdLike,

  occurredAt: IsoDateLoose,
  reportedAt: IsoDateLoose.optional(),

  // ABC structure — canonical taxonomy.
  antecedent: z.string().min(1),
  behavior: z.string().min(1),
  consequence: z.string().optional(),

  severity: BehaviorSeverity,
  durationMinutes: z.number().int().nonnegative().optional(),

  // Intervention used + safety flags.
  interventionLevel: InterventionLevel.optional(),
  restraintUsed: z.boolean().optional(),
  injuryOccurred: z.boolean().optional(),

  // Cross-module hooks.
  triggeredAlert: z.boolean().optional(),
  notifiedGuardian: z.boolean().optional(),

  ...AuditEnvelope.shape,
});

module.exports = {
  name: 'BehaviorIncident',
  modulePath: 'Behavior Management',
  mongooseModelName: 'BehaviorIncident',
  schema: BehaviorIncident,
};
