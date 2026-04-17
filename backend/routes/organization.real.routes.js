const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const logger = require('../utils/logger');
const Department = require('../models/Department');
const Position = require('../models/Position');
const { stripUpdateMeta } = require('../utils/sanitize');
const safeError = require('../utils/safeError');

router.use(authenticate);
router.use(requireBranchAccess);
// ═══════════════════════════════════════════════════════════════
//  STRUCTURE (الهيكل التنظيمي)
// ═══════════════════════════════════════════════════════════════

// GET /structure — Hierarchical org tree
router.get('/structure', async (req, res) => {
  try {
    // Try Mongoose org model first
    try {
      const Organization = require('../models/organization.model');
      const org = await Organization.findOne().lean();
      if (org) return res.json({ success: true, data: org });
    } catch (_) {
      /* model may not exist */
    }

    // Build tree from Department model
    const departments = await Department.find({ status: 'active' })
      .sort({ level: 1, order: 1 })
      .lean();

    if (departments.length > 0) {
      // Build hierarchical tree
      const map = {};
      departments.forEach(d => {
        map[d._id.toString()] = { ...d, children: [] };
      });
      const roots = [];
      departments.forEach(d => {
        const node = map[d._id.toString()];
        if (d.parent && map[d.parent.toString()]) {
          map[d.parent.toString()].children.push(node);
        } else {
          roots.push(node);
        }
      });
      return res.json({
        success: true,
        data: { name: 'مركز الأوائل للتأهيل', type: 'root', children: roots },
      });
    }

    // Fallback: branches
    try {
      const Branch = require('../models/Branch');
      const branches = await Branch.find().limit(200).lean();
      return res.json({ success: true, data: { name: 'مركز الأوائل للتأهيل', branches } });
    } catch (_) {
      return res.json({
        success: true,
        data: { name: 'مركز الأوائل للتأهيل', children: [] },
      });
    }
  } catch (err) {
    safeError(res, err, 'Organization structure error');
  }
});

// ═══════════════════════════════════════════════════════════════
//  DEPARTMENTS (الأقسام والإدارات)
// ═══════════════════════════════════════════════════════════════

// GET /departments
router.get('/departments', async (req, res) => {
  try {
    const { status, parent, page = 1, limit = 100 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (parent) filter.parent = parent;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [data, total] = await Promise.all([
      Department.find(filter)
        .sort({ level: 1, order: 1, name: 1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('parent', 'name')
        .lean(),
      Department.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data,
      pagination: { page: parseInt(page), limit: parseInt(limit), total },
    });
  } catch (err) {
    safeError(res, err, 'Departments list error');
  }
});

// POST /departments
router.post(
  '/departments',
  authorize(['admin', 'super_admin']),
  validate([
    body('name').trim().notEmpty().withMessage('اسم القسم مطلوب'),
    body('type')
      .optional()
      .isIn(['department', 'division', 'unit', 'section', 'branch'])
      .withMessage('نوع القسم غير صالح'),
    body('parent').optional().isMongoId().withMessage('معرف القسم الأب غير صالح'),
  ]),
  async (req, res) => {
    try {
      const dept = new Department({ ...req.body, createdBy: req.user._id || req.userId });
      // Auto-calculate level from parent
      if (dept.parent) {
        const parentDept = await Department.findById(dept.parent);
        if (parentDept) dept.level = parentDept.level + 1;
      }
      await dept.save();
      res.status(201).json({ success: true, data: dept, message: 'تم إنشاء القسم بنجاح' });
    } catch (err) {
      safeError(res, err, 'Department create error');
    }
  }
);

// PUT /departments/:id
router.put(
  '/departments/:id',
  authorize(['admin', 'super_admin']),
  validate([
    param('id').isMongoId().withMessage('معرف القسم غير صالح'),
    body('status')
      .optional()
      .isIn(['active', 'inactive', 'archived'])
      .withMessage('حالة غير صالحة'),
  ]),
  async (req, res) => {
    try {
      const dept = await Department.findByIdAndUpdate(req.params.id, stripUpdateMeta(req.body), {
        new: true,
        runValidators: true,
      });
      if (!dept) return res.status(404).json({ success: false, message: 'القسم غير موجود' });
      res.json({ success: true, data: dept, message: 'تم تحديث القسم بنجاح' });
    } catch (err) {
      safeError(res, err, 'Department update error');
    }
  }
);

// DELETE /departments/:id
router.delete('/departments/:id', authorize(['admin', 'super_admin']), async (req, res) => {
  try {
    // Check for children
    const children = await Department.countDocuments({ parent: req.params.id });
    if (children > 0) {
      return res.status(400).json({
        success: false,
        message: 'لا يمكن حذف قسم يحتوي على أقسام فرعية',
      });
    }
    const dept = await Department.findByIdAndDelete(req.params.id);
    if (!dept) return res.status(404).json({ success: false, message: 'القسم غير موجود' });
    res.json({ success: true, message: 'تم حذف القسم بنجاح' });
  } catch (err) {
    safeError(res, err, 'Department delete error');
  }
});

// ═══════════════════════════════════════════════════════════════
//  POSITIONS (المناصب الوظيفية)
// ═══════════════════════════════════════════════════════════════

// GET /positions
router.get('/positions', async (req, res) => {
  try {
    const { department, status, level, page = 1, limit = 100 } = req.query;
    const filter = {};
    if (department) filter.department = department;
    if (status) filter.status = status;
    if (level) filter.level = level;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [data, total] = await Promise.all([
      Position.find(filter)
        .sort({ level: 1, title: 1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('department', 'name')
        .lean(),
      Position.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data,
      pagination: { page: parseInt(page), limit: parseInt(limit), total },
    });
  } catch (err) {
    safeError(res, err, 'Positions list error');
  }
});

// POST /positions
router.post(
  '/positions',
  authorize(['admin', 'super_admin', 'manager']),
  validate([
    body('title').trim().notEmpty().withMessage('عنوان المنصب مطلوب'),
    body('department').notEmpty().withMessage('القسم مطلوب'),
    body('level')
      .optional()
      .isIn([
        'executive',
        'senior_management',
        'middle_management',
        'supervisor',
        'staff',
        'intern',
      ])
      .withMessage('مستوى المنصب غير صالح'),
  ]),
  async (req, res) => {
    try {
      const pos = new Position({ ...req.body, createdBy: req.user._id || req.userId });
      await pos.save();
      res.status(201).json({ success: true, data: pos, message: 'تم إنشاء المنصب بنجاح' });
    } catch (err) {
      safeError(res, err, 'Position create error');
    }
  }
);

// PUT /positions/:id
router.put(
  '/positions/:id',
  authorize(['admin', 'super_admin', 'manager']),
  validate([
    param('id').isMongoId().withMessage('معرف المنصب غير صالح'),
    body('department').optional().isMongoId().withMessage('معرف القسم غير صالح'),
    body('status')
      .optional()
      .isIn(['active', 'vacant', 'frozen', 'cancelled'])
      .withMessage('حالة غير صالحة'),
  ]),
  async (req, res) => {
    try {
      const pos = await Position.findByIdAndUpdate(req.params.id, stripUpdateMeta(req.body), {
        new: true,
        runValidators: true,
      });
      if (!pos) return res.status(404).json({ success: false, message: 'المنصب غير موجود' });
      res.json({ success: true, data: pos, message: 'تم تحديث المنصب بنجاح' });
    } catch (err) {
      safeError(res, err, 'Position update error');
    }
  }
);

// DELETE /positions/:id
router.delete('/positions/:id', authorize(['admin', 'super_admin']), async (req, res) => {
  try {
    const pos = await Position.findByIdAndDelete(req.params.id);
    if (!pos) return res.status(404).json({ success: false, message: 'المنصب غير موجود' });
    res.json({ success: true, message: 'تم حذف المنصب بنجاح' });
  } catch (err) {
    safeError(res, err, 'Position delete error');
  }
});

module.exports = router;
