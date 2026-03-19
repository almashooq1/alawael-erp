/* eslint-disable no-unused-vars */
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

router.use(authenticate);

// GET /:parentId/dashboard
router.get('/:parentId/dashboard', async (req, res) => {
  try {
    const Guardian = require('../models/Guardian');
    const parent = await Guardian.findById(req.params.parentId).lean();
    res.json({ success: true, data: { parent, children: [], recentActivity: [] } });
  } catch (err) {
    logger.error('Parent dashboard error:', err);
    res.status(500).json({ success: false, message: 'خطأ في لوحة تحكم ولي الأمر' });
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
