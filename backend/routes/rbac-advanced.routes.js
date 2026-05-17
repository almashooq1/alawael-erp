'use strict';
/**
 * RBAC Advanced Routes — صلاحيات متقدمة (تفويض، مجموعات، قواعد ديناميكية)
 */

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { requireBranchAccess } = require('../middleware/branchScope.middleware');

router.use(authenticate);
router.use(requireBranchAccess);

// Role Groups
router.get('/groups', authorize('admin'), async (req, res) => {
  try {
    const RoleGroup = require('../models/RBAC/RoleGroup');
    const data = await RoleGroup.find().sort({ name: 1 }).lean();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/groups', authorize('admin'), async (req, res) => {
  try {
    const RoleGroup = require('../models/RBAC/RoleGroup');
    const group = await RoleGroup.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ success: true, data: group });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Temporary Role Delegation
router.get('/delegations', authorize('admin', 'hr_manager', 'manager'), async (req, res) => {
  try {
    const RoleDelegation = require('../models/RBAC/RoleDelegation');
    const { active } = req.query;
    const filter = active === 'true' ? { expiresAt: { $gt: new Date() } } : {};
    const data = await RoleDelegation.find(filter).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/delegations', authorize('admin', 'manager'), async (req, res) => {
  try {
    const RoleDelegation = require('../models/RBAC/RoleDelegation');
    const { delegateeId, roleId, expiresAt, reason } = req.body;
    if (!delegateeId || !roleId || !expiresAt) {
      return res
        .status(400)
        .json({ success: false, message: 'delegateeId, roleId, expiresAt are required' });
    }
    const delegation = await RoleDelegation.create({
      delegatorId: req.user._id,
      delegateeId,
      roleId,
      expiresAt,
      reason,
    });
    res.status(201).json({ success: true, data: delegation });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.delete('/delegations/:id', authorize('admin', 'manager'), async (req, res) => {
  try {
    const RoleDelegation = require('../models/RBAC/RoleDelegation');
    await RoleDelegation.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Delegation revoked' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Dynamic Rules
router.get('/rules', authorize('admin'), async (req, res) => {
  try {
    const RBACRule = require('../models/RBAC/RBACRule');
    const data = await RBACRule.find({ isActive: true }).sort({ priority: 1 }).lean();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/rules', authorize('admin'), async (req, res) => {
  try {
    const RBACRule = require('../models/RBAC/RBACRule');
    const rule = await RBACRule.create({ ...req.body, isActive: true, createdBy: req.user._id });
    res.status(201).json({ success: true, data: rule });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Check effective permissions for a user
router.get('/check', async (req, res) => {
  try {
    const { userId, module, action } = req.query;
    if (!userId || !module || !action) {
      return res.status(400).json({ success: false, message: 'userId, module, action required' });
    }
    // Simplified permission check — full implementation requires aggregating user roles + group roles + delegations
    const UserRole = require('../models/RBAC/UserRole');
    const assignments = await UserRole.find({ userId }).lean();
    res.json({
      success: true,
      data: { userId, module, action, hasPermission: assignments.length > 0 },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
