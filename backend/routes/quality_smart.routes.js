const express = require('express');
const router = express.Router();
const SmartQualityService = require('../services/smartQuality.service');
const ComplianceLog = require('../models/ComplianceLog');
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');

router.use(authenticateToken);

/**
 * @route POST /api/quality-smart/scan
 * @desc Force a manual system-wide Quality & Compliance Scan
 */
router.post('/scan', authorizeRole(['ADMIN', 'HR', 'CARE_MANAGER']), async (req, res) => {
  try {
    const result = await SmartQualityService.runFullComplianceScan(req.user.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route GET /api/quality-smart/dashboard
 * @desc Get Open Issues grouped by Domain
 */
router.get('/dashboard', authorizeRole(['ADMIN', 'HR', 'CARE_MANAGER']), async (req, res) => {
  try {
    const stats = await SmartQualityService.getStats();
    const criticalIssues = await ComplianceLog.find({ status: 'OPEN', severity: 'CRITICAL' }).limit(10);

    res.json({ success: true, stats, criticalIssues });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route PUT /api/quality-smart/resolve/:id
 * @desc Mark an issue as Resolved
 */
router.put('/resolve/:id', authorizeRole(['ADMIN', 'HR']), async (req, res) => {
  try {
    const log = await ComplianceLog.findById(req.params.id);
    if (!log) return res.status(404).json({ message: 'Log not found' });

    log.status = 'RESOLVED';
    log.resolvedBy = req.user.id;
    log.resolvedAt = new Date();
    await log.save();

    res.json({ success: true, message: 'Issue resolved' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

