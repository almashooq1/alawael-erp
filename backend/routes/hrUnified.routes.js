'use strict';
/**
 * HR Unified Routes — بوابة الموارد البشرية الموحدة
 * Single entry point aggregating HR operations
 */

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { requireBranchAccess } = require('../middleware/branchScope.middleware');

router.use(authenticate);
router.use(requireBranchAccess);

// HR Dashboard Overview
router.get('/dashboard', authorize('admin', 'hr_manager', 'manager'), async (req, res) => {
  try {
    const Employee = require('../models/HR/Employee');
    const [totalActive, newThisMonth, byDepartment, byJobType] = await Promise.all([
      Employee.countDocuments({ status: 'active' }),
      Employee.countDocuments({
        joinDate: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
      }),
      Employee.aggregate([
        { $match: { status: 'active' } },
        { $group: { _id: '$department', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Employee.aggregate([
        { $match: { status: 'active' } },
        { $group: { _id: '$jobType', count: { $sum: 1 } } },
      ]),
    ]);
    res.json({ success: true, data: { totalActive, newThisMonth, byDepartment, byJobType } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Employee Search
router.get('/employees/search', async (req, res) => {
  try {
    const Employee = require('../models/HR/Employee');
    const { q, department, status = 'active', page = 1, limit = 20 } = req.query;
    const filter = { status };
    if (q)
      filter.$or = [
        { firstName: new RegExp(q, 'i') },
        { lastName: new RegExp(q, 'i') },
        { employeeCode: new RegExp(q, 'i') },
      ];
    if (department) filter.department = department;
    const skip = (Math.max(1, +page) - 1) * +limit;
    const [data, total] = await Promise.all([
      Employee.find(filter)
        .select('firstName lastName employeeCode department position status')
        .skip(skip)
        .limit(+limit)
        .lean(),
      Employee.countDocuments(filter),
    ]);
    res.json({ success: true, data, pagination: { page: +page, limit: +limit, total } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// HR Reports
router.get('/reports/headcount', authorize('admin', 'hr_manager'), async (req, res) => {
  try {
    const Employee = require('../models/HR/Employee');
    const { groupBy = 'department' } = req.query;
    const data = await Employee.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: `$${groupBy}`, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/reports/turnover', authorize('admin', 'hr_manager'), async (req, res) => {
  try {
    const Employee = require('../models/HR/Employee');
    const { year = new Date().getFullYear() } = req.query;
    const start = new Date(+year, 0, 1);
    const end = new Date(+year, 11, 31);
    const [terminated, hired] = await Promise.all([
      Employee.countDocuments({ terminationDate: { $gte: start, $lte: end } }),
      Employee.countDocuments({ joinDate: { $gte: start, $lte: end } }),
    ]);
    res.json({ success: true, data: { year: +year, hired, terminated, net: hired - terminated } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// HR Policy Library
router.get('/policies', async (req, res) => {
  try {
    const HRPolicy = require('../models/HR/HRPolicy');
    const data = await HRPolicy.find({ status: 'active' }).sort({ category: 1 }).lean();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/policies', authorize('admin', 'hr_manager'), async (req, res) => {
  try {
    const HRPolicy = require('../models/HR/HRPolicy');
    const policy = await HRPolicy.create({
      ...req.body,
      status: 'active',
      createdBy: req.user._id,
    });
    res.status(201).json({ success: true, data: policy });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

module.exports = router;
