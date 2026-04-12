'use strict';
/**
 * Consent Manager — Validation Schemas
 * ═════════════════════════════════════
 * express-validator chains for consent/DSAR/retention endpoints.
 */

const { body, param } = require('express-validator');

const isObjectId = value => /^[a-f\d]{24}$/i.test(value);

/* ─── Constants (from DddConsentManager model) ─── */
const CONSENT_PURPOSES = [
  'treatment',
  'assessment',
  'care_planning',
  'data_sharing',
  'research',
  'marketing',
  'analytics',
  'tele_rehab',
  'family_engagement',
  'third_party_referral',
  'insurance_claims',
  'ministry_reporting',
  'ai_recommendations',
  'biometric_data',
  'photo_video',
  'emergency_contact',
  'cross_border_transfer',
];

const CONSENT_STATUSES = ['granted', 'denied', 'withdrawn', 'expired', 'pending'];

const DSAR_REQUEST_TYPES = [
  'access',
  'erasure',
  'rectification',
  'portability',
  'restriction',
  'objection',
];

const LAWFUL_BASES = [
  'consent',
  'contract',
  'legal_obligation',
  'vital_interest',
  'public_interest',
  'legitimate_interest',
];

/* ═══ Grant Consent ═══ */
const grantConsent = [
  param('beneficiaryId').custom(isObjectId).withMessage('beneficiaryId غير صالح'),
  body('purpose').isIn(CONSENT_PURPOSES).withMessage('purpose غير صالح'),
  body('lawfulBasis').optional().isIn(LAWFUL_BASES).withMessage('lawfulBasis غير صالح'),
  body('grantMethod')
    .optional()
    .isIn(['written', 'electronic', 'verbal', 'implied'])
    .withMessage('grantMethod غير صالح'),
  body('expiresAt').optional().isISO8601().withMessage('expiresAt يجب أن يكون تاريخ ISO صالح'),
  body('scope.domains').optional().isArray().withMessage('scope.domains يجب أن يكون مصفوفة'),
  body('scope.dataCategories')
    .optional()
    .isArray()
    .withMessage('scope.dataCategories يجب أن يكون مصفوفة'),
  body('scope.dataCategories.*')
    .optional()
    .isIn([
      'personal',
      'clinical',
      'behavioral',
      'financial',
      'biometric',
      'genetic',
      'special_category',
    ])
    .withMessage('scope.dataCategories يحتوي قيمة غير صالحة'),
];

/* ═══ Withdraw Consent ═══ */
const withdrawConsent = [
  param('beneficiaryId').custom(isObjectId).withMessage('beneficiaryId غير صالح'),
  body('purpose').isIn(CONSENT_PURPOSES).withMessage('purpose مطلوب'),
  body('withdrawalReason')
    .optional()
    .trim()
    .isString()
    .withMessage('withdrawalReason يجب أن يكون نصاً'),
];

/* ═══ DSAR (Data Subject Access Request) ═══ */
const createDSAR = [
  body('beneficiaryId').custom(isObjectId).withMessage('beneficiaryId غير صالح'),
  body('requestType').isIn(DSAR_REQUEST_TYPES).withMessage('requestType غير صالح'),
  body('description').optional().trim().isString().withMessage('description يجب أن يكون نصاً'),
  body('specificData').optional().isArray().withMessage('specificData يجب أن يكون مصفوفة'),
  body('domains').optional().isArray().withMessage('domains يجب أن يكون مصفوفة'),
  body('identityVerificationMethod')
    .optional()
    .isIn(['document', 'two_factor', 'in_person', 'email_verification'])
    .withMessage('identityVerificationMethod غير صالح'),
  body('dataExportFormat')
    .optional()
    .isIn(['json', 'csv', 'fhir_bundle'])
    .withMessage('dataExportFormat غير صالح'),
];

/* ═══ Retention Policy Update ═══ */
const updateRetentionPolicy = [
  param('domain').trim().notEmpty().withMessage('domain مطلوب'),
  body('retentionPeriodDays')
    .optional()
    .isInt({ min: 1 })
    .withMessage('retentionPeriodDays يجب أن يكون عدداً ≥ 1'),
  body('archiveBeforeDelete')
    .optional()
    .isBoolean()
    .withMessage('archiveBeforeDelete يجب أن يكون قيمة منطقية'),
  body('isActive').optional().isBoolean().withMessage('isActive يجب أن يكون قيمة منطقية'),
];

module.exports = {
  grantConsent,
  withdrawConsent,
  createDSAR,
  updateRetentionPolicy,
};
