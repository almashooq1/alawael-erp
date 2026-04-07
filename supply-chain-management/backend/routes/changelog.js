import express from 'express';
import ChangeLog from '../models/ChangeLog.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// جلب سجل التعديلات لكيان معين
router.get('/:entity/:entityId', authMiddleware, async (req, res) => {
  try {
    const { entity, entityId } = req.params;
    const logs = await ChangeLog.find({ entity, entityId }).sort({ date: -1 });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: 'خطأ في جلب سجل التعديلات' });
  }
});

export default router;
