'use strict';
/**
 * Canonical Assessment — module: Assessments.
 *
 * One scored evaluation event. Bound to a beneficiary, optionally to an
 * episode and a measure (instrument).
 */

const { z, ObjectIdLike, IsoDateLoose, AuditEnvelope } = require('../_primitives');

const AssessmentType = z.enum([
  'initial',
  'periodic',
  'final',
  'behavioral',
  'academic',
  'medical',
  'screening',
  'diagnostic',
  'reassessment',
]);

const AssessmentStatus = z.enum([
  'draft',
  'in_progress',
  'submitted',
  'reviewed',
  'approved',
  'cancelled',
]);

const Assessment = z.object({
  _id: ObjectIdLike.optional(),

  beneficiaryId: ObjectIdLike,
  episodeId: ObjectIdLike.optional(),
  measureId: ObjectIdLike.optional(),

  type: AssessmentType,
  status: AssessmentStatus.optional(),

  conductedAt: IsoDateLoose,
  conductedBy: ObjectIdLike.optional(),

  // Raw / scored values. Detailed item-level data lives in extension.
  score: z.number().optional(),
  maxScore: z.number().optional(),
  scoreInterpretation: z.string().optional(),

  notes: z.string().optional(),

  ...AuditEnvelope.shape,
});

module.exports = {
  name: 'Assessment',
  modulePath: 'Assessments',
  mongooseModelName: 'Assessment',
  schema: Assessment,
};
