/**
 * ClinicalAssessment (Domain Re-export Shim)
 *
 * This file used to define a parallel `ClinicalAssessment` mongoose schema
 * that collided with the canonical model in
 * `backend/models/ClinicalAssessment.js`. The duplicate schema was archived
 * to `_archived/dead-models/domains-assessments-ClinicalAssessment.js`.
 *
 * Consumers should keep using the existing `{ ClinicalAssessment }` named
 * import.
 *
 * @module domains/assessments/models/ClinicalAssessment
 */

const ClinicalAssessment = require('../../../models/ClinicalAssessment');

module.exports = {
  ClinicalAssessment,
  clinicalAssessmentSchema: ClinicalAssessment.schema,
};
