/**
 * Beneficiary (Domain Re-export Shim)
 *
 * This file used to define a parallel `Beneficiary` mongoose schema that
 * collided with the canonical model in `backend/models/Beneficiary.js`.
 * The duplicate schema was archived to
 * `_archived/dead-models/domains-core-Beneficiary.js` to enforce
 * "ملف مستفيد طولي واحد" (single longitudinal beneficiary record).
 *
 * Consumers should keep using the existing `{ Beneficiary }` named import.
 *
 * @module domains/core/models/Beneficiary
 */

const Beneficiary = require('../../../models/Beneficiary');

module.exports = { Beneficiary, beneficiarySchema: Beneficiary.schema };
