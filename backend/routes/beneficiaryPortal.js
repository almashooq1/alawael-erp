'use strict';
/**
 * Beneficiary Portal Routes — بوابة المستفيد
 * Self-service portal for beneficiaries and their guardians
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

router.use(authenticate);

// Profile
router.get('/profile', async (req, res) => {
  try {
    const Beneficiary = require('../models/Beneficiary');
    const beneficiary = await Beneficiary.findOne({ userId: req.user._id }).lean();
    if (!beneficiary) return res.status(404).json({ success: false, message: 'Profile not found' });
    res.json({ success: true, data: beneficiary });
  } catch (err) {
    return safeError(res, err, 'beneficiaryPortal');
  }
});

router.put('/profile', async (req, res) => {
  try {
    const Beneficiary = require('../models/Beneficiary');
    const allowedFields = ['phone', 'address', 'emergencyContact', 'guardianInfo'];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }
    const beneficiary = await Beneficiary.findOneAndUpdate(
      { userId: req.user._id },
      { ...updates, updatedAt: new Date() },
      { returnDocument: 'after' }
    );
    if (!beneficiary) return res.status(404).json({ success: false, message: 'Profile not found' });
    res.json({ success: true, data: beneficiary });
  } catch (err) {
    return safeError(res, err, 'beneficiaryPortal');
  }
});

// Services
router.get('/services', async (req, res) => {
  try {
    const Beneficiary = require('../models/Beneficiary');
    const EpisodeOfCare = require('../models/EpisodeOfCare');
    const beneficiary = await Beneficiary.findOne({ userId: req.user._id }).lean();
    if (!beneficiary) return res.status(404).json({ success: false, message: 'Profile not found' });
    const episodes = await EpisodeOfCare.find({
      beneficiaryId: beneficiary._id,
      status: { $in: ['active', 'completed'] },
    })
      .sort({ startDate: -1 })
      .lean();
    res.json({ success: true, data: episodes });
  } catch (err) {
    return safeError(res, err, 'beneficiaryPortal');
  }
});

// Appointments
router.get('/appointments', async (req, res) => {
  try {
    const Beneficiary = require('../models/Beneficiary');
    const Session = require('../models/Session');
    const beneficiary = await Beneficiary.findOne({ userId: req.user._id }).lean();
    if (!beneficiary) return res.status(404).json({ success: false, message: 'Profile not found' });
    const now = new Date();
    const data = await Session.find({
      beneficiaryId: beneficiary._id,
      sessionDate: { $gte: now },
      status: 'scheduled',
    })
      .sort({ sessionDate: 1 })
      .lean();
    res.json({ success: true, data });
  } catch (err) {
    return safeError(res, err, 'beneficiaryPortal');
  }
});

// Service Requests
router.get('/service-requests', async (req, res) => {
  try {
    const Beneficiary = require('../models/Beneficiary');
    const ServiceRequest = require('../models/Portal/ServiceRequest');
    const beneficiary = await Beneficiary.findOne({ userId: req.user._id }).lean();
    if (!beneficiary) return res.status(404).json({ success: false, message: 'Profile not found' });
    const data = await ServiceRequest.find({ beneficiaryId: beneficiary._id })
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, data });
  } catch (err) {
    return safeError(res, err, 'beneficiaryPortal');
  }
});

router.post('/service-requests', async (req, res) => {
  try {
    const Beneficiary = require('../models/Beneficiary');
    const ServiceRequest = require('../models/Portal/ServiceRequest');
    const beneficiary = await Beneficiary.findOne({ userId: req.user._id }).lean();
    if (!beneficiary) return res.status(404).json({ success: false, message: 'Profile not found' });
    const request = await ServiceRequest.create({
      ...req.body,
      beneficiaryId: beneficiary._id,
      requestedBy: req.user._id,
      status: 'pending',
    });
    res.status(201).json({ success: true, data: request });
  } catch (err) {
    return safeError(res, err, 'beneficiaryPortal');
  }
});

// Documents
router.get('/documents', async (req, res) => {
  try {
    const Beneficiary = require('../models/Beneficiary');
    const Document = require('../models/Document');
    const beneficiary = await Beneficiary.findOne({ userId: req.user._id }).lean();
    if (!beneficiary) return res.status(404).json({ success: false, message: 'Profile not found' });
    const data = await Document.find({ beneficiaryId: beneficiary._id }).lean();
    res.json({ success: true, data });
  } catch (err) {
    return safeError(res, err, 'beneficiaryPortal');
  }
});

module.exports = router;
