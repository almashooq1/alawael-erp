'use strict';
/**
 * Canonical StaffHealthRecord — module: Occupational Health.
 *
 * Staff occupational-health surveillance: immunization / TB / fitness / exposure
 * incident / fit-test. CBAHI + MOH + OSHA. Confidential. See
 * `backend/models/StaffHealthRecord.js` (W1125).
 */

const { z, ObjectIdLike, IsoDateLoose, AuditEnvelope } = require('../_primitives');

const RecordType = z.enum([
  'immunization',
  'tb_screening',
  'fitness_for_work',
  'exposure_incident',
  'periodic_checkup',
  'respirator_fit_test',
]);

const RecordStatus = z.enum([
  'open',
  'in_progress',
  'completed',
  'cleared',
  'restricted',
  'follow_up_required',
  'closed',
]);

const ExposureType = z.enum(['needlestick', 'sharps', 'splash_mucous', 'splash_skin', 'aerosol', 'other']);
const FitnessLevel = z.enum(['fit', 'fit_with_restrictions', 'temporarily_unfit', 'unfit']);
const Result = z.enum(['negative', 'positive', 'indeterminate', 'pass', 'fail', 'not_applicable']);

const StaffHealthRecord = z.object({
  employeeId: ObjectIdLike,
  employeeName: z.string().optional(),
  branchId: ObjectIdLike.optional(),
  recordNumber: z.string().optional(),

  recordType: RecordType,
  status: RecordStatus,

  eventDate: IsoDateLoose,
  nextDueDate: IsoDateLoose.nullable().optional(),

  outcome: z.string().optional(),
  findings: z.string().optional(),
  restrictions: z.string().optional(),

  vaccineName: z.string().optional(),
  doseNumber: z.number().int().positive().nullable().optional(),
  administeredDate: IsoDateLoose.nullable().optional(),
  lotNumber: z.string().optional(),

  exposureType: z.union([ExposureType, z.literal('')]).optional(),
  sourcePatientKnown: z.boolean().optional(),
  bodyFluidType: z.string().optional(),
  postExposureProphylaxis: z.string().optional(),
  reportedWithin2h: z.boolean().optional(),

  fitnessLevel: z.union([FitnessLevel, z.literal('')]).optional(),
  result: z.union([Result, z.literal('')]).optional(),

  confidential: z.boolean().optional(),
  assessedByName: z.string().optional(),
  assessedBy: ObjectIdLike.optional(),
  notes: z.string().optional(),

  ...AuditEnvelope.shape,
});

module.exports = {
  name: 'StaffHealthRecord',
  modulePath: 'Occupational Health',
  mongooseModelName: 'StaffHealthRecord',
  schema: StaffHealthRecord,
};
