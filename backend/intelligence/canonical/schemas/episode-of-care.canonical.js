'use strict';
/**
 * Canonical EpisodeOfCare — module: Episodes of Care.
 *
 * The unifying clinical journey. Every assessment, plan, session, goal,
 * measure, report, and family interaction is anchored to ONE episode.
 */

const {
  z,
  ObjectIdLike,
  IsoDateLoose,
  EpisodeStatus,
  Priority,
  AuditEnvelope,
} = require('../_primitives');

const EpisodeType = z.enum([
  'initial',
  'continuation',
  'readmission',
  'intensive',
  'maintenance',
  'crisis',
  'tele_rehab',
  'home_based',
  'community',
]);

const EpisodeOfCare = z.object({
  _id: ObjectIdLike.optional(),
  episodeNumber: z.string().optional(),

  // ── Core link ────────────────────────────────────────────
  beneficiaryId: ObjectIdLike,

  // ── Episode classification ───────────────────────────────
  type: EpisodeType.optional(),
  status: EpisodeStatus,
  priority: Priority.optional(),

  // ── Timeline ─────────────────────────────────────────────
  startDate: IsoDateLoose,
  expectedEndDate: IsoDateLoose.optional(),
  actualEndDate: IsoDateLoose.optional(),

  // ── Phase (current) ──────────────────────────────────────
  currentPhase: z
    .enum([
      'referral',
      'intake',
      'triage',
      'initial_assessment',
      'mdt_review',
      'care_plan_approval',
      'active_treatment',
      'reassessment',
      'outcome_review',
      'discharge_planning',
      'discharge',
      'post_discharge_followup',
    ])
    .optional(),

  // ── Team lead (cardinal — others optional in extension) ──
  leadTherapistId: ObjectIdLike.optional(),

  // ── Audit ────────────────────────────────────────────────
  ...AuditEnvelope.shape,
});

module.exports = {
  name: 'EpisodeOfCare',
  modulePath: 'Episodes of Care',
  mongooseModelName: 'EpisodeOfCare',
  schema: EpisodeOfCare,
};
