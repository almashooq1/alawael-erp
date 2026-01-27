// API route for compliance risk scores and recommendations
import express from 'express';
import { getComplianceRiskScores } from '../modules/compliance-risk-ai';
import { rbac } from '../middleware/rbac';

const router = express.Router();

// GET /ai/compliance-risk-scores
router.get('/compliance-risk-scores', rbac(['admin', 'compliance-manager']), async (req, res) => {
  try {
    const days = req.query.days ? Number(req.query.days) : 30;
    const scores = await getComplianceRiskScores({ days });
    res.json(scores);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
