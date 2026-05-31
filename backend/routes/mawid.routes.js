'use strict';

/**
 * mawid.routes.js — Wave 687.
 *
 * Mawid (موعد) appointment-pull surface. Mounted via dualMountAuth at
 * /api/(v1/)?mawid. Mock-first (see mawidAdapter W687); live mode gated
 * behind MAWID_* env.
 *
 * Endpoints (3):
 *   GET  /status                         — integration mode/readiness probe
 *   GET  /appointments/:beneficiaryId    — pull upcoming Mawid appointments
 *   POST /pull                           — pull by explicit nationalId (body)
 *
 * Reads are branch-scoped via the beneficiary lookup; this surface never
 * persists PII (transport only) and follows the W269h scope doctrine
 * (uses branchFilter, never the always-undefined per-request branch field).
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateToken, requireRole } = require('../middleware/auth');

const mawidAdapter = require('../services/mawidAdapter');
const Beneficiary = require('../models/Beneficiary');
const safeError = require('../utils/safeError');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');

router.use(authenticateToken);
router.use(requireBranchAccess);

const READ_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'clinical_supervisor',
  'coordinator',
  'receptionist',
  'nurse',
  'physician',
];

function mapErrorToStatus(code) {
  switch (code) {
    case 'MAWID_INVALID_NATIONAL_ID':
      return 400;
    case 'MAWID_PATIENT_NOT_FOUND':
      return 404;
    case 'MAWID_LIVE_NOT_CONFIGURED':
      return 503;
    default:
      return 500;
  }
}

// ── GET /status ────────────────────────────────────────────────────────
router.get('/status', requireRole(READ_ROLES), async (req, res) => {
  try {
    const status = await mawidAdapter.getStatus();
    res.json({ success: true, ...status });
  } catch (err) {
    return safeError(res, err, 'mawid.status');
  }
});

// ── GET /appointments/:beneficiaryId ───────────────────────────────────
router.get('/appointments/:beneficiaryId', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.beneficiaryId)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    // Branch-scope: only resolve a beneficiary the caller may see.
    const benef = await Beneficiary.findOne({
      _id: req.params.beneficiaryId,
      ...branchFilter(req),
    })
      .select('nationalId national_id identityNumber firstName_ar lastName_ar')
      .lean();
    if (!benef) {
      return res.status(404).json({ success: false, message: 'المستفيد غير موجود' });
    }
    const nationalId = benef.nationalId || benef.national_id || benef.identityNumber || null;
    if (!nationalId) {
      return res
        .status(422)
        .json({ success: false, message: 'لا يوجد رقم هوية للمستفيد لاستعلام موعد' });
    }
    const result = await mawidAdapter.getAppointments(nationalId);
    res.json({ success: true, beneficiaryId: req.params.beneficiaryId, ...result });
  } catch (err) {
    if (err && err.code) {
      return res
        .status(mapErrorToStatus(err.code))
        .json({ success: false, code: err.code, message: err.message });
    }
    return safeError(res, err, 'mawid.appointments');
  }
});

// ── POST /pull — by explicit nationalId ────────────────────────────────
router.post('/pull', requireRole(READ_ROLES), async (req, res) => {
  try {
    const nationalId = String(req.body?.nationalId || '');
    const result = await mawidAdapter.getAppointments(nationalId);
    res.json({ success: true, ...result });
  } catch (err) {
    if (err && err.code) {
      return res
        .status(mapErrorToStatus(err.code))
        .json({ success: false, code: err.code, message: err.message });
    }
    return safeError(res, err, 'mawid.pull');
  }
});

module.exports = router;
