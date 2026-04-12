'use strict';
/**
 * Payment Gateway — Validation Schemas
 * ═════════════════════════════════════
 * express-validator chains for payment gateway endpoints.
 */

const { body, param } = require('express-validator');

const isObjectId = value => /^[a-f\d]{24}$/i.test(value);

/* ─── Constants (from DddPaymentGateway model) ─── */
const PAYMENT_PROVIDERS = [
  'mada',
  'visa',
  'mastercard',
  'apple_pay',
  'stc_pay',
  'sadad',
  'moyasar',
  'hyperpay',
  'tap',
  'payfort',
  'bank_transfer',
  'cash',
  'cheque',
];

const TRANSACTION_TYPES = [
  'payment',
  'refund',
  'partial_refund',
  'chargeback',
  'void',
  'capture',
  'authorization',
  'settlement',
  'adjustment',
  'fee',
  'transfer',
];

const CURRENCY_CODES = ['SAR', 'AED', 'USD', 'EUR', 'GBP', 'KWD', 'BHD', 'QAR', 'OMR', 'EGP'];

const PLAN_FREQUENCIES = ['weekly', 'bi_weekly', 'monthly', 'bi_monthly', 'quarterly', 'custom'];

/* ═══ Gateway Config ═══ */
const createGateway = [
  body('code').trim().notEmpty().withMessage('code مطلوب'),
  body('name').trim().notEmpty().withMessage('name مطلوب'),
  body('provider').isIn(PAYMENT_PROVIDERS).withMessage('provider غير صالح'),
  body('supportedCurrencies')
    .optional()
    .isArray()
    .withMessage('supportedCurrencies يجب أن يكون مصفوفة'),
  body('supportedCurrencies.*')
    .optional()
    .isIn(CURRENCY_CODES)
    .withMessage('supportedCurrencies يحتوي عملة غير صالحة'),
  body('config.environment')
    .optional()
    .isIn(['sandbox', 'production'])
    .withMessage('config.environment غير صالح'),
  body('fees.fixedFee').optional().isFloat({ min: 0 }).withMessage('fees.fixedFee يجب أن يكون ≥ 0'),
  body('fees.percentageFee')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('fees.percentageFee يجب أن يكون بين 0 و 100'),
  body('limits.minTransaction')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('limits.minTransaction يجب أن يكون ≥ 0'),
  body('limits.maxTransaction')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('limits.maxTransaction يجب أن يكون ≥ 0'),
];

const updateGateway = [
  body('name').optional().trim().notEmpty().withMessage('name لا يمكن أن يكون فارغاً'),
  body('provider').optional().isIn(PAYMENT_PROVIDERS).withMessage('provider غير صالح'),
  body('isActive').optional().isBoolean().withMessage('isActive يجب أن يكون قيمة منطقية'),
];

/* ═══ Transactions ═══ */
const initiateTransaction = [
  body('transactionNumber').trim().notEmpty().withMessage('transactionNumber مطلوب'),
  body('type').isIn(TRANSACTION_TYPES).withMessage('type غير صالح'),
  body('amount').isFloat({ min: 0.01 }).withMessage('amount يجب أن يكون > 0'),
  body('currency').optional().isIn(CURRENCY_CODES).withMessage('currency غير صالح'),
  body('gatewayId').optional().custom(isObjectId).withMessage('gatewayId غير صالح'),
  body('beneficiaryId').optional().custom(isObjectId).withMessage('beneficiaryId غير صالح'),
  body('invoiceId').optional().custom(isObjectId).withMessage('invoiceId غير صالح'),
];

const failTransaction = [
  body('errorCode').optional().trim().isString().withMessage('errorCode يجب أن يكون نصاً'),
  body('errorMessage').optional().trim().isString().withMessage('errorMessage يجب أن يكون نصاً'),
];

const refundTransaction = [
  body('amount').isFloat({ min: 0.01 }).withMessage('amount يجب أن يكون > 0'),
  body('reason').trim().notEmpty().withMessage('reason مطلوب'),
];

/* ═══ Payment Plans ═══ */
const createPaymentPlan = [
  body('planNumber').trim().notEmpty().withMessage('planNumber مطلوب'),
  body('beneficiaryId').custom(isObjectId).withMessage('beneficiaryId غير صالح'),
  body('totalAmount').isFloat({ min: 0.01 }).withMessage('totalAmount يجب أن يكون > 0'),
  body('numberOfInstallments')
    .isInt({ min: 2 })
    .withMessage('numberOfInstallments يجب أن يكون ≥ 2'),
  body('startDate').isISO8601().withMessage('startDate يجب أن يكون تاريخ ISO صالح'),
  body('frequency').optional().isIn(PLAN_FREQUENCIES).withMessage('frequency غير صالح'),
  body('downPayment').optional().isFloat({ min: 0 }).withMessage('downPayment يجب أن يكون ≥ 0'),
  body('interestRate')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('interestRate يجب أن يكون بين 0 و 100'),
];

const activatePaymentPlan = [
  body('approvedBy').custom(isObjectId).withMessage('approvedBy غير صالح'),
];

const recordInstallmentPayment = [
  body('installmentNumber').isInt({ min: 1 }).withMessage('installmentNumber يجب أن يكون ≥ 1'),
  body('transactionId').custom(isObjectId).withMessage('transactionId غير صالح'),
  body('amount').isFloat({ min: 0.01 }).withMessage('amount يجب أن يكون > 0'),
];

/* ═══ Reconciliation ═══ */
const createReconciliation = [
  body('batchNumber').trim().notEmpty().withMessage('batchNumber مطلوب'),
  body('periodFrom').isISO8601().withMessage('periodFrom يجب أن يكون تاريخ ISO صالح'),
  body('periodTo').isISO8601().withMessage('periodTo يجب أن يكون تاريخ ISO صالح'),
  body('gatewayId').optional().custom(isObjectId).withMessage('gatewayId غير صالح'),
];

const resolveDiscrepancy = [
  body('index').isInt({ min: 0 }).withMessage('index يجب أن يكون عدداً صحيحاً ≥ 0'),
  body('resolution').trim().notEmpty().withMessage('resolution مطلوب'),
  body('userId').custom(isObjectId).withMessage('userId غير صالح'),
];

module.exports = {
  createGateway,
  updateGateway,
  initiateTransaction,
  failTransaction,
  refundTransaction,
  createPaymentPlan,
  activatePaymentPlan,
  recordInstallmentPayment,
  createReconciliation,
  resolveDiscrepancy,
};
