import express from 'express';
import ChangeLog from '../models/ChangeLog.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// جلب سجل التعديلات لكيان معين
router.get('/:entity/:entityId', authMiddleware, async (req, res) => {
  const { entity, entityId } = req.params;
  const logs = await ChangeLog.find({ entity, entityId }).sort({ date: -1 });
  res.json(logs);
});

export default router;
