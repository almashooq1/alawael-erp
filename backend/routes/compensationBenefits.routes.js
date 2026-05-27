'use strict';
/**
 * Compensation & Benefits Routes — الرواتب والمزايا
 */

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { requireBranchAccess } = require('../middleware/branchScope.middleware');
const safeError = require('../utils/safeError');

router.use(authenticate);
router.use(requireBranchAccess);

// Salary Structures
router.get('/salary-structures', authorize('admin', 'hr_manager'), async (req, res) => {
  try {
    const SalaryStructure = require('../models/HR/SalaryStructure');
    const data = await SalaryStructure.find().sort({ name: 1 }).lean();
    res.json({ success: true, data });
  } catch (err) {
    return safeError(res, err, 'compensationBenefits');
  }
});

router.post('/salary-structures', authorize('admin', 'hr_manager'), async (req, res) => {
  try {
    const SalaryStructure = require('../models/HR/SalaryStructure');
    const structure = await SalaryStructure.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ success: true, data: structure });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Benefits Packages
router.get('/benefits-packages', async (req, res) => {
  try {
    const BenefitsPackage = require('../models/HR/BenefitsPackage');
    const data = await BenefitsPackage.find({ isActive: true }).lean();
    res.json({ success: true, data });
  } catch (err) {
    return safeError(res, err, 'compensationBenefits');
  }
});

router.post('/benefits-packages', authorize('admin', 'hr_manager'), async (req, res) => {
  try {
    const BenefitsPackage = require('../models/HR/BenefitsPackage');
    const pkg = await BenefitsPackage.create({
      ...req.body,
      isActive: true,
      createdBy: req.user._id,
    });
    res.status(201).json({ success: true, data: pkg });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Employee Benefits Enrollment
router.get('/enrollment/:employeeId', async (req, res) => {
  try {
    const BenefitsEnrollment = require('../models/HR/BenefitsEnrollment');
    const data = await BenefitsEnrollment.find({ employeeId: req.params.employeeId }).lean();
    res.json({ success: true, data });
  } catch (err) {
    return safeError(res, err, 'compensationBenefits');
  }
});

router.post('/enrollment', async (req, res) => {
  try {
    const BenefitsEnrollment = require('../models/HR/BenefitsEnrollment');
    const { employeeId, packageId } = req.body;
    if (!employeeId || !packageId)
      return res.status(400).json({ success: false, message: 'employeeId and packageId required' });
    const enrollment = await BenefitsEnrollment.create({
      employeeId,
      packageId,
      enrolledAt: new Date(),
      enrolledBy: req.user._id,
    });
    res.status(201).json({ success: true, data: enrollment });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Payroll Runs
router.get('/payroll-runs', authorize('admin', 'hr_manager', 'finance'), async (req, res) => {
  try {
    const PayrollRun = require('../models/HR/PayrollRun');
    const { year, month, status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (year) filter.year = +year;
    if (month) filter.month = +month;
    if (status) filter.status = status;
    const skip = (Math.max(1, +page) - 1) * +limit;
    const [data, total] = await Promise.all([
      PayrollRun.find(filter).sort({ year: -1, month: -1 }).skip(skip).limit(+limit).lean(),
      PayrollRun.countDocuments(filter),
    ]);
    res.json({ success: true, data, pagination: { page: +page, limit: +limit, total } });
  } catch (err) {
    return safeError(res, err, 'compensationBenefits');
  }
});

router.post('/payroll-runs', authorize('admin', 'hr_manager', 'finance'), async (req, res) => {
  try {
    const PayrollRun = require('../models/HR/PayrollRun');
    const run = await PayrollRun.create({ ...req.body, status: 'draft', createdBy: req.user._id });
    res.status(201).json({ success: true, data: run });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.patch('/payroll-runs/:id/approve', authorize('admin', 'hr_manager'), async (req, res) => {
  try {
    const PayrollRun = require('../models/HR/PayrollRun');
    const run = await PayrollRun.findByIdAndUpdate(
      req.params.id,
      { status: 'approved', approvedAt: new Date(), approvedBy: req.user._id },
      { returnDocument: 'after' }
    );
    if (!run) return res.status(404).json({ success: false, message: 'Payroll run not found' });
    res.json({ success: true, data: run });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

module.exports = router;
