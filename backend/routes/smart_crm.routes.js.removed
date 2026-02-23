const express = require('express');
const router = express.Router();
const SmartCRMService = require('../services/smartCRM.service');

// Mock Auth
const mockAuth = (req, res, next) => next();

// GET /api/crm-smart/patients
router.get('/patients', mockAuth, (req, res) => {
  try {
    const data = SmartCRMService.getAllPatients();
    res.json({ success: true, count: data.length, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET /api/crm-smart/campaigns
router.get('/campaigns', mockAuth, (req, res) => {
  try {
    const data = SmartCRMService.getAllCampaigns();
    res.json({ success: true, count: data.length, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/crm-smart/campaigns/:id/run
router.post('/campaigns/:id/run', mockAuth, (req, res) => {
  try {
    const result = SmartCRMService.runCampaign(req.params.id);
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/crm-smart/engagement (simulate activity)
router.post('/engagement', mockAuth, (req, res) => {
  try {
    const { patientId, points, activity } = req.body;
    const result = SmartCRMService.updateEngagementScore(patientId, points, activity);
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;

