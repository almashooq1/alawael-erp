'use strict';
/**
 * Billing Engine — Validation Schemas
 * ════════════════════════════════════
 * express-validator chains for billing endpoints.
 * Used with: backend/middleware/validate.js → validate([...])
 */

const { body, param } = require('express-validator');

/* ─── Helpers ─── */
const isObjectId = value => /^[a-f\d]{24}$/i.test(value);

/* ─── Constants (from DddBillingEngine model) ─── */
const SERVICE_CATEGORIES = [
  'consultation',
  'therapy_session',
  'assessment',
  'diagnostic',
  'equipment_rental',
  'assistive_device',
  'medication',
  'transport',
  'accommodation',
  'tele_rehab',
  'group_therapy',
  'home_visit',
  'report_generation',
  'ar_vr_session',
  'emergency',
  'administrative',
];

const CURRENCY_CODES = ['SAR', 'AED', 'USD', 'EUR', 'GBP', 'KWD', 'BHD', 'QAR', 'OMR', 'EGP'];

const PAYMENT_METHODS = [
  'cash',
  'credit_card',
  'debit_card',
  'bank_transfer',
  'insurance',
  'cheque',
  'online',
  'mobile_wallet',
  'government_subsidy',
  'charity_fund',
  'installment',
];

const BILLING_CYCLES = [
  'per_session',
  'daily',
  'weekly',
  'bi_weekly',
  'monthly',
  'quarterly',
  'per_episode',
  'annual',
];

/* ═══ Service Charges ═══ */
const createServiceCharge = [
  body('code').trim().notEmpty().withMessage('code مطلوب'),
  body('name').trim().notEmpty().withMessage('name مطلوب'),
  body('category').isIn(SERVICE_CATEGORIES).withMessage('category غير صالح'),
  body('basePrice').isFloat({ min: 0 }).withMessage('basePrice يجب أن يكون رقماً ≥ 0'),
  body('currency').optional().isIn(CURRENCY_CODES).withMessage('currency غير صالح'),
  body('taxRate')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('taxRate يجب أن يكون بين 0 و 100'),
  body('duration')
    .optional()
    .isInt({ min: 0 })
    .withMessage('duration يجب أن يكون عدداً صحيحاً ≥ 0'),
];

const updateServiceCharge = [
  body('code').optional().trim().notEmpty().withMessage('code لا يمكن أن يكون فارغاً'),
  body('name').optional().trim().notEmpty().withMessage('name لا يمكن أن يكون فارغاً'),
  body('category').optional().isIn(SERVICE_CATEGORIES).withMessage('category غير صالح'),
  body('basePrice').optional().isFloat({ min: 0 }).withMessage('basePrice يجب أن يكون رقماً ≥ 0'),
  body('currency').optional().isIn(CURRENCY_CODES).withMessage('currency غير صالح'),
];

/* ═══ Billing Accounts ═══ */
const createBillingAccount = [
  body('beneficiaryId').custom(isObjectId).withMessage('beneficiaryId غير صالح'),
  body('accountNumber').trim().notEmpty().withMessage('accountNumber مطلوب'),
  body('currency').optional().isIn(CURRENCY_CODES).withMessage('currency غير صالح'),
  body('billingCycle').optional().isIn(BILLING_CYCLES).withMessage('billingCycle غير صالح'),
  body('creditLimit').optional().isFloat({ min: 0 }).withMessage('creditLimit يجب أن يكون ≥ 0'),
];

const updateBillingAccount = [
  body('accountNumber')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('accountNumber لا يمكن أن يكون فارغاً'),
  body('currency').optional().isIn(CURRENCY_CODES).withMessage('currency غير صالح'),
  body('billingCycle').optional().isIn(BILLING_CYCLES).withMessage('billingCycle غير صالح'),
  body('status')
    .optional()
    .isIn(['active', 'suspended', 'closed', 'collections'])
    .withMessage('status غير صالح'),
];

/* ═══ Invoices ═══ */
const createInvoice = [
  body('invoiceNumber').trim().notEmpty().withMessage('invoiceNumber مطلوب'),
  body('billingAccountId').custom(isObjectId).withMessage('billingAccountId غير صالح'),
  body('beneficiaryId').custom(isObjectId).withMessage('beneficiaryId غير صالح'),
  body('dueDate').isISO8601().withMessage('dueDate يجب أن يكون تاريخ ISO صالح'),
  body('currency').optional().isIn(CURRENCY_CODES).withMessage('currency غير صالح'),
  body('lines').isArray({ min: 1 }).withMessage('lines مطلوبة (مصفوفة)'),
  body('lines.*.description').notEmpty().withMessage('lines[].description مطلوب'),
  body('lines.*.quantity').isFloat({ min: 0 }).withMessage('lines[].quantity يجب أن يكون ≥ 0'),
  body('lines.*.unitPrice').isFloat({ min: 0 }).withMessage('lines[].unitPrice يجب أن يكون ≥ 0'),
  body('lines.*.lineTotal').isFloat().withMessage('lines[].lineTotal مطلوب'),
];

const updateInvoice = [
  body('dueDate').optional().isISO8601().withMessage('dueDate يجب أن يكون تاريخ ISO صالح'),
  body('currency').optional().isIn(CURRENCY_CODES).withMessage('currency غير صالح'),
  body('status')
    .optional()
    .isIn([
      'draft',
      'pending',
      'sent',
      'partially_paid',
      'paid',
      'overdue',
      'disputed',
      'cancelled',
      'refunded',
      'written_off',
    ])
    .withMessage('status غير صالح'),
];

/* ═══ Payments ═══ */
const recordPayment = [
  body('paymentNumber').trim().notEmpty().withMessage('paymentNumber مطلوب'),
  body('billingAccountId').custom(isObjectId).withMessage('billingAccountId غير صالح'),
  body('beneficiaryId').custom(isObjectId).withMessage('beneficiaryId غير صالح'),
  body('amount').isFloat({ min: 0 }).withMessage('amount يجب أن يكون رقماً ≥ 0'),
  body('method').isIn(PAYMENT_METHODS).withMessage('method غير صالح'),
  body('currency').optional().isIn(CURRENCY_CODES).withMessage('currency غير صالح'),
];

/* ═══ Actions ═══ */
const cancelInvoice = [
  body('reason').optional().trim().isString().withMessage('reason يجب أن يكون نصاً'),
];

const refundPayment = [
  body('amount').isFloat({ min: 0.01 }).withMessage('amount يجب أن يكون رقماً > 0'),
  body('reason').trim().notEmpty().withMessage('reason مطلوب'),
];

module.exports = {
  createServiceCharge,
  updateServiceCharge,
  createBillingAccount,
  updateBillingAccount,
  createInvoice,
  updateInvoice,
  recordPayment,
  cancelInvoice,
  refundPayment,
};
