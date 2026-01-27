// Route to export data to an external webhook
import express from 'express';
import { exportDataToWebhook } from '../modules/export-to-webhook';
import { rbac } from '../middleware/rbac';

const router = express.Router();

// POST /export/webhook
router.post('/webhook', rbac(['admin', 'integration-manager']), async (req, res) => {
  const { userId, webhookUrl, payload, headers, eventType } = req.body;
  if (!webhookUrl || !payload) return res.status(400).json({ error: 'webhookUrl and payload required' });
  try {
    const status = await exportDataToWebhook({ userId, webhookUrl, payload, headers, eventType });
    res.json({ success: true, status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
