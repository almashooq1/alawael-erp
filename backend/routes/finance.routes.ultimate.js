/* eslint-disable no-unused-vars */
/**
 * ===================================================================
 * FINANCE ULTIMATE ROUTES - المسارات المالية المتقدمة النهائية
 * ===================================================================
 * الإصدار: 1.0
 * التاريخ: مارس 2026
 * الوصف: ميزات مالية متقدمة على مستوى المؤسسة:
 *   1. التجميع المالي (Financial Consolidation)
 *   2. الاعتراف بالإيراد IFRS 15 (Revenue Recognition)
 *   3. محاسبة الإيجارات IFRS 16 (Lease Accounting)
 *   4. المحفظة الاستثمارية (Investment Portfolio)
 *   5. إدارة الائتمان (Credit Management)
 *   6. التخطيط والتحليل المالي FP&A (Financial Planning)
 *   7. الامتثال والرقابة الداخلية (Compliance & Controls)
 *   8. التسويات بين الشركات (Intercompany Settlement)
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
    logger.warn(`Model ${name} not available: ${e.message}`);
    return null;
  }
};

const FinancialConsolidation = safeRequire(
  '../models/FinancialConsolidation',
  'FinancialConsolidation'
);
const revRecModels = safeRequire('../models/RevenueRecognition', 'RevenueRecognition');
const RevenueContract = revRecModels?.RevenueContract || revRecModels;
const RevenueSchedule = revRecModels?.RevenueSchedule;
const LeaseContract = safeRequire('../models/LeaseAccounting', 'LeaseAccounting');
const Investment = safeRequire('../models/Investment', 'Investment');
const creditModels = safeRequire('../models/CreditManagement', 'CreditManagement');
const CreditProfile = creditModels?.CreditProfile || creditModels;
const CreditApplication = creditModels?.CreditApplication;
const FinancialPlan = safeRequire('../models/FinancialPlanning', 'FinancialPlanning');
const complianceModels = safeRequire('../models/ComplianceControl', 'ComplianceControl');
const InternalControl = complianceModels?.InternalControl || complianceModels;
const ComplianceItem = complianceModels?.ComplianceItem;
const icModels = safeRequire('../models/IntercompanySettlement', 'IntercompanySettlement');
const IntercompanyInvoice = icModels?.IntercompanyInvoice || icModels;
const SettlementRun = icModels?.SettlementRun;

router.use(authenticateToken);

// ═══════════════════════════════════════════════════════════════════════
// 1. FINANCIAL CONSOLIDATION - التجميع المالي
// ═══════════════════════════════════════════════════════════════════════

router.get(
  '/consolidation',
  asyncHandler(async (req, res) => {
    if (!FinancialConsolidation) throw new AppError('Model not available', 501);
    const data = await FinancialConsolidation.find({ organization: req.user.organization }).sort({
      createdAt: -1,
    });
    res.json({ success: true, data });
  })
);

router.post(
  '/consolidation',
  asyncHandler(async (req, res) => {
    if (!FinancialConsolidation) throw new AppError('Model not available', 501);
    const doc = await FinancialConsolidation.create({
      ...req.body,
      organization: req.user.organization,
      preparedBy: req.user._id,
    });
    res.status(201).json({ success: true, data: doc });
  })
);

router.get(
  '/consolidation/:id',
  asyncHandler(async (req, res) => {
    if (!FinancialConsolidation) throw new AppError('Model not available', 501);
    const doc = await FinancialConsolidation.findOne({
      _id: req.params.id,
      organization: req.user.organization,
    });
    if (!doc) throw new AppError('Consolidation not found', 404);
    res.json({ success: true, data: doc });
  })
);

router.post(
  '/consolidation/:id/calculate',
  asyncHandler(async (req, res) => {
    if (!FinancialConsolidation) throw new AppError('Model not available', 501);
    const doc = await FinancialConsolidation.findOne({
      _id: req.params.id,
      organization: req.user.organization,
    });
    if (!doc) throw new AppError('Consolidation not found', 404);
    const totals = {
      totalAssets: 0,
      totalLiabilities: 0,
      totalEquity: 0,
      totalRevenue: 0,
      totalExpenses: 0,
      netIncome: 0,
      minorityInterest: 0,
    };
    for (const entity of doc.entities) {
      const pct = (entity.ownershipPct || 100) / 100;
      const rate = entity.exchangeRate || 1;
      totals.totalAssets += (entity.totalAssets || 0) * pct * rate;
      totals.totalLiabilities += (entity.totalLiabilities || 0) * pct * rate;
      totals.totalEquity += (entity.totalEquity || 0) * pct * rate;
      totals.totalRevenue += (entity.totalRevenue || 0) * pct * rate;
      totals.totalExpenses += (entity.totalExpenses || 0) * pct * rate;
      totals.netIncome += (entity.netIncome || 0) * pct * rate;
      if (pct < 1) totals.minorityInterest += (entity.netIncome || 0) * (1 - pct) * rate;
    }
    for (const elim of doc.eliminationEntries || []) {
      totals.totalRevenue -= elim.eliminationType === 'intercompany_revenue' ? elim.amount : 0;
      totals.totalExpenses -= elim.eliminationType === 'intercompany_revenue' ? elim.amount : 0;
    }
    doc.consolidated = totals;
    doc.status = 'in_progress';
    await doc.save();
    res.json({ success: true, data: doc });
  })
);

router.patch(
  '/consolidation/:id/status',
  asyncHandler(async (req, res) => {
    if (!FinancialConsolidation) throw new AppError('Model not available', 501);
    const doc = await FinancialConsolidation.findOneAndUpdate(
      { _id: req.params.id, organization: req.user.organization },
      {
        status: req.body.status,
        ...(req.body.status === 'approved' ? { approvedBy: req.user._id } : {}),
      },
      { new: true }
    );
    if (!doc) throw new AppError('Not found', 404);
    res.json({ success: true, data: doc });
  })
);

router.get(
  '/consolidation/summary/dashboard',
  asyncHandler(async (req, res) => {
    if (!FinancialConsolidation) throw new AppError('Model not available', 501);
    const all = await FinancialConsolidation.find({ organization: req.user.organization });
    const total = all.length;
    const published = all.filter(c => c.status === 'published').length;
    const inProgress = all.filter(c => c.status === 'in_progress').length;
    const latest = all.length > 0 ? all[0] : null;
    res.json({
      success: true,
      data: {
        total,
        published,
        inProgress,
        draft: total - published - inProgress,
        latest: latest?.consolidated,
      },
    });
  })
);

// ═══════════════════════════════════════════════════════════════════════
// 2. REVENUE RECOGNITION - IFRS 15 الاعتراف بالإيراد
// ═══════════════════════════════════════════════════════════════════════

router.get(
  '/revenue-recognition',
  asyncHandler(async (req, res) => {
    if (!RevenueContract) throw new AppError('Model not available', 501);
    const data = await RevenueContract.find({ organization: req.user.organization }).sort({
      createdAt: -1,
    });
    res.json({ success: true, data });
  })
);

router.post(
  '/revenue-recognition',
  asyncHandler(async (req, res) => {
    if (!RevenueContract) throw new AppError('Model not available', 501);
    const doc = await RevenueContract.create({
      ...req.body,
      organization: req.user.organization,
      createdBy: req.user._id,
    });
    res.status(201).json({ success: true, data: doc });
  })
);

router.get(
  '/revenue-recognition/:id',
  asyncHandler(async (req, res) => {
    if (!RevenueContract) throw new AppError('Model not available', 501);
    const doc = await RevenueContract.findOne({
      _id: req.params.id,
      organization: req.user.organization,
    });
    if (!doc) throw new AppError('Contract not found', 404);
    res.json({ success: true, data: doc });
  })
);

router.post(
  '/revenue-recognition/:id/allocate',
  asyncHandler(async (req, res) => {
    if (!RevenueContract) throw new AppError('Model not available', 501);
    const doc = await RevenueContract.findOne({
      _id: req.params.id,
      organization: req.user.organization,
    });
    if (!doc) throw new AppError('Contract not found', 404);
    const totalStandalone = doc.performanceObligations.reduce(
      (s, o) => s + (o.standalonePrice || 0),
      0
    );
    if (totalStandalone > 0) {
      doc.performanceObligations.forEach(ob => {
        ob.allocatedPrice =
          Math.round((ob.standalonePrice / totalStandalone) * doc.totalContractValue * 100) / 100;
      });
    }
    await doc.save();
    res.json({ success: true, data: doc });
  })
);

router.post(
  '/revenue-recognition/:id/recognize',
  asyncHandler(async (req, res) => {
    if (!RevenueContract) throw new AppError('Model not available', 501);
    const doc = await RevenueContract.findOne({
      _id: req.params.id,
      organization: req.user.organization,
    });
    if (!doc) throw new AppError('Contract not found', 404);
    let totalRecognized = 0;
    doc.performanceObligations.forEach(ob => {
      if (ob.recognitionMethod === 'point_in_time' && ob.status === 'satisfied') {
        ob.recognizedAmount = ob.allocatedPrice || ob.standalonePrice;
      } else if (ob.recognitionMethod.startsWith('over_time')) {
        ob.recognizedAmount =
          Math.round(
            ((ob.percentComplete || 0) / 100) * (ob.allocatedPrice || ob.standalonePrice) * 100
          ) / 100;
      }
      ob.deferredAmount = (ob.allocatedPrice || ob.standalonePrice) - (ob.recognizedAmount || 0);
      totalRecognized += ob.recognizedAmount || 0;
    });
    doc.totalRecognized = totalRecognized;
    doc.totalDeferred = doc.totalContractValue - totalRecognized;
    await doc.save();
    res.json({ success: true, data: doc });
  })
);

router.get(
  '/revenue-recognition/schedule/list',
  asyncHandler(async (req, res) => {
    if (!RevenueSchedule) return res.json({ success: true, data: [] });
    const data = await RevenueSchedule.find({ organization: req.user.organization }).sort({
      recognitionDate: 1,
    });
    res.json({ success: true, data });
  })
);

router.get(
  '/revenue-recognition/summary/dashboard',
  asyncHandler(async (req, res) => {
    if (!RevenueContract) throw new AppError('Model not available', 501);
    const all = await RevenueContract.find({ organization: req.user.organization });
    const totalContracts = all.length;
    const totalValue = all.reduce((s, c) => s + (c.totalContractValue || 0), 0);
    const totalRecognized = all.reduce((s, c) => s + (c.totalRecognized || 0), 0);
    const totalDeferred = all.reduce((s, c) => s + (c.totalDeferred || 0), 0);
    const active = all.filter(c => c.status === 'active').length;
    res.json({
      success: true,
      data: {
        totalContracts,
        active,
        totalValue,
        totalRecognized,
        totalDeferred,
        recognitionRate: totalValue > 0 ? Math.round((totalRecognized / totalValue) * 100) : 0,
      },
    });
  })
);

// ═══════════════════════════════════════════════════════════════════════
// 3. LEASE ACCOUNTING - IFRS 16 محاسبة الإيجارات
// ═══════════════════════════════════════════════════════════════════════

router.get(
  '/leases',
  asyncHandler(async (req, res) => {
    if (!LeaseContract) throw new AppError('Model not available', 501);
    const data = await LeaseContract.find({ organization: req.user.organization }).sort({
      createdAt: -1,
    });
    res.json({ success: true, data });
  })
);

router.post(
  '/leases',
  asyncHandler(async (req, res) => {
    if (!LeaseContract) throw new AppError('Model not available', 501);
    const doc = await LeaseContract.create({
      ...req.body,
      organization: req.user.organization,
      createdBy: req.user._id,
    });
    res.status(201).json({ success: true, data: doc });
  })
);

router.get(
  '/leases/:id',
  asyncHandler(async (req, res) => {
    if (!LeaseContract) throw new AppError('Model not available', 501);
    const doc = await LeaseContract.findOne({
      _id: req.params.id,
      organization: req.user.organization,
    });
    if (!doc) throw new AppError('Lease not found', 404);
    res.json({ success: true, data: doc });
  })
);

router.post(
  '/leases/:id/calculate-rou',
  asyncHandler(async (req, res) => {
    if (!LeaseContract) throw new AppError('Model not available', 501);
    const doc = await LeaseContract.findOne({
      _id: req.params.id,
      organization: req.user.organization,
    });
    if (!doc) throw new AppError('Lease not found', 404);
    // PV calculation of lease payments
    const rate = (doc.incrementalBorrowingRate || 5) / 100 / 12;
    const n = doc.leaseTermMonths || 12;
    const pmt = doc.monthlyPayment || 0;
    let pvLiability = 0;
    const schedule = [];
    let liability = 0;
    // Calculate PV
    for (let i = 1; i <= n; i++) {
      pvLiability += pmt / Math.pow(1 + rate, i);
    }
    pvLiability = Math.round(pvLiability * 100) / 100;
    doc.rouAssetInitial = pvLiability;
    doc.rouAssetCurrent = pvLiability;
    doc.leaseLiabilityInitial = pvLiability;
    doc.leaseLiabilityCurrent = pvLiability;
    // Build amortization schedule
    liability = pvLiability;
    for (let i = 1; i <= n; i++) {
      const interest = Math.round(liability * rate * 100) / 100;
      const principal = Math.round((pmt - interest) * 100) / 100;
      liability = Math.round((liability - principal) * 100) / 100;
      const start = new Date(doc.commencementDate);
      start.setMonth(start.getMonth() + i);
      schedule.push({
        paymentNumber: i,
        dueDate: start,
        leasePayment: pmt,
        interestExpense: interest,
        principalReduction: principal,
        closingLiability: Math.max(0, liability),
        status: 'upcoming',
      });
    }
    doc.paymentSchedule = schedule;
    doc.totalInterestExpense = schedule.reduce((s, p) => s + p.interestExpense, 0);
    doc.totalDepreciation = pvLiability;
    doc.status = 'active';
    await doc.save();
    res.json({ success: true, data: doc });
  })
);

router.get(
  '/leases/summary/dashboard',
  asyncHandler(async (req, res) => {
    if (!LeaseContract) throw new AppError('Model not available', 501);
    const all = await LeaseContract.find({ organization: req.user.organization });
    const totalLeases = all.length;
    const active = all.filter(l => l.status === 'active').length;
    const totalRouAsset = all.reduce((s, l) => s + (l.rouAssetCurrent || 0), 0);
    const totalLiability = all.reduce((s, l) => s + (l.leaseLiabilityCurrent || 0), 0);
    const monthlyPayments = all
      .filter(l => l.status === 'active')
      .reduce((s, l) => s + (l.monthlyPayment || 0), 0);
    const expiringSoon = all.filter(l => {
      if (!l.endDate) return false;
      const diff = (new Date(l.endDate) - new Date()) / (1000 * 60 * 60 * 24);
      return diff > 0 && diff <= 90;
    }).length;
    res.json({
      success: true,
      data: { totalLeases, active, totalRouAsset, totalLiability, monthlyPayments, expiringSoon },
    });
  })
);

// ═══════════════════════════════════════════════════════════════════════
// 4. INVESTMENT PORTFOLIO - المحفظة الاستثمارية
// ═══════════════════════════════════════════════════════════════════════

router.get(
  '/investments',
  asyncHandler(async (req, res) => {
    if (!Investment) throw new AppError('Model not available', 501);
    const data = await Investment.find({ organization: req.user.organization }).sort({
      createdAt: -1,
    });
    res.json({ success: true, data });
  })
);

router.post(
  '/investments',
  asyncHandler(async (req, res) => {
    if (!Investment) throw new AppError('Model not available', 501);
    const doc = await Investment.create({
      ...req.body,
      organization: req.user.organization,
      createdBy: req.user._id,
    });
    res.status(201).json({ success: true, data: doc });
  })
);

router.get(
  '/investments/:id',
  asyncHandler(async (req, res) => {
    if (!Investment) throw new AppError('Model not available', 501);
    const doc = await Investment.findOne({
      _id: req.params.id,
      organization: req.user.organization,
    });
    if (!doc) throw new AppError('Investment not found', 404);
    res.json({ success: true, data: doc });
  })
);

router.post(
  '/investments/:id/transaction',
  asyncHandler(async (req, res) => {
    if (!Investment) throw new AppError('Model not available', 501);
    const doc = await Investment.findOne({
      _id: req.params.id,
      organization: req.user.organization,
    });
    if (!doc) throw new AppError('Investment not found', 404);
    doc.transactions.push({ ...req.body, date: req.body.date || new Date() });
    const tx = req.body;
    if (tx.type === 'buy') {
      doc.quantity = (doc.quantity || 0) + (tx.quantity || 0);
      doc.acquisitionCost = (doc.acquisitionCost || 0) + (tx.amount || 0);
    } else if (tx.type === 'sell') {
      doc.quantity = Math.max(0, (doc.quantity || 0) - (tx.quantity || 0));
      doc.realizedGainLoss +=
        (tx.price || 0) * (tx.quantity || 0) -
        (doc.acquisitionCost / Math.max(1, doc.quantity + (tx.quantity || 0))) * (tx.quantity || 0);
    } else if (tx.type === 'dividend' || tx.type === 'coupon') {
      doc.dividendIncome = (doc.dividendIncome || 0) + (tx.amount || 0);
    }
    await doc.save();
    res.json({ success: true, data: doc });
  })
);

router.post(
  '/investments/:id/valuate',
  asyncHandler(async (req, res) => {
    if (!Investment) throw new AppError('Model not available', 501);
    const doc = await Investment.findOne({
      _id: req.params.id,
      organization: req.user.organization,
    });
    if (!doc) throw new AppError('Investment not found', 404);
    doc.currentValue = req.body.currentValue;
    doc.fairValue = req.body.fairValue || req.body.currentValue;
    doc.valuationHistory.push({
      date: new Date(),
      value: req.body.currentValue,
      source: req.body.source || 'manual',
    });
    await doc.save();
    res.json({ success: true, data: doc });
  })
);

router.get(
  '/investments/portfolio/summary',
  asyncHandler(async (req, res) => {
    if (!Investment) throw new AppError('Model not available', 501);
    const all = await Investment.find({ organization: req.user.organization, status: 'active' });
    const totalCost = all.reduce((s, i) => s + (i.acquisitionCost || 0), 0);
    const totalCurrent = all.reduce((s, i) => s + (i.currentValue || i.acquisitionCost || 0), 0);
    const totalUnrealized = all.reduce((s, i) => s + (i.unrealizedGainLoss || 0), 0);
    const totalRealized = all.reduce((s, i) => s + (i.realizedGainLoss || 0), 0);
    const totalDividends = all.reduce((s, i) => s + (i.dividendIncome || 0), 0);
    // Allocation by type
    const allocation = {};
    all.forEach(i => {
      const key = i.investmentType || 'other';
      if (!allocation[key]) allocation[key] = { type: key, cost: 0, current: 0, count: 0 };
      allocation[key].cost += i.acquisitionCost || 0;
      allocation[key].current += i.currentValue || i.acquisitionCost || 0;
      allocation[key].count++;
    });
    res.json({
      success: true,
      data: {
        totalInvestments: all.length,
        totalCost,
        totalCurrent,
        totalUnrealized,
        totalRealized,
        totalDividends,
        returnPct:
          totalCost > 0 ? Math.round(((totalCurrent - totalCost) / totalCost) * 10000) / 100 : 0,
        allocation: Object.values(allocation),
      },
    });
  })
);

// ═══════════════════════════════════════════════════════════════════════
// 5. CREDIT MANAGEMENT - إدارة الائتمان
// ═══════════════════════════════════════════════════════════════════════

router.get(
  '/credit-profiles',
  asyncHandler(async (req, res) => {
    if (!CreditProfile) throw new AppError('Model not available', 501);
    const data = await CreditProfile.find({ organization: req.user.organization }).sort({
      createdAt: -1,
    });
    res.json({ success: true, data });
  })
);

router.post(
  '/credit-profiles',
  asyncHandler(async (req, res) => {
    if (!CreditProfile) throw new AppError('Model not available', 501);
    const doc = await CreditProfile.create({
      ...req.body,
      organization: req.user.organization,
      createdBy: req.user._id,
    });
    res.status(201).json({ success: true, data: doc });
  })
);

router.patch(
  '/credit-profiles/:id/limit',
  asyncHandler(async (req, res) => {
    if (!CreditProfile) throw new AppError('Model not available', 501);
    const doc = await CreditProfile.findOne({
      _id: req.params.id,
      organization: req.user.organization,
    });
    if (!doc) throw new AppError('Profile not found', 404);
    doc.approvalHistory.push({
      date: new Date(),
      previousLimit: doc.creditLimit,
      newLimit: req.body.newLimit,
      approvedBy: req.user._id,
      reason: req.body.reason,
    });
    doc.creditLimit = req.body.newLimit;
    doc.lastReviewDate = new Date();
    await doc.save();
    res.json({ success: true, data: doc });
  })
);

router.patch(
  '/credit-profiles/:id/hold',
  asyncHandler(async (req, res) => {
    if (!CreditProfile) throw new AppError('Model not available', 501);
    const doc = await CreditProfile.findOneAndUpdate(
      { _id: req.params.id, organization: req.user.organization },
      {
        holdStatus: {
          onHold: req.body.onHold,
          holdDate: new Date(),
          holdReason: req.body.reason,
          heldBy: req.user._id,
        },
        status: req.body.onHold ? 'on_hold' : 'active',
      },
      { new: true }
    );
    if (!doc) throw new AppError('Not found', 404);
    res.json({ success: true, data: doc });
  })
);

router.get(
  '/credit-applications',
  asyncHandler(async (req, res) => {
    if (!CreditApplication) return res.json({ success: true, data: [] });
    const data = await CreditApplication.find({ organization: req.user.organization }).sort({
      createdAt: -1,
    });
    res.json({ success: true, data });
  })
);

router.post(
  '/credit-applications',
  asyncHandler(async (req, res) => {
    if (!CreditApplication) throw new AppError('Model not available', 501);
    const doc = await CreditApplication.create({
      ...req.body,
      organization: req.user.organization,
      createdBy: req.user._id,
    });
    res.status(201).json({ success: true, data: doc });
  })
);

router.patch(
  '/credit-applications/:id/decide',
  asyncHandler(async (req, res) => {
    if (!CreditApplication) throw new AppError('Model not available', 501);
    const updates = { status: req.body.decision };
    if (req.body.decision === 'approved') {
      updates.approvedLimit = req.body.approvedLimit;
      updates.approvedBy = req.user._id;
    } else if (req.body.decision === 'rejected') {
      updates.rejectionReason = req.body.reason;
      updates.reviewedBy = req.user._id;
    }
    const doc = await CreditApplication.findOneAndUpdate(
      { _id: req.params.id, organization: req.user.organization },
      updates,
      { new: true }
    );
    if (!doc) throw new AppError('Not found', 404);
    // If approved, update/create credit profile
    if (req.body.decision === 'approved' && CreditProfile) {
      await CreditProfile.findOneAndUpdate(
        { customerId: doc.customerId, organization: req.user.organization },
        {
          creditLimit: doc.approvedLimit,
          lastReviewDate: new Date(),
          status: 'active',
          $push: {
            approvalHistory: {
              date: new Date(),
              newLimit: doc.approvedLimit,
              approvedBy: req.user._id,
              reason: `Application ${doc.applicationNumber} approved`,
            },
          },
        },
        { upsert: true, new: true }
      );
    }
    res.json({ success: true, data: doc });
  })
);

router.get(
  '/credit/dashboard',
  asyncHandler(async (req, res) => {
    if (!CreditProfile) throw new AppError('Model not available', 501);
    const all = await CreditProfile.find({ organization: req.user.organization });
    const totalProfiles = all.length;
    const totalCreditLimit = all.reduce((s, p) => s + (p.creditLimit || 0), 0);
    const totalUsed = all.reduce((s, p) => s + (p.usedCredit || 0), 0);
    const totalOverdue = all.reduce((s, p) => s + (p.totalOverdue || 0), 0);
    const onHold = all.filter(p => p.holdStatus?.onHold).length;
    const highRisk = all.filter(p =>
      ['high', 'very_high', 'blacklisted'].includes(p.riskCategory)
    ).length;
    const apps = CreditApplication
      ? await CreditApplication.countDocuments({
          organization: req.user.organization,
          status: 'pending',
        })
      : 0;
    res.json({
      success: true,
      data: {
        totalProfiles,
        totalCreditLimit,
        totalUsed,
        totalOverdue,
        utilizationPct: totalCreditLimit > 0 ? Math.round((totalUsed / totalCreditLimit) * 100) : 0,
        onHold,
        highRisk,
        pendingApplications: apps,
      },
    });
  })
);

// ═══════════════════════════════════════════════════════════════════════
// 6. FINANCIAL PLANNING & ANALYSIS - التخطيط والتحليل المالي
// ═══════════════════════════════════════════════════════════════════════

router.get(
  '/financial-plans',
  asyncHandler(async (req, res) => {
    if (!FinancialPlan) throw new AppError('Model not available', 501);
    const data = await FinancialPlan.find({ organization: req.user.organization }).sort({
      createdAt: -1,
    });
    res.json({ success: true, data });
  })
);

router.post(
  '/financial-plans',
  asyncHandler(async (req, res) => {
    if (!FinancialPlan) throw new AppError('Model not available', 501);
    const doc = await FinancialPlan.create({
      ...req.body,
      organization: req.user.organization,
      createdBy: req.user._id,
    });
    res.status(201).json({ success: true, data: doc });
  })
);

router.get(
  '/financial-plans/:id',
  asyncHandler(async (req, res) => {
    if (!FinancialPlan) throw new AppError('Model not available', 501);
    const doc = await FinancialPlan.findOne({
      _id: req.params.id,
      organization: req.user.organization,
    });
    if (!doc) throw new AppError('Plan not found', 404);
    res.json({ success: true, data: doc });
  })
);

router.post(
  '/financial-plans/:id/scenario',
  asyncHandler(async (req, res) => {
    if (!FinancialPlan) throw new AppError('Model not available', 501);
    const doc = await FinancialPlan.findOne({
      _id: req.params.id,
      organization: req.user.organization,
    });
    if (!doc) throw new AppError('Plan not found', 404);
    const scenario = req.body;
    scenario.projectedNetIncome =
      Math.round(
        ((doc.totalPlannedRevenue || 0) * (scenario.revenueMultiplier || 1) -
          (doc.totalPlannedExpense || 0) * (scenario.expenseMultiplier || 1)) *
          100
      ) / 100;
    doc.scenarios.push(scenario);
    await doc.save();
    res.json({ success: true, data: doc });
  })
);

router.post(
  '/financial-plans/:id/calculate-variance',
  asyncHandler(async (req, res) => {
    if (!FinancialPlan) throw new AppError('Model not available', 501);
    const doc = await FinancialPlan.findOne({
      _id: req.params.id,
      organization: req.user.organization,
    });
    if (!doc) throw new AppError('Plan not found', 404);
    doc.revenuePlan.forEach(r => {
      r.variance = (r.actual || 0) - (r.planned || 0);
      r.variancePct = r.planned
        ? Math.round(((r.actual - r.planned) / r.planned) * 10000) / 100
        : 0;
    });
    doc.expensePlan.forEach(e => {
      e.variance = (e.actual || 0) - (e.planned || 0);
      e.variancePct = e.planned
        ? Math.round(((e.actual - e.planned) / e.planned) * 10000) / 100
        : 0;
    });
    await doc.save();
    res.json({ success: true, data: doc });
  })
);

router.patch(
  '/financial-plans/:id/status',
  asyncHandler(async (req, res) => {
    if (!FinancialPlan) throw new AppError('Model not available', 501);
    const doc = await FinancialPlan.findOneAndUpdate(
      { _id: req.params.id, organization: req.user.organization },
      {
        status: req.body.status,
        ...(req.body.status === 'approved' ? { approvedBy: req.user._id } : {}),
      },
      { new: true }
    );
    if (!doc) throw new AppError('Not found', 404);
    res.json({ success: true, data: doc });
  })
);

router.get(
  '/financial-plans/kpi/dashboard',
  asyncHandler(async (req, res) => {
    if (!FinancialPlan) throw new AppError('Model not available', 501);
    const activePlan = await FinancialPlan.findOne({
      organization: req.user.organization,
      status: 'active',
    }).sort({ createdAt: -1 });
    if (!activePlan)
      return res.json({ success: true, data: { plan: null, kpis: [], scenarios: [] } });
    res.json({
      success: true,
      data: {
        plan: {
          name: activePlan.name,
          planNumber: activePlan.planNumber,
          fiscalYear: activePlan.fiscalYear,
          totalPlannedRevenue: activePlan.totalPlannedRevenue,
          totalPlannedExpense: activePlan.totalPlannedExpense,
          projectedNetIncome: activePlan.projectedNetIncome,
        },
        kpis: activePlan.kpis || [],
        scenarios: activePlan.scenarios || [],
      },
    });
  })
);

// ═══════════════════════════════════════════════════════════════════════
// 7. COMPLIANCE & INTERNAL CONTROLS - الامتثال والرقابة الداخلية
// ═══════════════════════════════════════════════════════════════════════

router.get(
  '/internal-controls',
  asyncHandler(async (req, res) => {
    if (!InternalControl) throw new AppError('Model not available', 501);
    const data = await InternalControl.find({ organization: req.user.organization }).sort({
      createdAt: -1,
    });
    res.json({ success: true, data });
  })
);

router.post(
  '/internal-controls',
  asyncHandler(async (req, res) => {
    if (!InternalControl) throw new AppError('Model not available', 501);
    const doc = await InternalControl.create({
      ...req.body,
      organization: req.user.organization,
      createdBy: req.user._id,
    });
    res.status(201).json({ success: true, data: doc });
  })
);

router.post(
  '/internal-controls/:id/test',
  asyncHandler(async (req, res) => {
    if (!InternalControl) throw new AppError('Model not available', 501);
    const doc = await InternalControl.findOne({
      _id: req.params.id,
      organization: req.user.organization,
    });
    if (!doc) throw new AppError('Control not found', 404);
    doc.testResults.push({
      ...req.body,
      testDate: new Date(),
      tester: req.user._id,
      testerName: req.user.name,
    });
    doc.lastTestDate = new Date();
    doc.lastTestResult = req.body.result;
    if (req.body.result === 'ineffective') doc.status = 'remediation';
    await doc.save();
    res.json({ success: true, data: doc });
  })
);

router.get(
  '/compliance-items',
  asyncHandler(async (req, res) => {
    if (!ComplianceItem) return res.json({ success: true, data: [] });
    const data = await ComplianceItem.find({ organization: req.user.organization }).sort({
      deadline: 1,
    });
    res.json({ success: true, data });
  })
);

router.post(
  '/compliance-items',
  asyncHandler(async (req, res) => {
    if (!ComplianceItem) throw new AppError('Model not available', 501);
    const doc = await ComplianceItem.create({
      ...req.body,
      organization: req.user.organization,
      createdBy: req.user._id,
    });
    res.status(201).json({ success: true, data: doc });
  })
);

router.patch(
  '/compliance-items/:id/status',
  asyncHandler(async (req, res) => {
    if (!ComplianceItem) throw new AppError('Model not available', 501);
    const doc = await ComplianceItem.findOneAndUpdate(
      { _id: req.params.id, organization: req.user.organization },
      { complianceStatus: req.body.status, lastAssessmentDate: new Date() },
      { new: true }
    );
    if (!doc) throw new AppError('Not found', 404);
    res.json({ success: true, data: doc });
  })
);

router.get(
  '/compliance/dashboard',
  asyncHandler(async (req, res) => {
    if (!InternalControl) throw new AppError('Model not available', 501);
    const controls = await InternalControl.find({ organization: req.user.organization });
    const items = ComplianceItem
      ? await ComplianceItem.find({ organization: req.user.organization })
      : [];
    const totalControls = controls.length;
    const effective = controls.filter(c => c.lastTestResult === 'effective').length;
    const ineffective = controls.filter(c => c.lastTestResult === 'ineffective').length;
    const notTested = controls.filter(c => c.lastTestResult === 'not_tested').length;
    const totalCompliance = items.length;
    const compliant = items.filter(i => i.complianceStatus === 'compliant').length;
    const nonCompliant = items.filter(i => i.complianceStatus === 'non_compliant').length;
    const overdue = items.filter(
      i => i.deadline && new Date(i.deadline) < new Date() && i.complianceStatus !== 'compliant'
    ).length;
    const totalPenaltyRisk = items.reduce((s, i) => s + (i.penaltyRisk || 0), 0);
    res.json({
      success: true,
      data: {
        totalControls,
        effective,
        ineffective,
        notTested,
        effectivenessPct: totalControls > 0 ? Math.round((effective / totalControls) * 100) : 0,
        totalCompliance,
        compliant,
        nonCompliant,
        overdue,
        totalPenaltyRisk,
      },
    });
  })
);

// ═══════════════════════════════════════════════════════════════════════
// 8. INTERCOMPANY SETTLEMENT - التسويات بين الشركات
// ═══════════════════════════════════════════════════════════════════════

router.get(
  '/intercompany-invoices',
  asyncHandler(async (req, res) => {
    if (!IntercompanyInvoice) throw new AppError('Model not available', 501);
    const data = await IntercompanyInvoice.find({ organization: req.user.organization }).sort({
      createdAt: -1,
    });
    res.json({ success: true, data });
  })
);

router.post(
  '/intercompany-invoices',
  asyncHandler(async (req, res) => {
    if (!IntercompanyInvoice) throw new AppError('Model not available', 501);
    const doc = await IntercompanyInvoice.create({
      ...req.body,
      organization: req.user.organization,
      createdBy: req.user._id,
    });
    res.status(201).json({ success: true, data: doc });
  })
);

router.patch(
  '/intercompany-invoices/:id/status',
  asyncHandler(async (req, res) => {
    if (!IntercompanyInvoice) throw new AppError('Model not available', 501);
    const doc = await IntercompanyInvoice.findOneAndUpdate(
      { _id: req.params.id, organization: req.user.organization },
      { status: req.body.status },
      { new: true }
    );
    if (!doc) throw new AppError('Not found', 404);
    res.json({ success: true, data: doc });
  })
);

router.get(
  '/settlement-runs',
  asyncHandler(async (req, res) => {
    if (!SettlementRun) return res.json({ success: true, data: [] });
    const data = await SettlementRun.find({ organization: req.user.organization }).sort({
      createdAt: -1,
    });
    res.json({ success: true, data });
  })
);

router.post(
  '/settlement-runs',
  asyncHandler(async (req, res) => {
    if (!SettlementRun) throw new AppError('Model not available', 501);
    const doc = await SettlementRun.create({
      ...req.body,
      organization: req.user.organization,
      createdBy: req.user._id,
    });
    res.status(201).json({ success: true, data: doc });
  })
);

router.post(
  '/settlement-runs/:id/execute',
  asyncHandler(async (req, res) => {
    if (!SettlementRun) throw new AppError('Model not available', 501);
    const doc = await SettlementRun.findOne({
      _id: req.params.id,
      organization: req.user.organization,
    });
    if (!doc) throw new AppError('Run not found', 404);
    // Calculate netting
    let grossTotal = 0;
    doc.entities.forEach(e => {
      grossTotal += Math.abs(e.totalReceivable || 0) + Math.abs(e.totalPayable || 0);
      e.netPosition = (e.totalReceivable || 0) - (e.totalPayable || 0);
      e.settlementAmount = Math.abs(e.netPosition);
      e.direction = e.netPosition > 0 ? 'receive' : e.netPosition < 0 ? 'pay' : 'zero';
    });
    const netTotal = doc.entities.reduce((s, e) => s + e.settlementAmount, 0);
    doc.totalGrossAmount = grossTotal;
    doc.totalNetAmount = netTotal;
    doc.nettingSavings = grossTotal - netTotal;
    doc.nettingEfficiency =
      grossTotal > 0 ? Math.round(((grossTotal - netTotal) / grossTotal) * 100) : 0;
    doc.status = 'executed';
    doc.executedBy = req.user._id;
    doc.settlementDate = new Date();
    // Mark included invoices as settled
    if (IntercompanyInvoice && doc.invoicesIncluded?.length) {
      await IntercompanyInvoice.updateMany(
        { _id: { $in: doc.invoicesIncluded } },
        { settled: true, status: 'settled', settlementRunId: doc._id }
      );
    }
    await doc.save();
    res.json({ success: true, data: doc });
  })
);

router.get(
  '/intercompany/dashboard',
  asyncHandler(async (req, res) => {
    if (!IntercompanyInvoice) throw new AppError('Model not available', 501);
    const invoices = await IntercompanyInvoice.find({ organization: req.user.organization });
    const runs = SettlementRun
      ? await SettlementRun.find({ organization: req.user.organization })
      : [];
    const totalInvoices = invoices.length;
    const unsettled = invoices.filter(i => !i.settled).length;
    const totalAmount = invoices.reduce((s, i) => s + (i.totalAmount || 0), 0);
    const settledAmount = invoices
      .filter(i => i.settled)
      .reduce((s, i) => s + (i.totalAmount || 0), 0);
    const totalRuns = runs.length;
    const totalSavings = runs.reduce((s, r) => s + (r.nettingSavings || 0), 0);
    const avgEfficiency =
      runs.length > 0
        ? Math.round(runs.reduce((s, r) => s + (r.nettingEfficiency || 0), 0) / runs.length)
        : 0;
    res.json({
      success: true,
      data: {
        totalInvoices,
        unsettled,
        totalAmount,
        settledAmount,
        totalRuns,
        totalSavings,
        avgEfficiency,
      },
    });
  })
);

module.exports = router;
