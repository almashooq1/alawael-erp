'use strict';
/**
 * Clinical Engine — Validation Schemas
 * ═════════════════════════════════════
 * express-validator chains for clinical evaluation endpoints.
 */

const { body, param } = require('express-validator');

const isObjectId = value => /^[a-f\d]{24}$/i.test(value);

const EVALUATION_TYPES = ['comprehensive', 'focused', 'scheduled', 'event_triggered', 'manual'];

/* ═══ Evaluate Beneficiary ═══ */
const evaluateBeneficiary = [
  param('beneficiaryId').custom(isObjectId).withMessage('beneficiaryId غير صالح'),
  body('evaluationType').optional().isIn(EVALUATION_TYPES).withMessage('evaluationType غير صالح'),
];

/* ═══ Evaluate Batch ═══ */
const evaluateBatch = [
  body('filter').optional().isObject().withMessage('filter يجب أن يكون كائناً'),
];

module.exports = {
  evaluateBeneficiary,
  evaluateBatch,
};
