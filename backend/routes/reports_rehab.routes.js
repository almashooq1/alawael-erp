const express = require('express');
const router = express.Router();
const RehabReportService = require('../services/rehabReport.service');
const { authenticateToken } = require('../middleware/auth.middleware');

router.use(authenticateToken);

router.get('/improvement', async (req, res) => {
  try {
    const data = await RehabReportService.getImprovementRates();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/occupancy', async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString();
    const data = await RehabReportService.getRoomOccupancy(date);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
