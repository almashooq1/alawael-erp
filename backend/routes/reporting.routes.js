/**
 * Reporting Routes
 * مسارات API للتقارير المالية
 */

const express = require('express');
const router = express.Router();
const { FinancialReport, AuditLog } = require('../models');
const { authenticate, authorize } = require('../middleware/auth');

// GET أحدث التقارير
router.get('/latest', authenticate, async (req, res) => {
  try {
    const { reportType } = req.query;
    
    const report = await FinancialReport.getLatestReport(
      req.user.organizationId,
      reportType
    );
    
    res.json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET تقارير للفترة
router.get('/period', authenticate, async (req, res) => {
  try {
    const { startDate, endDate, reportType } = req.query;
    
    let filter = {
      organizationId: req.user.organizationId,
      'period.endDate': { $gte: new Date(startDate), $lte: new Date(endDate) },
      status: { $ne: 'archived' }
    };
    
    if (reportType) filter.reportType = reportType;
    
    const reports = await FinancialReport.find(filter).sort({ 'period.endDate': -1 });
    
    res.json({ success: true, data: reports });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST إنشاء تقرير مالي
router.post('/', authenticate, authorize(['finance_manager', 'accountant', 'admin']), async (req, res) => {
  try {
    const { reportType, startDate, endDate, balanceSheet, incomeStatement, cashFlowStatement, ratios } = req.body;
    
    const report = new FinancialReport({
      reportId: `report-${Date.now()}`,
      organizationId: req.user.organizationId,
      reportType,
      period: { startDate: new Date(startDate), endDate: new Date(endDate) },
      balanceSheet,
      incomeStatement,
      cashFlowStatement,
      ratios,
      createdBy: req.user._id
    });
    
    await report.save();
    
    await AuditLog.create({
      logId: `audit-${Date.now()}`,
      organizationId: req.user.organizationId,
      user: { userId: req.user._id, username: req.user.username, email: req.user.email, role: req.user.role },
      operation: 'create',
      entity: 'FinancialReport',
      entityId: report._id,
      status: 'success'
    });
    
    res.status(201).json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT تحديث التقرير
router.put('/:reportId', authenticate, authorize(['finance_manager', 'accountant', 'admin']), async (req, res) => {
  try {
    const report = await FinancialReport.findOneAndUpdate(
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
      entity: 'FinancialReport',
      entityId: report._id,
      status: 'success'
    });
    
    res.json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET المقارنة بين فترتين
router.get('/comparison', authenticate, async (req, res) => {
  try {
    const { period1End, period2End, reportType } = req.query;
    
    const report1 = await FinancialReport.findOne({
      organizationId: req.user.organizationId,
      reportType: reportType || 'income_statement',
      'period.endDate': new Date(period1End),
      status: { $ne: 'archived' }
    });
    
    const report2 = await FinancialReport.findOne({
      organizationId: req.user.organizationId,
      reportType: reportType || 'income_statement',
      'period.endDate': new Date(period2End),
      status: { $ne: 'archived' }
    });
    
    if (!report1 || !report2) {
      return res.status(404).json({ success: false, error: 'التقارير غير موجودة' });
    }
    
    res.json({
      success: true,
      data: {
        period1: report1,
        period2: report2
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST الموافقة على التقرير
router.post('/:reportId/approve', authenticate, authorize(['finance_director', 'cfo', 'admin']), async (req, res) => {
  try {
    const report = await FinancialReport.findOneAndUpdate(
      { reportId: req.params.reportId, organizationId: req.user.organizationId },
      { status: 'approved', approvedBy: req.user._id },
      { new: true }
    );
    
    if (!report) {
      return res.status(404).json({ success: false, error: 'التقرير غير موجود' });
    }
    
    await AuditLog.create({
      logId: `audit-${Date.now()}`,
      organizationId: req.user.organizationId,
      user: { userId: req.user._id, username: req.user.username, email: req.user.email, role: req.user.role },
      operation: 'approve',
      entity: 'FinancialReport',
      entityId: report._id,
      status: 'success'
    });
    
    res.json({ success: true, data: report, message: 'تم اعتماد التقرير بنجاح' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
