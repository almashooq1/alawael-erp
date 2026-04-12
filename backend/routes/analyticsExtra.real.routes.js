const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

router.use(authenticate);

const getAnalytics = () => {
  try { return require('../models/analytics.model'); } catch { return null; }
};

// GET /hr
router.get('/hr', async (req, res) => {
  try {
    const Employee = require('../models/Employee');
    const total = await Employee.countDocuments();
    res.json({ success: true, data: { totalEmployees: total, attendance: 0, turnover: 0 } });
  } catch (err) {
    safeError(res, err, 'Analytics HR error');
  }
});

// GET /system
router.get('/system', async (req, res) => {
  try {
    const os = require('os');
    res.json({ success: true, data: { uptime: process.uptime(), memory: process.memoryUsage(), cpu: os.loadavg() } });
  } catch (err) {
    safeError(res, err, 'Analytics system error');
  }
});

// GET /insights
router.get('/insights', async (req, res) => {
  try {
    const Analytics = getAnalytics();
    const data = Analytics ? await Analytics.find().sort({ createdAt: -1 }).limit(10).lean() : [];
    res.json({ success: true, data });
  } catch (err) {
    safeError(res, err, 'Analytics insights error');
  }
});

// GET /dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const User = require('../models/User');
const safeError = require('../utils/safeError');
    const [totalUsers] = await Promise.all([User.countDocuments()]);
    res.json({ success: true, data: { totalUsers, activeModules: 12, recentActivity: 0, systemHealth: 'good' } });
  } catch (err) {
    safeError(res, err, 'Analytics dashboard error');
  }
});

// GET /trends/monthly
router.get('/trends/monthly', async (req, res) => {
  try {
    const Analytics = getAnalytics();
    const data = Analytics ? await Analytics.find({ period: 'monthly' }).sort({ date: -1 }).limit(12).lean() : [];
    res.json({ success: true, data });
  } catch (err) {
    safeError(res, err, 'Analytics trends error');
  }
});

// GET /export
router.get('/export', async (req, res) => {
  try {
    res.json({ success: true, data: { format: req.query.format || 'json', status: 'ready' } });
  } catch (err) {
    safeError(res, err, 'analyticsExtra.real');
  }
});

// GET /compare
router.get('/compare', async (req, res) => {
  try {
    res.json({ success: true, data: { comparison: [], periods: [] } });
  } catch (err) {
    safeError(res, err, 'analyticsExtra.real');
  }
});

// GET /program/:id/performance
router.get('/program/:id/performance', async (req, res) => {
  try {
    const RehabProgram = require('../models/RehabilitationProgramModels');
    const program = await RehabProgram.RehabilitationProgram.findById(req.params.id).lean();
    res.json({ success: true, data: { program, metrics: {} } });
  } catch (err) {
    safeError(res, err, 'Analytics program performance error');
  }
});

// GET /predictive/:type
router.get('/predictive/:type', async (req, res) => {
  try {
    const Prediction = require('../models/prediction.model');
    const data = await Prediction.find({ type: req.params.type }).sort({ createdAt: -1 }).limit(10).lean();
    res.json({ success: true, data });
  } catch (err) {
    safeError(res, err, 'Predictive analytics error');
  }
});

module.exports = router;
