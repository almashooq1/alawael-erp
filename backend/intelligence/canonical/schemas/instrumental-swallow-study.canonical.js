'use strict';
/**
 * Canonical InstrumentalSwallowStudy — module: Clinical Assessments.
 *
 * One instrumental swallow study (VFSS/FEES) result. Records the findings
 * a bedside DysphagiaAssessment (W670) can only refer for. See
 * `backend/models/InstrumentalSwallowStudy.js` (W683).
 */

const { z, ObjectIdLike, IsoDateLoose, AuditEnvelope } = require('../_primitives');

const StudyType = z.enum(['vfss', 'fees', 'mbss']);
const Status = z.enum(['ordered', 'scheduled', 'completed', 'cancelled']);
const Phase = z.enum(['oral_preparatory', 'oral', 'pharyngeal', 'oesophageal']);
const IddsiLevel = z.enum(['0', '1', '2', '3', '4', '5', '6', '7']);

const InstrumentalSwallowStudy = z.object({
  _id: ObjectIdLike.optional(),

  beneficiaryId: ObjectIdLike,
  branchId: ObjectIdLike.optional(),
  dysphagiaAssessmentId: ObjectIdLike.optional(),
  dietPrescriptionId: ObjectIdLike.optional(),

  studyType: StudyType,
  status: Status,

  performedDate: IsoDateLoose.optional(),
  performedBy: ObjectIdLike.optional(),

  impairedPhases: z.array(Phase).optional(),
  penetrationAspirationScale: z.number().int().min(1).max(8).optional(),
  aspirationDetected: z.boolean().optional(),
  silentAspiration: z.boolean().optional(),

  consistencyResults: z
    .array(
      z.object({
        iddsiLevel: IddsiLevel,
        penetration: z.boolean().optional(),
        aspiration: z.boolean().optional(),
        safe: z.boolean().optional(),
      })
    )
    .optional(),
  recommendedDietLevels: z.array(IddsiLevel).optional(),
  npoRecommended: z.boolean().optional(),

  cancelReason: z.string().optional(),

  ...AuditEnvelope.shape,
});

module.exports = {
  name: 'InstrumentalSwallowStudy',
  modulePath: 'Clinical Assessments',
  mongooseModelName: 'InstrumentalSwallowStudy',
  schema: InstrumentalSwallowStudy,
};
