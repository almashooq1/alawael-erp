/**
 * insurance-tariffs-admin.routes.js — admin CRUD for the InsuranceTariff
 * table that drives automatic price resolution in the session→claim
 * bridge (see services/insuranceTariffs.js).
 *
 * Mount at /api/admin/insurance-tariffs (via _registry.js dualMount).
 *
 * Endpoints:
 *   GET    /            — list + filters (provider, cptCode, isActive)
 *   GET    /:id         — single row
 *   POST   /            — create
 *   PATCH  /:id         — update
 *   DELETE /:id         — soft-disable (sets isActive=false; keeps history)
 *   POST   /:id/restore — re-enable a soft-disabled row
 *
 * RBAC: finance / insurance_officer / admin / superadmin / manager.
 *
 * Why soft-delete: tariffs are referenced by historical claims via
 * `priceSource = tariff:<id>`. Hard-deleting would lose that audit trail.
 * `isActive: false` removes the row from lookup but keeps it for reports.
 */

'use strict';

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateToken, requireRole } = require('../middleware/auth');

const InsuranceTariff = require('../models/InsuranceTariff');
const safeError = require('../utils/safeError');
const logger = require('../utils/logger');

router.use(authenticateToken);

const READ_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'finance',
  'accountant',
  'insurance_officer',
];
const WRITE_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'finance',
  'insurance_officer',
];

const ALLOWED_UPDATE_FIELDS = [
  'provider',
  'providerId',
  'cptCode',
  'unitPrice',
  'currency',
  'effectiveFrom',
  'effectiveTo',
  'notes',
  'isActive',
];

function pickAllowed(body) {
  const out = {};
  for (const k of ALLOWED_UPDATE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(body || {}, k)) out[k] = body[k];
  }
  return out;
}

// ── GET / — list ─────────────────────────────────────────────────────────
router.get('/', requireRole(READ_ROLES), async (req, res) => {
  try {
    const { provider, cptCode, isActive, q, page = 1, limit = 25 } = req.query;
    const filter = {};
    if (provider) filter.provider = { $regex: String(provider), $options: 'i' };
    if (cptCode) filter.cptCode = String(cptCode).trim();
    if (isActive !== undefined && isActive !== '') {
      filter.isActive = String(isActive) === 'true';
    }
    if (q) {
      const rx = { $regex: String(q), $options: 'i' };
      filter.$or = [{ provider: rx }, { providerId: rx }, { cptCode: rx }, { notes: rx }];
    }

    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.min(200, Math.max(1, parseInt(limit, 10) || 25));

    const [rows, total] = await Promise.all([
      InsuranceTariff.find(filter)
        .sort({ provider: 1, cptCode: 1, effectiveFrom: -1 })
        .skip((p - 1) * l)
        .limit(l)
        .lean(),
      InsuranceTariff.countDocuments(filter),
    ]);

    return res.json({ ok: true, page: p, limit: l, total, rows });
  } catch (err) {
    return safeError(res, err, 'failed to list tariffs', { shape: 'ok' });
  }
});

// ── GET /:id ─────────────────────────────────────────────────────────────
router.get('/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ ok: false, error: 'invalid_id' });
    }
    const row = await InsuranceTariff.findById(req.params.id).lean();
    if (!row) return res.status(404).json({ ok: false, error: 'not_found' });
    return res.json({ ok: true, row });
  } catch (err) {
    return safeError(res, err, 'failed to fetch tariff', { shape: 'ok' });
  }
});

// ── POST / — create ──────────────────────────────────────────────────────
router.post('/', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const body = pickAllowed(req.body || {});

    // Required fields
    for (const f of ['provider', 'cptCode', 'unitPrice']) {
      if (body[f] === undefined || body[f] === null || body[f] === '') {
        return res.status(400).json({ ok: false, error: `missing_field:${f}` });
      }
    }
    if (!Number.isFinite(Number(body.unitPrice)) || Number(body.unitPrice) < 0) {
      return res.status(400).json({ ok: false, error: 'invalid_unit_price' });
    }

    body.createdBy = req.user?._id;
    const row = await InsuranceTariff.create(body);

    logger.info('insurance-tariff created', {
      id: String(row._id),
      provider: row.provider,
      cptCode: row.cptCode,
      unitPrice: row.unitPrice,
      actor: req.user?._id,
    });

    return res.status(201).json({ ok: true, row });
  } catch (err) {
    if (err.message?.includes('effectiveTo must be on/after effectiveFrom')) {
      return res.status(400).json({ ok: false, error: 'invalid_date_range' });
    }
    return safeError(res, err, 'failed to create tariff', { shape: 'ok' });
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
    if (
      updates.unitPrice !== undefined &&
      (!Number.isFinite(Number(updates.unitPrice)) || Number(updates.unitPrice) < 0)
    ) {
      return res.status(400).json({ ok: false, error: 'invalid_unit_price' });
    }

    const row = await InsuranceTariff.findById(req.params.id);
    if (!row) return res.status(404).json({ ok: false, error: 'not_found' });

    Object.assign(row, updates);
    await row.save();

    logger.info('insurance-tariff updated', {
      id: String(row._id),
      fields: Object.keys(updates),
      actor: req.user?._id,
    });

    return res.json({ ok: true, row });
  } catch (err) {
    if (err.message?.includes('effectiveTo must be on/after effectiveFrom')) {
      return res.status(400).json({ ok: false, error: 'invalid_date_range' });
    }
    return safeError(res, err, 'failed to update tariff', { shape: 'ok' });
  }
});

// ── DELETE /:id — soft-disable ───────────────────────────────────────────
router.delete('/:id', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ ok: false, error: 'invalid_id' });
    }
    const row = await InsuranceTariff.findById(req.params.id);
    if (!row) return res.status(404).json({ ok: false, error: 'not_found' });

    row.isActive = false;
    await row.save();

    logger.info('insurance-tariff soft-disabled', {
      id: String(row._id),
      actor: req.user?._id,
    });

    return res.json({ ok: true, row });
  } catch (err) {
    return safeError(res, err, 'failed to disable tariff', { shape: 'ok' });
  }
});

// ── POST /:id/restore — re-enable ────────────────────────────────────────
router.post('/:id/restore', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ ok: false, error: 'invalid_id' });
    }
    const row = await InsuranceTariff.findById(req.params.id);
    if (!row) return res.status(404).json({ ok: false, error: 'not_found' });

    row.isActive = true;
    await row.save();

    return res.json({ ok: true, row });
  } catch (err) {
    return safeError(res, err, 'failed to restore tariff', { shape: 'ok' });
  }
});

module.exports = router;
