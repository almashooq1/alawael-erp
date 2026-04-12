'use strict';
/**
 * DataMigration Routes
 * Auto-extracted from services/dddDataMigration.js
 * 6 endpoints — Auth required on all
 */

const { Router } = require('express');
const router = Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

const { getMigrationDashboard, runAllPending, runMigration, rollbackMigration } = require('../services/dddDataMigration');
const { DDDMigration } = require('../models/DddDataMigration');

  router.get('/migrations/dashboard', authenticate, async (_req, res) => {
    try {
    res.json({ success: true, ...(await getMigrationDashboard()) });
    } catch (e) {
      safeError(res, e, 'data-migration');
    }
  });

  router.get('/migrations', authenticate, async (req, res) => {
    try {
    const query = { isDeleted: { $ne: true } };
    if (req.query.status) query.status = req.query.status;
    if (req.query.domain) query.domain = req.query.domain;
    const list = await DDDMigration.find(query).sort({ order: 1 }).lean();
    res.json({ success: true, count: list.length, migrations: list });
    } catch (e) {
      safeError(res, e, 'data-migration');
    }
  });

  router.post('/migrations/run', authenticate, async (req, res) => {
    try {
    const result = await runAllPending({
    dryRun: req.body.dryRun === true,
    executedBy: req.user?._id,
    });
    res.json({ success: true, ...result });
    } catch (e) {
      safeError(res, e, 'data-migration');
    }
  });

  router.post('/migrations/:migrationId/run', authenticate, async (req, res) => {
    try {
    const migDef = BUILTIN_MIGRATIONS.find(m => m.migrationId === req.params.migrationId);
    if (!migDef) return res.status(404).json({ success: false, error: 'Migration not found' });
    const result = await runMigration(migDef, {
    dryRun: req.body.dryRun === true,
    executedBy: req.user?._id,
    });
    res.json({ success: true, ...result });
    } catch (e) {
      safeError(res, e, 'data-migration');
    }
  });

  router.post('/migrations/:migrationId/rollback', authenticate, async (req, res) => {
    try {
    const result = await rollbackMigration(req.params.migrationId, {
    rollbackBy: req.user?._id,
    });
    res.json({ success: true, ...result });
    } catch (e) {
      safeError(res, e, 'data-migration');
    }
  });

  router.post('/migrations/dry-run', authenticate, async (req, res) => {
    try {
    const result = await runAllPending({ dryRun: true, executedBy: req.user?._id });
    res.json({ success: true, ...result });
    } catch (e) {
      safeError(res, e, 'data-migration');
    }
  });

module.exports = router;
