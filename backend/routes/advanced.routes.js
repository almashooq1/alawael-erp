/**
 * Advanced Routes
 * مسارات API للأنظمة 8-10
 */

const express = require('express');
const router = express.Router();
const {
  FinancialService,
  ReportsService,
  SettingsService,
} = require('../services/advancedServices');

// ============================================
// FINANCIAL ROUTES (System 8) - 12 endpoints
// ============================================

router.post('/financial/invoice', async (req, res) => {
  try {
    const result = await FinancialService.addInvoice(req.body.beneficiaryId, req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/financial/payment', async (req, res) => {
  try {
    const result = await FinancialService.recordPayment(req.body.beneficiaryId, req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.get('/financial/summary/:beneficiaryId', async (req, res) => {
  try {
    const summary = await FinancialService.getFinancialSummary(req.params.beneficiaryId);
    res.json({ success: true, data: summary });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/financial/discount', async (req, res) => {
  try {
    const result = await FinancialService.applyDiscount(req.body.beneficiaryId, req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ============================================
// REPORTS ROUTES (System 9) - 12 endpoints
// ============================================

router.post('/reports/custom', async (req, res) => {
  try {
    const report = await ReportsService.createCustomReport(req.body.caseId, req.body);
    res.status(201).json({ success: true, data: report });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.get('/reports/:caseId', async (req, res) => {
  try {
    const reports = await ReportsService.getReports(req.params.caseId, req.query);
    res.json({ success: true, data: reports });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/reports/progress/:caseId', async (req, res) => {
  try {
    const report = await ReportsService.generateProgressReport(req.params.caseId);
    res.status(201).json({ success: true, data: report });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/reports/statistics/:caseId', async (req, res) => {
  try {
    const result = await ReportsService.updateStatistics(req.params.caseId, req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.get('/reports/export/:caseId/:reportId', async (req, res) => {
  try {
    const report = await ReportsService.exportReport(
      req.params.caseId,
      req.params.reportId,
      req.query.format
    );
    res.json({ success: true, data: report });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ============================================
// SETTINGS ROUTES (System 10) - 14 endpoints
// ============================================

router.get('/settings/:centerId', async (req, res) => {
  try {
    const settings = await SettingsService.getSettings(req.params.centerId);
    res.json({ success: true, data: settings });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.put('/settings/:centerId/center', async (req, res) => {
  try {
    const settings = await SettingsService.updateCenterSettings(req.params.centerId, req.body);
    res.json({ success: true, data: settings });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.get('/settings/:centerId/roles', async (req, res) => {
  try {
    const roles = await SettingsService.getRoles(req.params.centerId);
    res.json({ success: true, data: roles });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/settings/:centerId/role', async (req, res) => {
  try {
    const settings = await SettingsService.createRole(req.params.centerId, req.body);
    res.status(201).json({ success: true, data: settings });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.put('/settings/:centerId/role/:roleName', async (req, res) => {
  try {
    const settings = await SettingsService.updateRole(
      req.params.centerId,
      req.params.roleName,
      req.body.permissions
    );
    res.json({ success: true, data: settings });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.get('/settings/:centerId/audit', async (req, res) => {
  try {
    const logs = await SettingsService.getAuditLogs(req.params.centerId, req.query);
    res.json({ success: true, data: logs });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/settings/:centerId/audit', async (req, res) => {
  try {
    const result = await SettingsService.logAudit(req.params.centerId, req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.get('/settings/:centerId/system', async (req, res) => {
  try {
    const settings = await SettingsService.getSystemSettings(req.params.centerId);
    res.json({ success: true, data: settings });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.put('/settings/:centerId/system', async (req, res) => {
  try {
    const settings = await SettingsService.updateSystemSettings(req.params.centerId, req.body);
    res.json({ success: true, data: settings });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/settings/:centerId/backup', async (req, res) => {
  try {
    const result = await SettingsService.createBackup(req.params.centerId);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.get('/settings/:centerId/backups', async (req, res) => {
  try {
    const backups = await SettingsService.getBackups(req.params.centerId);
    res.json({ success: true, data: backups });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

module.exports = router;
