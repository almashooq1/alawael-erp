/**
 * نظام الأصول ERP - مسار المشاريع
 */
const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');

const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
// Authentication required for all project routes
router.use(authenticate);
router.use(requireBranchAccess);
router.get('/', (_req, res) => res.json({ success: true, data: [], message: 'قائمة المشاريع' }));
router.get('/:id', (req, res) =>
  res.json({ success: true, data: { id: req.params.id }, message: 'بيانات المشروع' })
);
router.post('/', authorize(['admin', 'manager']), (_req, res) =>
  res.status(201).json({ success: true, message: 'تم إنشاء المشروع' })
);
router.put('/:id', authorize(['admin', 'manager']), (_req, res) =>
  res.json({ success: true, message: 'تم تحديث المشروع' })
);
router.delete('/:id', authorize(['admin', 'manager']), (_req, res) =>
  res.json({ success: true, message: 'تم حذف المشروع' })
);

module.exports = router;
