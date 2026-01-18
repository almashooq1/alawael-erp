const express = require('express');
const router = express.Router();
const SmartReportService = require('../services/smartReport.service');
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');

router.use(authenticateToken);

/**
 * @route POST /api/reports-smart/progress/generate
 * @desc Auto-generates a text/JSON structure for a Medical Report
 * @body { beneficiaryId, startDate, endDate }
 */
router.post('/progress/generate', authorizeRole(['THERAPIST', 'DOCTOR', 'CARE_MANAGER', 'ADMIN']), async (req, res) => {
  try {
    const { beneficiaryId, startDate, endDate } = req.body;
    if (!beneficiaryId || !startDate || !endDate) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const reportDraft = await SmartReportService.generateProgressReport(beneficiaryId, startDate, endDate, req.user.id);

    res.json({ success: true, data: reportDraft });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
