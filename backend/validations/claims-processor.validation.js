'use strict';
/**
 * Claims Processor — Validation Schemas
 * ══════════════════════════════════════
 * express-validator chains for claims processing endpoints.
 */

const { body, param } = require('express-validator');

const isObjectId = value => /^[a-f\d]{24}$/i.test(value);

/* ─── Constants (from DddClaimsProcessor model) ─── */
const CLAIM_TYPES = [
  'professional',
  'institutional',
  'pharmacy',
  'dental',
  'vision',
  'rehabilitation',
  'mental_health',
  'assistive_technology',
  'home_health',
  'transport',
];

const SUBMISSION_CHANNELS = ['electronic', 'portal', 'nphies', 'fax', 'mail', 'manual'];

const APPEAL_LEVELS = ['first_level', 'second_level', 'external_review', 'arbitration'];

const EOB_TYPES = ['payment', 'denial', 'adjustment', 'reversal'];

/* ═══ Claims ═══ */
const createClaim = [
  body('claimNumber').trim().notEmpty().withMessage('claimNumber مطلوب'),
  body('beneficiaryId').custom(isObjectId).withMessage('beneficiaryId غير صالح'),
  body('policyId').custom(isObjectId).withMessage('policyId غير صالح'),
  body('providerId').custom(isObjectId).withMessage('providerId غير صالح'),
  body('claimType').isIn(CLAIM_TYPES).withMessage('claimType غير صالح'),
  body('serviceFrom').isISO8601().withMessage('serviceFrom يجب أن يكون تاريخ ISO صالح'),
  body('serviceTo').optional().isISO8601().withMessage('serviceTo يجب أن يكون تاريخ ISO صالح'),
  body('submissionChannel')
    .optional()
    .isIn(SUBMISSION_CHANNELS)
    .withMessage('submissionChannel غير صالح'),
  body('priority').optional().isIn(['normal', 'high', 'urgent']).withMessage('priority غير صالح'),
  body('lines').isArray({ min: 1 }).withMessage('lines مطلوبة (مصفوفة بند واحد على الأقل)'),
  body('lines.*.lineNumber').isInt({ min: 1 }).withMessage('lines[].lineNumber مطلوب ≥ 1'),
  body('lines.*.serviceCode').trim().notEmpty().withMessage('lines[].serviceCode مطلوب'),
  body('lines.*.description').trim().notEmpty().withMessage('lines[].description مطلوب'),
  body('lines.*.serviceDate')
    .isISO8601()
    .withMessage('lines[].serviceDate يجب أن يكون تاريخ ISO صالح'),
  body('lines.*.unitPrice').isFloat({ min: 0 }).withMessage('lines[].unitPrice يجب أن يكون ≥ 0'),
  body('lines.*.totalCharge')
    .isFloat({ min: 0 })
    .withMessage('lines[].totalCharge يجب أن يكون ≥ 0'),
  body('diagnosis').optional().isArray().withMessage('diagnosis يجب أن يكون مصفوفة'),
  body('diagnosis.*.code').optional().trim().notEmpty().withMessage('diagnosis[].code مطلوب'),
];

const updateClaim = [
  body('claimType').optional().isIn(CLAIM_TYPES).withMessage('claimType غير صالح'),
  body('submissionChannel')
    .optional()
    .isIn(SUBMISSION_CHANNELS)
    .withMessage('submissionChannel غير صالح'),
  body('priority').optional().isIn(['normal', 'high', 'urgent']).withMessage('priority غير صالح'),
  body('serviceFrom').optional().isISO8601().withMessage('serviceFrom يجب أن يكون تاريخ ISO صالح'),
];

/* ═══ Claim Actions ═══ */
const submitClaim = [body('userId').optional().custom(isObjectId).withMessage('userId غير صالح')];

const adjudicateClaim = [
  body('totalApproved').optional().isFloat({ min: 0 }).withMessage('totalApproved يجب أن يكون ≥ 0'),
  body('totalDenied').optional().isFloat({ min: 0 }).withMessage('totalDenied يجب أن يكون ≥ 0'),
  body('denialReasons').optional().isArray().withMessage('denialReasons يجب أن يكون مصفوفة'),
];

const markClaimPaid = [
  body('totalPaid').optional().isFloat({ min: 0 }).withMessage('totalPaid يجب أن يكون ≥ 0'),
  body('payerClaimRef').optional().trim().isString().withMessage('payerClaimRef يجب أن يكون نصاً'),
];

/* ═══ Batches ═══ */
const createBatch = [
  body('batchNumber').trim().notEmpty().withMessage('batchNumber مطلوب'),
  body('providerId').custom(isObjectId).withMessage('providerId غير صالح'),
  body('channel').optional().isIn(SUBMISSION_CHANNELS).withMessage('channel غير صالح'),
  body('claimIds').optional().isArray().withMessage('claimIds يجب أن يكون مصفوفة'),
  body('claimIds.*').optional().custom(isObjectId).withMessage('claimIds يحتوي معرّف غير صالح'),
];

const submitBatch = [body('userId').optional().custom(isObjectId).withMessage('userId غير صالح')];

/* ═══ Appeals ═══ */
const createAppeal = [
  body('appealNumber').trim().notEmpty().withMessage('appealNumber مطلوب'),
  body('claimId').custom(isObjectId).withMessage('claimId غير صالح'),
  body('beneficiaryId').custom(isObjectId).withMessage('beneficiaryId غير صالح'),
  body('appealReason').trim().notEmpty().withMessage('appealReason مطلوب'),
  body('level').optional().isIn(APPEAL_LEVELS).withMessage('level غير صالح'),
  body('clinicalJustification')
    .optional()
    .trim()
    .isString()
    .withMessage('clinicalJustification يجب أن يكون نصاً'),
  body('requestedAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('requestedAmount يجب أن يكون ≥ 0'),
];

const submitAppeal = [body('userId').optional().custom(isObjectId).withMessage('userId غير صالح')];

const resolveAppeal = [
  body('status')
    .optional()
    .isIn(['approved', 'denied', 'escalated', 'withdrawn'])
    .withMessage('status غير صالح'),
  body('approvedAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('approvedAmount يجب أن يكون ≥ 0'),
];

/* ═══ EOBs ═══ */
const createEOB = [
  body('eobNumber').trim().notEmpty().withMessage('eobNumber مطلوب'),
  body('claimId').custom(isObjectId).withMessage('claimId غير صالح'),
  body('beneficiaryId').custom(isObjectId).withMessage('beneficiaryId غير صالح'),
  body('type').optional().isIn(EOB_TYPES).withMessage('type غير صالح'),
  body('processedDate')
    .optional()
    .isISO8601()
    .withMessage('processedDate يجب أن يكون تاريخ ISO صالح'),
];

module.exports = {
  createClaim,
  updateClaim,
  submitClaim,
  adjudicateClaim,
  markClaimPaid,
  createBatch,
  submitBatch,
  createAppeal,
  submitAppeal,
  resolveAppeal,
  createEOB,
};
