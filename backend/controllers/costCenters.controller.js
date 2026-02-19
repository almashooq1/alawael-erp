/**
 * ===================================================================
 * COST CENTER CONTROLLER - متحكم مراكز التكلفة
 * ===================================================================
 */

const CostCenter = require('../models/CostCenter');
const asyncHandler = require('express-async-handler');

// الحصول على جميع مراكز التكلفة
exports.getAllCostCenters = asyncHandler(async (req, res) => {
  const { type, status, department, search } = req.query;

  const filter = {};

  if (type) filter.type = type;
  if (status) filter.status = status;
  if (department) filter.department = department;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { code: { $regex: search, $options: 'i' } },
    ];
  }

  const costCenters = await CostCenter.find(filter)
    .populate('manager accountant department branch parentCostCenter')
    .sort('code');

  res.json({
    success: true,
    data: costCenters,
    count: costCenters.length,
  });
});

// إنشاء مركز تكلفة جديد
exports.createCostCenter = asyncHandler(async (req, res) => {
  const costCenterData = {
    ...req.body,
    createdBy: req.user._id,
  };

  const costCenter = await CostCenter.create(costCenterData);

  res.status(201).json({
    success: true,
    data: costCenter,
    message: 'تم إنشاء مركز التكلفة بنجاح',
  });
});

// تحديث مركز تكلفة
exports.updateCostCenter = asyncHandler(async (req, res) => {
  const costCenter = await CostCenter.findById(req.params.id);

  if (!costCenter) {
    return res.status(404).json({
      success: false,
      message: 'مركز التكلفة غير موجود',
    });
  }

  Object.assign(costCenter, req.body);
  costCenter.updatedBy = req.user._id;
  await costCenter.save();

  res.json({
    success: true,
    data: costCenter,
    message: 'تم تحديث مركز التكلفة بنجاح',
  });
});

// تسجيل تكلفة
exports.recordCost = asyncHandler(async (req, res) => {
  const costCenter = await CostCenter.findById(req.params.id);

  if (!costCenter) {
    return res.status(404).json({
      success: false,
      message: 'مركز التكلفة غير موجود',
    });
  }

  await costCenter.recordCost(req.body);

  res.json({
    success: true,
    data: costCenter,
    message: 'تم تسجيل التكلفة بنجاح',
  });
});

// تسجيل إيراد
exports.recordRevenue = asyncHandler(async (req, res) => {
  const costCenter = await CostCenter.findById(req.params.id);

  if (!costCenter) {
    return res.status(404).json({
      success: false,
      message: 'مركز التكلفة غير موجود',
    });
  }

  await costCenter.recordRevenue(req.body.amount, req.body.source);

  res.json({
    success: true,
    data: costCenter,
    message: 'تم تسجيل الإيراد بنجاح',
  });
});

// تحديث مؤشر أداء
exports.updateKPI = asyncHandler(async (req, res) => {
  const costCenter = await CostCenter.findById(req.params.id);

  if (!costCenter) {
    return res.status(404).json({
      success: false,
      message: 'مركز التكلفة غير موجود',
    });
  }

  await costCenter.updateKPI(req.body.name, req.body.actualValue);

  res.json({
    success: true,
    data: costCenter,
    message: 'تم تحديث مؤشر الأداء بنجاح',
  });
});

// توزيع التكاليف
exports.allocateCosts = asyncHandler(async (req, res) => {
  const costCenter = await CostCenter.findById(req.params.id);

  if (!costCenter) {
    return res.status(404).json({
      success: false,
      message: 'مركز التكلفة غير موجود',
    });
  }

  const rule = costCenter.allocationRules.id(req.body.ruleId);

  if (!rule) {
    return res.status(404).json({
      success: false,
      message: 'قاعدة التوزيع غير موجودة',
    });
  }

  const allocations = await costCenter.allocateCosts(req.body.amount, rule);

  res.json({
    success: true,
    data: allocations,
    message: 'تم توزيع التكاليف بنجاح',
  });
});

// تقرير الأداء
exports.getPerformanceReport = asyncHandler(async (req, res) => {
  const { year, quarter } = req.query;

  const report = await CostCenter.getPerformanceReport(parseInt(year), quarter);

  res.json({
    success: true,
    data: report,
  });
});

// المراكز المتجاوزة للميزانية
exports.getOverBudget = asyncHandler(async (req, res) => {
  const centers = await CostCenter.getOverBudget();

  res.json({
    success: true,
    data: centers,
    count: centers.length,
  });
});

// الحصول على مركز واحد
exports.getCostCenterById = asyncHandler(async (req, res) => {
  const costCenter = await CostCenter.findById(req.params.id).populate(
    'manager accountant department branch parentCostCenter'
  );

  if (!costCenter) {
    return res.status(404).json({
      success: false,
      message: 'مركز التكلفة غير موجود',
    });
  }

  res.json({
    success: true,
    data: costCenter,
  });
});

// حذف مركز تكلفة
exports.deleteCostCenter = asyncHandler(async (req, res) => {
  const costCenter = await CostCenter.findById(req.params.id);

  if (!costCenter) {
    return res.status(404).json({
      success: false,
      message: 'مركز التكلفة غير موجود',
    });
  }

  await costCenter.remove();

  res.json({
    success: true,
    message: 'تم حذف مركز التكلفة بنجاح',
  });
});

// تحديث الميزانية
exports.updateBudget = asyncHandler(async (req, res) => {
  const costCenter = await CostCenter.findById(req.params.id);

  if (!costCenter) {
    return res.status(404).json({
      success: false,
      message: 'مركز التكلفة غير موجود',
    });
  }

  costCenter.budget = {
    ...costCenter.budget,
    ...req.body,
  };

  await costCenter.save();

  res.json({
    success: true,
    data: costCenter,
    message: 'تم تحديث الميزانية بنجاح',
  });
});

// تحليل الميزانية
exports.getBudgetAnalysis = asyncHandler(async (req, res) => {
  const costCenter = await CostCenter.findById(req.params.id);

  if (!costCenter) {
    return res.status(404).json({
      success: false,
      message: 'مركز التكلفة غير موجود',
    });
  }

  const analysis = {
    budgetUtilization: costCenter.budgetUtilization,
    budgetStatus: costCenter.budgetStatus,
    totalBudget: costCenter.budget.totalBudget,
    spentBudget: costCenter.budget.spentBudget,
    remainingBudget: costCenter.budget.remainingBudget,
    monthlyBudgets: costCenter.monthlyBudgets,
  };

  res.json({
    success: true,
    data: analysis,
  });
});

// الحصول على KPIs
exports.getKPIs = asyncHandler(async (req, res) => {
  const costCenter = await CostCenter.findById(req.params.id);

  if (!costCenter) {
    return res.status(404).json({
      success: false,
      message: 'مركز التكلفة غير موجود',
    });
  }

  res.json({
    success: true,
    data: costCenter.kpis,
  });
});

// تحليل الربحية
exports.getProfitabilityAnalysis = asyncHandler(async (req, res) => {
  const costCenter = await CostCenter.findById(req.params.id);

  if (!costCenter) {
    return res.status(404).json({
      success: false,
      message: 'مركز التكلفة غير موجود',
    });
  }

  const analysis = {
    type: costCenter.type,
    revenue: costCenter.revenue,
    costs: costCenter.totalCosts,
    profitMargin: costCenter.profitMargin,
    roi: costCenter.roi,
  };

  res.json({
    success: true,
    data: analysis,
  });
});

// الإحصائيات
exports.getStats = asyncHandler(async (req, res) => {
  const totalCenters = await CostCenter.countDocuments({ isActive: true });

  const centersByType = await CostCenter.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: '$type', count: { $sum: 1 } } },
  ]);

  const totalBudget = await CostCenter.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: null, total: { $sum: '$budget.totalBudget' } } },
  ]);

  res.json({
    success: true,
    data: {
      totalCenters,
      centersByType,
      totalBudget: totalBudget[0]?.total || 0,
    },
  });
});

// حسب النوع
exports.getByType = asyncHandler(async (req, res) => {
  const { type } = req.query;

  const centers = await CostCenter.getByType(type);

  res.json({
    success: true,
    data: centers,
    count: centers.length,
  });
});

module.exports = exports;
