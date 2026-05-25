'use strict';
/**
 * RBAC Admin Routes — إدارة الصلاحيات (مستوى النظام)
 */

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const safeError = require('../utils/safeError');

router.use(authenticate);
router.use(authorize('admin'));

// System-wide roles overview
router.get('/overview', async (req, res) => {
  try {
    const Role = require('../models/RBAC/Role');
    const Permission = require('../models/RBAC/Permission');
    const UserRole = require('../models/RBAC/UserRole');
    const [roles, permissions, assignments] = await Promise.all([
      Role.countDocuments(),
      Permission.countDocuments(),
      UserRole.countDocuments(),
    ]);
    res.json({ success: true, data: { roles, permissions, assignments } });
  } catch (err) {
    return safeError(res, err, 'rbac.admin');
  }
});

// Bulk permission assignment to role
router.patch('/roles/:roleId/permissions', async (req, res) => {
  try {
    const Role = require('../models/RBAC/Role');
    const { permissions } = req.body;
    if (!Array.isArray(permissions))
      return res.status(400).json({ success: false, message: 'permissions must be array' });
    const role = await Role.findByIdAndUpdate(
      req.params.roleId,
      { $set: { permissions }, updatedBy: req.user._id },
      { new: true }
    );
    if (!role) return res.status(404).json({ success: false, message: 'Role not found' });
    res.json({ success: true, data: role });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Copy role
router.post('/roles/:roleId/clone', async (req, res) => {
  try {
    const Role = require('../models/RBAC/Role');
    const source = await Role.findById(req.params.roleId).lean();
    if (!source) return res.status(404).json({ success: false, message: 'Role not found' });
    const { name, description } = req.body;
    const cloned = await Role.create({
      ...source,
      _id: undefined,
      name: name || `${source.name}_copy`,
      description,
      createdBy: req.user._id,
    });
    res.status(201).json({ success: true, data: cloned });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Audit log for role changes
router.get('/audit-log', async (req, res) => {
  try {
    const RBACAudit = require('../models/RBAC/RBACAudit');
    const { page = 1, limit = 50, from, to } = req.query;
    const filter = {};
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }
    const skip = (Math.max(1, +page) - 1) * +limit;
    const [data, total] = await Promise.all([
      RBACAudit.find(filter).sort({ createdAt: -1 }).skip(skip).limit(+limit).lean(),
      RBACAudit.countDocuments(filter),
    ]);
    res.json({ success: true, data, pagination: { page: +page, limit: +limit, total } });
  } catch (err) {
    return safeError(res, err, 'rbac.admin');
  }
});

module.exports = router;
