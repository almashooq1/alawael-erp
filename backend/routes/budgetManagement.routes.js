/**
 * Budget Management Routes
 * مسارات إدارة الميزانيات
 */
const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { requireBranchAccess } = require('../middleware/branchScope.middleware');
const _logger = require('../utils/logger');
const Budget = require('../models/Budget');
const safeError = require('../utils/safeError');

router.use(authenticate);
router.use(requireBranchAccess);
// ─── Overview stats (before /:id) ────────────────────────────────────────────
router.get('/stats/overview', async (req, res) => {
  try {
    // Use aggregation instead of loading all documents into memory.
    // W1208 — the model's totals are totalBudgeted/totalSpent (the phantom
    // totalAmount/spentAmount sums were always zero).
    const [stats] = await Budget.aggregate([
      { $match: { isDeleted: { $ne: true } } },
      {
        $group: {
          _id: null,
          totalBudgets: { $sum: 1 },
          totalBudget: { $sum: { $ifNull: ['$totalBudgeted', 0] } },
          totalSpent: { $sum: { $ifNull: ['$totalSpent', 0] } },
        },
      },
    ]);
    const { totalBudgets = 0, totalBudget = 0, totalSpent = 0 } = stats || {};
    const totalRemaining = totalBudget - totalSpent;
    res.json({
      success: true,
      data: {
        totalBudgets,
        totalBudget,
        totalSpent,
        totalRemaining,
        utilizationRate: totalBudget > 0 ? ((totalSpent / totalBudget) * 100).toFixed(1) : 0,
      },
      message: 'نظرة عامة على الميزانية',
    });
  } catch (error) {
    safeError(res, error, 'fetching budget overview');
  }
});

// ─── List budgets ────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { department, fiscalYear, page = 1, limit = 20 } = req.query;
    const filter = { isDeleted: { $ne: true } };
    if (department) filter.department = department;
    if (fiscalYear) filter.fiscalYear = +fiscalYear;
    const skip = (Math.max(1, +page) - 1) * +limit;
    const [data, total] = await Promise.all([
      Budget.find(filter).sort({ createdAt: -1 }).skip(skip).limit(+limit).lean(),
      Budget.countDocuments(filter),
    ]);
    res.json({
      success: true,
      data,
      pagination: { page: +page, limit: +limit, total },
      message: 'قائمة الميزانيات',
    });
  } catch (error) {
    safeError(res, error, 'fetching budgets');
  }
});

// ─── Get single budget ───────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const budget = await Budget.findById(req.params.id).lean();
    if (!budget) return res.status(404).json({ success: false, message: 'الميزانية غير موجودة' });
    res.json({ success: true, data: budget, message: 'بيانات الميزانية' });
  } catch (error) {
    safeError(res, error, 'fetching budget');
  }
});

// ─── Create budget ───────────────────────────────────────────────────────────
router.post('/', authorize(['admin', 'manager']), async (req, res) => {
  try {
    const { name, department, fiscalYear, totalAmount, lineItems } = req.body;
    if (!name || !department) {
      return res.status(400).json({ success: false, message: 'الاسم والقسم مطلوبان' });
    }
    const numTotal = Number(totalAmount);
    if (totalAmount !== undefined && (!Number.isFinite(numTotal) || numTotal < 0)) {
      return res.status(400).json({ success: false, message: 'المبلغ الإجمالي غير صالح' });
    }
    // W1208 — realigned to the REAL Budget vocabulary: period/startDate/
    // endDate/lines/totalBudgeted are REQUIRED (the phantom totalAmount/
    // spentAmount/lineItems payload threw ValidationError on every create
    // since the route shipped). period defaults to annual over the fiscal
    // year; only line items carrying the subdoc-required accountId+amount
    // are mapped.
    const year = Number(fiscalYear) || new Date().getFullYear();
    const total = Number.isFinite(numTotal) ? numTotal : 0;
    const lines = (Array.isArray(lineItems) ? lineItems : [])
      .filter(li => li && li.accountId && Number.isFinite(Number(li.amount)))
      .map(li => ({
        accountId: li.accountId,
        amount: Number(li.amount),
        notes: li.notes || li.description,
      }));
    const budget = await Budget.create({
      name,
      department,
      fiscalYear: year,
      period: 'annual',
      startDate: new Date(year, 0, 1),
      endDate: new Date(year, 11, 31),
      lines,
      totalBudgeted: total,
      totalRemaining: total,
      status: 'draft',
      createdBy: req.user.id,
    });
    res.status(201).json({ success: true, data: budget, message: 'تم إنشاء الميزانية بنجاح' });
  } catch (error) {
    safeError(res, error, 'creating budget');
  }
});

// ─── Update budget ───────────────────────────────────────────────────────────
router.put('/:id', authorize(['admin', 'manager']), async (req, res) => {
  try {
    const { name, department, fiscalYear, totalAmount, lineItems, status, notes } = req.body;
    // W1208 — explicit $set with the real vocabulary (phantom keys were
    // silently dropped on every update).
    const set = {};
    if (name !== undefined) set.name = name;
    if (department !== undefined) set.department = department;
    if (fiscalYear !== undefined) set.fiscalYear = Number(fiscalYear);
    if (totalAmount !== undefined) set.totalBudgeted = Number(totalAmount);
    if (lineItems !== undefined)
      set.lines = (Array.isArray(lineItems) ? lineItems : [])
        .filter(li => li && li.accountId && Number.isFinite(Number(li.amount)))
        .map(li => ({
          accountId: li.accountId,
          amount: Number(li.amount),
          notes: li.notes || li.description,
        }));
    if (status !== undefined) set.status = status;
    if (notes !== undefined) set.notes = notes;
    const budget = await Budget.findByIdAndUpdate(
      req.params.id,
      { $set: set },
      { returnDocument: 'after', runValidators: true }
    ).lean();
    if (!budget) return res.status(404).json({ success: false, message: 'الميزانية غير موجودة' });
    res.json({ success: true, data: budget, message: 'تم تحديث الميزانية بنجاح' });
  } catch (error) {
    safeError(res, error, 'updating budget');
  }
});

// ─── Allocate funds ──────────────────────────────────────────────────────────
router.post('/:id/allocate', authorize(['admin', 'manager']), async (req, res) => {
  try {
    const budget = await Budget.findById(req.params.id);
    if (!budget) return res.status(404).json({ success: false, message: 'الميزانية غير موجودة' });
    const { amount, description, category } = req.body;
    const numAmount = Number(amount);
    if (!Number.isFinite(numAmount) || numAmount <= 0) {
      return res.status(400).json({ success: false, message: 'المبلغ غير صالح' });
    }
    if (numAmount > 10_000_000) {
      return res.status(400).json({ success: false, message: 'المبلغ يتجاوز الحد المسموح' });
    }
    // W1208 — real totals are totalBudgeted/totalSpent (the phantom
    // spentAmount/totalAmount comparison made every allocation either bypass
    // the cap or fail); allocations history is now a declared subdoc.
    const newSpent = (budget.totalSpent || 0) + numAmount;
    if (newSpent > budget.totalBudgeted) {
      return res.status(400).json({
        success: false,
        message: 'المبلغ يتجاوز الميزانية المتاحة',
        data: {
          remaining: budget.totalBudgeted - (budget.totalSpent || 0),
        },
      });
    }
    budget.totalSpent = newSpent;
    budget.totalRemaining = budget.totalBudgeted - newSpent;
    budget.utilizationPercentage =
      budget.totalBudgeted > 0 ? Math.round((newSpent / budget.totalBudgeted) * 100) : 0;
    budget.allocations.push({
      amount: numAmount,
      description,
      category,
      allocatedBy: req.user.id,
      allocatedAt: new Date(),
    });
    await budget.save();
    res.json({ success: true, data: budget, message: 'تم تخصيص المبلغ بنجاح' });
  } catch (error) {
    safeError(res, error, 'allocating funds');
  }
});

// ─── Variance report ─────────────────────────────────────────────────────────
router.get('/:id/variance', async (req, res) => {
  try {
    const budget = await Budget.findById(req.params.id).lean();
    if (!budget) return res.status(404).json({ success: false, message: 'الميزانية غير موجودة' });
    // W1208 — real total fields (phantoms read as permanent zeros).
    const total = budget.totalBudgeted || 0;
    const spent = budget.totalSpent || 0;
    const variance = total - spent;
    const variancePercent = total > 0 ? ((variance / total) * 100).toFixed(1) : 0;
    res.json({
      success: true,
      data: {
        budget: total,
        spent,
        variance,
        variancePercent: +variancePercent,
        status: variance >= 0 ? 'under_budget' : 'over_budget',
      },
      message: 'تقرير الانحراف',
    });
  } catch (error) {
    safeError(res, error, 'fetching variance');
  }
});

module.exports = router;
