'use strict';
/**
 * TenantManager Routes
 * Auto-extracted from services/dddTenantManager.js
 * 11 endpoints — Auth required on all
 */

const { Router } = require('express');
const router = Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

const { createBranch, listBranches, getBranch, updateBranch, getBranchHierarchy, getBranchStats, grantAccess, revokeAccess, getUserBranches, getTenantDashboard } = require('../services/dddTenantManager');

  router.post('/tenants/branches', authenticate, async (req, res) => {
    try {
    const branch = await createBranch(req.body);
    res.status(201).json({ success: true, branch });
    } catch (e) {
      safeError(res, e, 'tenant-manager');
    }
  });

  router.get('/tenants/branches', authenticate, async (req, res) => {
    try {
    const branches = await listBranches(req.query);
    res.json({ success: true, count: branches.length, branches });
    } catch (e) {
      safeError(res, e, 'tenant-manager');
    }
  });

  router.get('/tenants/branches/:id', authenticate, async (req, res) => {
    try {
    const branch = await getBranch(req.params.id);
    if (!branch) return res.status(404).json({ success: false, error: 'Branch not found' });
    res.json({ success: true, branch });
    } catch (e) {
      safeError(res, e, 'tenant-manager');
    }
  });

  router.put('/tenants/branches/:id', authenticate, async (req, res) => {
    try {
    const branch = await updateBranch(req.params.id, req.body);
    res.json({ success: true, branch });
    } catch (e) {
      safeError(res, e, 'tenant-manager');
    }
  });

  router.get('/tenants/branches/:id/hierarchy', authenticate, async (req, res) => {
    try {
    const tree = await getBranchHierarchy(req.params.id);
    res.json({ success: true, hierarchy: tree });
    } catch (e) {
      safeError(res, e, 'tenant-manager');
    }
  });

  router.get('/tenants/branches/:id/stats', authenticate, async (req, res) => {
    try {
    const stats = await getBranchStats(req.params.id);
    res.json({ success: true, ...stats });
    } catch (e) {
      safeError(res, e, 'tenant-manager');
    }
  });

  router.post('/tenants/access', authenticate, async (req, res) => {
    try {
    const { userId, branchId, role, ...opts } = req.body;
    const access = await grantAccess(userId, branchId, role, opts);
    res.status(201).json({ success: true, access });
    } catch (e) {
      safeError(res, e, 'tenant-manager');
    }
  });

  router.delete('/tenants/access', authenticate, async (req, res) => {
    try {
    const { userId, branchId } = req.body;
    const access = await revokeAccess(userId, branchId);
    res.json({ success: true, access });
    } catch (e) {
      safeError(res, e, 'tenant-manager');
    }
  });

  router.get('/tenants/user/:userId/branches', authenticate, async (req, res) => {
    try {
    const branches = await getUserBranches(req.params.userId);
    res.json({ success: true, count: branches.length, branches });
    } catch (e) {
      safeError(res, e, 'tenant-manager');
    }
  });

  router.get('/tenants/dashboard', authenticate, async (_req, res) => {
    try {
    const dashboard = await getTenantDashboard();
    res.json({ success: true, ...dashboard });
    } catch (e) {
      safeError(res, e, 'tenant-manager');
    }
  });

  router.get('/tenants/scoped-models', authenticate, async (_req, res) => {
    try {
      res.json({ success: true });
    } catch (e) {
      safeError(res, e, 'tenant-manager');
    }
  });

module.exports = router;
