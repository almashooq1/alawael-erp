const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

router.use(authenticate);

// GET /summary-systems
router.get('/summary-systems', async (req, res) => {
  try {
    const User = require('../models/User');
    const Employee = require('../models/Employee');
    const [users, employees] = await Promise.all([
      User.countDocuments(),
      Employee.countDocuments(),
    ]);
    res.json({ success: true, data: { totalUsers: users, totalEmployees: employees, activeModules: 12, systemStatus: 'operational' } });
  } catch (err) {
    safeError(res, err, 'Dashboard summary-systems error');
  }
});

// GET /top-kpis
router.get('/top-kpis', async (req, res) => {
  try {
    const KPI = require('../models/KPI');
const safeError = require('../utils/safeError');
    const data = await KPI.find().sort({ 'measurements.value': -1 }).limit(5).lean();
    res.json({ success: true, data });
  } catch (err) {
    safeError(res, err, 'Dashboard top-kpis error');
  }
});

module.exports = router;
