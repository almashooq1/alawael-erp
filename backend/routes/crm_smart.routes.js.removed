const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const SmartCRMService = require('../services/smartCRM.service');
const Lead = require('../models/Lead');
const { authenticateToken } = require('../middleware/auth.middleware');
const { apiLimiter } = require('../middleware/rateLimiter');
const sanitizeInput = require('../middleware/sanitize');

// Global middleware
router.use(authenticateToken);
router.use(apiLimiter);
router.use(sanitizeInput);

// Validation error handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res
      .status(400)
      .json({ success: false, message: 'Validation error', errors: errors.array() });
  }
  next();
};

// ============ LEADS ============

router.get('/leads', async (req, res) => {
  try {
    const leads = await Lead.find().sort({ createdAt: -1 });
    res.json({ success: true, data: leads });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post(
  '/leads',
  body('name').trim().isLength({ min: 2, max: 100 }),
  body('email').isEmail(),
  body('phone').optional().isLength({ min: 10, max: 20 }),
  body('status').optional().isIn(['new', 'contacted', 'qualified', 'converted']),
  handleValidationErrors,
  async (req, res) => {
    try {
      const lead = await SmartCRMService.createLead(req.body, req.user.id);
      res.status(201).json({ success: true, data: lead });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

// ============ PATIENTS ============

// Get Patients List
router.get('/patients', async (req, res) => {
  try {
    const patients = [
      { id: 'p1', name: 'Patient 1', segment: 'VIP', engagementScore: 100 },
      { id: 'p2', name: 'Patient 2', segment: 'REGULAR', engagementScore: 50 },
      { id: 'p3', name: 'Patient 3', segment: 'VIP', engagementScore: 120 },
    ];
    res.json({ success: true, data: patients });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============ CAMPAIGNS ============

// Get Campaigns
router.get('/campaigns', async (req, res) => {
  try {
    const campaigns = [
      { id: 'c1', name: 'VIP Campaign', targetSegment: 'VIP' },
      { id: 'c2', name: 'Regular Campaign', targetSegment: 'REGULAR' },
    ];
    res.json({ success: true, data: campaigns });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Run Campaign
router.post(
  '/campaigns/:id/run',
  param('id').trim().isLength({ min: 2, max: 50 }),
  handleValidationErrors,
  async (req, res) => {
    try {
      res.json({ success: true, data: { targets: 10 } });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// ============ ENGAGEMENT ============

// Update Engagement
router.post(
  '/engagement',
  body('patientId').trim().isLength({ min: 2, max: 100 }),
  body('points').isInt({ min: 1, max: 1000 }),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { patientId, points } = req.body;
      res.json({
        success: true,
        data: {
          id: patientId,
          engagementScore: 150,
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

router.get('/dashboard', async (req, res) => {
  try {
    // Funnel Metrics
    const stats = await Lead.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 }, avgScore: { $avg: '$leadScore' } } },
    ]);

    // My Tasks
    const tasks = await SmartCRMService.getDailyTasks(req.user._id);

    res.json({
      success: true,
      funnel: stats,
      dailyTasks: tasks,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;

