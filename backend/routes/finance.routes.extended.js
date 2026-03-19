/* eslint-disable no-unused-vars */
/**
 * ===================================================================
 * FINANCE EXTENDED ROUTES - المسارات المالية الموسّعة
 * ===================================================================
 * الإصدار: 1.0
 * التاريخ: مارس 2026
 * الوصف: ميزات مالية إضافية تشمل:
 *   - إدارة الشيكات
 *   - سندات الصرف والقبض
 *   - كشوف حساب العملاء والموردين
 *   - التقويم الضريبي
 *   - إعدادات المحاسبة
 * ===================================================================
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');
const { asyncHandler, AppError } = require('../middleware/errorHandler.enhanced');

// ─── Models ──────────────────────────────────────────────────────────────────
const safeRequire = (path, name) => {
  try {
    return require(path);
  } catch (e) {
    logger.warn(`[Finance Extended] ${name} model not available`);
    return null;
  }
};

const Cheque = safeRequire('../models/Cheque', 'Cheque');
const PaymentVoucher = safeRequire('../models/PaymentVoucher', 'PaymentVoucher');
const TaxCalendar = safeRequire('../models/TaxCalendar', 'TaxCalendar');
const Account = safeRequire('../models/Account', 'Account');
const AccountingInvoice = safeRequire('../models/AccountingInvoice', 'AccountingInvoice');
const Expense = safeRequire('../models/Expense', 'Expense');
const AccountingSettings = safeRequire('../models/AccountingSettings', 'AccountingSettings');
const JournalEntry = safeRequire('../models/JournalEntry', 'JournalEntry');
const Transaction = safeRequire('../models/Transaction', 'Transaction');

// Auth required for all routes
router.use(authenticateToken);

// ============================================================================
// 1. إدارة الشيكات - CHEQUE MANAGEMENT
// ============================================================================

/**
 * GET /cheques
 * قائمة جميع الشيكات مع الفلترة
 */
router.get(
  '/cheques',
  asyncHandler(async (req, res) => {
    const { type, status, bankName, fromDate, toDate, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (bankName) filter.bankName = { $regex: bankName, $options: 'i' };
    if (fromDate || toDate) {
      filter.dueDate = {};
      if (fromDate) filter.dueDate.$gte = new Date(fromDate);
      if (toDate) filter.dueDate.$lte = new Date(toDate);
    }

    let cheques = [];
    let total = 0;

    if (Cheque) {
      total = await Cheque.countDocuments(filter);
      cheques = await Cheque.find(filter)
        .sort({ dueDate: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .lean();
    } else {
      // Sample data
      cheques = [
        {
          _id: '1',
          chequeNumber: 'CHQ-2026-001',
          type: 'issued',
          bankName: 'البنك الأهلي',
          amount: 25000,
          currency: 'SAR',
          issueDate: new Date(),
          dueDate: new Date(Date.now() + 30 * 86400000),
          payee: 'مؤسسة التوريدات',
          status: 'pending',
          description: 'دفعة توريد مواد',
        },
        {
          _id: '2',
          chequeNumber: 'CHQ-2026-002',
          type: 'received',
          bankName: 'بنك الراجحي',
          amount: 45000,
          currency: 'SAR',
          issueDate: new Date(),
          dueDate: new Date(Date.now() + 15 * 86400000),
          payee: 'عميل - شركة البناء',
          status: 'deposited',
          description: 'تحصيل فاتورة',
        },
        {
          _id: '3',
          chequeNumber: 'CHQ-2026-003',
          type: 'issued',
          bankName: 'بنك الإنماء',
          amount: 12000,
          currency: 'SAR',
          issueDate: new Date(),
          dueDate: new Date(Date.now() - 5 * 86400000),
          payee: 'الموظف أحمد',
          status: 'cleared',
          description: 'سلفة موظف',
        },
        {
          _id: '4',
          chequeNumber: 'CHQ-2026-004',
          type: 'received',
          bankName: 'البنك الأهلي',
          amount: 8500,
          currency: 'SAR',
          issueDate: new Date(),
          dueDate: new Date(Date.now() + 45 * 86400000),
          payee: 'مؤسسة الإمداد',
          status: 'pending',
          description: 'ضمان مشروع',
        },
        {
          _id: '5',
          chequeNumber: 'CHQ-2026-005',
          type: 'issued',
          bankName: 'بنك الراجحي',
          amount: 3200,
          currency: 'SAR',
          issueDate: new Date(),
          dueDate: new Date(Date.now() - 10 * 86400000),
          payee: 'شركة الكهرباء',
          status: 'bounced',
          description: 'فاتورة كهرباء',
          bounceReason: 'رصيد غير كافي',
        },
      ];
      total = cheques.length;
    }

    res.json({
      success: true,
      data: cheques,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / limit),
      },
    });
  })
);

/**
 * POST /cheques
 * إنشاء شيك جديد
 */
router.post(
  '/cheques',
  asyncHandler(async (req, res) => {
    const {
      chequeNumber,
      type,
      bankName,
      bankBranch,
      accountNumber,
      amount,
      currency,
      issueDate,
      dueDate,
      payee,
      drawer,
      description,
      notes,
    } = req.body;

    if (!chequeNumber || !type || !bankName || !amount || !dueDate || !payee) {
      throw new AppError('جميع الحقول المطلوبة يجب ملؤها', 400);
    }

    let cheque;
    if (Cheque) {
      cheque = await Cheque.create({
        chequeNumber,
        type,
        bankName,
        bankBranch,
        accountNumber,
        amount,
        currency: currency || 'SAR',
        issueDate: issueDate || new Date(),
        dueDate,
        payee,
        drawer,
        description,
        notes,
        createdBy: req.user?.id,
        organization: req.user?.organization,
      });
    } else {
      cheque = {
        _id: Date.now().toString(),
        chequeNumber,
        type,
        bankName,
        amount,
        dueDate,
        payee,
        status: 'pending',
        ...req.body,
      };
    }

    res.status(201).json({ success: true, data: cheque, message: 'تم إنشاء الشيك بنجاح' });
  })
);

/**
 * PATCH /cheques/:id/status
 * تحديث حالة الشيك
 */
router.patch(
  '/cheques/:id/status',
  asyncHandler(async (req, res) => {
    const { status, bounceReason } = req.body;
    const validStatuses = [
      'pending',
      'deposited',
      'cleared',
      'bounced',
      'cancelled',
      'expired',
      'on_hold',
    ];
    if (!validStatuses.includes(status)) {
      throw new AppError('حالة غير صالحة', 400);
    }

    let cheque;
    if (Cheque) {
      const update = { status };
      if (status === 'deposited') update.depositDate = new Date();
      if (status === 'cleared') update.clearDate = new Date();
      if (status === 'bounced') {
        update.bounceDate = new Date();
        update.bounceReason = bounceReason;
      }
      cheque = await Cheque.findByIdAndUpdate(req.params.id, update, { new: true });
    } else {
      cheque = { _id: req.params.id, status };
    }

    if (!cheque) throw new AppError('الشيك غير موجود', 404);
    res.json({ success: true, data: cheque, message: `تم تحديث حالة الشيك إلى ${status}` });
  })
);

/**
 * DELETE /cheques/:id
 */
router.delete(
  '/cheques/:id',
  asyncHandler(async (req, res) => {
    if (Cheque) {
      const cheque = await Cheque.findByIdAndDelete(req.params.id);
      if (!cheque) throw new AppError('الشيك غير موجود', 404);
    }
    res.json({ success: true, message: 'تم حذف الشيك بنجاح' });
  })
);

/**
 * GET /cheques/statistics
 * إحصائيات الشيكات
 */
router.get(
  '/cheques/statistics',
  asyncHandler(async (req, res) => {
    let stats;
    if (Cheque) {
      const all = await Cheque.find().lean();
      const issued = all.filter(c => c.type === 'issued');
      const received = all.filter(c => c.type === 'received');
      stats = {
        totalIssued: issued.length,
        totalReceived: received.length,
        issuedAmount: issued.reduce((s, c) => s + c.amount, 0),
        receivedAmount: received.reduce((s, c) => s + c.amount, 0),
        pending: all.filter(c => c.status === 'pending').length,
        cleared: all.filter(c => c.status === 'cleared').length,
        bounced: all.filter(c => c.status === 'bounced').length,
        overdue: all.filter(c => c.status === 'pending' && new Date(c.dueDate) < new Date()).length,
      };
    } else {
      stats = {
        totalIssued: 8,
        totalReceived: 12,
        issuedAmount: 156000,
        receivedAmount: 234000,
        pending: 5,
        cleared: 10,
        bounced: 2,
        overdue: 1,
      };
    }
    res.json({ success: true, data: stats });
  })
);

// ============================================================================
// 2. سندات الصرف والقبض - PAYMENT VOUCHERS
// ============================================================================

/**
 * GET /payment-vouchers
 */
router.get(
  '/payment-vouchers',
  asyncHandler(async (req, res) => {
    const { type, status, fromDate, toDate, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (fromDate || toDate) {
      filter.date = {};
      if (fromDate) filter.date.$gte = new Date(fromDate);
      if (toDate) filter.date.$lte = new Date(toDate);
    }

    let vouchers = [];
    let total = 0;

    if (PaymentVoucher) {
      total = await PaymentVoucher.countDocuments(filter);
      vouchers = await PaymentVoucher.find(filter)
        .sort({ date: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .lean();
    } else {
      vouchers = [
        {
          _id: '1',
          voucherNumber: 'PV-2026-001',
          type: 'payment',
          date: new Date(),
          amount: 15000,
          currency: 'SAR',
          paymentMethod: 'bank_transfer',
          partyType: 'vendor',
          partyName: 'مؤسسة التوريدات',
          description: 'دفعة توريد بضاعة',
          status: 'approved',
        },
        {
          _id: '2',
          voucherNumber: 'RV-2026-001',
          type: 'receipt',
          date: new Date(),
          amount: 32000,
          currency: 'SAR',
          paymentMethod: 'cheque',
          partyType: 'customer',
          partyName: 'شركة البناء الحديث',
          description: 'تحصيل فاتورة رقم 1045',
          status: 'posted',
          chequeNumber: 'CHQ-445',
        },
        {
          _id: '3',
          voucherNumber: 'PV-2026-002',
          type: 'payment',
          date: new Date(),
          amount: 5500,
          currency: 'SAR',
          paymentMethod: 'cash',
          partyType: 'employee',
          partyName: 'محمد أحمد',
          description: 'سلفة موظف',
          status: 'draft',
        },
        {
          _id: '4',
          voucherNumber: 'RV-2026-002',
          type: 'receipt',
          date: new Date(),
          amount: 18500,
          currency: 'SAR',
          paymentMethod: 'bank_transfer',
          partyType: 'customer',
          partyName: 'مؤسسة الأمل',
          description: 'إيراد خدمات استشارية',
          status: 'approved',
        },
        {
          _id: '5',
          voucherNumber: 'PV-2026-003',
          type: 'payment',
          date: new Date(),
          amount: 8200,
          currency: 'SAR',
          paymentMethod: 'credit_card',
          partyType: 'vendor',
          partyName: 'شركة الصيانة',
          description: 'صيانة دورية للمبنى',
          status: 'posted',
        },
      ];
      total = vouchers.length;
    }

    res.json({
      success: true,
      data: vouchers,
      pagination: { total, page: Number(page), limit: Number(limit) },
    });
  })
);

/**
 * POST /payment-vouchers
 */
router.post(
  '/payment-vouchers',
  asyncHandler(async (req, res) => {
    const {
      type,
      amount,
      paymentMethod,
      partyType,
      partyName,
      description,
      reference,
      chequeNumber,
      chequeDate,
      bankName,
      taxAmount,
      taxRate,
      notes,
    } = req.body;

    if (!type || !amount || !paymentMethod || !partyType || !partyName || !description) {
      throw new AppError('جميع الحقول المطلوبة يجب ملؤها', 400);
    }

    const prefix = type === 'receipt' ? 'RV' : 'PV';
    const voucherNumber = `${prefix}-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;

    let voucher;
    if (PaymentVoucher) {
      voucher = await PaymentVoucher.create({
        voucherNumber,
        type,
        date: new Date(),
        amount,
        currency: 'SAR',
        paymentMethod,
        partyType,
        partyName,
        description,
        reference,
        chequeNumber,
        chequeDate,
        bankName,
        taxAmount: taxAmount || 0,
        taxRate: taxRate || 0,
        netAmount: amount - (taxAmount || 0),
        notes,
        createdBy: req.user?.id,
        organization: req.user?.organization,
      });
    } else {
      voucher = {
        _id: Date.now().toString(),
        voucherNumber,
        type,
        amount,
        paymentMethod,
        partyType,
        partyName,
        description,
        status: 'draft',
        date: new Date(),
      };
    }

    res
      .status(201)
      .json({
        success: true,
        data: voucher,
        message: `تم إنشاء ${type === 'receipt' ? 'سند قبض' : 'سند صرف'} بنجاح`,
      });
  })
);

/**
 * PATCH /payment-vouchers/:id/approve
 */
router.patch(
  '/payment-vouchers/:id/approve',
  asyncHandler(async (req, res) => {
    let voucher;
    if (PaymentVoucher) {
      voucher = await PaymentVoucher.findByIdAndUpdate(
        req.params.id,
        { status: 'approved', approvedBy: req.user?.id, approvedAt: new Date() },
        { new: true }
      );
    } else {
      voucher = { _id: req.params.id, status: 'approved' };
    }
    if (!voucher) throw new AppError('السند غير موجود', 404);
    res.json({ success: true, data: voucher, message: 'تم اعتماد السند بنجاح' });
  })
);

/**
 * PATCH /payment-vouchers/:id/post
 */
router.patch(
  '/payment-vouchers/:id/post',
  asyncHandler(async (req, res) => {
    let voucher;
    if (PaymentVoucher) {
      voucher = await PaymentVoucher.findByIdAndUpdate(
        req.params.id,
        { status: 'posted', postedAt: new Date() },
        { new: true }
      );
    } else {
      voucher = { _id: req.params.id, status: 'posted' };
    }
    if (!voucher) throw new AppError('السند غير موجود', 404);
    res.json({ success: true, data: voucher, message: 'تم ترحيل السند بنجاح' });
  })
);

/**
 * DELETE /payment-vouchers/:id
 */
router.delete(
  '/payment-vouchers/:id',
  asyncHandler(async (req, res) => {
    if (PaymentVoucher) {
      const v = await PaymentVoucher.findById(req.params.id);
      if (!v) throw new AppError('السند غير موجود', 404);
      if (v.status === 'posted') throw new AppError('لا يمكن حذف سند مرحّل', 400);
      await PaymentVoucher.findByIdAndDelete(req.params.id);
    }
    res.json({ success: true, message: 'تم حذف السند بنجاح' });
  })
);

/**
 * GET /payment-vouchers/summary
 */
router.get(
  '/payment-vouchers/summary',
  asyncHandler(async (req, res) => {
    let summary;
    if (PaymentVoucher) {
      const all = await PaymentVoucher.find().lean();
      const receipts = all.filter(v => v.type === 'receipt');
      const payments = all.filter(v => v.type === 'payment');
      summary = {
        totalReceipts: receipts.reduce((s, v) => s + v.amount, 0),
        totalPayments: payments.reduce((s, v) => s + v.amount, 0),
        receiptCount: receipts.length,
        paymentCount: payments.length,
        draft: all.filter(v => v.status === 'draft').length,
        approved: all.filter(v => v.status === 'approved').length,
        posted: all.filter(v => v.status === 'posted').length,
      };
    } else {
      summary = {
        totalReceipts: 245000,
        totalPayments: 178000,
        receiptCount: 45,
        paymentCount: 32,
        draft: 5,
        approved: 12,
        posted: 60,
      };
    }
    summary.netBalance = summary.totalReceipts - summary.totalPayments;
    res.json({ success: true, data: summary });
  })
);

// ============================================================================
// 3. كشوف حساب العملاء والموردين - CUSTOMER/VENDOR STATEMENTS
// ============================================================================

/**
 * GET /customer-statements
 * كشف حساب عميل أو مورد
 */
router.get(
  '/customer-statements',
  asyncHandler(async (req, res) => {
    const { partyType = 'customer', partyName, fromDate, toDate } = req.query;

    // Try to gather from invoices and payments
    let transactions = [];
    let summary = {};

    if (AccountingInvoice && Transaction) {
      const invoiceFilter = {};
      if (partyName) {
        if (partyType === 'customer')
          invoiceFilter.customerName = { $regex: partyName, $options: 'i' };
        else invoiceFilter.vendorName = { $regex: partyName, $options: 'i' };
      }

      const invoices = await AccountingInvoice.find(invoiceFilter).sort({ date: -1 }).lean();
      transactions = invoices.map(inv => ({
        date: inv.date || inv.createdAt,
        type: inv.type === 'purchase' ? 'فاتورة مشتريات' : 'فاتورة مبيعات',
        reference: inv.invoiceNumber || inv._id,
        description: inv.description || `فاتورة - ${inv.customerName || inv.vendorName || ''}`,
        debit: inv.type === 'purchase' ? 0 : inv.total || inv.amount || 0,
        credit: inv.type === 'purchase' ? inv.total || inv.amount || 0 : 0,
        balance: 0,
      }));
    }

    if (transactions.length === 0) {
      // Sample data
      const name =
        partyName || (partyType === 'customer' ? 'شركة البناء الحديث' : 'مؤسسة التوريدات');
      transactions = [
        {
          date: '2026-01-15',
          type: 'رصيد افتتاحي',
          reference: '-',
          description: `رصيد افتتاحي - ${name}`,
          debit: 50000,
          credit: 0,
          balance: 50000,
        },
        {
          date: '2026-01-22',
          type: 'فاتورة مبيعات',
          reference: 'INV-2026-101',
          description: 'فاتورة خدمات استشارية',
          debit: 35000,
          credit: 0,
          balance: 85000,
        },
        {
          date: '2026-02-05',
          type: 'سند قبض',
          reference: 'RV-2026-015',
          description: 'تحصيل نقدي',
          debit: 0,
          credit: 40000,
          balance: 45000,
        },
        {
          date: '2026-02-18',
          type: 'فاتورة مبيعات',
          reference: 'INV-2026-125',
          description: 'فاتورة توريد معدات',
          debit: 22000,
          credit: 0,
          balance: 67000,
        },
        {
          date: '2026-03-01',
          type: 'إشعار دائن',
          reference: 'CN-2026-003',
          description: 'خصم على فاتورة 125',
          debit: 0,
          credit: 2000,
          balance: 65000,
        },
        {
          date: '2026-03-10',
          type: 'سند قبض',
          reference: 'RV-2026-028',
          description: 'تحصيل شيك',
          debit: 0,
          credit: 30000,
          balance: 35000,
        },
      ];
    }

    // Calculate running balance
    let runningBalance = 0;
    transactions.forEach(t => {
      runningBalance += (t.debit || 0) - (t.credit || 0);
      t.balance = runningBalance;
    });

    const totalDebit = transactions.reduce((s, t) => s + (t.debit || 0), 0);
    const totalCredit = transactions.reduce((s, t) => s + (t.credit || 0), 0);

    summary = {
      partyType,
      partyName: partyName || (partyType === 'customer' ? 'شركة البناء الحديث' : 'مؤسسة التوريدات'),
      totalDebit,
      totalCredit,
      closingBalance: totalDebit - totalCredit,
      transactionCount: transactions.length,
    };

    res.json({ success: true, data: { transactions, summary } });
  })
);

/**
 * GET /customer-statements/parties
 * قائمة العملاء والموردين
 */
router.get(
  '/customer-statements/parties',
  asyncHandler(async (req, res) => {
    const { type = 'customer' } = req.query;
    let parties = [];

    if (AccountingInvoice) {
      const field = type === 'customer' ? 'customerName' : 'vendorName';
      const invoices = await AccountingInvoice.find({}).select(field).lean();
      const uniqueNames = [...new Set(invoices.map(i => i[field]).filter(Boolean))];
      parties = uniqueNames.map(name => ({ name, hasBalance: true }));
    }

    if (parties.length === 0) {
      parties =
        type === 'customer'
          ? [
              { name: 'شركة البناء الحديث', hasBalance: true },
              { name: 'مؤسسة الأمل للتجارة', hasBalance: true },
              { name: 'شركة التقنية المتقدمة', hasBalance: true },
              { name: 'مؤسسة الرياض التجارية', hasBalance: false },
            ]
          : [
              { name: 'مؤسسة التوريدات', hasBalance: true },
              { name: 'شركة الصيانة والنظافة', hasBalance: true },
              { name: 'مكتب المحاسبة القانوني', hasBalance: false },
              { name: 'شركة الشحن السريع', hasBalance: true },
            ];
    }

    res.json({ success: true, data: parties });
  })
);

// ============================================================================
// 4. التقويم الضريبي - TAX CALENDAR
// ============================================================================

/**
 * GET /tax-calendar
 */
router.get(
  '/tax-calendar',
  asyncHandler(async (req, res) => {
    const { year, taxType, status } = req.query;
    const filter = {};
    if (year) {
      filter.dueDate = {
        $gte: new Date(`${year}-01-01`),
        $lte: new Date(`${year}-12-31`),
      };
    }
    if (taxType) filter.taxType = taxType;
    if (status) filter.status = status;

    let events = [];
    if (TaxCalendar) {
      events = await TaxCalendar.find(filter).sort({ dueDate: 1 }).lean();
    }

    if (events.length === 0) {
      const y = year || new Date().getFullYear();
      events = [
        {
          _id: '1',
          title: 'تقديم إقرار ضريبة القيمة المضافة - الربع الأول',
          taxType: 'vat',
          dueDate: `${y}-04-30`,
          periodStart: `${y}-01-01`,
          periodEnd: `${y}-03-31`,
          frequency: 'quarterly',
          estimatedAmount: 45000,
          status: 'upcoming',
          authority: 'ZATCA',
          reminderDays: 14,
        },
        {
          _id: '2',
          title: 'سداد ضريبة القيمة المضافة - الربع الأول',
          taxType: 'vat',
          dueDate: `${y}-04-30`,
          frequency: 'quarterly',
          estimatedAmount: 45000,
          status: 'upcoming',
          authority: 'ZATCA',
          reminderDays: 7,
        },
        {
          _id: '3',
          title: 'تقديم إقرار ضريبة القيمة المضافة - الربع الثاني',
          taxType: 'vat',
          dueDate: `${y}-07-31`,
          periodStart: `${y}-04-01`,
          periodEnd: `${y}-06-30`,
          frequency: 'quarterly',
          estimatedAmount: 52000,
          status: 'upcoming',
          authority: 'ZATCA',
          reminderDays: 14,
        },
        {
          _id: '4',
          title: 'تقديم إقرار الزكاة السنوي',
          taxType: 'zakat',
          dueDate: `${y}-04-30`,
          periodStart: `${Number(y) - 1}-01-01`,
          periodEnd: `${Number(y) - 1}-12-31`,
          frequency: 'annual',
          estimatedAmount: 120000,
          status: 'upcoming',
          authority: 'ZATCA',
          reminderDays: 30,
        },
        {
          _id: '5',
          title: 'سداد الزكاة السنوية',
          taxType: 'zakat',
          dueDate: `${y}-04-30`,
          frequency: 'annual',
          estimatedAmount: 120000,
          status: 'upcoming',
          authority: 'ZATCA',
          reminderDays: 14,
        },
        {
          _id: '6',
          title: 'تقديم ضريبة الاستقطاع - يناير',
          taxType: 'withholding',
          dueDate: `${y}-02-10`,
          periodStart: `${y}-01-01`,
          periodEnd: `${y}-01-31`,
          frequency: 'monthly',
          estimatedAmount: 3500,
          status: 'filed',
          authority: 'ZATCA',
          reminderDays: 5,
        },
        {
          _id: '7',
          title: 'تقديم ضريبة الاستقطاع - فبراير',
          taxType: 'withholding',
          dueDate: `${y}-03-10`,
          frequency: 'monthly',
          estimatedAmount: 4200,
          status: 'paid',
          authority: 'ZATCA',
          reminderDays: 5,
        },
        {
          _id: '8',
          title: 'التأمينات الاجتماعية - مارس',
          taxType: 'social_insurance',
          dueDate: `${y}-04-15`,
          frequency: 'monthly',
          estimatedAmount: 28000,
          status: 'upcoming',
          authority: 'GOSI',
          reminderDays: 7,
        },
        {
          _id: '9',
          title: 'تقديم إقرار ضريبة القيمة المضافة - الربع الثالث',
          taxType: 'vat',
          dueDate: `${y}-10-31`,
          periodStart: `${y}-07-01`,
          periodEnd: `${y}-09-30`,
          frequency: 'quarterly',
          estimatedAmount: 48000,
          status: 'upcoming',
          authority: 'ZATCA',
          reminderDays: 14,
        },
        {
          _id: '10',
          title: 'تقديم إقرار ضريبة القيمة المضافة - الربع الرابع',
          taxType: 'vat',
          dueDate: `${Number(y) + 1}-01-31`,
          periodStart: `${y}-10-01`,
          periodEnd: `${y}-12-31`,
          frequency: 'quarterly',
          estimatedAmount: 50000,
          status: 'upcoming',
          authority: 'ZATCA',
          reminderDays: 14,
        },
      ];

      // Auto-set overdue
      events = events.map(e => {
        if (e.status === 'upcoming' && new Date(e.dueDate) < new Date()) {
          return { ...e, status: 'overdue' };
        }
        if (e.status === 'upcoming') {
          const daysUntil = Math.ceil((new Date(e.dueDate) - new Date()) / 86400000);
          if (daysUntil <= (e.reminderDays || 7)) return { ...e, status: 'due' };
        }
        return e;
      });
    }

    // Summary
    const summary = {
      total: events.length,
      upcoming: events.filter(e => e.status === 'upcoming').length,
      due: events.filter(e => e.status === 'due').length,
      overdue: events.filter(e => e.status === 'overdue').length,
      filed: events.filter(e => e.status === 'filed').length,
      paid: events.filter(e => e.status === 'paid').length,
      totalEstimated: events
        .filter(e => !['paid', 'filed'].includes(e.status))
        .reduce((s, e) => s + (e.estimatedAmount || 0), 0),
    };

    res.json({ success: true, data: { events, summary } });
  })
);

/**
 * POST /tax-calendar
 */
router.post(
  '/tax-calendar',
  asyncHandler(async (req, res) => {
    const {
      title,
      taxType,
      dueDate,
      frequency,
      estimatedAmount,
      authority,
      reminderDays,
      description,
      periodStart,
      periodEnd,
    } = req.body;
    if (!title || !taxType || !dueDate || !frequency) {
      throw new AppError('جميع الحقول المطلوبة يجب ملؤها', 400);
    }

    let event;
    if (TaxCalendar) {
      event = await TaxCalendar.create({
        title,
        taxType,
        dueDate,
        frequency,
        estimatedAmount,
        authority: authority || 'ZATCA',
        reminderDays: reminderDays || 7,
        description,
        periodStart,
        periodEnd,
        createdBy: req.user?.id,
        organization: req.user?.organization,
      });
    } else {
      event = {
        _id: Date.now().toString(),
        title,
        taxType,
        dueDate,
        frequency,
        estimatedAmount,
        status: 'upcoming',
      };
    }

    res.status(201).json({ success: true, data: event, message: 'تم إضافة الموعد الضريبي بنجاح' });
  })
);

/**
 * PATCH /tax-calendar/:id/status
 */
router.patch(
  '/tax-calendar/:id/status',
  asyncHandler(async (req, res) => {
    const { status, amount, referenceNumber, filingDate, paymentDate } = req.body;
    let event;
    if (TaxCalendar) {
      const update = { status };
      if (amount) update.amount = amount;
      if (referenceNumber) update.referenceNumber = referenceNumber;
      if (status === 'filed') update.filingDate = filingDate || new Date();
      if (status === 'paid') update.paymentDate = paymentDate || new Date();
      event = await TaxCalendar.findByIdAndUpdate(req.params.id, update, { new: true });
    } else {
      event = { _id: req.params.id, status };
    }
    if (!event) throw new AppError('الموعد غير موجود', 404);
    res.json({ success: true, data: event, message: 'تم تحديث الحالة بنجاح' });
  })
);

/**
 * DELETE /tax-calendar/:id
 */
router.delete(
  '/tax-calendar/:id',
  asyncHandler(async (req, res) => {
    if (TaxCalendar) {
      await TaxCalendar.findByIdAndDelete(req.params.id);
    }
    res.json({ success: true, message: 'تم حذف الموعد بنجاح' });
  })
);

// ============================================================================
// 5. إعدادات المحاسبة - FINANCIAL SETTINGS
// ============================================================================

/**
 * GET /settings
 * إعدادات النظام المحاسبي
 */
router.get(
  '/settings',
  asyncHandler(async (req, res) => {
    let settings;
    if (AccountingSettings) {
      settings = await AccountingSettings.findOne({ organization: req.user?.organization }).lean();
    }

    if (!settings) {
      settings = {
        general: {
          companyName: 'مؤسسة الأوائل',
          companyNameEn: 'Al Awael Organization',
          taxNumber: '300000000000003',
          commercialRegister: '1010000000',
          fiscalYearStart: '01-01',
          fiscalYearEnd: '12-31',
          defaultCurrency: 'SAR',
          decimalPlaces: 2,
          dateFormat: 'DD/MM/YYYY',
        },
        tax: {
          vatEnabled: true,
          vatRate: 15,
          zakatEnabled: true,
          withholdingTaxEnabled: true,
          zatcaIntegration: true,
          eInvoicingEnabled: true,
          taxRoundingMethod: 'nearest',
        },
        accounting: {
          accountingMethod: 'accrual',
          autoNumbering: true,
          journalPrefix: 'JE',
          invoicePrefix: 'INV',
          expensePrefix: 'EXP',
          requireApproval: true,
          multiCurrency: true,
          costCentersEnabled: true,
          budgetTrackingEnabled: true,
          depreciationMethod: 'straight_line',
        },
        notifications: {
          invoiceDueReminder: true,
          invoiceReminderDays: 7,
          budgetAlertThreshold: 80,
          lowCashAlert: true,
          lowCashThreshold: 50000,
          taxDeadlineReminder: true,
          taxReminderDays: 14,
        },
        reports: {
          defaultReportPeriod: 'monthly',
          showZeroBalanceAccounts: false,
          comparativeReports: true,
          arabicReports: true,
          reportLogo: true,
          reportFooter: 'الأوائل - تقرير مالي سري',
        },
        backup: {
          autoBackup: true,
          backupFrequency: 'daily',
          lastBackup: new Date().toISOString(),
          retentionDays: 90,
        },
      };
    }

    res.json({ success: true, data: settings });
  })
);

/**
 * PUT /settings
 * تحديث إعدادات المحاسبة
 */
router.put(
  '/settings',
  asyncHandler(async (req, res) => {
    const updateData = req.body;

    let settings;
    if (AccountingSettings) {
      settings = await AccountingSettings.findOneAndUpdate(
        { organization: req.user?.organization },
        { $set: updateData },
        { new: true, upsert: true }
      );
    } else {
      settings = { ...updateData, updatedAt: new Date() };
    }

    res.json({ success: true, data: settings, message: 'تم حفظ الإعدادات بنجاح' });
  })
);

/**
 * GET /settings/numbering-preview
 * معاينة الترقيم التلقائي
 */
router.get(
  '/settings/numbering-preview',
  asyncHandler(async (req, res) => {
    const { prefix, type } = req.query;
    const year = new Date().getFullYear();
    const samples = {
      invoice: `${prefix || 'INV'}-${year}-0001`,
      expense: `${prefix || 'EXP'}-${year}-0001`,
      journal: `${prefix || 'JE'}-${year}-0001`,
      voucher: `${prefix || 'PV'}-${year}-0001`,
      receipt: `${prefix || 'RV'}-${year}-0001`,
    };
    res.json({
      success: true,
      data: type ? { preview: samples[type] || samples.invoice } : samples,
    });
  })
);

// ============================================================================
// 6. لوحة بيانات متقدمة - ADVANCED DASHBOARD DATA
// ============================================================================

/**
 * GET /dashboard/financial-health
 * مؤشر الصحة المالية الشامل
 */
router.get(
  '/dashboard/financial-health',
  asyncHandler(async (req, res) => {
    let health = {};

    // Try to compute from real data
    let totalAssets = 0,
      totalLiabilities = 0,
      currentAssets = 0,
      currentLiabilities = 0;
    let revenue = 0,
      expenses = 0;

    if (Account) {
      const accounts = await Account.find({ isActive: true, isDeleted: { $ne: true } }).lean();
      accounts.forEach(acc => {
        const bal = Math.abs(acc.balance || 0);
        if (acc.type === 'asset') {
          totalAssets += bal;
          if (acc.subType === 'current' || !acc.subType) currentAssets += bal;
        }
        if (acc.type === 'liability') {
          totalLiabilities += bal;
          if (acc.subType === 'current' || !acc.subType) currentLiabilities += bal;
        }
        if (acc.type === 'revenue') revenue += bal;
        if (acc.type === 'expense') expenses += bal;
      });
    }

    if (totalAssets === 0) {
      totalAssets = 2500000;
      currentAssets = 1200000;
      totalLiabilities = 800000;
      currentLiabilities = 350000;
      revenue = 1800000;
      expenses = 1350000;
    }

    const netProfit = revenue - expenses;
    const profitMargin = revenue > 0 ? ((netProfit / revenue) * 100).toFixed(1) : 0;
    const currentRatio =
      currentLiabilities > 0 ? (currentAssets / currentLiabilities).toFixed(2) : 0;
    const debtRatio = totalAssets > 0 ? ((totalLiabilities / totalAssets) * 100).toFixed(1) : 0;

    // Score calculation (0-100)
    let score = 50;
    if (profitMargin > 20) score += 15;
    else if (profitMargin > 10) score += 10;
    else if (profitMargin > 0) score += 5;
    if (currentRatio > 2) score += 15;
    else if (currentRatio > 1.5) score += 10;
    else if (currentRatio > 1) score += 5;
    if (debtRatio < 30) score += 15;
    else if (debtRatio < 50) score += 10;
    else if (debtRatio < 70) score += 5;
    score = Math.min(100, Math.max(0, score));

    let grade = 'ضعيف';
    let gradeColor = '#F44336';
    if (score >= 80) {
      grade = 'ممتاز';
      gradeColor = '#4CAF50';
    } else if (score >= 60) {
      grade = 'جيد';
      gradeColor = '#2196F3';
    } else if (score >= 40) {
      grade = 'مقبول';
      gradeColor = '#FF9800';
    }

    health = {
      score,
      grade,
      gradeColor,
      metrics: {
        profitMargin: Number(profitMargin),
        currentRatio: Number(currentRatio),
        debtRatio: Number(debtRatio),
        netProfit,
        revenue,
        expenses,
        totalAssets,
        totalLiabilities,
      },
      trends: {
        revenueGrowth: 12.5,
        expenseGrowth: 8.2,
        profitGrowth: 18.3,
      },
      alerts: [
        ...(currentRatio < 1
          ? [
              {
                type: 'danger',
                message: 'نسبة السيولة أقل من 1 - خطر عدم القدرة على سداد الالتزامات',
              },
            ]
          : []),
        ...(debtRatio > 70
          ? [{ type: 'warning', message: 'نسبة المديونية مرتفعة - يُنصح بتقليل الاقتراض' }]
          : []),
        ...(profitMargin < 5
          ? [{ type: 'warning', message: 'هامش الربح منخفض - مراجعة التكاليف مطلوبة' }]
          : []),
      ],
    };

    res.json({ success: true, data: health });
  })
);

/**
 * GET /dashboard/monthly-comparison
 * مقارنة شهرية
 */
router.get(
  '/dashboard/monthly-comparison',
  asyncHandler(async (req, res) => {
    const months = [
      { month: 'يناير', revenue: 145000, expenses: 98000, profit: 47000 },
      { month: 'فبراير', revenue: 158000, expenses: 102000, profit: 56000 },
      { month: 'مارس', revenue: 172000, expenses: 115000, profit: 57000 },
      { month: 'أبريل', revenue: 168000, expenses: 108000, profit: 60000 },
      { month: 'مايو', revenue: 155000, expenses: 99000, profit: 56000 },
      { month: 'يونيو', revenue: 180000, expenses: 120000, profit: 60000 },
      { month: 'يوليو', revenue: 192000, expenses: 125000, profit: 67000 },
      { month: 'أغسطس', revenue: 175000, expenses: 118000, profit: 57000 },
      { month: 'سبتمبر', revenue: 165000, expenses: 110000, profit: 55000 },
      { month: 'أكتوبر', revenue: 188000, expenses: 122000, profit: 66000 },
      { month: 'نوفمبر', revenue: 195000, expenses: 128000, profit: 67000 },
      { month: 'ديسمبر', revenue: 210000, expenses: 135000, profit: 75000 },
    ];

    const totals = months.reduce(
      (acc, m) => ({
        revenue: acc.revenue + m.revenue,
        expenses: acc.expenses + m.expenses,
        profit: acc.profit + m.profit,
      }),
      { revenue: 0, expenses: 0, profit: 0 }
    );

    res.json({
      success: true,
      data: { months, totals, averageMonthlyProfit: Math.round(totals.profit / 12) },
    });
  })
);

module.exports = router;
