/**
 * نظام الأصول ERP - مسار الفروع
 */
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');

const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
// Authentication required for all branch routes
router.use(authenticate);
router.use(requireBranchAccess);
router.get('/', (_req, res) => res.json({ success: true, data: [], message: 'قائمة الفروع' }));
router.get('/:id', (req, res) =>
  res.json({ success: true, data: { id: req.params.id }, message: 'بيانات الفرع' })
);
router.post(
  '/',
  authorize(['admin', 'manager']),
  validate([body('name').optional().trim().notEmpty().withMessage('اسم الفرع مطلوب')]),
  (_req, res) => res.status(201).json({ success: true, message: 'تم إنشاء الفرع' })
);
router.put('/:id', authorize(['admin', 'manager']), (_req, res) =>
  res.json({ success: true, message: 'تم تحديث الفرع' })
);
router.delete('/:id', authorize(['admin', 'manager']), (_req, res) =>
  res.json({ success: true, message: 'تم حذف الفرع' })
);

module.exports = router;
