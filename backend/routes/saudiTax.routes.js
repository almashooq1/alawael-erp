/**
 * Saudi Tax Routes — مسارات الضرائب السعودية (ZATCA)
 *
 * ✅ إقرارات ضريبة القيمة المضافة (VAT Returns)
 * ✅ الإقرارات الضريبية العامة (Tax Filings — VAT/Zakat/WHT/Excise/CIT)
 * ✅ ضريبة الاستقطاع (Withholding Tax)
 * ✅ الإحصائيات والمواعيد النهائية
 *
 * 🔐 جميع المسارات محمية بالمصادقة
 */

const express = require('express');
const { safeError } = require('../utils/safeError');
const router = express.Router();
const { authenticate, authorize: _authorize } = require('../middleware/auth');
const saudiTaxService = require('../services/saudiTax.service');
const logger = require('../utils/logger');
const { body, param, validationResult } = require('express-validator');

router.use(authenticate);

/** Validation error handler */
const validateReq = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array().map(e => e.msg) });
  }
  next();
};

const wrap = fn => async (req, res) => {
  try {
    const result = await fn(req, res);
    if (!res.headersSent) {
      res.json({ success: true, data: result });
    }
  } catch (err) {
    logger.error('Saudi Tax route error:', err.message);
    const status = err.status || 500;
    res.status(status).json({ success: false, message: safeError(err) });
  }
};

const getUserId = req => req.user?.userId || req.user?._id || req.user?.id;

// ═══════════════════════════════════════════════════════════════════════════════
// STATISTICS & DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════

router.get(
  '/statistics',
  wrap(async req => saudiTaxService.getStatistics(req.query.year))
);
router.get(
  '/upcoming-deadlines',
  wrap(async req => saudiTaxService.getUpcomingDeadlines(req.query.days))
);

// ═══════════════════════════════════════════════════════════════════════════════
// VAT RETURNS — إقرارات ضريبة القيمة المضافة
// ═══════════════════════════════════════════════════════════════════════════════

router.get(
  '/vat-returns',
  wrap(async req => saudiTaxService.listVATReturns(req.query))
);
router.get(
  '/vat-returns/:id',
  wrap(async req => saudiTaxService.getVATReturn(req.params.id))
);
router.post(
  '/vat-returns',
  [
    body('period').trim().notEmpty().withMessage('فترة الإقرار مطلوبة'),
    body('totalSales').optional().isNumeric().withMessage('إجمالي المبيعات يجب أن يكون رقماً'),
    validateReq,
  ],
  wrap(async req => saudiTaxService.createVATReturn(req.body, getUserId(req)))
);
router.put(
  '/vat-returns/:id',
  [param('id').isMongoId().withMessage('معرف غير صالح'), validateReq],
  wrap(async req => saudiTaxService.updateVATReturn(req.params.id, req.body, getUserId(req)))
);
router.post(
  '/vat-returns/:id/file',
  wrap(async req => saudiTaxService.fileVATReturn(req.params.id, getUserId(req)))
);

// ═══════════════════════════════════════════════════════════════════════════════
// TAX FILINGS — الإقرارات الضريبية العامة
// ═══════════════════════════════════════════════════════════════════════════════

router.get(
  '/filings',
  wrap(async req => saudiTaxService.listTaxFilings(req.query))
);
router.get(
  '/filings/:id',
  wrap(async req => saudiTaxService.getTaxFiling(req.params.id))
);
router.post(
  '/filings',
  [
    body('type').trim().notEmpty().withMessage('نوع الإقرار مطلوب'),
    body('period').trim().notEmpty().withMessage('فترة الإقرار مطلوبة'),
    validateReq,
  ],
  wrap(async req => saudiTaxService.createTaxFiling(req.body, getUserId(req)))
);
router.put(
  '/filings/:id',
  [param('id').isMongoId().withMessage('معرف غير صالح'), validateReq],
  wrap(async req => saudiTaxService.updateTaxFiling(req.params.id, req.body, getUserId(req)))
);
router.post(
  '/filings/:id/submit',
  wrap(async req => saudiTaxService.submitTaxFiling(req.params.id, getUserId(req)))
);

// ═══════════════════════════════════════════════════════════════════════════════
// WITHHOLDING TAX — ضريبة الاستقطاع
// ═══════════════════════════════════════════════════════════════════════════════

router.get(
  '/withholding',
  wrap(async req => saudiTaxService.listWithholdingTax(req.query))
);
router.get(
  '/withholding/:id',
  wrap(async req => saudiTaxService.getWithholdingTax(req.params.id))
);
router.post(
  '/withholding',
  [body('amount').isNumeric().withMessage('المبلغ مطلوب ويجب أن يكون رقماً'), validateReq],
  wrap(async req => saudiTaxService.createWithholdingTax(req.body, getUserId(req)))
);
router.put(
  '/withholding/:id',
  [param('id').isMongoId().withMessage('معرف غير صالح'), validateReq],
  wrap(async req => saudiTaxService.updateWithholdingTax(req.params.id, req.body, getUserId(req)))
);
router.delete(
  '/withholding/:id',
  [param('id').isMongoId().withMessage('معرف غير صالح'), validateReq],
  wrap(async req => saudiTaxService.deleteWithholdingTax(req.params.id))
);

module.exports = router;
