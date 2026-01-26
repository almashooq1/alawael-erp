/**
 * 💰 مسارات إدارة التكاليف والميزانيات
 */

const express = require('express');
const router = express.Router();
const costBudgetService = require('../services/costBudgetService');
const { authenticateToken } = require('../middleware/auth');

// إنشاء ميزانية
router.post('/budgets', authenticateToken, (req, res) => {
  try {
    const budget = costBudgetService.createBudget(req.body);
    res.json({
      success: true,
      message: 'تم إنشاء الميزانية',
      budget,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// جلب الميزانيات
router.get('/budgets', (req, res) => {
  try {
    const result = costBudgetService.getBudgets(req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// جلب تفاصيل الميزانية
router.get('/budgets/:id', (req, res) => {
  try {
    const details = costBudgetService.getBudgetDetails(parseInt(req.params.id));
    if (!details) {
      return res.status(404).json({ success: false, message: 'الميزانية غير موجودة' });
    }
    res.json(details);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// تحديث الميزانية
router.put('/budgets/:id/rebalance', authenticateToken, (req, res) => {
  try {
    const budget = costBudgetService.rebalanceBudget(parseInt(req.params.id), req.body.allocations);
    if (!budget) {
      return res.status(400).json({ success: false, message: 'بيانات غير صحيحة' });
    }
    res.json({
      success: true,
      message: 'تم تحديث الميزانية',
      budget,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// تسجيل تكلفة
router.post('/costs', authenticateToken, (req, res) => {
  try {
    const cost = costBudgetService.recordCost(req.body);
    res.json({
      success: true,
      message: 'تم تسجيل التكلفة',
      cost,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// جلب التكاليف
router.get('/costs', (req, res) => {
  try {
    const result = costBudgetService.getCosts(req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// موافقة على التكلفة
router.put('/costs/:id/approve', authenticateToken, (req, res) => {
  try {
    const cost = costBudgetService.approveCost(parseInt(req.params.id), req.user.id || 'admin');
    if (!cost) {
      return res.status(404).json({ success: false, message: 'التكلفة غير موجودة' });
    }
    res.json({
      success: true,
      message: 'تمت الموافقة على التكلفة',
      cost,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// رفض التكلفة
router.put('/costs/:id/reject', authenticateToken, (req, res) => {
  try {
    const cost = costBudgetService.rejectCost(parseInt(req.params.id), req.body.reason);
    if (!cost) {
      return res.status(404).json({ success: false, message: 'التكلفة غير موجودة' });
    }
    res.json({
      success: true,
      message: 'تم رفض التكلفة',
      cost,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// تحليل التكاليف
router.get('/analysis/:vehicleId', (req, res) => {
  try {
    const analysis = costBudgetService.analyzeCosts(
      req.params.vehicleId,
      req.query.startDate,
      req.query.endDate
    );
    res.json(analysis);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// مقارنة الميزانيات
router.post('/compare', (req, res) => {
  try {
    const comparison = costBudgetService.compareBudgets(
      req.body.vehicleId1,
      req.body.vehicleId2,
      req.body.period
    );
    res.json(comparison);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// تقرير الميزانية
router.get('/report/:vehicleId', (req, res) => {
  try {
    const report = costBudgetService.getBudgetReport(req.params.vehicleId, req.query.period);
    if (!report) {
      return res.status(404).json({ success: false, message: 'الميزانية غير موجودة' });
    }
    res.json(report);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// التنبؤ بالتكاليف
router.get('/prediction/:vehicleId', (req, res) => {
  try {
    const prediction = costBudgetService.predictFutureCosts(req.params.vehicleId);
    res.json({
      vehicleId: req.params.vehicleId,
      prediction,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
