import express from 'express';
import { requirePermission } from '../middleware/rbac';
import CompliancePolicy from '../models/compliance-policy';
// استيراد middleware التحقق المركزي
const { sanitizeInput, commonValidations, handleValidationErrors } = require('../../../backend/middleware/requestValidation');

const router = express.Router();

// قائمة السياسات
router.get('/', requirePermission('view-policies'), sanitizeInput, async (req, res) => {
  const policies = await CompliancePolicy.find().lean();
  res.json(policies);
});

// إضافة سياسة
router.post('/',
  requirePermission('manage-policies'),
  sanitizeInput,
  [
    commonValidations.requiredString('name', 2, 100),
    commonValidations.optionalString('description', 500),
    commonValidations.boolean('enabled'),
    handleValidationErrors
  ],
  async (req, res) => {
    try {
      const p = await CompliancePolicy.create(req.body);
      res.status(201).json(p);
    } catch (e) {
      const err = e as Error;
      res.status(400).json({ error: err.message });
    }
  }
);

// تعديل سياسة
router.put('/:id',
  requirePermission('manage-policies'),
  sanitizeInput,
  [
    commonValidations.mongoId('id'),
    commonValidations.optionalString('name', 100),
    commonValidations.optionalString('description', 500),
    commonValidations.boolean('enabled'),
    handleValidationErrors
  ],
  async (req, res) => {
    try {
      const p = await CompliancePolicy.findByIdAndUpdate(req.params.id, req.body, { new: true });
      if (!p) return res.status(404).json({ error: 'Not found' });
      res.json(p);
    } catch (e) {
      const err = e as Error;
      res.status(400).json({ error: err.message });
    }
  }
);

// حذف سياسة
router.delete('/:id',
  requirePermission('manage-policies'),
  sanitizeInput,
  [commonValidations.mongoId('id'), handleValidationErrors],
  async (req, res) => {
    try {
      const deleted = await CompliancePolicy.findByIdAndDelete(req.params.id);
      if (!deleted) return res.status(404).json({ error: 'Not found' });
      res.json({ ok: true });
    } catch (e) {
      const err = e as Error;
      res.status(400).json({ error: err.message });
    }
  }
);

export default router;
