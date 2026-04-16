/**
 * Budget Management Routes
 * مسارات إدارة الميزانيات
 */
const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const logger = require('../utils/logger');
const Budget = require('../models/Budget');
const safeError = require('../utils/safeError');

router.use(authenticate);
router.use(requireBranchAccess);
// ─── Overview stats (before /:id) ────────────────────────────────────────────
router.get('/stats/overview', async (req, res) => {
  try {
    // Use aggregation instead of loading all documents into memory
    const [stats] = await Budget.aggregate([
      {
        $group: {
          _id: null,
          totalBudgets: { $sum: 1 },
          totalBudget: { $sum: { $ifNull: ['$totalAmount', 0] } },
          totalSpent: { $sum: { $ifNull: ['$spentAmount', 0] } },
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
    const filter = {};
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
    const budget = await Budget.create({
      name,
      department,
      fiscalYear: fiscalYear || new Date().getFullYear(),
      totalAmount: Number.isFinite(numTotal) ? numTotal : 0,
      spentAmount: 0,
      lineItems: lineItems || [],
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
    const budget = await Budget.findByIdAndUpdate(
      req.params.id,
      { name, department, fiscalYear, totalAmount, lineItems, status, notes },
      { new: true, runValidators: true }
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
    const newSpent = (budget.spentAmount || 0) + numAmount;
    if (newSpent > budget.totalAmount) {
      return res.status(400).json({
        success: false,
        message: 'المبلغ يتجاوز الميزانية المتاحة',
        data: {
          remaining: budget.totalAmount - (budget.spentAmount || 0),
        },
      });
    }
    budget.spentAmount = newSpent;
    if (!budget.allocations) budget.allocations = [];
    budget.allocations.push({
      amount,
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
    const total = budget.totalAmount || 0;
    const spent = budget.spentAmount || 0;
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
