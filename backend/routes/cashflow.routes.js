/**
 * CashFlow Routes
 * مسارات API لإدارة التدفق النقدي والتنبؤات
 */

const express = require('express');
const router = express.Router();
const { CashFlow, AuditLog } = require('../models');
const { authenticate, authorize } = require('../middleware/auth');

// GET أحدث تقرير تدفق نقدي
router.get('/latest', authenticate, async (req, res) => {
  try {
    const report = await CashFlow.findOne({
      organizationId: req.user.organizationId,
      status: { $ne: 'archived' }
    }).sort({ 'period.startDate': -1 });
    
    res.json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET تقارير للفترة
router.get('/period', authenticate, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const reports = await CashFlow.find({
      organizationId: req.user.organizationId,
      'period.startDate': { $gte: new Date(startDate) },
      'period.endDate': { $lte: new Date(endDate) },
      status: { $ne: 'archived' }
    }).sort({ 'period.startDate': -1 });
    
    res.json({ success: true, data: reports });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST إنشاء تقرير تدفق نقدي
router.post('/', authenticate, authorize(['finance_manager', 'admin']), async (req, res) => {
  try {
    const { startDate, endDate, inflows, outflows, reserves } = req.body;
    
    const report = new CashFlow({
      reportId: `cf-${Date.now()}`,
      organizationId: req.user.organizationId,
      period: { startDate: new Date(startDate), endDate: new Date(endDate) },
      inflows,
      outflows,
      reserves,
      createdBy: req.user._id
    });
    
    await report.save();
    
    await AuditLog.create({
      logId: `audit-${Date.now()}`,
      organizationId: req.user.organizationId,
      user: { userId: req.user._id, username: req.user.username, email: req.user.email, role: req.user.role },
      operation: 'create',
      entity: 'CashFlow',
      entityId: report._id,
      status: 'success'
    });
    
    res.status(201).json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT تحديث التقرير
router.put('/:reportId', authenticate, authorize(['finance_manager', 'admin']), async (req, res) => {
  try {
    const report = await CashFlow.findOneAndUpdate(
      { reportId: req.params.reportId, organizationId: req.user.organizationId },
      { ...req.body, modifiedBy: req.user._id },
      { new: true }
    );
    
    if (!report) {
      return res.status(404).json({ success: false, error: 'التقرير غير موجود' });
    }
    
    await AuditLog.create({
      logId: `audit-${Date.now()}`,
      organizationId: req.user.organizationId,
      user: { userId: req.user._id, username: req.user.username, email: req.user.email, role: req.user.role },
      operation: 'update',
      entity: 'CashFlow',
      entityId: report._id,
      status: 'success'
    });
    
    res.json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET تحليل التدفق النقدي
router.get('/analysis/:reportId', authenticate, async (req, res) => {
  try {
    const report = await CashFlow.findOne({
      reportId: req.params.reportId,
      organizationId: req.user.organizationId
    });
    
    if (!report) {
      return res.status(404).json({ success: false, error: 'التقرير غير موجود' });
    }
    
    const analysis = {
      healthScore: report.calculateHealthScore ? report.calculateHealthScore() : 0,
      netCashFlow: report.calculations.netCashFlow,
      totalInflows: report.calculations.totalInflows,
      totalOutflows: report.calculations.totalOutflows,
      endBalance: report.calculations.endBalance,
      reserveRatio: (report.reserves.total / report.calculations.totalOutflows * 100).toFixed(2),
      trend: report.analysis.incomeTraend,
      riskLevel: report.analysis.riskLevel,
      recommendations: report.analysis.recommendations
    };
    
    res.json({ success: true, data: analysis });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST إضافة حركة دخول
router.post('/:reportId/inflows', authenticate, async (req, res) => {
  try {
    const { source, amount, description } = req.body;
    
    const report = await CashFlow.findOne({
      reportId: req.params.reportId,
      organizationId: req.user.organizationId
    });
    
    if (!report) {
      return res.status(404).json({ success: false, error: 'التقرير غير موجود' });
    }
    
    await report.addInflow(source, amount, description);
    
    res.json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST إضافة حركة خروج
router.post('/:reportId/outflows', authenticate, async (req, res) => {
  try {
    const { purpose, amount, description, dueDate } = req.body;
    
    const report = await CashFlow.findOne({
      reportId: req.params.reportId,
      organizationId: req.user.organizationId
    });
    
    if (!report) {
      return res.status(404).json({ success: false, error: 'التقرير غير موجود' });
    }
    
    await report.addOutflow(purpose, amount, description, new Date(dueDate));
    
    res.json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
