import express from 'express';
import { analyzeRootCause } from '../modules/ai-root-cause';
import { rbac } from '../middleware/rbac';

const router = express.Router();

// POST /ai/compliance-root-cause
router.post('/compliance-root-cause', rbac(['admin', 'compliance-manager']), async (req, res) => {
  try {
    const { event } = req.body;
    if (!event) return res.status(400).json({ error: 'event required' });
    const result = await analyzeRootCause(event);
    res.json({ result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
