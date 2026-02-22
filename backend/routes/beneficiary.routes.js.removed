const express = require('express');
const router = express.Router();
const BeneficiaryFile = require('../models/BeneficiaryFile');
const { authenticateToken } = require('../middleware/auth.middleware');
const { checkPermission } = require('../middleware/checkPermission');
const AuditService = require('../services/audit.service');

// Protect all
router.use(authenticateToken);

/**
 * @desc Get All Beneficiaries (with search)
 */
router.get('/', async (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { fileNumber: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const beneficiaries = await BeneficiaryFile.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await BeneficiaryFile.countDocuments(query);

    res.json({ success: true, count: beneficiaries.length, total, data: beneficiaries });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @desc Create New File
 */
router.post('/', async (req, res) => {
  try {
    // Auto-generate file number if not provided
    if (!req.body.fileNumber) {
      req.body.fileNumber = `PAT-${Date.now().toString().slice(-6)}`;
    }

    const beneficiary = new BeneficiaryFile(req.body);
    await beneficiary.save();

    await AuditService.log(req, 'CREATE_PATIENT_FILE', 'REHAB', { id: beneficiary.id, type: 'Beneficiary' });

    res.status(201).json({ success: true, data: beneficiary });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

/**
 * @desc Get Single File
 */
router.get('/:id', async (req, res) => {
  try {
    const beneficiary = await BeneficiaryFile.findById(req.params.id).populate('insurance.provider');

    if (!beneficiary) return res.status(404).json({ message: 'File not found' });
    res.json({ success: true, data: beneficiary });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @desc Add Medical Record
 */
router.post('/:id/medical-records', async (req, res) => {
  try {
    const beneficiary = await BeneficiaryFile.findById(req.params.id);
    if (!beneficiary) return res.status(404).json({ message: 'File not found' });

    const record = {
      ...req.body,
      doctor: req.user.id,
      date: new Date(),
    };

    beneficiary.medicalHistory.push(record);
    await beneficiary.save();

    await AuditService.log(req, 'ADD_MEDICAL_RECORD', 'CLINIC', { id: beneficiary.id }, null, 'SUCCESS');

    res.json({ success: true, data: beneficiary.medicalHistory });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;

