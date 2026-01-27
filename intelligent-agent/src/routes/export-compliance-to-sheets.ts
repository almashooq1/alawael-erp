// Route to export compliance events to Google Sheets
import express from 'express';
import { exportComplianceEventsToGoogleSheets } from '../modules/export-compliance-to-sheets';
import { rbac } from '../middleware/rbac';

const router = express.Router();

// POST /export/compliance-to-sheets
router.post('/compliance-to-sheets', rbac(['admin', 'compliance-manager']), async (req, res) => {
  const { userId, sheetId, range } = req.body;
  if (!userId || !sheetId) return res.status(400).json({ error: 'userId and sheetId required' });
  try {
    const count = await exportComplianceEventsToGoogleSheets({ userId, sheetId, range });
    res.json({ success: true, exported: count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
