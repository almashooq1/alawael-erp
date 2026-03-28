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
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const saudiTaxService = require('../services/saudiTax.service');
const logger = require('../utils/logger');

router.use(authenticate);

const wrap = fn => async (req, res) => {
  try {
    const result = await fn(req, res);
    if (!res.headersSent) {
      res.json({ success: true, data: result });
    }
  } catch (err) {
    logger.error('Saudi Tax route error:', err.message);
    const status = err.status || 500;
    res.status(status).json({ success: false, message: err.message });
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
  wrap(async req => saudiTaxService.createVATReturn(req.body, getUserId(req)))
);
router.put(
  '/vat-returns/:id',
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
  wrap(async req => saudiTaxService.createTaxFiling(req.body, getUserId(req)))
);
router.put(
  '/filings/:id',
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
  wrap(async req => saudiTaxService.createWithholdingTax(req.body, getUserId(req)))
);
router.put(
  '/withholding/:id',
  wrap(async req => saudiTaxService.updateWithholdingTax(req.params.id, req.body, getUserId(req)))
);
router.delete(
  '/withholding/:id',
  wrap(async req => saudiTaxService.deleteWithholdingTax(req.params.id))
);

module.exports = router;
