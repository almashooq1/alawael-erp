/**
 * ZATCA Phase 2 Routes — مسارات هيئة الزكاة (المرحلة الثانية)
 * الفوترة الإلكترونية — منصة فاتورة FATOORA
 */
'use strict';

const express = require('express');
const router = express.Router();
const zatcaService = require('../services/zatca-phase2.service');
const { requireAuth } = require('../middleware/auth.middleware');

// ─── معالجة فاتورة كاملة (بناء XML + QR + إرسال) ─────────────────────────
/**
 * POST /api/zatca-phase2/invoice/process
 * معالجة فاتورة كاملة وإرسالها لـ FATOORA
 */
router.post('/invoice/process', requireAuth, async (req, res) => {
  try {
    const invoiceData = req.body;
    const required = [
      'invoiceNumber',
      'invoiceDate',
      'sellerName',
      'sellerVatNumber',
      'buyerName',
      'taxableAmount',
      'vatAmount',
      'totalAmount',
    ];
    const missing = required.filter(f => !invoiceData[f]);
    if (missing.length) {
      return res
        .status(400)
        .json({ success: false, message: `الحقول المطلوبة: ${missing.join(', ')}` });
    }
    const result = await zatcaService.processInvoice(invoiceData);
    return res.json({
      success: true,
      message: 'تمت معالجة الفاتورة',
      data: {
        hash: result.hash,
        qrCode: result.qrCode,
        uuid: result.uuid,
        zatcaStatus: result.zatcaResult?.success ? 'submitted' : 'failed',
        zatcaResponse: result.zatcaResult?.data,
        zatcaError: result.zatcaResult?.error,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ─── بناء XML فقط (بدون إرسال) ────────────────────────────────────────────
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

// ─── توليد QR Code فقط ────────────────────────────────────────────────────
/**
 * POST /api/zatca-phase2/invoice/qr
 * توليد QR Code وفق مواصفات ZATCA (TLV Base64)
 */
router.post('/invoice/qr', requireAuth, async (req, res) => {
  try {
    const { sellerName, sellerVatNumber, invoiceDate, invoiceTime, totalAmount, vatAmount } =
      req.body;
    if (
      !sellerName ||
      !sellerVatNumber ||
      !invoiceDate ||
      totalAmount == null ||
      vatAmount == null
    ) {
      return res.status(400).json({ success: false, message: 'بيانات QR ناقصة' });
    }
    const qrCode = zatcaService.generateQrCode({
      sellerName,
      sellerVatNumber,
      invoiceDate,
      invoiceTime,
      totalAmount,
      vatAmount,
    });
    return res.json({ success: true, data: { qrCode } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ─── إرسال للتقرير (فاتورة مبسطة) ────────────────────────────────────────
/**
 * POST /api/zatca-phase2/invoice/report
 * إرسال فاتورة مبسطة للإبلاغ (Simplified Invoice Reporting)
 */
router.post('/invoice/report', requireAuth, async (req, res) => {
  try {
    const { invoiceXml, invoiceHash } = req.body;
    if (!invoiceXml || !invoiceHash) {
      return res.status(400).json({ success: false, message: 'XML والـ hash مطلوبان' });
    }
    const result = await zatcaService.reportInvoice(invoiceXml, invoiceHash);
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

// ─── إرسال للمقاصة (فاتورة ضريبية) ──────────────────────────────────────
/**
 * POST /api/zatca-phase2/invoice/clear
 * إرسال فاتورة ضريبية للمقاصة (Standard Invoice Clearance)
 */
router.post('/invoice/clear', requireAuth, async (req, res) => {
  try {
    const { invoiceXml, invoiceHash } = req.body;
    if (!invoiceXml || !invoiceHash) {
      return res.status(400).json({ success: false, message: 'XML والـ hash مطلوبان' });
    }
    const result = await zatcaService.clearInvoice(invoiceXml, invoiceHash);
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

// ─── فحص التوافق ─────────────────────────────────────────────────────────
/**
 * POST /api/zatca-phase2/compliance/check
 * فحص التوافق مع ZATCA لفاتورة معينة
 */
router.post('/compliance/check', requireAuth, async (req, res) => {
  try {
    const { invoiceXml, invoiceHash } = req.body;
    if (!invoiceXml || !invoiceHash) {
      return res.status(400).json({ success: false, message: 'XML والـ hash مطلوبان' });
    }
    const result = await zatcaService.checkCompliance(invoiceXml, invoiceHash);
    return res.status(result.success ? 200 : 502).json({
      success: result.success,
      data: result.data,
      error: result.error,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ─── حالة الخدمة ──────────────────────────────────────────────────────────
/**
 * GET /api/zatca-phase2/status
 * حالة تكامل ZATCA
 */
router.get('/status', requireAuth, (req, res) => {
  return res.json({
    success: true,
    data: {
      service: 'ZATCA Phase 2',
      env: process.env.ZATCA_ENV || 'sandbox',
      configured: !!(process.env.ZATCA_CSID && process.env.ZATCA_SECRET),
      features: [
        'XML-UBL2.1',
        'SHA256-Hash',
        'TLV-QR',
        'Reporting-API',
        'Clearance-API',
        'Compliance-Check',
      ],
    },
  });
});

module.exports = router;
