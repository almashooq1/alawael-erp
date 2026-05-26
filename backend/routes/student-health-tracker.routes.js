'use strict';
/**
 * Student Health Tracker Routes — متابعة الصحة والسلامة الجسدية للطلاب
 * ══════════════════════════════════════════════════════════════════════════
 * Health monitoring for students: vitals tracking, medication management,
 * health alerts, incident reports, and health history.
 *
 *   GET    /                       list health records (paginated)
 *   POST   /                       add health record/entry
 *   GET    /:beneficiaryId/profile  full health profile
 *   POST   /:beneficiaryId/vitals   record vitals measurement
 *   GET    /:beneficiaryId/vitals   vitals history
 *   GET    /:beneficiaryId/medications  medication list
 *   POST   /:beneficiaryId/medications  add medication
 *   PATCH  /:beneficiaryId/medications/:medId  update medication
 *   DELETE /:beneficiaryId/medications/:medId  discontinue medication
 *   GET    /alerts                 active health alerts
 *   POST   /incidents              report health incident
 *   GET    /incidents              list health incidents
 *   GET    /stats                  health tracker statistics
 */

const express = require('express');
const mongoose = require('mongoose');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac.v2.middleware');
const { requireBranchAccess } = require('../middleware/branchScope.middleware');
const { branchScopedBeneficiaryParam } = require('../middleware/assertBranchMatch');
const safeError = require('../utils/safeError');

const router = express.Router();
router.use(authenticate);
router.use(requireBranchAccess);
// W440: auto-enforce branch ownership on every :beneficiaryId param.
router.param('beneficiaryId', branchScopedBeneficiaryParam);

const safeModel = name => {
  try {
    return mongoose.model(name);
  } catch (_) {
    return null;
  }
};

// ── GET / ──────────────────────────────────────────────────────────────────
router.get(
  '/',
  requireRole('admin', 'manager', 'supervisor', 'clinician', 'doctor', 'nurse'),
  async (req, res) => {
    try {
      const Beneficiary = safeModel('Beneficiary');
      if (!Beneficiary) return res.json({ success: true, data: [], pagination: { total: 0 } });
      const { page = 1, limit = 20, hasAlerts } = req.query;
      const filter = { branchId: req.user.branchId };
      if (hasAlerts === 'true') filter['healthAlerts.0'] = { $exists: true };
      const skip = (Number(page) - 1) * Number(limit);
      const [data, total] = await Promise.all([
        Beneficiary.find(filter)
          .select('name fileNumber dateOfBirth healthAlerts lastVitalsAt')
          .sort({ 'name.first': 1 })
          .skip(skip)
          .limit(Number(limit))
          .lean(),
        Beneficiary.countDocuments(filter),
      ]);
      res.json({
        success: true,
        data,
        pagination: { total, page: Number(page), limit: Number(limit) },
      });
    } catch (err) {
      safeError(res, err, 'list health records');
    }
  }
);

// ── POST / ─────────────────────────────────────────────────────────────────
router.post(
  '/',
  requireRole('admin', 'manager', 'clinician', 'doctor', 'nurse'),
  async (req, res) => {
    try {
      const Beneficiary = safeModel('Beneficiary');
      if (!Beneficiary)
        return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
      const { beneficiaryId, type, data: healthData } = req.body;
      if (!beneficiaryId || !type)
        return res
          .status(400)
          .json({ success: false, message: 'beneficiaryId and type are required' });
      const update = {
        $push: {
          healthLog: { type, data: healthData, recordedBy: req.user._id, recordedAt: new Date() },
        },
      };
      const doc = await Beneficiary.findOneAndUpdate(
        { _id: beneficiaryId, branchId: req.user.branchId },
        update,
        { new: true }
      );
      if (!doc) return res.status(404).json({ success: false, message: 'Beneficiary not found' });
      res
        .status(201)
        .json({ success: true, data: { message: 'Health record added', beneficiaryId } });
    } catch (err) {
      safeError(res, err, 'add health record');
    }
  }
);

// ── GET /:beneficiaryId/profile ────────────────────────────────────────────
router.get(
  '/:beneficiaryId/profile',
  requireRole('admin', 'manager', 'clinician', 'doctor', 'nurse', 'supervisor'),
  async (req, res) => {
    try {
      const Beneficiary = safeModel('Beneficiary');
      if (!Beneficiary)
        return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
      const doc = await Beneficiary.findOne({
        _id: req.params.beneficiaryId,
        branchId: req.user.branchId,
      })
        .select(
          'name dateOfBirth gender bloodType allergies chronicConditions medications healthAlerts emergencyContact healthLog'
        )
        .lean();
      if (!doc) return res.status(404).json({ success: false, message: 'Beneficiary not found' });
      res.json({ success: true, data: doc });
    } catch (err) {
      safeError(res, err, 'get health profile');
    }
  }
);

// ── POST /:beneficiaryId/vitals ────────────────────────────────────────────
router.post(
  '/:beneficiaryId/vitals',
  requireRole('admin', 'manager', 'clinician', 'doctor', 'nurse'),
  async (req, res) => {
    try {
      const { weight, height, temperature, bloodPressure, heartRate, oxygenSaturation, notes } =
        req.body;
      const Beneficiary = safeModel('Beneficiary');
      if (!Beneficiary)
        return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
      const vitalsEntry = {
        type: 'vitals',
        data: { weight, height, temperature, bloodPressure, heartRate, oxygenSaturation },
        notes,
        recordedBy: req.user._id,
        recordedAt: new Date(),
      };
      const doc = await Beneficiary.findOneAndUpdate(
        { _id: req.params.beneficiaryId, branchId: req.user.branchId },
        { $push: { healthLog: vitalsEntry }, lastVitalsAt: new Date() },
        { new: true }
      );
      if (!doc) return res.status(404).json({ success: false, message: 'Beneficiary not found' });
      res.status(201).json({ success: true, data: vitalsEntry });
    } catch (err) {
      safeError(res, err, 'record vitals');
    }
  }
);

// ── GET /:beneficiaryId/vitals ─────────────────────────────────────────────
router.get(
  '/:beneficiaryId/vitals',
  requireRole('admin', 'manager', 'clinician', 'doctor', 'nurse', 'supervisor'),
  async (req, res) => {
    try {
      const Beneficiary = safeModel('Beneficiary');
      if (!Beneficiary)
        return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
      const doc = await Beneficiary.findOne({
        _id: req.params.beneficiaryId,
        branchId: req.user.branchId,
      })
        .select('healthLog')
        .lean();
      if (!doc) return res.status(404).json({ success: false, message: 'Beneficiary not found' });
      const vitals = (doc.healthLog || [])
        .filter(e => e.type === 'vitals')
        .sort((a, b) => new Date(b.recordedAt) - new Date(a.recordedAt));
      res.json({ success: true, data: vitals });
    } catch (err) {
      safeError(res, err, 'get vitals history');
    }
  }
);

// ── GET /:beneficiaryId/medications ───────────────────────────────────────
router.get(
  '/:beneficiaryId/medications',
  requireRole('admin', 'manager', 'clinician', 'doctor', 'nurse', 'supervisor'),
  async (req, res) => {
    try {
      const Beneficiary = safeModel('Beneficiary');
      if (!Beneficiary)
        return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
      const doc = await Beneficiary.findOne({
        _id: req.params.beneficiaryId,
        branchId: req.user.branchId,
      })
        .select('medications')
        .lean();
      if (!doc) return res.status(404).json({ success: false, message: 'Beneficiary not found' });
      const { active } = req.query;
      const meds =
        active === 'true'
          ? (doc.medications || []).filter(m => m.isActive !== false)
          : doc.medications || [];
      res.json({ success: true, data: meds });
    } catch (err) {
      safeError(res, err, 'get medications');
    }
  }
);

// ── POST /:beneficiaryId/medications ──────────────────────────────────────
router.post(
  '/:beneficiaryId/medications',
  requireRole('admin', 'manager', 'doctor', 'clinician'),
  async (req, res) => {
    try {
      const { name, dosage, frequency, route, prescribedBy, startDate, endDate, notes } = req.body;
      if (!name || !dosage)
        return res.status(400).json({ success: false, message: 'name and dosage are required' });
      const Beneficiary = safeModel('Beneficiary');
      if (!Beneficiary)
        return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
      const medEntry = {
        _id: new mongoose.Types.ObjectId(),
        name,
        dosage,
        frequency,
        route,
        prescribedBy,
        startDate,
        endDate,
        notes,
        addedBy: req.user._id,
        addedAt: new Date(),
        isActive: true,
      };
      const doc = await Beneficiary.findOneAndUpdate(
        { _id: req.params.beneficiaryId, branchId: req.user.branchId },
        { $push: { medications: medEntry } },
        { new: true }
      );
      if (!doc) return res.status(404).json({ success: false, message: 'Beneficiary not found' });
      res.status(201).json({ success: true, data: medEntry });
    } catch (err) {
      safeError(res, err, 'add medication');
    }
  }
);

// ── PATCH /:beneficiaryId/medications/:medId ───────────────────────────────
router.patch(
  '/:beneficiaryId/medications/:medId',
  requireRole('admin', 'manager', 'doctor', 'clinician'),
  async (req, res) => {
    try {
      const Beneficiary = safeModel('Beneficiary');
      if (!Beneficiary)
        return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
      const updateFields = {};
      Object.keys(req.body).forEach(k => {
        updateFields[`medications.$.${k}`] = req.body[k];
      });
      const doc = await Beneficiary.findOneAndUpdate(
        {
          _id: req.params.beneficiaryId,
          branchId: req.user.branchId,
          'medications._id': req.params.medId,
        },
        { $set: updateFields },
        { new: true }
      );
      if (!doc) return res.status(404).json({ success: false, message: 'Medication not found' });
      res.json({
        success: true,
        data: (doc.medications || []).find(m => String(m._id) === req.params.medId),
      });
    } catch (err) {
      safeError(res, err, 'update medication');
    }
  }
);

// ── DELETE /:beneficiaryId/medications/:medId ──────────────────────────────
router.delete(
  '/:beneficiaryId/medications/:medId',
  requireRole('admin', 'manager', 'doctor', 'clinician'),
  async (req, res) => {
    try {
      const Beneficiary = safeModel('Beneficiary');
      if (!Beneficiary)
        return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
      const doc = await Beneficiary.findOneAndUpdate(
        {
          _id: req.params.beneficiaryId,
          branchId: req.user.branchId,
          'medications._id': req.params.medId,
        },
        {
          $set: {
            'medications.$.isActive': false,
            'medications.$.discontinuedAt': new Date(),
            'medications.$.discontinuedBy': req.user._id,
          },
        },
        { new: true }
      );
      if (!doc) return res.status(404).json({ success: false, message: 'Medication not found' });
      res.json({ success: true, message: 'Medication discontinued' });
    } catch (err) {
      safeError(res, err, 'discontinue medication');
    }
  }
);

// ── GET /alerts ────────────────────────────────────────────────────────────
router.get(
  '/alerts',
  requireRole('admin', 'manager', 'clinician', 'doctor', 'nurse', 'supervisor'),
  async (req, res) => {
    try {
      const Beneficiary = safeModel('Beneficiary');
      if (!Beneficiary) return res.json({ success: true, data: [] });
      const data = await Beneficiary.find({
        branchId: req.user.branchId,
        'healthAlerts.0': { $exists: true },
      })
        .select('name fileNumber healthAlerts')
        .lean();
      res.json({ success: true, data });
    } catch (err) {
      safeError(res, err, 'health alerts');
    }
  }
);

// ── POST /incidents ────────────────────────────────────────────────────────
router.post(
  '/incidents',
  requireRole('admin', 'manager', 'clinician', 'doctor', 'nurse', 'supervisor'),
  async (req, res) => {
    try {
      const { beneficiaryId, incidentType, description, severity, actionTaken } = req.body;
      if (!beneficiaryId || !incidentType || !description)
        return res.status(400).json({
          success: false,
          message: 'beneficiaryId, incidentType, description are required',
        });
      const Beneficiary = safeModel('Beneficiary');
      if (!Beneficiary)
        return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
      const incident = {
        type: 'incident',
        data: { incidentType, severity, actionTaken },
        description,
        recordedBy: req.user._id,
        recordedAt: new Date(),
      };
      const doc = await Beneficiary.findOneAndUpdate(
        { _id: beneficiaryId, branchId: req.user.branchId },
        { $push: { healthLog: incident } },
        { new: true }
      );
      if (!doc) return res.status(404).json({ success: false, message: 'Beneficiary not found' });
      res.status(201).json({ success: true, data: incident });
    } catch (err) {
      safeError(res, err, 'report incident');
    }
  }
);

// ── GET /incidents ─────────────────────────────────────────────────────────
router.get(
  '/incidents',
  requireRole('admin', 'manager', 'supervisor', 'clinician', 'doctor', 'nurse'),
  async (req, res) => {
    try {
      const Beneficiary = safeModel('Beneficiary');
      if (!Beneficiary) return res.json({ success: true, data: [] });
      const raw = await Beneficiary.aggregate([
        { $match: { branchId: req.user.branchId } },
        { $unwind: '$healthLog' },
        { $match: { 'healthLog.type': 'incident' } },
        { $project: { beneficiaryName: '$name', incident: '$healthLog' } },
        { $sort: { 'incident.recordedAt': -1 } },
        { $limit: 100 },
      ]);
      res.json({ success: true, data: raw });
    } catch (err) {
      safeError(res, err, 'list incidents');
    }
  }
);

// ── GET /stats ─────────────────────────────────────────────────────────────
router.get('/stats', requireRole('admin', 'manager', 'supervisor'), async (req, res) => {
  try {
    const Beneficiary = safeModel('Beneficiary');
    if (!Beneficiary)
      return res.json({ success: true, data: { total: 0, withAlerts: 0, withMedications: 0 } });
    const base = { branchId: req.user.branchId };
    const [total, withAlerts, withMeds] = await Promise.all([
      Beneficiary.countDocuments(base),
      Beneficiary.countDocuments({ ...base, 'healthAlerts.0': { $exists: true } }),
      Beneficiary.countDocuments({ ...base, 'medications.0': { $exists: true } }),
    ]);
    res.json({ success: true, data: { total, withAlerts, withMedications: withMeds } });
  } catch (err) {
    safeError(res, err, 'health tracker stats');
  }
});

module.exports = router;
