'use strict';
/**
 * ConfigManager Routes
 * Auto-extracted from services/dddConfigManager.js
 * 10 endpoints — Auth required on all
 */

const { Router } = require('express');
const router = Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

const { listConfigs, getConfigFull, setConfig, deleteConfig, getConfigVersions, rollbackConfig, seedDefaults, exportConfigs, importConfigs, getConfigDashboard } = require('../services/dddConfigManager');
const { validate } = require('../middleware/validate');
const v = require('../validations/config-manager.validation');

  router.get('/configs', authenticate, async (req, res) => {
    try {
    const configs = await listConfigs(req.query);
    res.json({ success: true, count: configs.length, configs });
    } catch (e) {
      safeError(res, e, 'config-manager');
    }
  });

  router.get('/configs/:key(*)', authenticate, async (req, res) => {
    try {
    const config = await getConfigFull(req.params.key, {
    userId: req.user?._id,
    branchId: req.headers['x-branch-id'],
    domain: req.query.domain,
    });
    if (!config) return res.status(404).json({ success: false, error: 'Config not found' });
    res.json({ success: true, config });
    } catch (e) {
      safeError(res, e, 'config-manager');
    }
  });

  router.put('/configs/:key(*)', authenticate, validate(v.updateConfig), async (req, res) => {
    try {
    const config = await setConfig(req.params.key, req.body.value, {
    ...req.body,
    changedBy: req.user?._id,
    });
    res.json({ success: true, config });
    } catch (e) {
      safeError(res, e, 'config-manager');
    }
  });

  router.delete('/configs/:key(*)', authenticate, async (req, res) => {
    try {
    await deleteConfig(req.params.key, req.query.scope, req.query.scopeId);
    res.json({ success: true, message: 'Config deleted' });
    } catch (e) {
      safeError(res, e, 'config-manager');
    }
  });

  router.get('/configs/:key(*)/versions', authenticate, async (req, res) => {
    try {
    const versions = await getConfigVersions(req.params.key);
    res.json({ success: true, count: versions.length, versions });
    } catch (e) {
      safeError(res, e, 'config-manager');
    }
  });

  router.post('/configs/:key(*)/rollback', authenticate, async (req, res) => {
    try {
    const config = await rollbackConfig(req.params.key, req.body.targetVersion, req.user?._id);
    res.json({ success: true, config });
    } catch (e) {
      safeError(res, e, 'config-manager');
    }
  });

  router.post('/configs-seed', authenticate, async (_req, res) => {
    try {
    const result = await seedDefaults();
    res.json({ success: true, ...result });
    } catch (e) {
      safeError(res, e, 'config-manager');
    }
  });

  router.get('/configs-export', authenticate, async (req, res) => {
    try {
    const data = await exportConfigs(req.query.scope);
    res.json({ success: true, count: data.length, configs: data });
    } catch (e) {
      safeError(res, e, 'config-manager');
    }
  });

  router.post('/configs-import', authenticate, async (req, res) => {
    try {
    const result = await importConfigs(req.body.configs, {
    changedBy: req.user?._id,
    scope: req.body.scope,
    scopeId: req.body.scopeId,
    });
    res.json({ success: true, ...result });
    } catch (e) {
      safeError(res, e, 'config-manager');
    }
  });

  router.get('/configs-dashboard', authenticate, async (_req, res) => {
    try {
    const dashboard = await getConfigDashboard();
    res.json({ success: true, ...dashboard });
    } catch (e) {
      safeError(res, e, 'config-manager');
    }
  });

module.exports = router;
