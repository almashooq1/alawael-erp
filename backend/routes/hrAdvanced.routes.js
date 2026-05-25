'use strict';
/**
 * HR Advanced Routes — موارد بشرية متقدمة
 * Covers succession planning, competency frameworks, workforce analytics
 */

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { requireBranchAccess } = require('../middleware/branchScope.middleware');
const safeError = require('../utils/safeError');

router.use(authenticate);
router.use(requireBranchAccess);

// Workforce Analytics
router.get('/workforce/analytics', authorize('admin', 'hr_manager'), async (req, res) => {
  try {
    const Employee = require('../models/HR/Employee');
    const { department } = req.query;
    const match = {};
    if (department) match.department = department;
    const data = await Employee.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$department',
          headcount: { $sum: 1 },
          avgSalary: { $avg: '$salary' },
          avgTenureMonths: {
            $avg: {
              $divide: [{ $subtract: [new Date(), '$joinDate'] }, 1000 * 60 * 60 * 24 * 30],
            },
          },
        },
      },
      { $sort: { headcount: -1 } },
    ]);
    res.json({ success: true, data });
  } catch (err) {
    return safeError(res, err, 'hrAdvanced');
  }
});

// Succession Planning
router.get('/succession/plans', authorize('admin', 'hr_manager'), async (req, res) => {
  try {
    const SuccessionPlan = require('../models/HR/SuccessionPlan');
    const { page = 1, limit = 20, position, department } = req.query;
    const filter = {};
    if (position) filter.position = position;
    if (department) filter.department = department;
    const skip = (Math.max(1, +page) - 1) * +limit;
    const [data, total] = await Promise.all([
      SuccessionPlan.find(filter).sort({ priority: 1 }).skip(skip).limit(+limit).lean(),
      SuccessionPlan.countDocuments(filter),
    ]);
    res.json({ success: true, data, pagination: { page: +page, limit: +limit, total } });
  } catch (err) {
    return safeError(res, err, 'hrAdvanced');
  }
});

router.post('/succession/plans', authorize('admin', 'hr_manager'), async (req, res) => {
  try {
    const SuccessionPlan = require('../models/HR/SuccessionPlan');
    const plan = await SuccessionPlan.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ success: true, data: plan });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Competency Framework
router.get('/competencies', async (req, res) => {
  try {
    const Competency = require('../models/HR/Competency');
    const data = await Competency.find().sort({ category: 1, name: 1 }).lean();
    res.json({ success: true, data });
  } catch (err) {
    return safeError(res, err, 'hrAdvanced');
  }
});

router.post('/competencies', authorize('admin', 'hr_manager'), async (req, res) => {
  try {
    const Competency = require('../models/HR/Competency');
    const comp = await Competency.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ success: true, data: comp });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Employee Skills
router.get('/employees/:employeeId/skills', async (req, res) => {
  try {
    const EmployeeSkill = require('../models/HR/EmployeeSkill');
    const data = await EmployeeSkill.find({ employeeId: req.params.employeeId }).lean();
    res.json({ success: true, data });
  } catch (err) {
    return safeError(res, err, 'hrAdvanced');
  }
});

router.post('/employees/:employeeId/skills', async (req, res) => {
  try {
    const EmployeeSkill = require('../models/HR/EmployeeSkill');
    const skill = await EmployeeSkill.create({
      employeeId: req.params.employeeId,
      ...req.body,
      updatedBy: req.user._id,
    });
    res.status(201).json({ success: true, data: skill });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

module.exports = router;
