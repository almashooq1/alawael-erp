/**
 * Routes Index
 * تصدير جميع مسارات API
 */

const express = require('express');
const validationRoutes = require('./validation.routes');
const cashflowRoutes = require('./cashflow.routes');
const riskRoutes = require('./risk.routes');
const reportingRoutes = require('./reporting.routes');

function setupRoutes(app) {
  // استخدام المسارات
  app.use('/api/finance/validation', validationRoutes);
  app.use('/api/finance/cashflow', cashflowRoutes);
  app.use('/api/finance/risk', riskRoutes);
  app.use('/api/finance/reporting', reportingRoutes);
  
  // مسار الصحة (Health Check)
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
  });
  
  // مسار الإحصائيات الشاملة
  app.get('/api/finance/dashboard', async (req, res) => {
    try {
      const { FinancialReport, RiskAssessment, CashFlow } = require('../models');
      
      const latestReport = await FinancialReport.findOne({
        organizationId: req.user?.organizationId
      }).sort({ 'period.endDate': -1 });
      
      const criticalRisks = await RiskAssessment.find({
        organizationId: req.user?.organizationId,
        'assessment.severity': 'critical',
        status: { $ne: 'closed' }
      });
      
      const latestCashFlow = await CashFlow.findOne({
        organizationId: req.user?.organizationId
      }).sort({ createdAt: -1 });
      
      res.json({
        success: true,
        data: {
          latestFinancialReport: latestReport,
          criticalRisksCount: criticalRisks.length,
          latestCashFlowHealth: latestCashFlow?.analysis?.financialHealth || 'unknown',
          lastUpdate: new Date()
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
}

module.exports = setupRoutes;
