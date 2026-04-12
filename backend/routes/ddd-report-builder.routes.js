'use strict';
/**
 * ReportBuilder Routes
 * Auto-extracted from services/dddReportBuilder.js
 * 5 endpoints — Auth required on all
 */

const { Router } = require('express');
const router = Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

const { executeReport, getReportHistory, seedBuiltinReports } = require('../services/dddReportBuilder');
const { DDDReportDefinition } = require('../models/DddReportBuilder');

  router.get('/reports/definitions', authenticate, async (_req, res) => {
    try {
    const definitions = await DDDReportDefinition.find({ isActive: true })
    .sort({ category: 1, name: 1 })
    .lean();
    const builtins = BUILTIN_REPORTS.map(r => ({
    name: r.name,
    nameAr: r.nameAr,
    category: r.category,
    domain: r.domain,
    primaryModel: r.primaryModel,
    isBuiltin: true,
    }));
    res.json({ success: true, definitions, builtins });
    } catch (e) {
      safeError(res, e, 'report-builder');
    }
  });

  router.post('/reports/execute', authenticate, async (req, res) => {
    try {
    const { reportName, definitionId, filters, sort, limit, page, startDate, endDate } = req.body;
    let reportDef;
    if (definitionId) {
    reportDef = await DDDReportDefinition.findById(definitionId).lean();
    } else if (reportName) {
    // Try DB first, then builtin
    reportDef = await DDDReportDefinition.findOne({ name: reportName }).lean();
    if (!reportDef) {
    reportDef = BUILTIN_REPORTS.find(r => r.name === reportName || r.nameAr === reportName);
    }
    }
    if (!reportDef) {
    return res.status(404).json({ success: false, message: 'Report definition not found' });
    }
    const result = await executeReport(reportDef, {
    filters,
    sort,
    limit: parseInt(limit, 10),
    page: parseInt(page, 10),
    startDate,
    endDate,
    executedBy: req.user?._id,
    });
    res.json({ success: true, ...result });
    } catch (e) {
      safeError(res, e, 'report-builder');
    }
  });

  router.post('/reports/definitions', authenticate, async (req, res) => {
    try {
    const def = await DDDReportDefinition.create({
    ...req.body,
    createdBy: req.user?._id,
    isBuiltin: false,
    });
    res.status(201).json({ success: true, definition: def });
    } catch (e) {
      safeError(res, e, 'report-builder');
    }
  });

  router.get('/reports/history', authenticate, async (req, res) => {
    try {
    const data = await getReportHistory({
    limit: parseInt(req.query.limit, 10) || 50,
    page: parseInt(req.query.page, 10) || 1,
    });
    res.json({ success: true, ...data });
    } catch (e) {
      safeError(res, e, 'report-builder');
    }
  });

  router.post('/reports/seed', authenticate, async (_req, res) => {
    try {
    const created = await seedBuiltinReports();
    res.json({ success: true, created });
    } catch (e) {
      safeError(res, e, 'report-builder');
    }
  });

module.exports = router;
