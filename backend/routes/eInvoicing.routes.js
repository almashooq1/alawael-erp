/**
 * E-Invoicing Routes (ZATCA Compliant)
 * مسارات الفواتير الإلكترونية
 */
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const logger = require('../utils/logger');
const EInvoice = require('../models/EInvoice');
const safeError = require('../utils/safeError');

router.use(authenticate);

// ─── Stats summary (before /:id) ────────────────────────────────────────────
router.get('/stats/summary', async (req, res) => {
  try {
    const [total, byStatus] = await Promise.all([
      EInvoice.countDocuments(),
      EInvoice.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 }, totalAmount: { $sum: '$totalAmount' } } },
      ]),
    ]);
    const stats = { total, draft: 0, issued: 0, paid: 0, cancelled: 0, totalRevenue: 0 };
    byStatus.forEach(s => {
      const key = (s._id || '').toLowerCase();
      if (stats[key] !== undefined) stats[key] = s.count;
      if (key === 'paid') stats.totalRevenue = s.totalAmount;
    });
    res.json({ success: true, data: stats, message: 'إحصائيات الفواتير' });
  } catch (error) {
    safeError(res, error, 'fetching invoice stats');
  }
});

// ─── List invoices ───────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { status, type, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (type) filter.invoiceType = type;
    const skip = (Math.max(1, +page) - 1) * +limit;
    const [data, total] = await Promise.all([
      EInvoice.find(filter).sort({ createdAt: -1 }).skip(skip).limit(+limit).lean(),
      EInvoice.countDocuments(filter),
    ]);
    res.json({
      success: true,
      data,
      pagination: { page: +page, limit: +limit, total },
      message: 'قائمة الفواتير',
    });
  } catch (error) {
    safeError(res, error, 'fetching invoices');
  }
});

// ─── Get single invoice ──────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const invoice = await EInvoice.findById(req.params.id).lean();
    if (!invoice) return res.status(404).json({ success: false, message: 'الفاتورة غير موجودة' });
    res.json({ success: true, data: invoice, message: 'بيانات الفاتورة' });
  } catch (error) {
    safeError(res, error, 'fetching invoice');
  }
});

// ─── Create invoice ──────────────────────────────────────────────────────────
router.post(
  '/',
  authorize(['admin', 'manager', 'accountant']),
  validate([
    body('lineItems').isArray({ min: 1 }).withMessage('يجب إضافة بند واحد على الأقل'),
    body('buyer').optional().isObject().withMessage('بيانات المشتري غير صالحة'),
    body('invoiceType')
      .optional()
      .isIn(['standard', 'simplified', 'debit_note', 'credit_note'])
      .withMessage('نوع الفاتورة غير صالح'),
  ]),
  async (req, res) => {
    try {
      const { invoiceType, buyer, lineItems } = req.body;
      if (!lineItems || lineItems.length === 0) {
        return res.status(400).json({ success: false, message: 'يجب إضافة بند واحد على الأقل' });
      }
      const count = await EInvoice.countDocuments();
      const invoiceNumber = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
      const invoice = await EInvoice.create({
        invoiceNumber,
        invoiceType: invoiceType || 'standard',
        issueDate: new Date(),
        buyer,
        lineItems,
        seller: req.body.seller || { name: 'مركز الأوائل للتأهيل' },
        status: 'draft',
        createdBy: req.user.id,
      });
      res.status(201).json({ success: true, data: invoice, message: 'تم إنشاء الفاتورة بنجاح' });
    } catch (error) {
      safeError(res, error, 'creating invoice');
    }
  }
);

// ─── Submit to ZATCA ─────────────────────────────────────────────────────────
router.post('/:id/submit-zatca', authorize(['admin', 'manager']), async (req, res) => {
  try {
    const invoice = await EInvoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ success: false, message: 'الفاتورة غير موجودة' });
    invoice.status = 'issued';
    invoice.zatcaStatus = 'submitted';
    invoice.zatcaSubmissionDate = new Date();
    await invoice.save();
    res.json({ success: true, data: invoice, message: 'تم إرسال الفاتورة إلى زاتكا' });
  } catch (error) {
    safeError(res, error, 'submitting to ZATCA');
  }
});

// ─── Generate QR code ────────────────────────────────────────────────────────
router.get('/:id/qr', async (req, res) => {
  try {
    const invoice = await EInvoice.findById(req.params.id).lean();
    if (!invoice) return res.status(404).json({ success: false, message: 'الفاتورة غير موجودة' });
    const qrData = Buffer.from(
      JSON.stringify({
        seller: invoice.seller?.name,
        vat: invoice.seller?.vatNumber,
        date: invoice.issueDate,
        total: invoice.totalAmount,
        tax: invoice.vatAmount,
      })
    ).toString('base64');
    res.json({
      success: true,
      data: { qrCode: qrData, invoiceNumber: invoice.invoiceNumber },
      message: 'رمز QR للفاتورة',
    });
  } catch (error) {
    safeError(res, error, 'generating QR');
  }
});

module.exports = router;
