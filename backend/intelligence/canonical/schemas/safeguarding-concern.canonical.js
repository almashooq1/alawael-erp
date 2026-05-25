'use strict';
/**
 * Canonical SafeguardingConcern — module: Safeguarding.
 *
 * Abuse/neglect intake-to-closure ledger. CBAHI + Saudi child-protection
 * mandatory. See `backend/models/SafeguardingConcern.js` (W357).
 */

const { z, ObjectIdLike, IsoDateLoose, AuditEnvelope } = require('../_primitives');

const ConcernCategory = z.enum([
  'physical',
  'sexual',
  'emotional',
  'neglect',
  'financial',
  'online',
  'other',
]);

const ConcernSeverity = z.enum(['low', 'medium', 'high', 'critical']);

const ConcernStatus = z.enum([
  'reported',
  'triaged',
  'investigating',
  'substantiated',
  'unsubstantiated',
  'escalated_to_authority',
  'closed',
]);

const SubjectKind = z.enum(['beneficiary', 'staff', 'other']);
const Outcome = z.enum(['substantiated', 'unsubstantiated', 'inconclusive']);

const SafeguardingConcern = z.object({
  _id: ObjectIdLike.optional(),

  subjectKind: SubjectKind,
  subjectBeneficiaryId: ObjectIdLike.optional(),
  branchId: ObjectIdLike.optional(),

  reportedBy: ObjectIdLike,
  reportedAt: IsoDateLoose,

  category: ConcernCategory,
  severity: ConcernSeverity,
  description: z.string().min(1),

  triagedAt: IsoDateLoose.optional(),
  investigatorId: ObjectIdLike.optional(),
  investigationStartedAt: IsoDateLoose.optional(),

  outcome: Outcome.optional(),
  outcomeAt: IsoDateLoose.optional(),
  actionPlan: z.string().optional(),

  authorityReported: z.boolean().optional(),
  authorityName: z.string().optional(),
  authorityReportedAt: IsoDateLoose.optional(),

  supervisorNotifiedAt: IsoDateLoose.optional(),

  status: ConcernStatus,
  closedBy: ObjectIdLike.optional(),
  closedAt: IsoDateLoose.optional(),
  linkedIncidentId: ObjectIdLike.optional(),

  confidentiality: z.enum(['restricted', 'standard']).optional(),

  ...AuditEnvelope.shape,
});

module.exports = {
  name: 'SafeguardingConcern',
  modulePath: 'Safeguarding',
  mongooseModelName: 'SafeguardingConcern',
  schema: SafeguardingConcern,
};
