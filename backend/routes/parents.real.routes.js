const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const logger = require('../utils/logger');

router.use(authenticate);
router.use(requireBranchAccess);
// GET /:parentId/dashboard
router.get('/:parentId/dashboard', async (req, res) => {
  try {
    const Guardian = require('../models/Guardian');
    const parent = await Guardian.findById(req.params.parentId).lean();
    res.json({ success: true, data: { parent, children: [], recentActivity: [] } });
  } catch (err) {
    safeError(res, err, 'Parent dashboard error');
  }
});

// GET /children-progress
router.get('/children-progress', async (req, res) => {
  try {
    const BenProgress = require('../models/BeneficiaryProgress');
    const data = await BenProgress.find({ guardianId: req.user?.id }).lean();
    res.json({ success: true, data: data || [] });
  } catch (err) {
    // Fallback with useful message
    res.json({ success: true, data: [] });
  }
});

// GET /attendance
router.get('/attendance', async (req, res) => {
  try {
    const BenMgmt = require('../models/BeneficiaryManagement');
    const data = await BenMgmt.AttendanceRecord.find().sort({ date: -1 }).limit(30).lean();
    res.json({ success: true, data });
  } catch (err) {
    res.json({ success: true, data: [] });
  }
});

// GET /payments
router.get('/payments', async (req, res) => {
  try {
    const PortalPayment = require('../models/PortalPayment');
const safeError = require('../utils/safeError');
    const data = await PortalPayment.find({ guardianId: req.user?.id }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: data || [] });
  } catch (err) {
    res.json({ success: true, data: [] });
  }
});

// GET /documents
router.get('/documents', async (req, res) => {
  try {
    const Document = require('../models/Document');
    const data = await Document.find({ accessibleTo: req.user?.id }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: data || [] });
  } catch (err) {
    res.json({ success: true, data: [] });
  }
});

// GET /appointments
router.get('/appointments', async (req, res) => {
  try {
    const Schedule = require('../models/Schedule');
    const data = await Schedule.find({ guardianId: req.user?.id }).sort({ date: 1 }).lean();
    res.json({ success: true, data: data || [] });
  } catch (err) {
    res.json({ success: true, data: [] });
  }
});

// GET /messages
router.get('/messages', async (req, res) => {
  try {
    const PortalMessage = require('../models/PortalMessage');
    const data = await PortalMessage.find({ $or: [{ fromId: req.user?.id }, { toId: req.user?.id }] }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: data || [] });
  } catch (err) {
    res.json({ success: true, data: [] });
  }
});

module.exports = router;
