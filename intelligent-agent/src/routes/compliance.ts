// REST API لتقارير وتنبيهات الامتثال

import express, { Request, Response } from 'express';
import { requirePermission } from '../middleware/rbac';
import ComplianceEvent from '../models/compliance-event';
// استيراد middleware التحقق المركزي
const { sanitizeInput, commonValidations, handleValidationErrors } = require('../../../backend/middleware/requestValidation');

const router = express.Router();

// جلب أحدث أحداث الامتثال
router.get('/events', requirePermission('view-reports'), sanitizeInput, async (req, res) => {
  const events = await ComplianceEvent.find().sort({ timestamp: -1 }).limit(100);
  res.json(events);
});

// جلب حدث واحد بالمعرف
router.get('/events/:id',
  requirePermission('view-reports'),
  sanitizeInput,
  [commonValidations.mongoId('id'), handleValidationErrors],
  async (req: Request, res: Response) => {
    const event = await ComplianceEvent.findById(req.params.id);
    if (!event) return res.status(404).json({ error: 'Not found' });
    res.json(event);
  }
);

// إحصائيات الامتثال
router.get('/stats', requirePermission('view-reports'), sanitizeInput, async (req, res) => {
  const total = await ComplianceEvent.countDocuments();
  const byStatus = await ComplianceEvent.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);
  res.json({ total, byStatus });
});

// تنبيهات الامتثال (أحداث فشل أو تحذير فقط)
router.get('/alerts', requirePermission('view-reports'), sanitizeInput, async (req, res) => {
  const alerts = await ComplianceEvent.find({ status: { $in: ['fail', 'warning'] } }).sort({ timestamp: -1 }).limit(50);
  res.json(alerts);
});

// بحث بالأحداث حسب الحالة
router.get('/status/:status',
  requirePermission('view-reports'),
  sanitizeInput,
  [commonValidations.requiredString('status', 2, 20), handleValidationErrors],
  async (req: Request, res: Response) => {
    const events = await ComplianceEvent.find({ status: req.params.status }).sort({ timestamp: -1 }).limit(100);
    res.json(events);
  }
);

export default router;
