/**
 * zatca-credentials-admin.routes.js — admin CRUD for the ZatcaCredential
 * table. One credential row per branch holds the CSIDs, secrets, keys
 * and PIH counter that drive ZATCA Phase 2 invoice submission.
 *
 * Mount at /api/admin/zatca-credentials (via _registry.js dualMount).
 *
 * Endpoints:
 *   GET    /                  — list (sensitive fields redacted)
 *   GET    /:id               — single (sensitive fields redacted)
 *   POST   /                  — create (org info only — onboarding flow
 *                                 fills in keys/CSIDs)
 *   PATCH  /:id               — update (allow-list of org fields)
 *   POST   /:id/onboard       — proxy to ZATCA onboarding
 *   POST   /:id/production    — proxy to compliance→production swap
 *   DELETE /:id               — soft-disable (isActive=false)
 *   POST   /:id/restore       — re-enable
 *
 * RBAC: admin / superadmin / finance / accountant.
 *
 * Sensitive-field redaction:
 *   privateKey, certificate, complianceCsid, productionCsid,
 *   binarySecurityToken, secret, apiSecretHash, csr — NEVER returned via
 *   list/get/patch responses. They live only in the model and the
 *   onboarding flow uses them server-side. The UI only needs to know
 *   whether a credential is "configured" (computed via the model's
 *   `isConfigured` virtual).
 */

'use strict';

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateToken, requireRole } = require('../middleware/auth');

const ZatcaCredential = require('../models/zatca/ZatcaCredential');
const safeError = require('../utils/safeError');
const logger = require('../utils/logger');

router.use(authenticateToken);

const READ_ROLES = ['admin', 'superadmin', 'super_admin', 'manager', 'finance', 'accountant'];
const WRITE_ROLES = ['admin', 'superadmin', 'super_admin', 'finance'];

// Fields the admin UI is allowed to set/update directly.
// Everything not in this list either comes from the onboarding flow
// (CSIDs, keys) or is a counter that must never be touched manually.
const EDITABLE_FIELDS = [
  'branchId',
  'branchCode',
  'organizationName',
  'organizationNameAr',
  'vatNumber',
  'crNumber',
  'egsSerialNumber',
  'street',
  'buildingNumber',
  'city',
  'district',
  'postalCode',
  'isActive',
  'isProduction',
  'apiBaseUrl',
  'notes',
];

const SENSITIVE_FIELDS = [
  'privateKey',
  'publicKey',
  'certificate',
  'csr',
  'complianceCsid',
  'productionCsid',
  'binarySecurityToken',
  'secret',
  'apiSecretHash',
  'complianceRequestId',
  'productionRequestId',
];

function pickAllowed(body) {
  const out = {};
  for (const k of EDITABLE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(body || {}, k)) out[k] = body[k];
  }
  return out;
}

function redact(doc) {
  if (!doc) return doc;
  const obj = doc.toObject ? doc.toObject({ virtuals: true }) : { ...doc };
  // Compute the configured flag without leaking the secret. The schema
  // virtual depends on the actual fields, so when redacting a lean()
  // doc we recompute it from the boolean we still know.
  obj.isConfigured = !!(obj.binarySecurityToken && obj.secret);
  for (const f of SENSITIVE_FIELDS) {
    if (obj[f] !== undefined) obj[f] = obj[f] ? '[REDACTED]' : null;
  }
  return obj;
}

// ── GET / — list ─────────────────────────────────────────────────────────
router.get('/', requireRole(READ_ROLES), async (req, res) => {
  try {
    const { branchId, isActive, q, page = 1, limit = 25 } = req.query;
    const filter = {};
    if (branchId && mongoose.Types.ObjectId.isValid(branchId)) filter.branchId = branchId;
    if (isActive !== undefined && isActive !== '') filter.isActive = String(isActive) === 'true';
    if (q) {
      const rx = { $regex: String(q), $options: 'i' };
      filter.$or = [
        { branchCode: rx },
        { organizationName: rx },
        { organizationNameAr: rx },
        { vatNumber: rx },
        { crNumber: rx },
      ];
    }

    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.min(200, Math.max(1, parseInt(limit, 10) || 25));

    const [rows, total] = await Promise.all([
      ZatcaCredential.find(filter)
        .sort({ branchCode: 1 })
        .skip((p - 1) * l)
        .limit(l),
      ZatcaCredential.countDocuments(filter),
    ]);

    return res.json({ ok: true, page: p, limit: l, total, rows: rows.map(redact) });
  } catch (err) {
    return safeError(res, err, 'failed to list credentials', { shape: 'ok' });
  }
});

// ── GET /:id ─────────────────────────────────────────────────────────────
router.get('/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ ok: false, error: 'invalid_id' });
    }
    const row = await ZatcaCredential.findById(req.params.id);
    if (!row) return res.status(404).json({ ok: false, error: 'not_found' });
    return res.json({ ok: true, row: redact(row) });
  } catch (err) {
    return safeError(res, err, 'failed to fetch credential', { shape: 'ok' });
  }
});

// ── POST / — create ──────────────────────────────────────────────────────
router.post('/', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const body = pickAllowed(req.body || {});
    for (const f of ['branchId', 'branchCode']) {
      if (!body[f]) return res.status(400).json({ ok: false, error: `missing_field:${f}` });
    }
    if (!mongoose.Types.ObjectId.isValid(body.branchId)) {
      return res.status(400).json({ ok: false, error: 'invalid_branch_id' });
    }

    const existing = await ZatcaCredential.findOne({ branchId: body.branchId });
    if (existing) {
      return res.status(409).json({ ok: false, error: 'branch_already_has_credential' });
    }

    const row = await ZatcaCredential.create(body);
    logger.info('zatca-credential created', {
      id: String(row._id),
      branchCode: row.branchCode,
      actor: req.user?._id,
    });
    return res.status(201).json({ ok: true, row: redact(row) });
  } catch (err) {
    return safeError(res, err, 'failed to create credential', { shape: 'ok' });
  }
});

// ── PATCH /:id — update ──────────────────────────────────────────────────
router.patch('/:id', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ ok: false, error: 'invalid_id' });
    }
    const updates = pickAllowed(req.body || {});
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ ok: false, error: 'no_fields' });
    }
    // Ad-hoc rejection: the body must NEVER contain a sensitive field.
    // We already drop them via pickAllowed, but explicit rejection makes
    // the contract obvious + defends against schema drift in EDITABLE_FIELDS.
    for (const f of SENSITIVE_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(req.body || {}, f)) {
        return res.status(403).json({ ok: false, error: `sensitive_field_blocked:${f}` });
      }
    }

    const row = await ZatcaCredential.findById(req.params.id);
    if (!row) return res.status(404).json({ ok: false, error: 'not_found' });

    Object.assign(row, updates);
    await row.save();
    logger.info('zatca-credential updated', {
      id: String(row._id),
      fields: Object.keys(updates),
      actor: req.user?._id,
    });
    return res.json({ ok: true, row: redact(row) });
  } catch (err) {
    return safeError(res, err, 'failed to update credential', { shape: 'ok' });
  }
});

// ── DELETE /:id — soft-disable ───────────────────────────────────────────
router.delete('/:id', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ ok: false, error: 'invalid_id' });
    }
    const row = await ZatcaCredential.findById(req.params.id);
    if (!row) return res.status(404).json({ ok: false, error: 'not_found' });
    row.isActive = false;
    await row.save();
    return res.json({ ok: true, row: redact(row) });
  } catch (err) {
    return safeError(res, err, 'failed to disable credential', { shape: 'ok' });
  }
});

// ── POST /:id/restore ────────────────────────────────────────────────────
router.post('/:id/restore', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ ok: false, error: 'invalid_id' });
    }
    const row = await ZatcaCredential.findById(req.params.id);
    if (!row) return res.status(404).json({ ok: false, error: 'not_found' });
    row.isActive = true;
    await row.save();
    return res.json({ ok: true, row: redact(row) });
  } catch (err) {
    return safeError(res, err, 'failed to restore credential', { shape: 'ok' });
  }
});

// ── POST /:id/onboard — proxy to ZATCA Phase 2 onboarding ────────────────
//
// This endpoint exists so the admin UI can trigger onboarding without
// constructing the CSR payload itself — we already have the org fields
// in the credential row, so the proxy bundles them and forwards to the
// existing service. Returns whatever the service returns.
router.post('/:id/onboard', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ ok: false, error: 'invalid_id' });
    }
    const row = await ZatcaCredential.findById(req.params.id);
    if (!row) return res.status(404).json({ ok: false, error: 'not_found' });

    // The existing zatca-phase2.service exposes performOnboarding.
    const zatca = require('../services/zatca-phase2.service');
    if (typeof zatca.performOnboarding !== 'function') {
      return res.status(501).json({ ok: false, error: 'onboarding_unavailable' });
    }

    const otp = req.body?.otp;
    if (!otp) return res.status(400).json({ ok: false, error: 'missing_field:otp' });

    const result = await zatca.performOnboarding({ branchId: row.branchId, otp });
    logger.info('zatca-credential onboarded', {
      id: String(row._id),
      branchCode: row.branchCode,
      actor: req.user?._id,
    });

    // Re-fetch to return the latest persisted state (service mutated it).
    const fresh = await ZatcaCredential.findById(req.params.id);
    return res.json({ ok: true, row: redact(fresh), serviceResult: result });
  } catch (err) {
    return safeError(res, err, 'failed to onboard credential', { shape: 'ok' });
  }
});

// ── POST /:id/production — promote compliance → production CSID ──────────
router.post('/:id/production', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ ok: false, error: 'invalid_id' });
    }
    const row = await ZatcaCredential.findById(req.params.id);
    if (!row) return res.status(404).json({ ok: false, error: 'not_found' });

    const zatca = require('../services/zatca-phase2.service');
    if (typeof zatca.obtainProductionCsid !== 'function') {
      return res.status(501).json({ ok: false, error: 'production_csid_unavailable' });
    }

    const result = await zatca.obtainProductionCsid({ branchId: row.branchId });
    logger.info('zatca-credential promoted to production', {
      id: String(row._id),
      branchCode: row.branchCode,
      actor: req.user?._id,
    });

    const fresh = await ZatcaCredential.findById(req.params.id);
    return res.json({ ok: true, row: redact(fresh), serviceResult: result });
  } catch (err) {
    return safeError(res, err, 'failed to obtain production csid', { shape: 'ok' });
  }
});

module.exports = router;
module.exports.SENSITIVE_FIELDS = SENSITIVE_FIELDS;
module.exports.EDITABLE_FIELDS = EDITABLE_FIELDS;
