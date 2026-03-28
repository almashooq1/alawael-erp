/**
 * ===================================================================
 * FINANCE ELITE ROUTES - المسارات المالية الاستراتيجية المتقدمة
 * ===================================================================
 * الإصدار: 1.0
 * التاريخ: مارس 2026
 * الوصف: ميزات مالية استراتيجية متقدمة:
 *   1. إدارة المخاطر المالية (Risk Management)
 *   2. لوحات البيانات المخصصة (Financial Dashboard Builder)
 *   3. إدارة الخزينة المتقدمة (Treasury Management)
 *   4. إدارة الديون (Debt Management)
 *   5. توزيع التكاليف (Cost Allocation)
 *   6. سير العمل المالي (Financial Workflow)
 *   7. التخطيط الضريبي (Tax Planning)
 *   8. إدارة التدقيق المالي (Audit Manager)
 * ===================================================================
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');
const { asyncHandler } = require('../errors/errorHandler');
const { AppError } = require('../errors/AppError');
const { stripUpdateMeta } = require('../utils/sanitize');

// ─── Safe Model Loader ──────────────────────────────────────────────────
const safeRequire = (path, name) => {
  try {
    return require(path);
  } catch (e) {
    logger.warn(`Model ${name} not available: ${e.message}`);
    return null;
  }
};

const RiskRegister = safeRequire('../models/RiskManagement', 'RiskManagement');
const DashboardConfig = safeRequire(
  '../models/FinancialDashboardConfig',
  'FinancialDashboardConfig'
);
const TreasuryOperation = safeRequire('../models/TreasuryOperation', 'TreasuryOperation');
const DebtInstrument = safeRequire('../models/DebtInstrument', 'DebtInstrument');
const CostAllocation = safeRequire('../models/CostAllocation', 'CostAllocation');
const wfModels = safeRequire('../models/FinancialWorkflow', 'FinancialWorkflow');
const FinancialWorkflow = wfModels?.FinancialWorkflow || wfModels;
const WorkflowInstance = wfModels?.WorkflowInstance;
const TaxPlanningStrategy = safeRequire('../models/TaxPlanningStrategy', 'TaxPlanningStrategy');
const AuditEngagement = safeRequire('../models/AuditEngagement', 'AuditEngagement');

// Apply authentication
router.use(authenticateToken);

// =====================================================================
// 1. RISK MANAGEMENT - إدارة المخاطر المالية
// =====================================================================

// GET /risk-register - List risk registers
router.get(
  '/risk-register',
  asyncHandler(async (req, res) => {
    if (!RiskRegister) throw new AppError('Risk Management module not available', 503);
    const { status, category, severity, page = 1, limit = 25 } = req.query;
    const filter = { organization: req.user.organizationId };
    if (status) filter.status = status;
    if (category) filter.riskCategory = category;
    if (severity) filter.severity = severity;
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      RiskRegister.find(filter).sort({ riskScore: -1 }).skip(skip).limit(Number(limit)),
      RiskRegister.countDocuments(filter),
    ]);
    res.json({
      success: true,
      data,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / limit),
      },
    });
  })
);

// POST /risk-register - Create risk entry
router.post(
  '/risk-register',
  asyncHandler(async (req, res) => {
    if (!RiskRegister) throw new AppError('Risk Management module not available', 503);
    const entry = new RiskRegister({
      ...req.body,
      organization: req.user.organizationId,
      createdBy: req.user._id,
    });
    await entry.save();
    res.status(201).json({ success: true, data: entry });
  })
);

// GET /risk-register/:id - Get risk by ID
router.get(
  '/risk-register/:id',
  asyncHandler(async (req, res) => {
    if (!RiskRegister) throw new AppError('Risk Management module not available', 503);
    const entry = await RiskRegister.findOne({
      _id: req.params.id,
      organization: req.user.organizationId,
    });
    if (!entry) throw new AppError('Risk entry not found', 404);
    res.json({ success: true, data: entry });
  })
);

// PUT /risk-register/:id - Update risk entry
router.put(
  '/risk-register/:id',
  asyncHandler(async (req, res) => {
    if (!RiskRegister) throw new AppError('Risk Management module not available', 503);
    const entry = await RiskRegister.findOneAndUpdate(
      { _id: req.params.id, organization: req.user.organizationId },
      { ...req.body, updatedBy: req.user._id },
      { new: true, runValidators: true }
    );
    if (!entry) throw new AppError('Risk entry not found', 404);
    res.json({ success: true, data: entry });
  })
);

// DELETE /risk-register/:id - Delete risk entry
router.delete(
  '/risk-register/:id',
  asyncHandler(async (req, res) => {
    if (!RiskRegister) throw new AppError('Risk Management module not available', 503);
    const entry = await RiskRegister.findOneAndDelete({
      _id: req.params.id,
      organization: req.user.organizationId,
    });
    if (!entry) throw new AppError('Risk entry not found', 404);
    res.json({ success: true, message: 'تم حذف سجل المخاطر' });
  })
);

// GET /risk-register/dashboard/summary - Risk dashboard summary
router.get(
  '/risk-register/dashboard/summary',
  asyncHandler(async (req, res) => {
    if (!RiskRegister) throw new AppError('Risk Management module not available', 503);
    const orgFilter = { organization: req.user.organizationId };
    const [total, bySeverity, byCategory, breachedKRIs] = await Promise.all([
      RiskRegister.countDocuments(orgFilter),
      RiskRegister.aggregate([
        { $match: orgFilter },
        { $group: { _id: '$severity', count: { $sum: 1 } } },
      ]),
      RiskRegister.aggregate([
        { $match: orgFilter },
        { $group: { _id: '$riskCategory', count: { $sum: 1 }, avgScore: { $avg: '$riskScore' } } },
      ]),
      RiskRegister.countDocuments({ ...orgFilter, 'keyRiskIndicators.breached': true }),
    ]);
    res.json({ success: true, data: { total, bySeverity, byCategory, breachedKRIs } });
  })
);

// POST /risk-register/:id/mitigation - Add mitigation action
router.post(
  '/risk-register/:id/mitigation',
  asyncHandler(async (req, res) => {
    if (!RiskRegister) throw new AppError('Risk Management module not available', 503);
    const entry = await RiskRegister.findOne({
      _id: req.params.id,
      organization: req.user.organizationId,
    });
    if (!entry) throw new AppError('Risk entry not found', 404);
    entry.mitigationPlan.push(req.body);
    entry.updatedBy = req.user._id;
    await entry.save();
    res.json({ success: true, data: entry });
  })
);

// PUT /risk-register/:id/kri - Update key risk indicators
router.put(
  '/risk-register/:id/kri',
  asyncHandler(async (req, res) => {
    if (!RiskRegister) throw new AppError('Risk Management module not available', 503);
    const entry = await RiskRegister.findOneAndUpdate(
      { _id: req.params.id, organization: req.user.organizationId },
      { keyRiskIndicators: req.body.keyRiskIndicators, updatedBy: req.user._id },
      { new: true }
    );
    if (!entry) throw new AppError('Risk entry not found', 404);
    res.json({ success: true, data: entry });
  })
);

// =====================================================================
// 2. FINANCIAL DASHBOARD BUILDER - لوحات البيانات المخصصة
// =====================================================================

// GET /dashboards - List dashboards
router.get(
  '/dashboards',
  asyncHandler(async (req, res) => {
    if (!DashboardConfig) throw new AppError('Dashboard module not available', 503);
    const { status, type, page = 1, limit = 20 } = req.query;
    const filter = { organization: req.user.organizationId };
    if (status) filter.status = status;
    if (type) filter.dashboardType = type;
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      DashboardConfig.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(Number(limit)),
      DashboardConfig.countDocuments(filter),
    ]);
    res.json({
      success: true,
      data,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / limit),
      },
    });
  })
);

// POST /dashboards - Create dashboard
router.post(
  '/dashboards',
  asyncHandler(async (req, res) => {
    if (!DashboardConfig) throw new AppError('Dashboard module not available', 503);
    const dashboard = new DashboardConfig({
      ...req.body,
      organization: req.user.organizationId,
      owner: req.user._id,
      createdBy: req.user._id,
    });
    await dashboard.save();
    res.status(201).json({ success: true, data: dashboard });
  })
);

// GET /dashboards/:id - Get dashboard by ID
router.get(
  '/dashboards/:id',
  asyncHandler(async (req, res) => {
    if (!DashboardConfig) throw new AppError('Dashboard module not available', 503);
    const dashboard = await DashboardConfig.findOne({
      _id: req.params.id,
      organization: req.user.organizationId,
    });
    if (!dashboard) throw new AppError('Dashboard not found', 404);
    res.json({ success: true, data: dashboard });
  })
);

// PUT /dashboards/:id - Update dashboard
router.put(
  '/dashboards/:id',
  asyncHandler(async (req, res) => {
    if (!DashboardConfig) throw new AppError('Dashboard module not available', 503);
    const dashboard = await DashboardConfig.findOneAndUpdate(
      { _id: req.params.id, organization: req.user.organizationId },
      { ...req.body, updatedBy: req.user._id },
      { new: true, runValidators: true }
    );
    if (!dashboard) throw new AppError('Dashboard not found', 404);
    res.json({ success: true, data: dashboard });
  })
);

// DELETE /dashboards/:id - Delete dashboard
router.delete(
  '/dashboards/:id',
  asyncHandler(async (req, res) => {
    if (!DashboardConfig) throw new AppError('Dashboard module not available', 503);
    const dashboard = await DashboardConfig.findOneAndDelete({
      _id: req.params.id,
      organization: req.user.organizationId,
    });
    if (!dashboard) throw new AppError('Dashboard not found', 404);
    res.json({ success: true, message: 'تم حذف لوحة البيانات' });
  })
);

// POST /dashboards/:id/widgets - Add widget to dashboard
router.post(
  '/dashboards/:id/widgets',
  asyncHandler(async (req, res) => {
    if (!DashboardConfig) throw new AppError('Dashboard module not available', 503);
    const dashboard = await DashboardConfig.findOne({
      _id: req.params.id,
      organization: req.user.organizationId,
    });
    if (!dashboard) throw new AppError('Dashboard not found', 404);
    const widgetId = `W-${Date.now().toString(36).toUpperCase()}`;
    dashboard.widgets.push({ ...req.body, widgetId });
    dashboard.updatedBy = req.user._id;
    await dashboard.save();
    res.json({ success: true, data: dashboard });
  })
);

// PUT /dashboards/:id/widgets/:widgetId - Update widget
router.put(
  '/dashboards/:id/widgets/:widgetId',
  asyncHandler(async (req, res) => {
    if (!DashboardConfig) throw new AppError('Dashboard module not available', 503);
    const dashboard = await DashboardConfig.findOne({
      _id: req.params.id,
      organization: req.user.organizationId,
    });
    if (!dashboard) throw new AppError('Dashboard not found', 404);
    const widget = dashboard.widgets.find(w => w.widgetId === req.params.widgetId);
    if (!widget) throw new AppError('Widget not found', 404);
    Object.assign(widget, stripUpdateMeta(req.body));
    dashboard.updatedBy = req.user._id;
    await dashboard.save();
    res.json({ success: true, data: dashboard });
  })
);

// POST /dashboards/:id/clone - Clone dashboard
router.post(
  '/dashboards/:id/clone',
  asyncHandler(async (req, res) => {
    if (!DashboardConfig) throw new AppError('Dashboard module not available', 503);
    const orig = await DashboardConfig.findOne({
      _id: req.params.id,
      organization: req.user.organizationId,
    });
    if (!orig) throw new AppError('Dashboard not found', 404);
    const clone = new DashboardConfig({
      ...orig.toObject(),
      _id: undefined,
      dashboardNumber: undefined,
      name: `${orig.name} (نسخة)`,
      status: 'draft',
      owner: req.user._id,
      createdBy: req.user._id,
    });
    await clone.save();
    res.status(201).json({ success: true, data: clone });
  })
);

// =====================================================================
// 3. TREASURY MANAGEMENT - إدارة الخزينة المتقدمة
// =====================================================================

// GET /treasury - List treasury operations
router.get(
  '/treasury',
  asyncHandler(async (req, res) => {
    if (!TreasuryOperation) throw new AppError('Treasury module not available', 503);
    const { type, status, page = 1, limit = 25 } = req.query;
    const filter = { organization: req.user.organizationId };
    if (type) filter.operationType = type;
    if (status) filter.status = status;
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      TreasuryOperation.find(filter).sort({ tradeDate: -1 }).skip(skip).limit(Number(limit)),
      TreasuryOperation.countDocuments(filter),
    ]);
    res.json({
      success: true,
      data,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / limit),
      },
    });
  })
);

// POST /treasury - Create treasury operation
router.post(
  '/treasury',
  asyncHandler(async (req, res) => {
    if (!TreasuryOperation) throw new AppError('Treasury module not available', 503);
    const op = new TreasuryOperation({
      ...req.body,
      organization: req.user.organizationId,
      createdBy: req.user._id,
    });
    await op.save();
    res.status(201).json({ success: true, data: op });
  })
);

// GET /treasury/:id - Get treasury operation
router.get(
  '/treasury/:id',
  asyncHandler(async (req, res) => {
    if (!TreasuryOperation) throw new AppError('Treasury module not available', 503);
    const op = await TreasuryOperation.findOne({
      _id: req.params.id,
      organization: req.user.organizationId,
    });
    if (!op) throw new AppError('Treasury operation not found', 404);
    res.json({ success: true, data: op });
  })
);

// PUT /treasury/:id - Update treasury operation
router.put(
  '/treasury/:id',
  asyncHandler(async (req, res) => {
    if (!TreasuryOperation) throw new AppError('Treasury module not available', 503);
    const op = await TreasuryOperation.findOneAndUpdate(
      { _id: req.params.id, organization: req.user.organizationId },
      { ...req.body, updatedBy: req.user._id },
      { new: true, runValidators: true }
    );
    if (!op) throw new AppError('Treasury operation not found', 404);
    res.json({ success: true, data: op });
  })
);

// DELETE /treasury/:id - Delete treasury operation
router.delete(
  '/treasury/:id',
  asyncHandler(async (req, res) => {
    if (!TreasuryOperation) throw new AppError('Treasury module not available', 503);
    const op = await TreasuryOperation.findOneAndDelete({
      _id: req.params.id,
      organization: req.user.organizationId,
    });
    if (!op) throw new AppError('Treasury operation not found', 404);
    res.json({ success: true, message: 'تم حذف عملية الخزينة' });
  })
);

// PUT /treasury/:id/approve - Approve treasury operation
router.put(
  '/treasury/:id/approve',
  asyncHandler(async (req, res) => {
    if (!TreasuryOperation) throw new AppError('Treasury module not available', 503);
    const op = await TreasuryOperation.findOneAndUpdate(
      { _id: req.params.id, organization: req.user.organizationId },
      {
        status: 'approved',
        'approval.approvedBy': req.user._id,
        'approval.approvedDate': new Date(),
        'approval.comments': req.body.comments,
      },
      { new: true }
    );
    if (!op) throw new AppError('Treasury operation not found', 404);
    res.json({ success: true, data: op });
  })
);

// GET /treasury/dashboard/positions - Treasury positions summary
router.get(
  '/treasury/dashboard/positions',
  asyncHandler(async (req, res) => {
    if (!TreasuryOperation) throw new AppError('Treasury module not available', 503);
    const orgFilter = { organization: req.user.organizationId };
    const [byType, byStatus, totalExposure] = await Promise.all([
      TreasuryOperation.aggregate([
        { $match: orgFilter },
        {
          $group: {
            _id: '$operationType',
            count: { $sum: 1 },
            totalAmount: { $sum: '$amounts.baseAmount' },
          },
        },
      ]),
      TreasuryOperation.aggregate([
        { $match: orgFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      TreasuryOperation.aggregate([
        { $match: { ...orgFilter, status: { $in: ['approved', 'executed'] } } },
        { $group: { _id: null, total: { $sum: '$amounts.baseAmount' } } },
      ]),
    ]);
    res.json({
      success: true,
      data: { byType, byStatus, totalExposure: totalExposure[0]?.total || 0 },
    });
  })
);

// PUT /treasury/:id/settle - Settle treasury operation
router.put(
  '/treasury/:id/settle',
  asyncHandler(async (req, res) => {
    if (!TreasuryOperation) throw new AppError('Treasury module not available', 503);
    const op = await TreasuryOperation.findOneAndUpdate(
      { _id: req.params.id, organization: req.user.organizationId },
      {
        status: 'settled',
        'settlement.settledDate': new Date(),
        'settlement.settledAmount': req.body.settledAmount,
        'settlement.confirmationRef': req.body.confirmationRef,
      },
      { new: true }
    );
    if (!op) throw new AppError('Treasury operation not found', 404);
    res.json({ success: true, data: op });
  })
);

// =====================================================================
// 4. DEBT MANAGEMENT - إدارة الديون
// =====================================================================

// GET /debt - List debt instruments
router.get(
  '/debt',
  asyncHandler(async (req, res) => {
    if (!DebtInstrument) throw new AppError('Debt Management module not available', 503);
    const { type, status, page = 1, limit = 25 } = req.query;
    const filter = { organization: req.user.organizationId };
    if (type) filter.instrumentType = type;
    if (status) filter.status = status;
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      DebtInstrument.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      DebtInstrument.countDocuments(filter),
    ]);
    res.json({
      success: true,
      data,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / limit),
      },
    });
  })
);

// POST /debt - Create debt instrument
router.post(
  '/debt',
  asyncHandler(async (req, res) => {
    if (!DebtInstrument) throw new AppError('Debt Management module not available', 503);
    const inst = new DebtInstrument({
      ...req.body,
      organization: req.user.organizationId,
      createdBy: req.user._id,
    });
    await inst.save();
    res.status(201).json({ success: true, data: inst });
  })
);

// GET /debt/:id - Get debt instrument
router.get(
  '/debt/:id',
  asyncHandler(async (req, res) => {
    if (!DebtInstrument) throw new AppError('Debt Management module not available', 503);
    const inst = await DebtInstrument.findOne({
      _id: req.params.id,
      organization: req.user.organizationId,
    });
    if (!inst) throw new AppError('Debt instrument not found', 404);
    res.json({ success: true, data: inst });
  })
);

// PUT /debt/:id - Update debt instrument
router.put(
  '/debt/:id',
  asyncHandler(async (req, res) => {
    if (!DebtInstrument) throw new AppError('Debt Management module not available', 503);
    const inst = await DebtInstrument.findOneAndUpdate(
      { _id: req.params.id, organization: req.user.organizationId },
      { ...req.body, updatedBy: req.user._id },
      { new: true, runValidators: true }
    );
    if (!inst) throw new AppError('Debt instrument not found', 404);
    res.json({ success: true, data: inst });
  })
);

// DELETE /debt/:id - Delete debt instrument
router.delete(
  '/debt/:id',
  asyncHandler(async (req, res) => {
    if (!DebtInstrument) throw new AppError('Debt Management module not available', 503);
    const inst = await DebtInstrument.findOneAndDelete({
      _id: req.params.id,
      organization: req.user.organizationId,
    });
    if (!inst) throw new AppError('Debt instrument not found', 404);
    res.json({ success: true, message: 'تم حذف أداة الدين' });
  })
);

// GET /debt/dashboard/summary - Debt portfolio summary
router.get(
  '/debt/dashboard/summary',
  asyncHandler(async (req, res) => {
    if (!DebtInstrument) throw new AppError('Debt Management module not available', 503);
    const orgFilter = { organization: req.user.organizationId };
    const [byType, totalFacility, covenantBreaches] = await Promise.all([
      DebtInstrument.aggregate([
        { $match: orgFilter },
        {
          $group: {
            _id: '$instrumentType',
            count: { $sum: 1 },
            totalFacility: { $sum: '$facility.facilityAmount' },
            totalDrawn: { $sum: '$facility.drawnAmount' },
          },
        },
      ]),
      DebtInstrument.aggregate([
        { $match: { ...orgFilter, status: 'active' } },
        {
          $group: {
            _id: null,
            totalFacility: { $sum: '$facility.facilityAmount' },
            totalDrawn: { $sum: '$facility.drawnAmount' },
          },
        },
      ]),
      DebtInstrument.countDocuments({ ...orgFilter, 'covenants.compliant': false }),
    ]);
    res.json({
      success: true,
      data: {
        byType,
        portfolio: totalFacility[0] || { totalFacility: 0, totalDrawn: 0 },
        covenantBreaches,
      },
    });
  })
);

// POST /debt/:id/amortization/generate - Generate amortization schedule
router.post(
  '/debt/:id/amortization/generate',
  asyncHandler(async (req, res) => {
    if (!DebtInstrument) throw new AppError('Debt Management module not available', 503);
    const inst = await DebtInstrument.findOne({
      _id: req.params.id,
      organization: req.user.organizationId,
    });
    if (!inst) throw new AppError('Debt instrument not found', 404);
    // Simple amortization generation
    const periods = inst.terms.tenorMonths || 12;
    const principal = inst.facility.facilityAmount;
    const rate = (inst.terms.interestRate || 0) / 100;
    const monthlyRate = rate / 12;
    const schedule = [];
    let balance = principal;
    for (let i = 1; i <= periods; i++) {
      const interest = balance * monthlyRate;
      const principalPayment = principal / periods;
      balance -= principalPayment;
      const dueDate = new Date(inst.terms.effectiveDate);
      dueDate.setMonth(dueDate.getMonth() + i);
      schedule.push({
        periodNumber: i,
        dueDate,
        principalAmount: Math.round(principalPayment * 100) / 100,
        interestAmount: Math.round(interest * 100) / 100,
        totalPayment: Math.round((principalPayment + interest) * 100) / 100,
        outstandingBalance: Math.max(0, Math.round(balance * 100) / 100),
        status: 'scheduled',
      });
    }
    inst.amortization = schedule;
    inst.updatedBy = req.user._id;
    await inst.save();
    res.json({ success: true, data: inst });
  })
);

// PUT /debt/:id/covenants/test - Test covenant compliance
router.put(
  '/debt/:id/covenants/test',
  asyncHandler(async (req, res) => {
    if (!DebtInstrument) throw new AppError('Debt Management module not available', 503);
    const inst = await DebtInstrument.findOne({
      _id: req.params.id,
      organization: req.user.organizationId,
    });
    if (!inst) throw new AppError('Debt instrument not found', 404);
    const results = inst.covenants.map(cov => {
      const val = req.body.values?.[cov.metric] ?? cov.currentValue;
      let compliant = true;
      if (cov.operator === '>=') compliant = val >= cov.threshold;
      else if (cov.operator === '<=') compliant = val <= cov.threshold;
      else if (cov.operator === '>') compliant = val > cov.threshold;
      else if (cov.operator === '<') compliant = val < cov.threshold;
      cov.currentValue = val;
      cov.compliant = compliant;
      cov.lastTestDate = new Date();
      return { metric: cov.metric, threshold: cov.threshold, value: val, compliant };
    });
    inst.updatedBy = req.user._id;
    await inst.save();
    res.json({ success: true, data: { results, instrument: inst } });
  })
);

// =====================================================================
// 5. COST ALLOCATION - توزيع التكاليف
// =====================================================================

// GET /cost-allocation - List allocations
router.get(
  '/cost-allocation',
  asyncHandler(async (req, res) => {
    if (!CostAllocation) throw new AppError('Cost Allocation module not available', 503);
    const { type, status, year, page = 1, limit = 25 } = req.query;
    const filter = { organization: req.user.organizationId };
    if (type) filter.allocationType = type;
    if (status) filter.status = status;
    if (year) filter['period.fiscalYear'] = Number(year);
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      CostAllocation.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      CostAllocation.countDocuments(filter),
    ]);
    res.json({
      success: true,
      data,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / limit),
      },
    });
  })
);

// POST /cost-allocation - Create allocation
router.post(
  '/cost-allocation',
  asyncHandler(async (req, res) => {
    if (!CostAllocation) throw new AppError('Cost Allocation module not available', 503);
    const alloc = new CostAllocation({
      ...req.body,
      organization: req.user.organizationId,
      createdBy: req.user._id,
    });
    await alloc.save();
    res.status(201).json({ success: true, data: alloc });
  })
);

// GET /cost-allocation/:id - Get allocation
router.get(
  '/cost-allocation/:id',
  asyncHandler(async (req, res) => {
    if (!CostAllocation) throw new AppError('Cost Allocation module not available', 503);
    const alloc = await CostAllocation.findOne({
      _id: req.params.id,
      organization: req.user.organizationId,
    });
    if (!alloc) throw new AppError('Cost allocation not found', 404);
    res.json({ success: true, data: alloc });
  })
);

// PUT /cost-allocation/:id - Update allocation
router.put(
  '/cost-allocation/:id',
  asyncHandler(async (req, res) => {
    if (!CostAllocation) throw new AppError('Cost Allocation module not available', 503);
    const alloc = await CostAllocation.findOneAndUpdate(
      { _id: req.params.id, organization: req.user.organizationId },
      { ...req.body, updatedBy: req.user._id },
      { new: true, runValidators: true }
    );
    if (!alloc) throw new AppError('Cost allocation not found', 404);
    res.json({ success: true, data: alloc });
  })
);

// DELETE /cost-allocation/:id - Delete allocation
router.delete(
  '/cost-allocation/:id',
  asyncHandler(async (req, res) => {
    if (!CostAllocation) throw new AppError('Cost Allocation module not available', 503);
    const alloc = await CostAllocation.findOneAndDelete({
      _id: req.params.id,
      organization: req.user.organizationId,
    });
    if (!alloc) throw new AppError('Cost allocation not found', 404);
    res.json({ success: true, message: 'تم حذف توزيع التكاليف' });
  })
);

// POST /cost-allocation/:id/execute - Execute allocation run
router.post(
  '/cost-allocation/:id/execute',
  asyncHandler(async (req, res) => {
    if (!CostAllocation) throw new AppError('Cost Allocation module not available', 503);
    const alloc = await CostAllocation.findOne({
      _id: req.params.id,
      organization: req.user.organizationId,
    });
    if (!alloc) throw new AppError('Cost allocation not found', 404);
    // Generate allocation results based on rules
    const totalPool = alloc.costPool.totalAmount;
    const results = alloc.allocationRules.map(rule => ({
      targetCostCenter: rule.targetCenter,
      targetDepartment: rule.targetCenter,
      allocatedAmount: rule.percentage
        ? (totalPool * rule.percentage) / 100
        : rule.fixedAmount || 0,
      percentage: rule.percentage || 0,
    }));
    alloc.allocationResults = results;
    alloc.executionLog.push({
      executedBy: req.user._id,
      totalAllocated: results.reduce((sum, r) => sum + r.allocatedAmount, 0),
      centersAffected: results.length,
      status: 'success',
    });
    alloc.updatedBy = req.user._id;
    await alloc.save();
    res.json({ success: true, data: alloc });
  })
);

// GET /cost-allocation/reports/profit-centers - Profit center report
router.get(
  '/cost-allocation/reports/profit-centers',
  asyncHandler(async (req, res) => {
    if (!CostAllocation) throw new AppError('Cost Allocation module not available', 503);
    const orgFilter = { organization: req.user.organizationId, status: 'active' };
    const allocations = await CostAllocation.find(orgFilter);
    const profitCenters = {};
    allocations.forEach(a => {
      a.profitCenterMapping.forEach(pc => {
        if (!profitCenters[pc.profitCenter])
          profitCenters[pc.profitCenter] = {
            name: pc.profitCenterName,
            revenue: 0,
            cost: 0,
            contribution: 0,
          };
        profitCenters[pc.profitCenter].revenue += pc.allocatedRevenue;
        profitCenters[pc.profitCenter].cost += pc.allocatedCost;
        profitCenters[pc.profitCenter].contribution += pc.contribution;
      });
    });
    res.json({ success: true, data: profitCenters });
  })
);

// =====================================================================
// 6. FINANCIAL WORKFLOW - سير العمل المالي
// =====================================================================

// GET /workflows - List workflow templates
router.get(
  '/workflows',
  asyncHandler(async (req, res) => {
    if (!FinancialWorkflow) throw new AppError('Workflow module not available', 503);
    const { type, status, page = 1, limit = 20 } = req.query;
    const filter = { organization: req.user.organizationId };
    if (type) filter.workflowType = type;
    if (status) filter.status = status;
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      FinancialWorkflow.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      FinancialWorkflow.countDocuments(filter),
    ]);
    res.json({
      success: true,
      data,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / limit),
      },
    });
  })
);

// POST /workflows - Create workflow template
router.post(
  '/workflows',
  asyncHandler(async (req, res) => {
    if (!FinancialWorkflow) throw new AppError('Workflow module not available', 503);
    const wf = new FinancialWorkflow({
      ...req.body,
      organization: req.user.organizationId,
      createdBy: req.user._id,
    });
    await wf.save();
    res.status(201).json({ success: true, data: wf });
  })
);

// GET /workflows/:id - Get workflow
router.get(
  '/workflows/:id',
  asyncHandler(async (req, res) => {
    if (!FinancialWorkflow) throw new AppError('Workflow module not available', 503);
    const wf = await FinancialWorkflow.findOne({
      _id: req.params.id,
      organization: req.user.organizationId,
    });
    if (!wf) throw new AppError('Workflow not found', 404);
    res.json({ success: true, data: wf });
  })
);

// PUT /workflows/:id - Update workflow
router.put(
  '/workflows/:id',
  asyncHandler(async (req, res) => {
    if (!FinancialWorkflow) throw new AppError('Workflow module not available', 503);
    const wf = await FinancialWorkflow.findOneAndUpdate(
      { _id: req.params.id, organization: req.user.organizationId },
      { ...req.body, updatedBy: req.user._id },
      { new: true, runValidators: true }
    );
    if (!wf) throw new AppError('Workflow not found', 404);
    res.json({ success: true, data: wf });
  })
);

// DELETE /workflows/:id - Delete workflow
router.delete(
  '/workflows/:id',
  asyncHandler(async (req, res) => {
    if (!FinancialWorkflow) throw new AppError('Workflow module not available', 503);
    const wf = await FinancialWorkflow.findOneAndDelete({
      _id: req.params.id,
      organization: req.user.organizationId,
    });
    if (!wf) throw new AppError('Workflow not found', 404);
    res.json({ success: true, message: 'تم حذف سير العمل' });
  })
);

// POST /workflows/:id/instances - Create workflow instance (start a workflow)
router.post(
  '/workflows/:id/instances',
  asyncHandler(async (req, res) => {
    if (!WorkflowInstance) throw new AppError('Workflow module not available', 503);
    const instance = new WorkflowInstance({
      ...req.body,
      organization: req.user.organizationId,
      workflow: req.params.id,
      submittedBy: req.user._id,
      status: 'in_progress',
      currentStep: 1,
    });
    await instance.save();
    res.status(201).json({ success: true, data: instance });
  })
);

// GET /workflow-instances - List workflow instances
router.get(
  '/workflow-instances',
  asyncHandler(async (req, res) => {
    if (!WorkflowInstance) throw new AppError('Workflow module not available', 503);
    const { status, priority, page = 1, limit = 25 } = req.query;
    const filter = { organization: req.user.organizationId };
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      WorkflowInstance.find(filter)
        .populate('workflow')
        .sort({ submittedDate: -1 })
        .skip(skip)
        .limit(Number(limit)),
      WorkflowInstance.countDocuments(filter),
    ]);
    res.json({
      success: true,
      data,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / limit),
      },
    });
  })
);

// PUT /workflow-instances/:id/action - Take action on workflow instance
router.put(
  '/workflow-instances/:id/action',
  asyncHandler(async (req, res) => {
    if (!WorkflowInstance) throw new AppError('Workflow module not available', 503);
    const instance = await WorkflowInstance.findOne({
      _id: req.params.id,
      organization: req.user.organizationId,
    });
    if (!instance) throw new AppError('Workflow instance not found', 404);
    const { action, comments } = req.body;
    instance.stepHistory.push({
      stepNumber: instance.currentStep,
      action,
      actionBy: req.user._id,
      comments,
    });
    if (action === 'approved') instance.currentStep += 1;
    if (action === 'rejected') instance.status = 'rejected';
    if (action === 'approved') {
      // Check if all steps done
      const wf = await FinancialWorkflow.findById(instance.workflow);
      if (wf && instance.currentStep > wf.approvalChain.length) {
        instance.status = 'approved';
        instance.completedDate = new Date();
      }
    }
    await instance.save();
    res.json({ success: true, data: instance });
  })
);

// =====================================================================
// 7. TAX PLANNING - التخطيط الضريبي
// =====================================================================

// GET /tax-planning - List tax strategies
router.get(
  '/tax-planning',
  asyncHandler(async (req, res) => {
    if (!TaxPlanningStrategy) throw new AppError('Tax Planning module not available', 503);
    const { type, status, year, page = 1, limit = 20 } = req.query;
    const filter = { organization: req.user.organizationId };
    if (type) filter.strategyType = type;
    if (status) filter.status = status;
    if (year) filter.fiscalYear = Number(year);
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      TaxPlanningStrategy.find(filter).sort({ fiscalYear: -1 }).skip(skip).limit(Number(limit)),
      TaxPlanningStrategy.countDocuments(filter),
    ]);
    res.json({
      success: true,
      data,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / limit),
      },
    });
  })
);

// POST /tax-planning - Create tax strategy
router.post(
  '/tax-planning',
  asyncHandler(async (req, res) => {
    if (!TaxPlanningStrategy) throw new AppError('Tax Planning module not available', 503);
    const strategy = new TaxPlanningStrategy({
      ...req.body,
      organization: req.user.organizationId,
      createdBy: req.user._id,
    });
    await strategy.save();
    res.status(201).json({ success: true, data: strategy });
  })
);

// GET /tax-planning/:id - Get tax strategy
router.get(
  '/tax-planning/:id',
  asyncHandler(async (req, res) => {
    if (!TaxPlanningStrategy) throw new AppError('Tax Planning module not available', 503);
    const strategy = await TaxPlanningStrategy.findOne({
      _id: req.params.id,
      organization: req.user.organizationId,
    });
    if (!strategy) throw new AppError('Tax strategy not found', 404);
    res.json({ success: true, data: strategy });
  })
);

// PUT /tax-planning/:id - Update tax strategy
router.put(
  '/tax-planning/:id',
  asyncHandler(async (req, res) => {
    if (!TaxPlanningStrategy) throw new AppError('Tax Planning module not available', 503);
    const strategy = await TaxPlanningStrategy.findOneAndUpdate(
      { _id: req.params.id, organization: req.user.organizationId },
      { ...req.body, updatedBy: req.user._id },
      { new: true, runValidators: true }
    );
    if (!strategy) throw new AppError('Tax strategy not found', 404);
    res.json({ success: true, data: strategy });
  })
);

// DELETE /tax-planning/:id - Delete tax strategy
router.delete(
  '/tax-planning/:id',
  asyncHandler(async (req, res) => {
    if (!TaxPlanningStrategy) throw new AppError('Tax Planning module not available', 503);
    const strategy = await TaxPlanningStrategy.findOneAndDelete({
      _id: req.params.id,
      organization: req.user.organizationId,
    });
    if (!strategy) throw new AppError('Tax strategy not found', 404);
    res.json({ success: true, message: 'تم حذف استراتيجية التخطيط الضريبي' });
  })
);

// POST /tax-planning/:id/scenarios - Add scenario to strategy
router.post(
  '/tax-planning/:id/scenarios',
  asyncHandler(async (req, res) => {
    if (!TaxPlanningStrategy) throw new AppError('Tax Planning module not available', 503);
    const strategy = await TaxPlanningStrategy.findOne({
      _id: req.params.id,
      organization: req.user.organizationId,
    });
    if (!strategy) throw new AppError('Tax strategy not found', 404);
    strategy.scenarios.push(req.body);
    strategy.updatedBy = req.user._id;
    await strategy.save();
    res.json({ success: true, data: strategy });
  })
);

// GET /tax-planning/reports/compliance-forecast - ZATCA compliance forecast
router.get(
  '/tax-planning/reports/compliance-forecast',
  asyncHandler(async (req, res) => {
    if (!TaxPlanningStrategy) throw new AppError('Tax Planning module not available', 503);
    const orgFilter = { organization: req.user.organizationId };
    const strategies = await TaxPlanningStrategy.find({ ...orgFilter, status: 'active' });
    const forecast = {
      totalVatPayable: 0,
      totalWithholding: 0,
      totalZakat: 0,
      complianceScores: [],
      upcomingDeadlines: [],
    };
    strategies.forEach(s => {
      forecast.totalVatPayable += s.currentTaxPosition.netVat;
      forecast.totalWithholding += s.currentTaxPosition.withholdingTax;
      forecast.totalZakat += s.currentTaxPosition.zakatDue;
      if (s.zatcaCompliance) {
        forecast.complianceScores.push({
          strategy: s.name,
          score: s.zatcaCompliance.complianceScore,
        });
        forecast.upcomingDeadlines.push(
          ...(s.zatcaCompliance.filingDeadlines || []).filter(d => d.status === 'pending')
        );
      }
    });
    res.json({ success: true, data: forecast });
  })
);

// =====================================================================
// 8. AUDIT MANAGER - إدارة التدقيق المالي
// =====================================================================

// GET /audit-engagements - List audit engagements
router.get(
  '/audit-engagements',
  asyncHandler(async (req, res) => {
    if (!AuditEngagement) throw new AppError('Audit module not available', 503);
    const { type, status, priority, page = 1, limit = 20 } = req.query;
    const filter = { organization: req.user.organizationId };
    if (type) filter.auditType = type;
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      AuditEngagement.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      AuditEngagement.countDocuments(filter),
    ]);
    res.json({
      success: true,
      data,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / limit),
      },
    });
  })
);

// POST /audit-engagements - Create audit engagement
router.post(
  '/audit-engagements',
  asyncHandler(async (req, res) => {
    if (!AuditEngagement) throw new AppError('Audit module not available', 503);
    const engagement = new AuditEngagement({
      ...req.body,
      organization: req.user.organizationId,
      createdBy: req.user._id,
    });
    await engagement.save();
    res.status(201).json({ success: true, data: engagement });
  })
);

// GET /audit-engagements/:id - Get audit engagement
router.get(
  '/audit-engagements/:id',
  asyncHandler(async (req, res) => {
    if (!AuditEngagement) throw new AppError('Audit module not available', 503);
    const engagement = await AuditEngagement.findOne({
      _id: req.params.id,
      organization: req.user.organizationId,
    });
    if (!engagement) throw new AppError('Audit engagement not found', 404);
    res.json({ success: true, data: engagement });
  })
);

// PUT /audit-engagements/:id - Update audit engagement
router.put(
  '/audit-engagements/:id',
  asyncHandler(async (req, res) => {
    if (!AuditEngagement) throw new AppError('Audit module not available', 503);
    const engagement = await AuditEngagement.findOneAndUpdate(
      { _id: req.params.id, organization: req.user.organizationId },
      { ...req.body, updatedBy: req.user._id },
      { new: true, runValidators: true }
    );
    if (!engagement) throw new AppError('Audit engagement not found', 404);
    res.json({ success: true, data: engagement });
  })
);

// DELETE /audit-engagements/:id - Delete audit engagement
router.delete(
  '/audit-engagements/:id',
  asyncHandler(async (req, res) => {
    if (!AuditEngagement) throw new AppError('Audit module not available', 503);
    const engagement = await AuditEngagement.findOneAndDelete({
      _id: req.params.id,
      organization: req.user.organizationId,
    });
    if (!engagement) throw new AppError('Audit engagement not found', 404);
    res.json({ success: true, message: 'تم حذف مهمة التدقيق' });
  })
);

// POST /audit-engagements/:id/findings - Add finding
router.post(
  '/audit-engagements/:id/findings',
  asyncHandler(async (req, res) => {
    if (!AuditEngagement) throw new AppError('Audit module not available', 503);
    const engagement = await AuditEngagement.findOne({
      _id: req.params.id,
      organization: req.user.organizationId,
    });
    if (!engagement) throw new AppError('Audit engagement not found', 404);
    const findingNumber = `FND-${engagement.engagementNumber}-${engagement.findings.length + 1}`;
    engagement.findings.push({ ...req.body, findingNumber });
    engagement.updatedBy = req.user._id;
    await engagement.save();
    res.json({ success: true, data: engagement });
  })
);

// POST /audit-engagements/:id/corrective-actions - Add corrective action
router.post(
  '/audit-engagements/:id/corrective-actions',
  asyncHandler(async (req, res) => {
    if (!AuditEngagement) throw new AppError('Audit module not available', 503);
    const engagement = await AuditEngagement.findOne({
      _id: req.params.id,
      organization: req.user.organizationId,
    });
    if (!engagement) throw new AppError('Audit engagement not found', 404);
    const actionNumber = `CAP-${engagement.engagementNumber}-${engagement.correctiveActions.length + 1}`;
    engagement.correctiveActions.push({ ...req.body, actionNumber });
    engagement.updatedBy = req.user._id;
    await engagement.save();
    res.json({ success: true, data: engagement });
  })
);

// PUT /audit-engagements/:id/opinion - Set audit opinion
router.put(
  '/audit-engagements/:id/opinion',
  asyncHandler(async (req, res) => {
    if (!AuditEngagement) throw new AppError('Audit module not available', 503);
    const engagement = await AuditEngagement.findOneAndUpdate(
      { _id: req.params.id, organization: req.user.organizationId },
      { auditOpinion: req.body, updatedBy: req.user._id },
      { new: true }
    );
    if (!engagement) throw new AppError('Audit engagement not found', 404);
    res.json({ success: true, data: engagement });
  })
);

// GET /audit-engagements/dashboard/summary - Audit dashboard
router.get(
  '/audit-engagements/dashboard/summary',
  asyncHandler(async (req, res) => {
    if (!AuditEngagement) throw new AppError('Audit module not available', 503);
    const orgFilter = { organization: req.user.organizationId };
    const [total, byStatus, byType, openFindings] = await Promise.all([
      AuditEngagement.countDocuments(orgFilter),
      AuditEngagement.aggregate([
        { $match: orgFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      AuditEngagement.aggregate([
        { $match: orgFilter },
        { $group: { _id: '$auditType', count: { $sum: 1 } } },
      ]),
      AuditEngagement.aggregate([
        { $match: orgFilter },
        { $unwind: '$findings' },
        { $match: { 'findings.status': { $in: ['open', 'in_progress'] } } },
        { $group: { _id: '$findings.severity', count: { $sum: 1 } } },
      ]),
    ]);
    res.json({ success: true, data: { total, byStatus, byType, openFindings } });
  })
);

module.exports = router;
