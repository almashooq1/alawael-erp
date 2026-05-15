'use strict';
/**
 * Employee Affairs Expanded Routes — شؤون الموظفين الموسعة
 * Covers contracts, certificates, disciplinary, benefits, end of service
 */

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { requireBranchAccess } = require('../middleware/branchScope.middleware');

router.use(authenticate);
router.use(requireBranchAccess);

// Employment Contracts
router.get('/contracts', authorize('admin', 'hr_manager'), async (req, res) => {
  try {
    const EmploymentContract = require('../models/HR/EmploymentContract');
    const { employeeId, status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (employeeId) filter.employeeId = employeeId;
    if (status) filter.status = status;
    const skip = (Math.max(1, +page) - 1) * +limit;
    const [data, total] = await Promise.all([
      EmploymentContract.find(filter).sort({ startDate: -1 }).skip(skip).limit(+limit).lean(),
      EmploymentContract.countDocuments(filter),
    ]);
    res.json({ success: true, data, pagination: { page: +page, limit: +limit, total } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/contracts', authorize('admin', 'hr_manager'), async (req, res) => {
  try {
    const EmploymentContract = require('../models/HR/EmploymentContract');
    const contract = await EmploymentContract.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ success: true, data: contract });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Service Certificates
router.get('/certificates', async (req, res) => {
  try {
    const ServiceCertificate = require('../models/HR/ServiceCertificate');
    const { employeeId, type } = req.query;
    const filter = {};
    if (employeeId) filter.employeeId = employeeId;
    if (type) filter.type = type;
    const data = await ServiceCertificate.find(filter).sort({ issuedAt: -1 }).lean();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/certificates', authorize('admin', 'hr_manager'), async (req, res) => {
  try {
    const ServiceCertificate = require('../models/HR/ServiceCertificate');
    const cert = await ServiceCertificate.create({
      ...req.body,
      issuedAt: new Date(),
      issuedBy: req.user._id,
    });
    res.status(201).json({ success: true, data: cert });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// End of Service
router.get('/end-of-service', authorize('admin', 'hr_manager'), async (req, res) => {
  try {
    const EndOfService = require('../models/HR/EndOfService');
    const { status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    const skip = (Math.max(1, +page) - 1) * +limit;
    const [data, total] = await Promise.all([
      EndOfService.find(filter).sort({ terminationDate: -1 }).skip(skip).limit(+limit).lean(),
      EndOfService.countDocuments(filter),
    ]);
    res.json({ success: true, data, pagination: { page: +page, limit: +limit, total } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/end-of-service', authorize('admin', 'hr_manager'), async (req, res) => {
  try {
    const EndOfService = require('../models/HR/EndOfService');
    const record = await EndOfService.create({ ...req.body, processedBy: req.user._id });
    res.status(201).json({ success: true, data: record });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

module.exports = router;
