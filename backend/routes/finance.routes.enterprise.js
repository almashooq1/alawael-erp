/**
 * ===================================================================
 * FINANCE ENTERPRISE ROUTES - المسارات المالية للمؤسسات
 * ===================================================================
 * الإصدار: 1.0
 * التاريخ: مارس 2026
 * الوصف: ميزات مؤسسية متقدمة تشمل:
 *   1. إقفال الفترات المالية (Period Closing & Year-End)
 *   2. تسوية الحسابات العامة (General Account Reconciliation)
 *   3. إدارة التحصيل والمطالبات (Dunning & Collection)
 *   4. خطابات الضمان والاعتمادات (LC & Bank Guarantees)
 *   5. إدارة الخزينة والتنبؤ النقدي (Treasury & Cash Forecasting)
 *   6. إدارة الإقرارات الضريبية (ZATCA Filing Tracker)
 *   7. سير عمل الاعتمادات المالية (Financial Approvals Engine)
 *   8. إدارة القروض والتمويل (Loan & Financing Management)
 * ===================================================================
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');
const { asyncHandler } = require('../errors/errorHandler');
const { AppError } = require('../errors/AppError');

// ─── Safe Model Loader ──────────────────────────────────────────────────
const safeRequire = (path, name) => {
  try {
    return require(path);
  } catch (e) {
    logger.warn(`[Finance Enterprise] ${name} model not available`);
    return null;
  }
};

// Models
const ClosingChecklist = safeRequire('../models/ClosingChecklist', 'ClosingChecklist');
const AccountReconModels = safeRequire('../models/AccountReconciliation', 'AccountReconciliation');
const AccountReconciliation = AccountReconModels?.AccountReconciliation || null;
const IntercompanyTransaction = AccountReconModels?.IntercompanyTransaction || null;
const DunningModels = safeRequire('../models/Dunning', 'Dunning');
const DunningProfile = DunningModels?.DunningProfile || null;
const DunningHistory = DunningModels?.DunningHistory || null;
const GuaranteeModels = safeRequire('../models/BankGuarantee', 'BankGuarantee');
const BankGuarantee = GuaranteeModels?.BankGuarantee || null;
const LetterOfCredit = GuaranteeModels?.LetterOfCredit || null;
const ForecastModels = safeRequire('../models/CashForecast', 'CashForecast');
const CashForecast = ForecastModels?.CashForecast || null;
const TreasuryTransfer = ForecastModels?.TreasuryTransfer || null;
const TaxFilingModels = safeRequire('../models/TaxFiling', 'TaxFiling');
const TaxFiling = TaxFilingModels?.TaxFiling || null;
const TaxPenalty = TaxFilingModels?.TaxPenalty || null;
const ApprovalModels = safeRequire('../models/ApprovalWorkflow', 'ApprovalWorkflow');
const ApprovalWorkflow = ApprovalModels?.ApprovalWorkflow || null;
const FinancialApproval = ApprovalModels?.FinancialApproval || null;
const LoanModels = safeRequire('../models/CompanyLoan', 'CompanyLoan');
const CompanyLoan = LoanModels?.CompanyLoan || null;
const LoanDrawdown = LoanModels?.LoanDrawdown || null;

const BankAccount = safeRequire('../models/BankAccount', 'BankAccount');
const JournalEntry = safeRequire('../models/JournalEntry', 'JournalEntry');
const AccountingInvoice = safeRequire('../models/AccountingInvoice', 'AccountingInvoice');

router.use(authenticateToken);

// ╔════════════════════════════════════════════════════════════════════╗
// ║  1. PERIOD CLOSING & YEAR-END - إقفال الفترات المالية            ║
// ╚════════════════════════════════════════════════════════════════════╝

// GET – list all closing checklists
router.get(
  '/period-closing',
  asyncHandler(async (req, res) => {
    if (!ClosingChecklist) return res.json({ success: true, data: [] });
    const org = req.user.organization;
    const { status, periodType } = req.query;
    const filter = { organization: org };
    if (status) filter.status = status;
    if (periodType) filter.periodType = periodType;
    const checklists = await ClosingChecklist.find(filter).sort({ createdAt: -1 }).limit(50);
    res.json({ success: true, data: checklists });
  })
);

// POST – create closing checklist for a period
router.post(
  '/period-closing',
  asyncHandler(async (req, res) => {
    if (!ClosingChecklist) throw new AppError('ClosingChecklist model not available', 500);
    const org = req.user.organization;
    const defaultTasks = [
      {
        taskName: 'مراجعة جميع القيود المحاسبية',
        taskNameEn: 'Review all journal entries',
        category: 'journal_entries',
        order: 1,
      },
      {
        taskName: 'ترحيل قيود الإهلاك',
        taskNameEn: 'Post depreciation entries',
        category: 'depreciation',
        order: 2,
      },
      {
        taskName: 'تسوية الحسابات البنكية',
        taskNameEn: 'Bank reconciliations',
        category: 'reconciliation',
        order: 3,
      },
      {
        taskName: 'مراجعة المستحقات والمقدمات',
        taskNameEn: 'Review accruals & prepayments',
        category: 'accruals',
        order: 4,
      },
      {
        taskName: 'تكوين المخصصات',
        taskNameEn: 'Create provisions',
        category: 'provisions',
        order: 5,
      },
      {
        taskName: 'تسوية المعاملات بين الفروع',
        taskNameEn: 'Intercompany reconciliation',
        category: 'intercompany',
        order: 6,
      },
      {
        taskName: 'إعداد إقرار ضريبة القيمة المضافة',
        taskNameEn: 'Prepare VAT return',
        category: 'tax',
        order: 7,
      },
      {
        taskName: 'مراجعة التدقيق الداخلي',
        taskNameEn: 'Internal audit review',
        category: 'audit',
        order: 8,
      },
    ];
    const checklist = await ClosingChecklist.create({
      ...req.body,
      organization: org,
      tasks: req.body.tasks || defaultTasks,
      initiatedBy: req.user.id,
      createdBy: req.user.id,
    });
    res.status(201).json({ success: true, data: checklist });
  })
);

// PATCH – update task status within checklist
router.patch(
  '/period-closing/:id/task/:taskId',
  asyncHandler(async (req, res) => {
    if (!ClosingChecklist) throw new AppError('Model not available', 500);
    const checklist = await ClosingChecklist.findById(req.params.id);
    if (!checklist) throw new AppError('Checklist not found', 404);
    const task = checklist.tasks.id(req.params.taskId);
    if (!task) throw new AppError('Task not found', 404);
    Object.assign(task, req.body);
    if (req.body.status === 'completed') {
      task.completedBy = req.user.id;
      task.completedAt = new Date();
    }
    await checklist.save();
    res.json({ success: true, data: checklist });
  })
);

// POST – execute period close
router.post(
  '/period-closing/:id/close',
  asyncHandler(async (req, res) => {
    if (!ClosingChecklist) throw new AppError('Model not available', 500);
    const checklist = await ClosingChecklist.findById(req.params.id);
    if (!checklist) throw new AppError('Checklist not found', 404);
    const required = checklist.tasks.filter(t => t.isRequired);
    const incomplete = required.filter(t => t.status !== 'completed' && t.status !== 'skipped');
    if (incomplete.length > 0)
      throw new AppError(`${incomplete.length} مهام مطلوبة لم تكتمل بعد`, 400);
    checklist.status = 'completed';
    checklist.lockStatus = 'closed';
    checklist.closedBy = req.user.id;
    checklist.closedAt = new Date();
    await checklist.save();
    res.json({ success: true, data: checklist, message: 'تم إقفال الفترة بنجاح' });
  })
);

// POST – reopen period
router.post(
  '/period-closing/:id/reopen',
  asyncHandler(async (req, res) => {
    if (!ClosingChecklist) throw new AppError('Model not available', 500);
    const checklist = await ClosingChecklist.findById(req.params.id);
    if (!checklist) throw new AppError('Checklist not found', 404);
    checklist.status = 'reopened';
    checklist.lockStatus = 'open';
    checklist.reopenedBy = req.user.id;
    checklist.reopenedAt = new Date();
    checklist.reopenReason = req.body.reason || '';
    await checklist.save();
    res.json({ success: true, data: checklist, message: 'تم إعادة فتح الفترة' });
  })
);

// GET – closing summary/stats
router.get(
  '/period-closing/summary',
  asyncHandler(async (req, res) => {
    if (!ClosingChecklist)
      return res.json({ success: true, data: { total: 0, closed: 0, open: 0, inProgress: 0 } });
    const org = req.user.organization;
    const all = await ClosingChecklist.find({ organization: org });
    const data = {
      total: all.length,
      closed: all.filter(c => c.status === 'completed').length,
      open: all.filter(c => c.lockStatus === 'open').length,
      inProgress: all.filter(c => c.status === 'in_progress').length,
    };
    res.json({ success: true, data });
  })
);

// ╔════════════════════════════════════════════════════════════════════╗
// ║  2. ACCOUNT RECONCILIATION - تسوية الحسابات العامة               ║
// ╚════════════════════════════════════════════════════════════════════╝

router.get(
  '/reconciliation',
  asyncHandler(async (req, res) => {
    if (!AccountReconciliation) return res.json({ success: true, data: [] });
    const org = req.user.organization;
    const filter = { organization: org };
    if (req.query.status) filter.status = req.query.status;
    const recons = await AccountReconciliation.find(filter).sort({ createdAt: -1 }).limit(50);
    res.json({ success: true, data: recons });
  })
);

router.post(
  '/reconciliation',
  asyncHandler(async (req, res) => {
    if (!AccountReconciliation) throw new AppError('Model not available', 500);
    const recon = await AccountReconciliation.create({
      ...req.body,
      organization: req.user.organization,
      createdBy: req.user.id,
    });
    res.status(201).json({ success: true, data: recon });
  })
);

router.post(
  '/reconciliation/:id/match',
  asyncHandler(async (req, res) => {
    if (!AccountReconciliation) throw new AppError('Model not available', 500);
    const recon = await AccountReconciliation.findById(req.params.id);
    if (!recon) throw new AppError('Reconciliation not found', 404);
    const { debitTransactionId, creditTransactionId, amount } = req.body;
    recon.matchedPairs.push({
      debitTransactionId,
      creditTransactionId,
      amount,
      matchedBy: req.user.id,
      matchType: 'manual',
    });
    recon.reconciledBalance = recon.matchedPairs.reduce((s, p) => s + p.amount, 0);
    recon.unreconciledBalance = recon.totalDebits + recon.totalCredits - recon.reconciledBalance;
    await recon.save();
    res.json({ success: true, data: recon });
  })
);

router.get(
  '/reconciliation/summary',
  asyncHandler(async (req, res) => {
    if (!AccountReconciliation) return res.json({ success: true, data: { total: 0 } });
    const org = req.user.organization;
    const all = await AccountReconciliation.find({ organization: org });
    const data = {
      total: all.length,
      completed: all.filter(r => r.status === 'completed').length,
      inProgress: all.filter(r => r.status === 'in_progress').length,
      draft: all.filter(r => r.status === 'draft').length,
      totalUnreconciled: all.reduce((s, r) => s + (r.unreconciledBalance || 0), 0),
    };
    res.json({ success: true, data });
  })
);

// Intercompany
router.get(
  '/reconciliation/intercompany',
  asyncHandler(async (req, res) => {
    if (!IntercompanyTransaction) return res.json({ success: true, data: [] });
    const txns = await IntercompanyTransaction.find({ organization: req.user.organization })
      .sort({ createdAt: -1 })
      .limit(100);
    res.json({ success: true, data: txns });
  })
);

router.post(
  '/reconciliation/intercompany',
  asyncHandler(async (req, res) => {
    if (!IntercompanyTransaction) throw new AppError('Model not available', 500);
    const txn = await IntercompanyTransaction.create({
      ...req.body,
      organization: req.user.organization,
      createdBy: req.user.id,
    });
    res.status(201).json({ success: true, data: txn });
  })
);

// ╔════════════════════════════════════════════════════════════════════╗
// ║  3. DUNNING & COLLECTION - إدارة التحصيل والمطالبات              ║
// ╚════════════════════════════════════════════════════════════════════╝

// Profiles
router.get(
  '/dunning/profiles',
  asyncHandler(async (req, res) => {
    if (!DunningProfile) return res.json({ success: true, data: [] });
    const profiles = await DunningProfile.find({
      organization: req.user.organization,
      isActive: true,
    });
    res.json({ success: true, data: profiles });
  })
);

router.post(
  '/dunning/profiles',
  asyncHandler(async (req, res) => {
    if (!DunningProfile) throw new AppError('Model not available', 500);
    const profile = await DunningProfile.create({
      ...req.body,
      organization: req.user.organization,
      createdBy: req.user.id,
    });
    res.status(201).json({ success: true, data: profile });
  })
);

// Dunning Queue (customers needing reminders)
router.get(
  '/dunning/queue',
  asyncHandler(async (req, res) => {
    if (!AccountingInvoice) return res.json({ success: true, data: [] });
    const org = req.user.organization;
    const now = new Date();
    const overdueInvoices = await AccountingInvoice.find({
      organization: org,
      status: { $in: ['sent', 'overdue', 'partially_paid'] },
      dueDate: { $lt: now },
    })
      .sort({ dueDate: 1 })
      .limit(100);

    const queue = overdueInvoices.map(inv => ({
      customerId: inv.client || inv.customer,
      customerName: inv.clientName || inv.customerName || 'عميل',
      invoiceId: inv._id,
      invoiceNumber: inv.invoiceNumber || inv.number,
      amount: inv.totalAmount || inv.total || 0,
      paidAmount: inv.paidAmount || 0,
      balanceDue: (inv.totalAmount || inv.total || 0) - (inv.paidAmount || 0),
      dueDate: inv.dueDate,
      daysOverdue: Math.floor((now - inv.dueDate) / (1000 * 60 * 60 * 24)),
    }));
    res.json({ success: true, data: queue });
  })
);

// Execute dunning (send reminders)
router.post(
  '/dunning/execute',
  asyncHandler(async (req, res) => {
    if (!DunningHistory) throw new AppError('Model not available', 500);
    const { customerId, customerName, invoiceId, invoiceNumber, amountDue, level, channel } =
      req.body;
    const record = await DunningHistory.create({
      organization: req.user.organization,
      customerId,
      customerName,
      invoiceId,
      invoiceNumber,
      amountDue,
      level: level || 1,
      channel: channel || 'email',
      sentBy: req.user.id,
    });
    res.status(201).json({ success: true, data: record, message: 'تم إرسال التذكير بنجاح' });
  })
);

// Record promise-to-pay
router.patch(
  '/dunning/:id/promise',
  asyncHandler(async (req, res) => {
    if (!DunningHistory) throw new AppError('Model not available', 500);
    const record = await DunningHistory.findById(req.params.id);
    if (!record) throw new AppError('Record not found', 404);
    record.response = 'promised';
    record.promiseDate = req.body.promiseDate;
    record.promiseAmount = req.body.promiseAmount;
    record.notes = req.body.notes || record.notes;
    await record.save();
    res.json({ success: true, data: record });
  })
);

// Dunning history
router.get(
  '/dunning/history',
  asyncHandler(async (req, res) => {
    if (!DunningHistory) return res.json({ success: true, data: [] });
    const history = await DunningHistory.find({ organization: req.user.organization })
      .sort({ sentAt: -1 })
      .limit(100);
    res.json({ success: true, data: history });
  })
);

// Dunning dashboard
router.get(
  '/dunning/dashboard',
  asyncHandler(async (req, res) => {
    if (!DunningHistory)
      return res.json({ success: true, data: { totalSent: 0, promises: 0, collections: 0 } });
    const org = req.user.organization;
    const history = await DunningHistory.find({ organization: org });
    const data = {
      totalSent: history.length,
      promises: history.filter(h => h.response === 'promised').length,
      promisesFulfilled: history.filter(h => h.promiseFulfilled).length,
      collections: history.filter(h => h.response === 'paid').length,
      escalated: history.filter(h => h.escalated).length,
      noResponse: history.filter(h => h.response === 'no_response').length,
    };
    res.json({ success: true, data });
  })
);

// ╔════════════════════════════════════════════════════════════════════╗
// ║  4. LC & BANK GUARANTEES - خطابات الضمان والاعتمادات المستندية    ║
// ╚════════════════════════════════════════════════════════════════════╝

// Bank Guarantees
router.get(
  '/guarantees',
  asyncHandler(async (req, res) => {
    if (!BankGuarantee) return res.json({ success: true, data: [] });
    const filter = { organization: req.user.organization };
    if (req.query.status) filter.status = req.query.status;
    if (req.query.type) filter.type = req.query.type;
    const guarantees = await BankGuarantee.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data: guarantees });
  })
);

router.post(
  '/guarantees',
  asyncHandler(async (req, res) => {
    if (!BankGuarantee) throw new AppError('Model not available', 500);
    const guarantee = await BankGuarantee.create({
      ...req.body,
      organization: req.user.organization,
      createdBy: req.user.id,
    });
    res.status(201).json({ success: true, data: guarantee });
  })
);

router.patch(
  '/guarantees/:id/status',
  asyncHandler(async (req, res) => {
    if (!BankGuarantee) throw new AppError('Model not available', 500);
    const guarantee = await BankGuarantee.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );
    if (!guarantee) throw new AppError('Guarantee not found', 404);
    res.json({ success: true, data: guarantee });
  })
);

router.get(
  '/guarantees/expiring',
  asyncHandler(async (req, res) => {
    if (!BankGuarantee) return res.json({ success: true, data: [] });
    const days = parseInt(req.query.days) || 30;
    const future = new Date();
    future.setDate(future.getDate() + days);
    const expiring = await BankGuarantee.find({
      organization: req.user.organization,
      status: { $in: ['issued', 'active'] },
      expiryDate: { $lte: future },
    }).sort({ expiryDate: 1 });
    res.json({ success: true, data: expiring });
  })
);

router.get(
  '/guarantees/exposure',
  asyncHandler(async (req, res) => {
    if (!BankGuarantee)
      return res.json({ success: true, data: { byBank: [], byType: [], totalExposure: 0 } });
    const org = req.user.organization;
    const active = await BankGuarantee.find({
      organization: org,
      status: { $in: ['issued', 'active'] },
    });
    const byBank = {};
    const byType = {};
    let totalExposure = 0;
    active.forEach(g => {
      byBank[g.bankName] = (byBank[g.bankName] || 0) + g.amount;
      byType[g.type] = (byType[g.type] || 0) + g.amount;
      totalExposure += g.amount;
    });
    res.json({
      success: true,
      data: {
        byBank: Object.entries(byBank).map(([k, v]) => ({ bank: k, amount: v })),
        byType: Object.entries(byType).map(([k, v]) => ({ type: k, amount: v })),
        totalExposure,
        totalActive: active.length,
        totalMargin: active.reduce((s, g) => s + (g.marginAmount || 0), 0),
      },
    });
  })
);

// Letters of Credit
router.get(
  '/lc',
  asyncHandler(async (req, res) => {
    if (!LetterOfCredit) return res.json({ success: true, data: [] });
    const filter = { organization: req.user.organization };
    if (req.query.status) filter.status = req.query.status;
    const lcs = await LetterOfCredit.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data: lcs });
  })
);

router.post(
  '/lc',
  asyncHandler(async (req, res) => {
    if (!LetterOfCredit) throw new AppError('Model not available', 500);
    const lc = await LetterOfCredit.create({
      ...req.body,
      organization: req.user.organization,
      createdBy: req.user.id,
    });
    res.status(201).json({ success: true, data: lc });
  })
);

router.patch(
  '/lc/:id/stage',
  asyncHandler(async (req, res) => {
    if (!LetterOfCredit) throw new AppError('Model not available', 500);
    const lc = await LetterOfCredit.findById(req.params.id);
    if (!lc) throw new AppError('LC not found', 404);
    lc.stages.push({ stage: req.body.stage, amount: req.body.amount, notes: req.body.notes });
    lc.currentStage = req.body.stage;
    if (req.body.stage === 'paid') lc.status = 'paid';
    if (req.body.stage === 'closed') lc.status = 'closed';
    await lc.save();
    res.json({ success: true, data: lc });
  })
);

// ╔════════════════════════════════════════════════════════════════════╗
// ║  5. TREASURY & CASH FORECASTING - إدارة الخزينة والتنبؤ النقدي   ║
// ╚════════════════════════════════════════════════════════════════════╝

router.get(
  '/treasury/dashboard',
  asyncHandler(async (req, res) => {
    const bankAccounts = BankAccount
      ? await BankAccount.find({ organization: req.user.organization, status: 'active' })
      : [];
    const forecasts = CashForecast
      ? await CashForecast.find({ organization: req.user.organization, status: 'active' }).sort({
          periodStart: 1,
        })
      : [];
    const totalBalance = bankAccounts.reduce((s, a) => s + (a.currentBalance || 0), 0);
    const byCurrency = {};
    bankAccounts.forEach(a => {
      byCurrency[a.currency] = (byCurrency[a.currency] || 0) + (a.currentBalance || 0);
    });
    res.json({
      success: true,
      data: {
        totalBalance,
        byCurrency: Object.entries(byCurrency).map(([k, v]) => ({ currency: k, balance: v })),
        accountCount: bankAccounts.length,
        forecasts: forecasts.slice(0, 5),
      },
    });
  })
);

router.get(
  '/treasury/forecast',
  asyncHandler(async (req, res) => {
    if (!CashForecast) return res.json({ success: true, data: [] });
    const filter = { organization: req.user.organization };
    if (req.query.scenarioType) filter.scenarioType = req.query.scenarioType;
    if (req.query.status) filter.status = req.query.status;
    const forecasts = await CashForecast.find(filter).sort({ periodStart: 1 });
    res.json({ success: true, data: forecasts });
  })
);

router.post(
  '/treasury/forecast',
  asyncHandler(async (req, res) => {
    if (!CashForecast) throw new AppError('Model not available', 500);
    const forecast = await CashForecast.create({
      ...req.body,
      organization: req.user.organization,
      createdBy: req.user.id,
    });
    res.status(201).json({ success: true, data: forecast });
  })
);

// Inter-bank transfers
router.get(
  '/treasury/transfers',
  asyncHandler(async (req, res) => {
    if (!TreasuryTransfer) return res.json({ success: true, data: [] });
    const transfers = await TreasuryTransfer.find({ organization: req.user.organization })
      .sort({ transferDate: -1 })
      .limit(50);
    res.json({ success: true, data: transfers });
  })
);

router.post(
  '/treasury/transfers',
  asyncHandler(async (req, res) => {
    if (!TreasuryTransfer) throw new AppError('Model not available', 500);
    const transfer = await TreasuryTransfer.create({
      ...req.body,
      organization: req.user.organization,
      createdBy: req.user.id,
    });
    res.status(201).json({ success: true, data: transfer });
  })
);

router.patch(
  '/treasury/transfers/:id/execute',
  asyncHandler(async (req, res) => {
    if (!TreasuryTransfer) throw new AppError('Model not available', 500);
    const transfer = await TreasuryTransfer.findById(req.params.id);
    if (!transfer) throw new AppError('Transfer not found', 404);
    transfer.status = 'executed';
    transfer.executedBy = req.user.id;
    await transfer.save();
    // Update bank balances
    if (BankAccount) {
      await BankAccount.findByIdAndUpdate(transfer.fromBankAccountId, {
        $inc: { currentBalance: -transfer.amount },
      });
      await BankAccount.findByIdAndUpdate(transfer.toBankAccountId, {
        $inc: { currentBalance: transfer.amount },
      });
    }
    res.json({ success: true, data: transfer, message: 'تم تنفيذ التحويل بنجاح' });
  })
);

// ╔════════════════════════════════════════════════════════════════════╗
// ║  6. ZATCA FILING TRACKER - إدارة الإقرارات الضريبية              ║
// ╚════════════════════════════════════════════════════════════════════╝

router.get(
  '/tax-filing',
  asyncHandler(async (req, res) => {
    if (!TaxFiling) return res.json({ success: true, data: [] });
    const filter = { organization: req.user.organization };
    if (req.query.type) filter.type = req.query.type;
    if (req.query.status) filter.status = req.query.status;
    const filings = await TaxFiling.find(filter).sort({ dueDate: -1 });
    res.json({ success: true, data: filings });
  })
);

router.post(
  '/tax-filing',
  asyncHandler(async (req, res) => {
    if (!TaxFiling) throw new AppError('Model not available', 500);
    const filing = await TaxFiling.create({
      ...req.body,
      organization: req.user.organization,
      createdBy: req.user.id,
    });
    res.status(201).json({ success: true, data: filing });
  })
);

router.patch(
  '/tax-filing/:id/status',
  asyncHandler(async (req, res) => {
    if (!TaxFiling) throw new AppError('Model not available', 500);
    const filing = await TaxFiling.findById(req.params.id);
    if (!filing) throw new AppError('Filing not found', 404);
    filing.status = req.body.status;
    if (req.body.status === 'prepared') {
      filing.preparedBy = req.user.id;
      filing.preparedAt = new Date();
      filing.preparedAmount = req.body.amount || filing.preparedAmount;
    }
    if (req.body.status === 'submitted') {
      filing.submittedBy = req.user.id;
      filing.submittedAt = new Date();
      filing.submittedAmount = req.body.amount || filing.submittedAmount;
      filing.zatcaReference = req.body.zatcaReference;
    }
    if (req.body.status === 'assessed') {
      filing.assessedAmount = req.body.amount || filing.assessedAmount;
    }
    await filing.save();
    res.json({ success: true, data: filing });
  })
);

router.post(
  '/tax-filing/:id/correction',
  asyncHandler(async (req, res) => {
    if (!TaxFiling) throw new AppError('Model not available', 500);
    const original = await TaxFiling.findById(req.params.id);
    if (!original) throw new AppError('Original filing not found', 404);
    const correction = await TaxFiling.create({
      ...req.body,
      organization: req.user.organization,
      type: original.type,
      periodStart: original.periodStart,
      periodEnd: original.periodEnd,
      status: 'draft',
      correctionOf: original._id,
      amendmentNotes: req.body.amendmentNotes,
      createdBy: req.user.id,
    });
    original.status = 'amended';
    await original.save();
    res.status(201).json({ success: true, data: correction });
  })
);

// Penalties
router.get(
  '/tax-filing/penalties',
  asyncHandler(async (req, res) => {
    if (!TaxPenalty) return res.json({ success: true, data: [] });
    const penalties = await TaxPenalty.find({ organization: req.user.organization }).sort({
      createdAt: -1,
    });
    res.json({ success: true, data: penalties });
  })
);

router.post(
  '/tax-filing/penalties',
  asyncHandler(async (req, res) => {
    if (!TaxPenalty) throw new AppError('Model not available', 500);
    const penalty = await TaxPenalty.create({
      ...req.body,
      organization: req.user.organization,
      createdBy: req.user.id,
    });
    res.status(201).json({ success: true, data: penalty });
  })
);

// Filing Dashboard
router.get(
  '/tax-filing/dashboard',
  asyncHandler(async (req, res) => {
    if (!TaxFiling) return res.json({ success: true, data: { total: 0 } });
    const org = req.user.organization;
    const filings = await TaxFiling.find({ organization: org });
    const penalties = TaxPenalty ? await TaxPenalty.find({ organization: org }) : [];
    const now = new Date();
    const data = {
      total: filings.length,
      upcoming: filings.filter(f => f.status === 'upcoming').length,
      overdue: filings.filter(
        f =>
          f.status === 'overdue' ||
          (f.dueDate < now && !['submitted', 'accepted', 'assessed'].includes(f.status))
      ).length,
      submitted: filings.filter(f => f.status === 'submitted').length,
      accepted: filings.filter(f => f.status === 'accepted').length,
      totalPenalties: penalties.reduce((s, p) => s + (p.totalDue || 0), 0),
      unpaidPenalties: penalties
        .filter(p => p.status !== 'paid' && p.status !== 'waived')
        .reduce((s, p) => s + (p.totalDue || 0) - (p.paidAmount || 0), 0),
      byType: {},
    };
    filings.forEach(f => {
      data.byType[f.type] = (data.byType[f.type] || 0) + 1;
    });
    res.json({ success: true, data });
  })
);

// ╔════════════════════════════════════════════════════════════════════╗
// ║  7. FINANCIAL APPROVALS ENGINE - سير عمل الاعتمادات المالية       ║
// ╚════════════════════════════════════════════════════════════════════╝

// Workflows
router.get(
  '/approvals/workflows',
  asyncHandler(async (req, res) => {
    if (!ApprovalWorkflow) return res.json({ success: true, data: [] });
    const workflows = await ApprovalWorkflow.find({
      organization: req.user.organization,
      isActive: true,
    });
    res.json({ success: true, data: workflows });
  })
);

router.post(
  '/approvals/workflows',
  asyncHandler(async (req, res) => {
    if (!ApprovalWorkflow) throw new AppError('Model not available', 500);
    const workflow = await ApprovalWorkflow.create({
      ...req.body,
      organization: req.user.organization,
      createdBy: req.user.id,
    });
    res.status(201).json({ success: true, data: workflow });
  })
);

// Approval Requests
router.get(
  '/approvals/pending',
  asyncHandler(async (req, res) => {
    if (!FinancialApproval) return res.json({ success: true, data: [] });
    const pending = await FinancialApproval.find({
      organization: req.user.organization,
      'steps.approver': req.user.id,
      'steps.status': 'pending',
      overallStatus: { $in: ['pending', 'in_progress'] },
    }).sort({ createdAt: -1 });
    res.json({ success: true, data: pending });
  })
);

router.get(
  '/approvals/history',
  asyncHandler(async (req, res) => {
    if (!FinancialApproval) return res.json({ success: true, data: [] });
    const all = await FinancialApproval.find({ organization: req.user.organization })
      .sort({ createdAt: -1 })
      .limit(100);
    res.json({ success: true, data: all });
  })
);

router.post(
  '/approvals/request',
  asyncHandler(async (req, res) => {
    if (!FinancialApproval) throw new AppError('Model not available', 500);
    const approval = await FinancialApproval.create({
      ...req.body,
      organization: req.user.organization,
      submittedBy: req.user.id,
      createdBy: req.user.id,
    });
    res.status(201).json({ success: true, data: approval });
  })
);

router.patch(
  '/approvals/:id/decide',
  asyncHandler(async (req, res) => {
    if (!FinancialApproval) throw new AppError('Model not available', 500);
    const approval = await FinancialApproval.findById(req.params.id);
    if (!approval) throw new AppError('Approval not found', 404);
    const step = approval.steps.find(
      s => s.approver?.toString() === req.user.id && s.status === 'pending'
    );
    if (!step) throw new AppError('لا يوجد خطوة اعتماد معلقة لك', 403);
    step.status = req.body.action; // 'approved' or 'rejected'
    step.decidedAt = new Date();
    step.comment = req.body.comment;
    if (req.body.action === 'rejected') {
      approval.overallStatus = 'rejected';
      approval.finalDecisionBy = req.user.id;
      approval.finalDecisionAt = new Date();
    } else {
      const pendingSteps = approval.steps.filter(s => s.status === 'pending');
      if (pendingSteps.length === 0) {
        approval.overallStatus = 'approved';
        approval.finalDecisionBy = req.user.id;
        approval.finalDecisionAt = new Date();
      } else {
        approval.currentStep += 1;
        approval.overallStatus = 'in_progress';
      }
    }
    await approval.save();
    res.json({ success: true, data: approval });
  })
);

router.patch(
  '/approvals/:id/delegate',
  asyncHandler(async (req, res) => {
    if (!FinancialApproval) throw new AppError('Model not available', 500);
    const approval = await FinancialApproval.findById(req.params.id);
    if (!approval) throw new AppError('Approval not found', 404);
    const step = approval.steps.find(
      s => s.approver?.toString() === req.user.id && s.status === 'pending'
    );
    if (!step) throw new AppError('لا يوجد خطوة اعتماد معلقة لك', 403);
    step.status = 'delegated';
    step.delegatedTo = req.body.delegateTo;
    step.delegatedAt = new Date();
    // Add new step for delegate
    approval.steps.push({
      stepOrder: step.stepOrder,
      stepName: step.stepName,
      approver: req.body.delegateTo,
      status: 'pending',
      slaDeadline: step.slaDeadline,
    });
    await approval.save();
    res.json({ success: true, data: approval, message: 'تم تفويض الاعتماد' });
  })
);

// SLA report
router.get(
  '/approvals/sla-report',
  asyncHandler(async (req, res) => {
    if (!FinancialApproval) return res.json({ success: true, data: { total: 0 } });
    const all = await FinancialApproval.find({ organization: req.user.organization });
    const data = {
      total: all.length,
      pending: all.filter(a => a.overallStatus === 'pending' || a.overallStatus === 'in_progress')
        .length,
      approved: all.filter(a => a.overallStatus === 'approved').length,
      rejected: all.filter(a => a.overallStatus === 'rejected').length,
      slaBreaches: all.reduce((s, a) => s + a.steps.filter(st => st.isSlaBreached).length, 0),
      avgApprovalHours: (() => {
        const decided = all.filter(a => a.finalDecisionAt);
        if (decided.length === 0) return 0;
        const total = decided.reduce(
          (s, a) => s + (a.finalDecisionAt - a.createdAt) / (1000 * 60 * 60),
          0
        );
        return Math.round(total / decided.length);
      })(),
    };
    res.json({ success: true, data });
  })
);

// ╔════════════════════════════════════════════════════════════════════╗
// ║  8. LOAN & FINANCING MANAGEMENT - إدارة القروض والتمويل          ║
// ╚════════════════════════════════════════════════════════════════════╝

router.get(
  '/company-loans',
  asyncHandler(async (req, res) => {
    if (!CompanyLoan) return res.json({ success: true, data: [] });
    const filter = { organization: req.user.organization };
    if (req.query.status) filter.status = req.query.status;
    if (req.query.facilityType) filter.facilityType = req.query.facilityType;
    const loans = await CompanyLoan.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data: loans });
  })
);

router.post(
  '/company-loans',
  asyncHandler(async (req, res) => {
    if (!CompanyLoan) throw new AppError('Model not available', 500);
    const loan = await CompanyLoan.create({
      ...req.body,
      organization: req.user.organization,
      createdBy: req.user.id,
    });
    res.status(201).json({ success: true, data: loan });
  })
);

router.get(
  '/company-loans/:id',
  asyncHandler(async (req, res) => {
    if (!CompanyLoan) throw new AppError('Model not available', 500);
    const loan = await CompanyLoan.findById(req.params.id);
    if (!loan) throw new AppError('Loan not found', 404);
    res.json({ success: true, data: loan });
  })
);

// Drawdown
router.post(
  '/company-loans/:id/drawdown',
  asyncHandler(async (req, res) => {
    if (!CompanyLoan || !LoanDrawdown) throw new AppError('Model not available', 500);
    const loan = await CompanyLoan.findById(req.params.id);
    if (!loan) throw new AppError('Loan not found', 404);
    const { amount } = req.body;
    if (loan.drawnAmount + amount > loan.principalAmount)
      throw new AppError('تجاوز الحد المسموح', 400);
    const drawdown = await LoanDrawdown.create({
      organization: req.user.organization,
      loanId: loan._id,
      amount,
      purpose: req.body.purpose,
      status: 'disbursed',
      createdBy: req.user.id,
    });
    loan.drawnAmount += amount;
    loan.outstandingBalance += amount;
    if (loan.status === 'approved') loan.status = 'active';
    await loan.save();
    res.status(201).json({ success: true, data: { loan, drawdown } });
  })
);

// Repayment
router.post(
  '/company-loans/:id/repayment',
  asyncHandler(async (req, res) => {
    if (!CompanyLoan) throw new AppError('Model not available', 500);
    const loan = await CompanyLoan.findById(req.params.id);
    if (!loan) throw new AppError('Loan not found', 404);
    const { amount, principalPortion, profitPortion } = req.body;
    loan.outstandingBalance = Math.max(0, loan.outstandingBalance - (principalPortion || amount));
    loan.paidInstallments = (loan.paidInstallments || 0) + 1;
    // Update next installment in schedule
    const nextDue = loan.amortizationSchedule.find(
      i => i.status === 'due' || i.status === 'upcoming'
    );
    if (nextDue) {
      nextDue.status = 'paid';
      nextDue.paidAmount = amount;
      nextDue.paidDate = new Date();
    }
    if (loan.outstandingBalance <= 0) loan.status = 'completed';
    await loan.save();
    res.json({ success: true, data: loan, message: 'تم تسجيل السداد بنجاح' });
  })
);

// Covenant compliance
router.get(
  '/company-loans/covenants/check',
  asyncHandler(async (req, res) => {
    if (!CompanyLoan) return res.json({ success: true, data: [] });
    const loans = await CompanyLoan.find({ organization: req.user.organization, status: 'active' });
    const allCovenants = [];
    loans.forEach(l => {
      (l.covenants || []).forEach(c => {
        allCovenants.push({ loanNumber: l.loanNumber, lender: l.lenderName, ...c.toObject() });
      });
    });
    res.json({ success: true, data: allCovenants });
  })
);

// Loan summary
router.get(
  '/company-loans/summary',
  asyncHandler(async (req, res) => {
    if (!CompanyLoan) return res.json({ success: true, data: { totalLoans: 0 } });
    const loans = await CompanyLoan.find({ organization: req.user.organization });
    const active = loans.filter(l => l.status === 'active');
    const data = {
      totalLoans: loans.length,
      activeLoans: active.length,
      totalPrincipal: active.reduce((s, l) => s + (l.principalAmount || 0), 0),
      totalOutstanding: active.reduce((s, l) => s + (l.outstandingBalance || 0), 0),
      totalDrawn: active.reduce((s, l) => s + (l.drawnAmount || 0), 0),
      byType: {},
      upcoming: active
        .flatMap(l =>
          (l.amortizationSchedule || [])
            .filter(i => i.status === 'upcoming' || i.status === 'due')
            .slice(0, 3)
            .map(i => ({
              loanNumber: l.loanNumber,
              lender: l.lenderName,
              dueDate: i.dueDate,
              totalDue: i.totalDue,
            }))
        )
        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
        .slice(0, 10),
    };
    active.forEach(l => {
      data.byType[l.facilityType] = (data.byType[l.facilityType] || 0) + 1;
    });
    res.json({ success: true, data });
  })
);

// Maturity profile
router.get(
  '/company-loans/maturity-profile',
  asyncHandler(async (req, res) => {
    if (!CompanyLoan) return res.json({ success: true, data: [] });
    const active = await CompanyLoan.find({
      organization: req.user.organization,
      status: 'active',
    });
    const now = new Date();
    const buckets = [
      { label: 'خلال سنة', min: 0, max: 365 },
      { label: '1-3 سنوات', min: 365, max: 1095 },
      { label: '3-5 سنوات', min: 1095, max: 1825 },
      { label: 'أكثر من 5 سنوات', min: 1825, max: Infinity },
    ];
    const profile = buckets.map(b => ({
      label: b.label,
      amount: active
        .filter(l => {
          const days = (new Date(l.maturityDate) - now) / (1000 * 60 * 60 * 24);
          return days >= b.min && days < b.max;
        })
        .reduce((s, l) => s + (l.outstandingBalance || 0), 0),
      count: active.filter(l => {
        const days = (new Date(l.maturityDate) - now) / (1000 * 60 * 60 * 24);
        return days >= b.min && days < b.max;
      }).length,
    }));
    res.json({ success: true, data: profile });
  })
);

module.exports = router;
