'use strict';
/**
 * RBAC Routes — صلاحيات التحكم في الوصول
 */

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { requireBranchAccess } = require('../middleware/branchScope.middleware');

router.use(authenticate);
router.use(requireBranchAccess);

// List all roles
router.get('/roles', authorize('admin', 'hr_manager'), async (req, res) => {
  try {
    const Role = require('../models/RBAC/Role');
    const data = await Role.find().sort({ name: 1 }).lean();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/roles', authorize('admin'), async (req, res) => {
  try {
    const Role = require('../models/RBAC/Role');
    const role = await Role.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ success: true, data: role });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/roles/:id', authorize('admin', 'hr_manager'), async (req, res) => {
  try {
    const Role = require('../models/RBAC/Role');
    const role = await Role.findById(req.params.id).lean();
    if (!role) return res.status(404).json({ success: false, message: 'Role not found' });
    res.json({ success: true, data: role });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/roles/:id', authorize('admin'), async (req, res) => {
  try {
    const Role = require('../models/RBAC/Role');
    const role = await Role.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!role) return res.status(404).json({ success: false, message: 'Role not found' });
    res.json({ success: true, data: role });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.delete('/roles/:id', authorize('admin'), async (req, res) => {
  try {
    const Role = require('../models/RBAC/Role');
    await Role.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Role deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Permissions
router.get('/permissions', authorize('admin'), async (req, res) => {
  try {
    const Permission = require('../models/RBAC/Permission');
    const data = await Permission.find().sort({ module: 1, action: 1 }).lean();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// User role assignments
router.get('/users/:userId/roles', authorize('admin', 'hr_manager'), async (req, res) => {
  try {
    const UserRole = require('../models/RBAC/UserRole');
    const data = await UserRole.find({ userId: req.params.userId }).lean();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/users/:userId/roles', authorize('admin'), async (req, res) => {
  try {
    const UserRole = require('../models/RBAC/UserRole');
    const assignment = await UserRole.create({
      userId: req.params.userId,
      ...req.body,
      assignedBy: req.user._id,
    });
    res.status(201).json({ success: true, data: assignment });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

module.exports = router;
