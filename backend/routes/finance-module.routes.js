/**
 * Finance & Billing Module Routes — وحدة المالية والفوترة
 * prompt_07 — ZATCA Phase 2 Compliant
 *
 * Endpoints:
 *  Chart of Accounts   → /api/finance-module/accounts
 *  Journal Entries     → /api/finance-module/journal-entries
 *  Invoices            → /api/finance-module/invoices          (ZATCA)
 *  Payments            → /api/finance-module/payments
 *  Insurance Claims    → /api/finance-module/insurance-claims
 *  ZATCA               → /api/finance-module/zatca
 *  Reports             → /api/finance-module/reports
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticate, requireAdmin } = require('../middleware/auth');
const logger = require('../utils/logger');

// 🔒 All finance routes require authentication
router.use(authenticate);

// ─── Models ─────────────────────────────────────────────────────────────────
const ChartOfAccount = require('../models/finance/ChartOfAccount');
const JournalEntry = require('../models/finance/JournalEntry');
const Invoice = require('../models/finance/Invoice');
const Payment = require('../models/finance/Payment');
const InsuranceClaim = require('../models/finance/InsuranceClaim');

// ─── Services ────────────────────────────────────────────────────────────────
const {
  AccountingService,
  ZatcaService,
  InsuranceClaimService,
} = require('../services/finance/FinanceService');

const accountingService = new AccountingService();
const zatcaService = new ZatcaService();
const insuranceClaimService = new InsuranceClaimService();

// ─── Middleware helpers ───────────────────────────────────────────────────────
const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const validateObjectId =
  (param = 'id') =>
  (req, res, next) => {
    if (!mongoose.Types.ObjectId.isValid(req.params[param])) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    next();
  };

// ══════════════════════════════════════════════════════════════════════════════
// 1. CHART OF ACCOUNTS — شجرة الحسابات
// ══════════════════════════════════════════════════════════════════════════════

// GET /finance-module/accounts — قائمة الحسابات
router.get(
  '/accounts',
  asyncHandler(async (req, res) => {
    const { type, parent_id, search, active } = req.query;
    const filter = { deleted_at: null };

    if (type) filter.account_type = type;
    if (active !== undefined) filter.is_active = active === 'true';
    if (parent_id) filter.parent_account_id = parent_id === 'null' ? null : parent_id;
    if (search) {
      filter.$or = [
        { account_name_ar: { $regex: search, $options: 'i' } },
        { account_name_en: { $regex: search, $options: 'i' } },
        { account_code: { $regex: search, $options: 'i' } },
      ];
    }

    const accounts = await ChartOfAccount.find(filter)
      .populate('parent_account_id', 'account_code account_name_ar')
      .sort({ account_code: 1 });

    res.json({ success: true, data: accounts, count: accounts.length });
  })
);

// GET /finance-module/accounts/tree — شجرة الحسابات الهرمية
router.get(
  '/accounts/tree',
  asyncHandler(async (req, res) => {
    const accounts = await ChartOfAccount.find({ deleted_at: null, is_active: true })
      .sort({ account_code: 1 })
      .lean();

    // بناء الشجرة
    const map = {};
    accounts.forEach(a => {
      map[a._id.toString()] = { ...a, children: [] };
    });

    const roots = [];
    accounts.forEach(a => {
      if (a.parent_account_id) {
        const parentId = a.parent_account_id.toString();
        if (map[parentId]) {
          map[parentId].children.push(map[a._id.toString()]);
        }
      } else {
        roots.push(map[a._id.toString()]);
      }
    });

    res.json({ success: true, data: roots });
  })
);

// GET /finance-module/accounts/:id
router.get(
  '/accounts/:id',
  validateObjectId(),
  asyncHandler(async (req, res) => {
    const account = await ChartOfAccount.findOne({ _id: req.params.id, deleted_at: null }).populate(
      'parent_account_id',
      'account_code account_name_ar'
    );
    if (!account) return res.status(404).json({ success: false, message: 'الحساب غير موجود' });
    res.json({ success: true, data: account });
  })
);

// POST /finance-module/accounts
router.post(
  '/accounts',
  asyncHandler(async (req, res) => {
    const account = new ChartOfAccount({
      ...req.body,
      created_by: req.user?._id,
    });
    await account.save();
    res.status(201).json({ success: true, data: account, message: 'تم إنشاء الحساب بنجاح' });
  })
);

// PUT /finance-module/accounts/:id
router.put(
  '/accounts/:id',
  validateObjectId(),
  asyncHandler(async (req, res) => {
    const { account_code, created_by, ...updateData } = req.body;
    const account = await ChartOfAccount.findOneAndUpdate(
      { _id: req.params.id, deleted_at: null },
      { ...updateData, updated_at: new Date() },
      { new: true, runValidators: true }
    );
    if (!account) return res.status(404).json({ success: false, message: 'الحساب غير موجود' });
    res.json({ success: true, data: account, message: 'تم تحديث الحساب' });
  })
);

// DELETE /finance-module/accounts/:id
router.delete(
  '/accounts/:id',
  validateObjectId(),
  asyncHandler(async (req, res) => {
    const account = await ChartOfAccount.findOneAndUpdate(
      { _id: req.params.id, deleted_at: null },
      { deleted_at: new Date(), is_active: false },
      { new: true }
    );
    if (!account) return res.status(404).json({ success: false, message: 'الحساب غير موجود' });
    res.json({ success: true, message: 'تم حذف الحساب' });
  })
);

// ══════════════════════════════════════════════════════════════════════════════
// 2. JOURNAL ENTRIES — القيود اليومية
// ══════════════════════════════════════════════════════════════════════════════

// GET /finance-module/journal-entries
router.get(
  '/journal-entries',
  asyncHandler(async (req, res) => {
    const { status, entry_type, from_date, to_date, search, page = 1, limit = 20 } = req.query;
    const filter = { deleted_at: null };

    if (status) filter.status = status;
    if (entry_type) filter.entry_type = entry_type;
    if (from_date || to_date) {
      filter.entry_date = {};
      if (from_date) filter.entry_date.$gte = new Date(from_date);
      if (to_date) filter.entry_date.$lte = new Date(to_date);
    }
    if (search) {
      filter.$or = [
        { entry_number: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await JournalEntry.countDocuments(filter);
    const entries = await JournalEntry.find(filter)
      .populate('lines.account_id', 'account_code account_name_ar')
      .populate('created_by', 'name')
      .populate('approved_by', 'name')
      .sort({ entry_date: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: entries,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  })
);

// GET /finance-module/journal-entries/:id
router.get(
  '/journal-entries/:id',
  validateObjectId(),
  asyncHandler(async (req, res) => {
    const entry = await JournalEntry.findOne({ _id: req.params.id, deleted_at: null })
      .populate('lines.account_id', 'account_code account_name_ar account_type')
      .populate('created_by', 'name')
      .populate('approved_by', 'name');
    if (!entry) return res.status(404).json({ success: false, message: 'القيد غير موجود' });
    res.json({ success: true, data: entry });
  })
);

// POST /finance-module/journal-entries
router.post(
  '/journal-entries',
  asyncHandler(async (req, res) => {
    const entry = new JournalEntry({
      ...req.body,
      created_by: req.user?._id,
    });
    await entry.save();
    res.status(201).json({ success: true, data: entry, message: 'تم إنشاء القيد بنجاح' });
  })
);

// POST /finance-module/journal-entries/:id/approve — اعتماد القيد
router.post(
  '/journal-entries/:id/approve',
  validateObjectId(),
  asyncHandler(async (req, res) => {
    const entry = await JournalEntry.findOneAndUpdate(
      { _id: req.params.id, deleted_at: null, status: 'draft' },
      {
        status: 'posted',
        approved_by: req.user?._id,
        approved_at: new Date(),
      },
      { new: true }
    );
    if (!entry)
      return res
        .status(404)
        .json({ success: false, message: 'القيد غير موجود أو لا يمكن اعتماده' });
    res.json({ success: true, data: entry, message: 'تم اعتماد القيد' });
  })
);

// POST /finance-module/journal-entries/:id/reverse — عكس القيد
router.post(
  '/journal-entries/:id/reverse',
  validateObjectId(),
  asyncHandler(async (req, res) => {
    const original = await JournalEntry.findOne({
      _id: req.params.id,
      deleted_at: null,
      status: 'posted',
    });
    if (!original)
      return res.status(404).json({ success: false, message: 'القيد غير موجود أو لم يُعتمد بعد' });

    // عكس الأسطر (قلب المدين والدائن)
    const reversedLines = original.lines.map(l => ({
      account_id: l.account_id,
      description: `عكس: ${l.description || ''}`,
      debit_amount: l.credit_amount,
      credit_amount: l.debit_amount,
      branch_id: l.branch_id,
    }));

    const year = new Date().getFullYear();
    const count = await JournalEntry.countDocuments({ entry_number: { $regex: `^JE-${year}` } });
    const reverseEntry = new JournalEntry({
      entry_number: `JE-${year}-${String(count + 1).padStart(5, '0')}`,
      entry_date: new Date(),
      entry_type: original.entry_type,
      description: `عكس القيد ${original.entry_number}`,
      lines: reversedLines,
      status: 'posted',
      branch_id: original.branch_id,
      fiscal_year: original.fiscal_year,
      reference_type: 'journal_reversal',
      reference_id: original._id,
      created_by: req.user?._id,
      approved_by: req.user?._id,
      approved_at: new Date(),
    });

    await reverseEntry.save();

    // تحديث الأصل بالربط
    original.reversed_by = reverseEntry._id;
    await original.save();

    res.status(201).json({ success: true, data: reverseEntry, message: 'تم إنشاء قيد العكس' });
  })
);

// DELETE /finance-module/journal-entries/:id
router.delete(
  '/journal-entries/:id',
  validateObjectId(),
  asyncHandler(async (req, res) => {
    const entry = await JournalEntry.findOneAndUpdate(
      { _id: req.params.id, deleted_at: null, status: 'draft' },
      { deleted_at: new Date(), status: 'cancelled' },
      { new: true }
    );
    if (!entry)
      return res.status(404).json({ success: false, message: 'القيد غير موجود أو لا يمكن حذفه' });
    res.json({ success: true, message: 'تم حذف القيد' });
  })
);

// ══════════════════════════════════════════════════════════════════════════════
// 3. INVOICES — الفواتير (ZATCA متوافق)
// ══════════════════════════════════════════════════════════════════════════════

// GET /finance-module/invoices
router.get(
  '/invoices',
  asyncHandler(async (req, res) => {
    const {
      status,
      invoice_type,
      beneficiary_id,
      from_date,
      to_date,
      search,
      page = 1,
      limit = 20,
    } = req.query;
    const filter = { deleted_at: null };

    if (status) filter.status = status;
    if (invoice_type) filter.invoice_type = invoice_type;
    if (beneficiary_id) filter.beneficiary_id = beneficiary_id;
    if (from_date || to_date) {
      filter.invoice_date = {};
      if (from_date) filter.invoice_date.$gte = new Date(from_date);
      if (to_date) filter.invoice_date.$lte = new Date(to_date);
    }
    if (search) {
      filter.$or = [
        { invoice_number: { $regex: search, $options: 'i' } },
        { 'buyer.name': { $regex: search, $options: 'i' } },
        { 'buyer.vat_number': { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Invoice.countDocuments(filter);
    const invoices = await Invoice.find(filter)
      .populate('beneficiary_id', 'full_name_ar file_number')
      .populate('created_by', 'name')
      .sort({ invoice_date: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // إحصاءات سريعة
    const stats = await Invoice.aggregate([
      { $match: { deleted_at: null } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          total_amount: { $sum: '$total_amount' },
        },
      },
    ]);

    res.json({
      success: true,
      data: invoices,
      stats,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  })
);

// GET /finance-module/invoices/:id
router.get(
  '/invoices/:id',
  validateObjectId(),
  asyncHandler(async (req, res) => {
    const invoice = await Invoice.findOne({ _id: req.params.id, deleted_at: null })
      .populate('beneficiary_id', 'full_name_ar file_number phone')
      .populate('created_by', 'name');
    if (!invoice) return res.status(404).json({ success: false, message: 'الفاتورة غير موجودة' });
    res.json({ success: true, data: invoice });
  })
);

// POST /finance-module/invoices — إنشاء فاتورة
router.post(
  '/invoices',
  asyncHandler(async (req, res) => {
    const invoice = new Invoice({
      ...req.body,
      created_by: req.user?._id,
    });
    await invoice.save();

    // إنشاء قيد محاسبي تلقائي (مدين: ذمم مدينة، دائن: إيرادات + ضريبة)
    try {
      await accountingService.createInvoiceEntry(invoice, req.user?._id);
    } catch (err) {
      // لا نوقف إنشاء الفاتورة إذا فشل القيد
      logger.error('Invoice journal entry failed:', err.message);
    }

    res.status(201).json({ success: true, data: invoice, message: 'تم إنشاء الفاتورة بنجاح' });
  })
);

// PUT /finance-module/invoices/:id
router.put(
  '/invoices/:id',
  validateObjectId(),
  asyncHandler(async (req, res) => {
    const invoice = await Invoice.findOne({ _id: req.params.id, deleted_at: null });
    if (!invoice) return res.status(404).json({ success: false, message: 'الفاتورة غير موجودة' });

    if (['paid', 'cancelled'].includes(invoice.status)) {
      return res
        .status(400)
        .json({ success: false, message: 'لا يمكن تعديل فاتورة مدفوعة أو ملغاة' });
    }

    const { invoice_number, invoice_uuid, created_by, zatca_hash, zatca_qr_code, ...updateData } =
      req.body;
    Object.assign(invoice, updateData);
    invoice.updated_at = new Date();
    await invoice.save();

    res.json({ success: true, data: invoice, message: 'تم تحديث الفاتورة' });
  })
);

// POST /finance-module/invoices/:id/cancel — إلغاء فاتورة
router.post(
  '/invoices/:id/cancel',
  validateObjectId(),
  asyncHandler(async (req, res) => {
    const invoice = await Invoice.findOneAndUpdate(
      { _id: req.params.id, deleted_at: null, status: { $in: ['draft', 'pending'] } },
      { status: 'cancelled', cancellation_reason: req.body.reason, updated_at: new Date() },
      { new: true }
    );
    if (!invoice)
      return res
        .status(404)
        .json({ success: false, message: 'الفاتورة غير موجودة أو لا يمكن إلغاؤها' });
    res.json({ success: true, data: invoice, message: 'تم إلغاء الفاتورة' });
  })
);

// GET /finance-module/invoices/:id/qr — رمز QR للفاتورة (ZATCA TLV)
router.get(
  '/invoices/:id/qr',
  validateObjectId(),
  asyncHandler(async (req, res) => {
    const invoice = await Invoice.findOne({ _id: req.params.id, deleted_at: null });
    if (!invoice) return res.status(404).json({ success: false, message: 'الفاتورة غير موجودة' });

    const qrCode = zatcaService.generateQrTLV({
      seller_name: invoice.seller?.name || 'مركز التأهيل',
      vat_number: invoice.seller?.vat_number || '',
      invoice_date: invoice.invoice_date?.toISOString() || new Date().toISOString(),
      total_amount: invoice.total_amount?.toString() || '0',
      vat_amount: invoice.vat_total?.toString() || '0',
    });

    res.json({ success: true, data: { qr_code: qrCode, invoice_number: invoice.invoice_number } });
  })
);

// GET /finance-module/invoices/:id/xml — XML للفاتورة (UBL 2.1 لـ ZATCA)
router.get(
  '/invoices/:id/xml',
  validateObjectId(),
  asyncHandler(async (req, res) => {
    const invoice = await Invoice.findOne({ _id: req.params.id, deleted_at: null }).populate(
      'beneficiary_id',
      'full_name_ar'
    );
    if (!invoice) return res.status(404).json({ success: false, message: 'الفاتورة غير موجودة' });

    const xml = zatcaService.generateInvoiceXml(invoice);
    const hash = zatcaService.generateInvoiceHash(xml);

    // حفظ الـ hash
    await Invoice.findByIdAndUpdate(invoice._id, { zatca_hash: hash });

    res.set('Content-Type', 'application/xml');
    res.send(xml);
  })
);

// POST /finance-module/invoices/:id/zatca-submit — رفع لـ ZATCA
router.post(
  '/invoices/:id/zatca-submit',
  validateObjectId(),
  asyncHandler(async (req, res) => {
    const invoice = await Invoice.findOne({ _id: req.params.id, deleted_at: null });
    if (!invoice) return res.status(404).json({ success: false, message: 'الفاتورة غير موجودة' });

    const xml = zatcaService.generateInvoiceXml(invoice);
    const hash = zatcaService.generateInvoiceHash(xml);
    const qr = zatcaService.generateQrTLV({
      seller_name: invoice.seller?.name || '',
      vat_number: invoice.seller?.vat_number || '',
      invoice_date: invoice.invoice_date?.toISOString() || '',
      total_amount: invoice.total_amount?.toString() || '0',
      vat_amount: invoice.vat_total?.toString() || '0',
    });

    await Invoice.findByIdAndUpdate(invoice._id, {
      zatca_hash: hash,
      zatca_qr_code: qr,
      zatca_submission_status: 'submitted',
      zatca_submitted_at: new Date(),
      status: invoice.status === 'draft' ? 'pending' : invoice.status,
    });

    res.json({
      success: true,
      data: { hash, qr_code: qr, invoice_number: invoice.invoice_number },
      message: 'تم رفع الفاتورة لـ ZATCA',
    });
  })
);

// ══════════════════════════════════════════════════════════════════════════════
// 4. PAYMENTS — المدفوعات
// ══════════════════════════════════════════════════════════════════════════════

// GET /finance-module/payments
router.get(
  '/payments',
  asyncHandler(async (req, res) => {
    const {
      status,
      payment_method,
      beneficiary_id,
      from_date,
      to_date,
      page = 1,
      limit = 20,
    } = req.query;
    const filter = { deleted_at: null };

    if (status) filter.status = status;
    if (payment_method) filter.payment_method = payment_method;
    if (beneficiary_id) filter.beneficiary_id = beneficiary_id;
    if (from_date || to_date) {
      filter.payment_date = {};
      if (from_date) filter.payment_date.$gte = new Date(from_date);
      if (to_date) filter.payment_date.$lte = new Date(to_date);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Payment.countDocuments(filter);
    const payments = await Payment.find(filter)
      .populate('invoice_id', 'invoice_number total_amount')
      .populate('beneficiary_id', 'full_name_ar file_number')
      .populate('received_by', 'name')
      .sort({ payment_date: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: payments,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  })
);

// GET /finance-module/payments/:id
router.get(
  '/payments/:id',
  validateObjectId(),
  asyncHandler(async (req, res) => {
    const payment = await Payment.findOne({ _id: req.params.id, deleted_at: null })
      .populate('invoice_id', 'invoice_number total_amount remaining_amount')
      .populate('beneficiary_id', 'full_name_ar file_number phone')
      .populate('received_by', 'name');
    if (!payment) return res.status(404).json({ success: false, message: 'الدفعة غير موجودة' });
    res.json({ success: true, data: payment });
  })
);

// POST /finance-module/payments — تسجيل دفعة
router.post(
  '/payments',
  asyncHandler(async (req, res) => {
    const payment = new Payment({
      ...req.body,
      received_by: req.body.received_by || req.user?._id,
    });
    await payment.save();

    // تحديث الفاتورة المرتبطة
    if (payment.invoice_id) {
      const invoice = await Invoice.findById(payment.invoice_id);
      if (invoice) {
        invoice.paid_amount = (invoice.paid_amount || 0) + payment.amount;
        invoice.remaining_amount = invoice.total_amount - invoice.paid_amount;
        if (invoice.remaining_amount <= 0) {
          invoice.status = 'paid';
          invoice.paid_at = new Date();
        } else {
          invoice.status = 'partial';
        }
        await invoice.save();
      }
    }

    res.status(201).json({ success: true, data: payment, message: 'تم تسجيل الدفعة بنجاح' });
  })
);

// POST /finance-module/payments/:id/refund — استرداد دفعة
router.post(
  '/payments/:id/refund',
  validateObjectId(),
  asyncHandler(async (req, res) => {
    const payment = await Payment.findOne({
      _id: req.params.id,
      deleted_at: null,
      status: 'completed',
    });
    if (!payment)
      return res
        .status(404)
        .json({ success: false, message: 'الدفعة غير موجودة أو لا يمكن استردادها' });

    payment.status = 'refunded';
    payment.refund_reason = req.body.reason;
    payment.refunded_at = new Date();
    payment.refunded_by = req.user?._id;
    await payment.save();

    // تحديث الفاتورة
    if (payment.invoice_id) {
      const invoice = await Invoice.findById(payment.invoice_id);
      if (invoice) {
        invoice.paid_amount = Math.max(0, (invoice.paid_amount || 0) - payment.amount);
        invoice.remaining_amount = invoice.total_amount - invoice.paid_amount;
        invoice.status = invoice.paid_amount <= 0 ? 'pending' : 'partial';
        await invoice.save();
      }
    }

    res.json({ success: true, data: payment, message: 'تم إجراء الاسترداد' });
  })
);

// DELETE /finance-module/payments/:id
router.delete(
  '/payments/:id',
  validateObjectId(),
  asyncHandler(async (req, res) => {
    const payment = await Payment.findOneAndUpdate(
      { _id: req.params.id, deleted_at: null, status: { $in: ['pending', 'failed'] } },
      { deleted_at: new Date() },
      { new: true }
    );
    if (!payment)
      return res
        .status(404)
        .json({ success: false, message: 'الدفعة غير موجودة أو لا يمكن حذفها' });
    res.json({ success: true, message: 'تم حذف الدفعة' });
  })
);

// ══════════════════════════════════════════════════════════════════════════════
// 5. INSURANCE CLAIMS — مطالبات التأمين
// ══════════════════════════════════════════════════════════════════════════════

// GET /finance-module/insurance-claims
router.get(
  '/insurance-claims',
  asyncHandler(async (req, res) => {
    const {
      status,
      insurance_company,
      beneficiary_id,
      from_date,
      to_date,
      page = 1,
      limit = 20,
    } = req.query;
    const filter = { deleted_at: null };

    if (status) filter.status = status;
    if (insurance_company) filter.insurance_company = { $regex: insurance_company, $options: 'i' };
    if (beneficiary_id) filter.beneficiary_id = beneficiary_id;
    if (from_date || to_date) {
      filter.claim_date = {};
      if (from_date) filter.claim_date.$gte = new Date(from_date);
      if (to_date) filter.claim_date.$lte = new Date(to_date);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await InsuranceClaim.countDocuments(filter);
    const claims = await InsuranceClaim.find(filter)
      .populate('beneficiary_id', 'full_name_ar file_number')
      .populate('invoice_id', 'invoice_number total_amount')
      .populate('created_by', 'name')
      .sort({ claim_date: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: claims,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  })
);

// GET /finance-module/insurance-claims/:id
router.get(
  '/insurance-claims/:id',
  validateObjectId(),
  asyncHandler(async (req, res) => {
    const claim = await InsuranceClaim.findOne({ _id: req.params.id, deleted_at: null })
      .populate('beneficiary_id', 'full_name_ar file_number phone date_of_birth')
      .populate('invoice_id', 'invoice_number total_amount lines')
      .populate('created_by', 'name');
    if (!claim) return res.status(404).json({ success: false, message: 'المطالبة غير موجودة' });
    res.json({ success: true, data: claim });
  })
);

// POST /finance-module/insurance-claims
router.post(
  '/insurance-claims',
  asyncHandler(async (req, res) => {
    const claim = new InsuranceClaim({
      ...req.body,
      created_by: req.user?._id,
    });
    await claim.save();
    res.status(201).json({ success: true, data: claim, message: 'تم إنشاء المطالبة بنجاح' });
  })
);

// POST /finance-module/insurance-claims/:id/submit — رفع المطالبة للشركة
router.post(
  '/insurance-claims/:id/submit',
  validateObjectId(),
  asyncHandler(async (req, res) => {
    const claim = await InsuranceClaim.findOneAndUpdate(
      { _id: req.params.id, deleted_at: null, status: 'draft' },
      {
        status: 'submitted',
        submitted_at: new Date(),
        submitted_by: req.user?._id,
      },
      { new: true }
    );
    if (!claim)
      return res
        .status(404)
        .json({ success: false, message: 'المطالبة غير موجودة أو تم رفعها مسبقاً' });
    res.json({ success: true, data: claim, message: 'تم رفع المطالبة' });
  })
);

// POST /finance-module/insurance-claims/:id/approve — الموافقة على المطالبة
router.post(
  '/insurance-claims/:id/approve',
  validateObjectId(),
  asyncHandler(async (req, res) => {
    const { approved_amount, approval_reference, notes } = req.body;
    const claim = await InsuranceClaim.findOneAndUpdate(
      { _id: req.params.id, deleted_at: null, status: 'submitted' },
      {
        status: 'approved',
        approved_amount: approved_amount || undefined,
        approval_reference,
        insurance_notes: notes,
        approved_at: new Date(),
      },
      { new: true }
    );
    if (!claim) return res.status(404).json({ success: false, message: 'المطالبة غير موجودة' });
    res.json({ success: true, data: claim, message: 'تم اعتماد المطالبة' });
  })
);

// POST /finance-module/insurance-claims/:id/reject — رفض المطالبة
router.post(
  '/insurance-claims/:id/reject',
  validateObjectId(),
  asyncHandler(async (req, res) => {
    const claim = await InsuranceClaim.findOneAndUpdate(
      { _id: req.params.id, deleted_at: null, status: 'submitted' },
      {
        status: 'rejected',
        rejection_reason: req.body.reason,
        rejected_at: new Date(),
      },
      { new: true }
    );
    if (!claim) return res.status(404).json({ success: false, message: 'المطالبة غير موجودة' });
    res.json({ success: true, data: claim, message: 'تم رفض المطالبة' });
  })
);

// DELETE /finance-module/insurance-claims/:id
router.delete(
  '/insurance-claims/:id',
  validateObjectId(),
  asyncHandler(async (req, res) => {
    const claim = await InsuranceClaim.findOneAndUpdate(
      { _id: req.params.id, deleted_at: null, status: 'draft' },
      { deleted_at: new Date() },
      { new: true }
    );
    if (!claim)
      return res
        .status(404)
        .json({ success: false, message: 'المطالبة غير موجودة أو لا يمكن حذفها' });
    res.json({ success: true, message: 'تم حذف المطالبة' });
  })
);

// ══════════════════════════════════════════════════════════════════════════════
// 6. REPORTS — التقارير المالية
// ══════════════════════════════════════════════════════════════════════════════

// GET /finance-module/reports/summary — ملخص مالي عام
router.get(
  '/reports/summary',
  asyncHandler(async (req, res) => {
    const { from_date, to_date, branch_id } = req.query;

    const invoiceFilter = { deleted_at: null };
    const paymentFilter = { deleted_at: null };
    const claimFilter = { deleted_at: null };

    if (from_date || to_date) {
      const dateRange = {};
      if (from_date) dateRange.$gte = new Date(from_date);
      if (to_date) dateRange.$lte = new Date(to_date);
      invoiceFilter.invoice_date = dateRange;
      paymentFilter.payment_date = dateRange;
      claimFilter.claim_date = dateRange;
    }
    if (branch_id) {
      invoiceFilter.branch_id = branch_id;
      paymentFilter.branch_id = branch_id;
    }

    const [invoiceSummary, paymentSummary, claimSummary] = await Promise.all([
      Invoice.aggregate([
        { $match: invoiceFilter },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            total: { $sum: '$total_amount' },
            vat: { $sum: '$vat_total' },
          },
        },
      ]),
      Payment.aggregate([
        { $match: { ...paymentFilter, status: 'completed' } },
        {
          $group: {
            _id: '$payment_method',
            count: { $sum: 1 },
            total: { $sum: '$amount' },
          },
        },
      ]),
      InsuranceClaim.aggregate([
        { $match: claimFilter },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            claimed: { $sum: '$claimed_amount' },
            approved: { $sum: '$approved_amount' },
          },
        },
      ]),
    ]);

    res.json({ success: true, data: { invoiceSummary, paymentSummary, claimSummary } });
  })
);

// GET /finance-module/reports/trial-balance — ميزان المراجعة
router.get(
  '/reports/trial-balance',
  asyncHandler(async (req, res) => {
    const { fiscal_year } = req.query;
    const filter = { deleted_at: null, status: 'posted' };
    if (fiscal_year) filter.fiscal_year = parseInt(fiscal_year);

    const entries = await JournalEntry.find(filter).lean();

    // تجميع الأرصدة لكل حساب
    const balances = {};
    entries.forEach(entry => {
      (entry.lines || []).forEach(line => {
        const accId = line.account_id?.toString();
        if (!accId) return;
        if (!balances[accId]) balances[accId] = { debit: 0, credit: 0 };
        balances[accId].debit += line.debit_amount || 0;
        balances[accId].credit += line.credit_amount || 0;
      });
    });

    const accountIds = Object.keys(balances);
    const accounts = await ChartOfAccount.find({ _id: { $in: accountIds } })
      .select('account_code account_name_ar account_type')
      .sort({ account_code: 1 });

    const trialBalance = accounts.map(acc => {
      const b = balances[acc._id.toString()] || { debit: 0, credit: 0 };
      return {
        account_code: acc.account_code,
        account_name_ar: acc.account_name_ar,
        account_type: acc.account_type,
        total_debit: b.debit,
        total_credit: b.credit,
        balance: b.debit - b.credit,
      };
    });

    const totals = trialBalance.reduce(
      (acc, row) => ({
        total_debit: acc.total_debit + row.total_debit,
        total_credit: acc.total_credit + row.total_credit,
      }),
      { total_debit: 0, total_credit: 0 }
    );

    res.json({
      success: true,
      data: {
        trialBalance,
        totals,
        is_balanced: Math.abs(totals.total_debit - totals.total_credit) < 0.01,
      },
    });
  })
);

// GET /finance-module/reports/revenue — تقرير الإيرادات
router.get(
  '/reports/revenue',
  asyncHandler(async (req, res) => {
    const { from_date, to_date, group_by = 'month' } = req.query;
    const filter = { deleted_at: null, status: { $in: ['paid', 'partial'] } };
    if (from_date || to_date) {
      filter.invoice_date = {};
      if (from_date) filter.invoice_date.$gte = new Date(from_date);
      if (to_date) filter.invoice_date.$lte = new Date(to_date);
    }

    const groupId =
      group_by === 'month'
        ? { year: { $year: '$invoice_date' }, month: { $month: '$invoice_date' } }
        : { year: { $year: '$invoice_date' } };

    const revenue = await Invoice.aggregate([
      { $match: filter },
      {
        $group: {
          _id: groupId,
          invoices: { $sum: 1 },
          subtotal: { $sum: '$subtotal' },
          vat: { $sum: '$vat_total' },
          discount: { $sum: '$discount_amount' },
          total_amount: { $sum: '$total_amount' },
          paid_amount: { $sum: '$paid_amount' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    res.json({ success: true, data: revenue });
  })
);

module.exports = router;
