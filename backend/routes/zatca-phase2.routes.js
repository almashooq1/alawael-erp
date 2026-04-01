/**
 * ZATCA Phase 2 Routes — مسارات هيئة الزكاة (المرحلة الثانية)
 * الفوترة الإلكترونية — منصة فاتورة FATOORA
 *
 * Endpoints:
 * POST /api/zatca-phase2/onboarding                — تسجيل الفرع واستخراج CSID
 * POST /api/zatca-phase2/production-csid           — الحصول على Production CSID
 * GET  /api/zatca-phase2/credential-status/:id     — حالة اعتماد الفرع
 * POST /api/zatca-phase2/invoice/process           — معالجة فاتورة كاملة
 * POST /api/zatca-phase2/invoice/build-xml         — بناء XML فقط
 * POST /api/zatca-phase2/invoice/qr                — توليد QR Code
 * POST /api/zatca-phase2/invoice/qr/decode         — فك ترميز QR
 * POST /api/zatca-phase2/invoice/report            — إرسال للتقرير (B2C)
 * POST /api/zatca-phase2/invoice/clear             — إرسال للمقاصة (B2B)
 * POST /api/zatca-phase2/compliance/check          — فحص التوافق
 * POST /api/zatca-phase2/vat/calculate             — حساب ضريبة القيمة المضافة
 * GET  /api/zatca-phase2/cpt-codes                 — رموز CPT لمراكز التأهيل
 * GET  /api/zatca-phase2/status                    — حالة الخدمة
 */
'use strict';

const express = require('express');
const router = express.Router();
const zatcaService = require('../services/zatca-phase2.service');
const { authenticateToken } = require('../middleware/auth.middleware');
const requireAuth = authenticateToken;

// ─── 1. Onboarding — تسجيل الفرع ─────────────────────────────────────────
/**
 * POST /api/zatca-phase2/onboarding
 * تسجيل فرع جديد واستخراج Compliance CSID
 */
router.post('/onboarding', requireAuth, async (req, res) => {
  try {
    const { branchId, orgData, otp } = req.body;
    if (!branchId || !orgData || !otp) {
      return res.status(400).json({
        success: false,
        message: 'branchId و orgData و otp مطلوبة',
      });
    }
    const result = await zatcaService.performOnboarding(branchId, orgData, otp);
    return res.status(result.success ? 200 : 400).json(result);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ─── 2. Production CSID — استخراج شهادة الإنتاج ──────────────────────────
/**
 * POST /api/zatca-phase2/production-csid
 * الحصول على Production CSID بعد نجاح Compliance Check
 */
router.post('/production-csid', requireAuth, async (req, res) => {
  try {
    const { branchId } = req.body;
    if (!branchId) {
      return res.status(400).json({ success: false, message: 'branchId مطلوب' });
    }
    const result = await zatcaService.obtainProductionCsid(branchId);
    return res.status(result.success ? 200 : 400).json(result);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ─── 3. حالة اعتماد الفرع ─────────────────────────────────────────────────
/**
 * GET /api/zatca-phase2/credential-status/:branchId
 * فحص حالة اعتماد ZATCA للفرع
 */
router.get('/credential-status/:branchId', requireAuth, async (req, res) => {
  try {
    const result = await zatcaService.getCredentialStatus(req.params.branchId);
    return res.json({ success: true, data: result });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ─── 4. معالجة فاتورة كاملة ────────────────────────────────────────────────
/**
 * POST /api/zatca-phase2/invoice/process
 * معالجة فاتورة كاملة: بناء XML + PIH + Hash + QR + إرسال
 */
router.post('/invoice/process', requireAuth, async (req, res) => {
  try {
    const invoiceData = req.body;
    const required = [
      'invoiceDate',
      'sellerName',
      'sellerVatNumber',
      'buyerName',
      'taxableAmount',
      'vatAmount',
      'totalAmount',
    ];
    const missing = required.filter(f => invoiceData[f] === undefined || invoiceData[f] === null);
    if (missing.length) {
      return res.status(400).json({
        success: false,
        message: `الحقول المطلوبة: ${missing.join(', ')}`,
      });
    }

    const branchId = invoiceData.branchId || null;
    const result = await zatcaService.processInvoice(invoiceData, branchId);

    return res.json({
      success: true,
      message: 'تمت معالجة الفاتورة',
      data: {
        hash: result.hash,
        qrCode: result.qrCode,
        uuid: result.uuid,
        invoiceCounter: result.invoiceCounter,
        previousHash: result.previousHash,
        zatcaStatus: result.zatcaResult?.success
          ? 'submitted'
          : result.zatcaResult?.skipped
            ? 'skipped'
            : 'failed',
        zatcaResponse: result.zatcaResult?.data,
        zatcaError: result.zatcaResult?.error,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ─── 5. بناء XML فقط ───────────────────────────────────────────────────────
/**
 * POST /api/zatca-phase2/invoice/build-xml
 * بناء XML الفاتورة وفق UBL 2.1 بدون إرسال
 */
router.post('/invoice/build-xml', requireAuth, async (req, res) => {
  try {
    const invoiceData = req.body;
    const xml = zatcaService.buildInvoiceXml(invoiceData);
    const hash = zatcaService.calculateInvoiceHash(xml);
    const qrCode = zatcaService.generateQrCode(invoiceData);
    return res.json({ success: true, data: { xml, hash, qrCode } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ─── 6. توليد QR Code ─────────────────────────────────────────────────────
/**
 * POST /api/zatca-phase2/invoice/qr
 * توليد QR Code وفق مواصفات ZATCA (TLV Base64 - Tags 1-9)
 */
router.post('/invoice/qr', requireAuth, async (req, res) => {
  try {
    const {
      sellerName,
      sellerVatNumber,
      invoiceDate,
      invoiceTime,
      totalAmount,
      vatAmount,
      invoiceHash,
      phase2,
    } = req.body;
    if (
      !sellerName ||
      !sellerVatNumber ||
      !invoiceDate ||
      totalAmount == null ||
      vatAmount == null
    ) {
      return res.status(400).json({ success: false, message: 'بيانات QR ناقصة' });
    }
    const qrCode = zatcaService.generateQrCode(
      {
        sellerName,
        sellerVatNumber,
        invoiceDate,
        invoiceTime,
        totalAmount,
        vatAmount,
        invoiceHash,
      },
      { phase2: phase2 !== false }
    );
    return res.json({ success: true, data: { qrCode } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ─── 7. فك ترميز QR Code ──────────────────────────────────────────────────
/**
 * POST /api/zatca-phase2/invoice/qr/decode
 * فك ترميز QR Code وعرض البيانات المضمنة
 */
router.post('/invoice/qr/decode', requireAuth, (req, res) => {
  try {
    const { qrCode } = req.body;
    if (!qrCode) {
      return res.status(400).json({ success: false, message: 'qrCode مطلوب' });
    }
    const result = zatcaService.decodeQrCode(qrCode);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ─── 8. إرسال للتقرير (فاتورة مبسطة B2C) ────────────────────────────────
/**
 * POST /api/zatca-phase2/invoice/report
 * إرسال فاتورة مبسطة للإبلاغ (Simplified Invoice Reporting)
 */
router.post('/invoice/report', requireAuth, async (req, res) => {
  try {
    const { invoiceXml, invoiceHash, uuid, csid, secret } = req.body;
    if (!invoiceXml || !invoiceHash) {
      return res.status(400).json({ success: false, message: 'XML والـ hash مطلوبان' });
    }
    const result = await zatcaService.reportInvoice(invoiceXml, invoiceHash, {
      uuid,
      csid,
      secret,
    });
    return res.status(result.success ? 200 : 502).json({
      success: result.success,
      message: result.success ? 'تم الإبلاغ بنجاح' : 'فشل الإبلاغ',
      data: result.data,
      error: result.error,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ─── 9. إرسال للمقاصة (فاتورة ضريبية B2B) ───────────────────────────────
/**
 * POST /api/zatca-phase2/invoice/clear
 * إرسال فاتورة ضريبية للمقاصة (Standard Invoice Clearance)
 */
router.post('/invoice/clear', requireAuth, async (req, res) => {
  try {
    const { invoiceXml, invoiceHash, uuid, csid, secret } = req.body;
    if (!invoiceXml || !invoiceHash) {
      return res.status(400).json({ success: false, message: 'XML والـ hash مطلوبان' });
    }
    const result = await zatcaService.clearInvoice(invoiceXml, invoiceHash, { uuid, csid, secret });
    return res.status(result.success ? 200 : 502).json({
      success: result.success,
      message: result.success ? 'تمت المقاصة بنجاح' : 'فشلت المقاصة',
      data: result.data,
      error: result.error,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ─── 10. فحص التوافق ────────────────────────────────────────────────────────
/**
 * POST /api/zatca-phase2/compliance/check
 * فحص التوافق مع ZATCA لفاتورة معينة
 */
router.post('/compliance/check', requireAuth, async (req, res) => {
  try {
    const { invoiceXml, invoiceHash, csid, secret } = req.body;
    if (!invoiceXml || !invoiceHash) {
      return res.status(400).json({ success: false, message: 'XML والـ hash مطلوبان' });
    }
    const result = await zatcaService.checkCompliance(invoiceXml, invoiceHash, { csid, secret });
    return res.status(result.success ? 200 : 502).json({
      success: result.success,
      data: result.data,
      error: result.error,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ─── 11. حساب ضريبة القيمة المضافة ─────────────────────────────────────────
/**
 * POST /api/zatca-phase2/vat/calculate
 * حساب ضريبة القيمة المضافة السعودية (15%)
 */
router.post('/vat/calculate', requireAuth, (req, res) => {
  try {
    const { amount, rate } = req.body;
    if (amount == null || isNaN(parseFloat(amount))) {
      return res.status(400).json({ success: false, message: 'المبلغ مطلوب' });
    }
    const result = zatcaService.calculateVat(parseFloat(amount), rate ? parseFloat(rate) : 15);
    return res.json({ success: true, data: result });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ─── 12. التحقق من رقم الضريبة ─────────────────────────────────────────────
/**
 * POST /api/zatca-phase2/vat/validate
 * التحقق من صحة رقم الضريبة السعودي (15 رقم)
 */
router.post('/vat/validate', requireAuth, (req, res) => {
  try {
    const { vatNumber } = req.body;
    const isValid = zatcaService.validateVatNumber(vatNumber);
    return res.json({
      success: true,
      data: {
        vatNumber,
        isValid,
        message: isValid ? 'رقم ضريبة صحيح' : 'رقم ضريبة غير صحيح (يجب أن يكون 15 رقماً)',
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ─── 13. رموز CPT لمراكز التأهيل ───────────────────────────────────────────
/**
 * GET /api/zatca-phase2/cpt-codes
 * قائمة رموز CPT المستخدمة في مراكز تأهيل ذوي الإعاقة
 */
router.get('/cpt-codes', requireAuth, (req, res) => {
  try {
    const codes = zatcaService.getRehabCptCodes();
    const list = Object.entries(codes).map(([code, info]) => ({
      code,
      ...info,
    }));
    return res.json({
      success: true,
      data: list,
      total: list.length,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ─── 14. حالة الخدمة ────────────────────────────────────────────────────────
/**
 * GET /api/zatca-phase2/status
 * حالة تكامل ZATCA Phase 2
 */
router.get('/status', requireAuth, async (req, res) => {
  try {
    const branchId = req.query.branchId || null;
    let credentialStatus = null;
    if (branchId) {
      credentialStatus = await zatcaService.getCredentialStatus(branchId);
    }

    return res.json({
      success: true,
      data: {
        service: 'ZATCA Phase 2',
        env: process.env.ZATCA_ENV || 'sandbox',
        configured: !!(process.env.ZATCA_CSID && process.env.ZATCA_SECRET),
        features: [
          'UBL-2.1-XML',
          'SHA256-Hash-Chain',
          'TLV-QR-Tags-1-9',
          'PIH-Chain',
          'ICV-Counter',
          'Onboarding-CSID',
          'Clearance-API-B2B',
          'Reporting-API-B2C',
          'Compliance-Check',
          'VAT-Calculator',
          'CPT-Codes-Rehab',
        ],
        invoiceTypes: {
          388: 'فاتورة ضريبية (Tax Invoice)',
          381: 'إشعار دائن (Credit Note)',
          383: 'إشعار مدين (Debit Note)',
        },
        subtypes: {
          '0100000': 'B2B (Clearance)',
          '0200000': 'B2C (Reporting)',
        },
        credentialStatus,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
