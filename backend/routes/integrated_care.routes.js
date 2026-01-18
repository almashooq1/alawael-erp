const express = require('express');
const router = express.Router();
const IntegratedCareService = require('../services/integrated_care.service');

// Mock Auth
const mockAuth = (req, res, next) => next();

// --- PLAN ENDPOINTS ---

router.post('/plans', mockAuth, async (req, res) => {
  try {
    const plan = await IntegratedCareService.createPlan(req.body);
    res.json({ success: true, data: plan });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get('/plans/student/:id', mockAuth, async (req, res) => {
  try {
    const plan = await IntegratedCareService.getPlanByStudent(req.params.id);
    res.json({ success: true, data: plan });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.put('/plans/:id', mockAuth, async (req, res) => {
  try {
    const plan = await IntegratedCareService.updatePlan(req.params.id, req.body);
    res.json({ success: true, data: plan });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// --- GROUP ENDPOINTS ---

router.post('/groups', mockAuth, async (req, res) => {
  try {
    const group = await IntegratedCareService.createGroup(req.body);
    res.json({ success: true, data: group });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/groups/:id/students', mockAuth, async (req, res) => {
  try {
    const group = await IntegratedCareService.addStudentToGroup(req.params.id, req.body.studentId);
    res.json({ success: true, data: group });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// --- SESSION ENDPOINTS ---

router.post('/sessions', mockAuth, async (req, res) => {
  try {
    const session = await IntegratedCareService.recordSession(req.body);
    res.json({ success: true, data: session });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get('/reports/student/:id', mockAuth, async (req, res) => {
  try {
    const report = await IntegratedCareService.generateProgressReport(req.params.id);
    res.json({ success: true, data: report });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
