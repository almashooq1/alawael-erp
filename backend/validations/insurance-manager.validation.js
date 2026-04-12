'use strict';
/**
 * Insurance Manager — Validation Schemas
 * ═══════════════════════════════════════
 * express-validator chains for insurance endpoints.
 */

const { body, param } = require('express-validator');

const isObjectId = value => /^[a-f\d]{24}$/i.test(value);

/* ─── Constants (from DddInsuranceManager model) ─── */
const PROVIDER_TYPES = [
  'government',
  'private',
  'cooperative',
  'self_insured',
  'international',
  'military',
  'workers_comp',
  'charity',
  'social_affairs',
  'employer_group',
];

const BENEFIT_CATEGORIES = [
  'physical_therapy',
  'occupational_therapy',
  'speech_therapy',
  'psychological',
  'assistive_devices',
  'diagnostics',
  'tele_rehab',
  'home_care',
  'inpatient_rehab',
  'day_program',
  'group_therapy',
  'medication',
];

const COVERAGE_TYPES = [
  'full',
  'co_pay',
  'co_insurance',
  'deductible_first',
  'capitated',
  'per_diem',
  'case_rate',
  'excluded',
];

const NETWORK_TIERS = ['in_network', 'out_of_network', 'preferred', 'restricted'];

const PLAN_CLASSES = ['A', 'B', 'C', 'D', 'VIP', 'economy', 'standard', 'premium'];

const URGENCY_TYPES = ['routine', 'urgent', 'emergency', 'retrospective'];

/* ═══ Providers ═══ */
const createProvider = [
  body('code').trim().notEmpty().withMessage('code مطلوب'),
  body('name').trim().notEmpty().withMessage('name مطلوب'),
  body('type').isIn(PROVIDER_TYPES).withMessage('type غير صالح'),
  body('contact.email').optional().isEmail().withMessage('contact.email غير صالح'),
  body('contact.phone').optional().trim().isString().withMessage('contact.phone يجب أن يكون نصاً'),
  body('networkTier').optional().isIn(NETWORK_TIERS).withMessage('networkTier غير صالح'),
  body('serviceCategories')
    .optional()
    .isArray()
    .withMessage('serviceCategories يجب أن يكون مصفوفة'),
  body('serviceCategories.*')
    .optional()
    .isIn(BENEFIT_CATEGORIES)
    .withMessage('serviceCategories يحتوي قيمة غير صالحة'),
  body('paymentTermsDays')
    .optional()
    .isInt({ min: 0 })
    .withMessage('paymentTermsDays يجب أن يكون عدداً ≥ 0'),
];

const updateProvider = [
  body('code').optional().trim().notEmpty().withMessage('code لا يمكن أن يكون فارغاً'),
  body('name').optional().trim().notEmpty().withMessage('name لا يمكن أن يكون فارغاً'),
  body('type').optional().isIn(PROVIDER_TYPES).withMessage('type غير صالح'),
  body('isActive').optional().isBoolean().withMessage('isActive يجب أن يكون قيمة منطقية'),
];

/* ═══ Policies ═══ */
const createPolicy = [
  body('beneficiaryId').custom(isObjectId).withMessage('beneficiaryId غير صالح'),
  body('providerId').custom(isObjectId).withMessage('providerId غير صالح'),
  body('policyNumber').trim().notEmpty().withMessage('policyNumber مطلوب'),
  body('effectiveDate').isISO8601().withMessage('effectiveDate يجب أن يكون تاريخ ISO صالح'),
  body('expiryDate').isISO8601().withMessage('expiryDate يجب أن يكون تاريخ ISO صالح'),
  body('planClass').optional().isIn(PLAN_CLASSES).withMessage('planClass غير صالح'),
  body('networkTier').optional().isIn(NETWORK_TIERS).withMessage('networkTier غير صالح'),
  body('deductible').optional().isFloat({ min: 0 }).withMessage('deductible يجب أن يكون ≥ 0'),
];

const updatePolicy = [
  body('policyNumber')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('policyNumber لا يمكن أن يكون فارغاً'),
  body('effectiveDate')
    .optional()
    .isISO8601()
    .withMessage('effectiveDate يجب أن يكون تاريخ ISO صالح'),
  body('expiryDate').optional().isISO8601().withMessage('expiryDate يجب أن يكون تاريخ ISO صالح'),
  body('status')
    .optional()
    .isIn(['active', 'pending', 'suspended', 'expired', 'cancelled', 'exhausted', 'under_review'])
    .withMessage('status غير صالح'),
  body('planClass').optional().isIn(PLAN_CLASSES).withMessage('planClass غير صالح'),
];

/* ═══ Policy Actions ═══ */
const verifyPolicy = [
  body('userId').optional().custom(isObjectId).withMessage('userId غير صالح'),
  body('notes').optional().trim().isString().withMessage('notes يجب أن يكون نصاً'),
];

const checkCoverage = [body('category').isIn(BENEFIT_CATEGORIES).withMessage('category غير صالح')];

/* ═══ Pre-Authorizations ═══ */
const createPreAuth = [
  body('authNumber').trim().notEmpty().withMessage('authNumber مطلوب'),
  body('policyId').custom(isObjectId).withMessage('policyId غير صالح'),
  body('providerId').custom(isObjectId).withMessage('providerId غير صالح'),
  body('beneficiaryId').custom(isObjectId).withMessage('beneficiaryId غير صالح'),
  body('urgency').optional().isIn(URGENCY_TYPES).withMessage('urgency غير صالح'),
  body('requestedServices')
    .optional()
    .isArray()
    .withMessage('requestedServices يجب أن يكون مصفوفة'),
  body('requestedServices.*.category')
    .optional()
    .isIn(BENEFIT_CATEGORIES)
    .withMessage('requestedServices[].category غير صالح'),
  body('requestedServices.*.sessions')
    .optional()
    .isInt({ min: 1 })
    .withMessage('requestedServices[].sessions يجب أن يكون عدداً ≥ 1'),
  body('requestedServices.*.estimatedCost')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('requestedServices[].estimatedCost يجب أن يكون ≥ 0'),
];

/* ═══ Pre-Auth Actions ═══ */
const submitPreAuth = [body('userId').optional().custom(isObjectId).withMessage('userId غير صالح')];

const approvePreAuth = [
  body('reviewer').custom(isObjectId).withMessage('reviewer غير صالح'),
  body('approvals').optional().isArray().withMessage('approvals يجب أن يكون مصفوفة'),
];

const denyPreAuth = [
  body('reviewer').custom(isObjectId).withMessage('reviewer غير صالح'),
  body('reason').trim().notEmpty().withMessage('reason مطلوب'),
];

/* ═══ Coverage Rules ═══ */
const createCoverageRule = [
  body('providerId').custom(isObjectId).withMessage('providerId غير صالح'),
  body('category').isIn(BENEFIT_CATEGORIES).withMessage('category غير صالح'),
  body('coverageType').isIn(COVERAGE_TYPES).withMessage('coverageType غير صالح'),
  body('coPayPercent')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('coPayPercent يجب أن يكون بين 0 و 100'),
  body('maxSessions').optional().isInt({ min: 0 }).withMessage('maxSessions يجب أن يكون عدداً ≥ 0'),
  body('preAuthRequired')
    .optional()
    .isBoolean()
    .withMessage('preAuthRequired يجب أن يكون قيمة منطقية'),
  body('waitingPeriodDays')
    .optional()
    .isInt({ min: 0 })
    .withMessage('waitingPeriodDays يجب أن يكون عدداً ≥ 0'),
];

const updateCoverageRule = [
  body('category').optional().isIn(BENEFIT_CATEGORIES).withMessage('category غير صالح'),
  body('coverageType').optional().isIn(COVERAGE_TYPES).withMessage('coverageType غير صالح'),
  body('isActive').optional().isBoolean().withMessage('isActive يجب أن يكون قيمة منطقية'),
];

module.exports = {
  createProvider,
  updateProvider,
  createPolicy,
  updatePolicy,
  verifyPolicy,
  checkCoverage,
  createPreAuth,
  submitPreAuth,
  approvePreAuth,
  denyPreAuth,
  createCoverageRule,
  updateCoverageRule,
};
