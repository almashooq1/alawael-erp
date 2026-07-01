'use strict';

/**
 * medication-reconciliation.routes.js — Wave 1041.
 *
 * Medication-reconciliation admin surface. Mounted via dualMountAuth at
 * /api/(v1/)?medication-reconciliation.
 *
 * Endpoints:
 *   GET    /unresolved               — records carrying ≥1 unresolved discrepancy (cohort)
 *   GET    /                         — list w/ filters (paginated)
 *   GET    /by-beneficiary/:id       — per-beneficiary history + latest
 *   GET    /stats                    — type + discrepancy distribution for a range
 *   GET    /:id
 *   POST   /                         — create a reconciliation (with medications[])
 *   POST   /:id/reconcile            — mark reconciled (immutable after)
 *   POST   /:id/resolve-discrepancy  — resolve the discrepancy on medications[index]
 *   PATCH  /:id                      — correct (only while status=draft)
 *   DELETE /:id                      — admin-only
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateToken, requireRole } = require('../middleware/auth');

const MedicationReconciliation = require('../models/MedicationReconciliation');
const Beneficiary = require('../models/Beneficiary');
const safeError = require('../utils/safeError');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const { bodyScopedBeneficiaryGuard } = require('../middleware/assertBranchMatch');

router.use(authenticateToken);
router.use(requireBranchAccess);
router.use(bodyScopedBeneficiaryGuard);

const READ_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'clinical_supervisor',
  'physician',
  'pharmacist',
  'nurse',
  'quality',
];
const WRITE_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'clinical_supervisor',
  'physician',
  'pharmacist',
  'nurse',
];
// Reconciliation sign-off is a clinical responsibility (pharmacist/physician).
const RECONCILE_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'clinical_supervisor',
  'physician',
  'pharmacist',
];
const DELETE_ROLES = ['admin', 'superadmin', 'super_admin'];

const { TYPES, SOURCES, DECISIONS, DISCREPANCY_TYPES } = MedicationReconciliation;

const UNRESOLVED_QUERY = {
  medications: { $elemMatch: { discrepancyType: { $ne: 'none' }, discrepancyResolved: false } },
};

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function sanitizeMedications(arr) {
  if (!Array.isArray(arr)) return [];
  return arr
    .filter(m => m && String(m.name || '').trim())
    .slice(0, 100)
    .map(m => ({
      name: String(m.name).slice(0, 200),
      dose: String(m.dose || '').slice(0, 100),
      route: String(m.route || '').slice(0, 60),
      frequency: String(m.frequency || '').slice(0, 100),
      source: SOURCES.includes(String(m.source)) ? String(m.source) : 'home',
      decision: DECISIONS.includes(String(m.decision)) ? String(m.decision) : 'continue',
      discrepancyType: DISCREPANCY_TYPES.includes(String(m.discrepancyType))
        ? String(m.discrepancyType)
        : 'none',
      discrepancyResolved: !!m.discrepancyResolved,
      notes: String(m.notes || '').slice(0, 500),
    }));
}

async function hydrate(items) {
  const ids = [...new Set(items.map(r => String(r.beneficiaryId)).filter(Boolean))].filter(id =>
    mongoose.isValidObjectId(id)
  );
  const benefs = ids.length
    ? await Beneficiary.find({ _id: { $in: ids } })
        .select('firstName_ar lastName_ar beneficiaryNumber')
        .lean()
    : [];
  const map = new Map(benefs.map(b => [String(b._id), b]));
  return items.map(r => ({ ...r, beneficiary: map.get(String(r.beneficiaryId)) || null }));
}

// ── GET /unresolved — unresolved-discrepancy cohort ───────────────────
router.get('/unresolved', requireRole(READ_ROLES), async (req, res) => {
  try {
    const filter = { ...branchFilter(req), ...UNRESOLVED_QUERY };
    if (!filter.branchId && req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      filter.branchId = req.query.branchId;
    }
    const raw = await MedicationReconciliation.find(filter).sort({ date: -1 }).limit(300).lean();
    const items = await hydrate(raw);
    res.json({ success: true, items, count: items.length });
  } catch (err) {
    return safeError(res, err, 'medRec.unresolved');
  }
});

// ── GET / — list ──────────────────────────────────────────────────────
router.get('/', requireRole(READ_ROLES), async (req, res) => {
  try {
    const filter = { ...branchFilter(req) };
    if (req.query.beneficiaryId && mongoose.isValidObjectId(req.query.beneficiaryId)) {
      filter.beneficiaryId = req.query.beneficiaryId;
    }
    if (!filter.branchId && req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      filter.branchId = req.query.branchId;
    }
    if (req.query.type && TYPES.includes(String(req.query.type))) {
      filter.reconciliationType = String(req.query.type);
    }
    if (req.query.status && ['draft', 'reconciled'].includes(String(req.query.status))) {
      filter.status = String(req.query.status);
    }
    if (req.query.from || req.query.to) {
      filter.date = {};
      if (req.query.from) filter.date.$gte = startOfDay(new Date(req.query.from));
      if (req.query.to) filter.date.$lte = endOfDay(new Date(req.query.to));
    }
    const p = Math.max(1, parseInt(req.query.page, 10) || 1);
    const l = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const [raw, total] = await Promise.all([
      MedicationReconciliation.find(filter)
        .sort({ date: -1 })
        .skip((p - 1) * l)
        .limit(l)
        .lean(),
      MedicationReconciliation.countDocuments(filter),
    ]);
    const items = await hydrate(raw);
    res.json({
      success: true,
      items,
      pagination: { page: p, limit: l, total, pages: Math.ceil(total / l) },
    });
  } catch (err) {
    return safeError(res, err, 'medRec.list');
  }
});

// ── GET /by-beneficiary/:id ───────────────────────────────────────────
router.get('/by-beneficiary/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const items = await MedicationReconciliation.find({
      ...branchFilter(req),
      beneficiaryId: req.params.id,
    })
      .sort({ date: -1 })
      .limit(100)
      .lean();
    res.json({ success: true, items, count: items.length, latest: items[0] || null });
  } catch (err) {
    return safeError(res, err, 'medRec.byBeneficiary');
  }
});

// ── GET /stats ────────────────────────────────────────────────────────
router.get('/stats', requireRole(READ_ROLES), async (req, res) => {
  try {
    const from = req.query.from
      ? startOfDay(new Date(req.query.from))
      : startOfDay(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000));
    const to = req.query.to ? endOfDay(new Date(req.query.to)) : endOfDay(new Date());
    const filter = { ...branchFilter(req), date: { $gte: from, $lte: to } };
    if (!filter.branchId && req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      filter.branchId = req.query.branchId;
    }
    if (req.query.beneficiaryId && mongoose.isValidObjectId(req.query.beneficiaryId)) {
      filter.beneficiaryId = req.query.beneficiaryId;
    }
    const raw = await MedicationReconciliation.find(filter)
      .select('reconciliationType status medications')
      .lean();
    const byType = TYPES.reduce((acc, t) => ((acc[t] = 0), acc), {});
    let reconciled = 0;
    let totalDiscrepancies = 0;
    let unresolvedDiscrepancies = 0;
    let recordsWithUnresolved = 0;
    for (const r of raw) {
      if (r.reconciliationType)
        byType[r.reconciliationType] = (byType[r.reconciliationType] || 0) + 1;
      if (r.status === 'reconciled') reconciled++;
      let recUnresolved = 0;
      for (const m of r.medications || []) {
        if (m.discrepancyType && m.discrepancyType !== 'none') {
          totalDiscrepancies++;
          if (!m.discrepancyResolved) {
            unresolvedDiscrepancies++;
            recUnresolved++;
          }
        }
      }
      if (recUnresolved > 0) recordsWithUnresolved++;
    }
    res.json({
      success: true,
      from,
      to,
      total: raw.length,
      reconciled,
      byType,
      totalDiscrepancies,
      unresolvedDiscrepancies,
      recordsWithUnresolved,
    });
  } catch (err) {
    return safeError(res, err, 'medRec.stats');
  }
});

// ── GET /:id ──────────────────────────────────────────────────────────
router.get('/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await MedicationReconciliation.findOne({
      _id: req.params.id,
      ...branchFilter(req),
    }).lean();
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    const [hydrated] = await hydrate([row]);
    res.json({ success: true, data: hydrated });
  } catch (err) {
    return safeError(res, err, 'medRec.get');
  }
});

// ── POST / — create ───────────────────────────────────────────────────
router.post('/', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.beneficiaryId || !mongoose.isValidObjectId(body.beneficiaryId)) {
      return res.status(400).json({ success: false, message: 'beneficiaryId مطلوب' });
    }
    const doc = await MedicationReconciliation.create({
      beneficiaryId: body.beneficiaryId,
      branchId: body.branchId && mongoose.isValidObjectId(body.branchId) ? body.branchId : null,
      sectionId: body.sectionId && mongoose.isValidObjectId(body.sectionId) ? body.sectionId : null,
      carePlanVersionId:
        body.carePlanVersionId && mongoose.isValidObjectId(body.carePlanVersionId)
          ? body.carePlanVersionId
          : null,
      date: body.date ? new Date(body.date) : new Date(),
      reconciliationType: TYPES.includes(String(body.reconciliationType))
        ? String(body.reconciliationType)
        : 'admission',
      medications: sanitizeMedications(body.medications),
      prescriberId:
        body.prescriberId && mongoose.isValidObjectId(body.prescriberId) ? body.prescriberId : null,
      prescriberName: String(body.prescriberName || '').slice(0, 100),
      notes: String(body.notes || '').slice(0, 1000),
      enteredBy: req.user?.id || null,
      enteredByName: req.user?.name || String(body.enteredByName || '').slice(0, 100),
      status: 'draft',
    });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    return safeError(res, err, 'medRec.create');
  }
});

// ── POST /:id/reconcile ───────────────────────────────────────────────
router.post('/:id/reconcile', requireRole(RECONCILE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await MedicationReconciliation.findOne({
      _id: req.params.id,
      ...branchFilter(req),
    });
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    if (row.status === 'reconciled') {
      return res.status(409).json({ success: false, message: 'تمت المطابقة سلفاً' });
    }
    row.reconciledBy = req.user?.id || null;
    row.reconciledByName = req.user?.name || String(req.body?.reconcilerName || '').slice(0, 100);
    row.reconciledAt = new Date();
    row.status = 'reconciled';
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'medRec.reconcile');
  }
});

// ── POST /:id/resolve-discrepancy ─────────────────────────────────────
router.post('/:id/resolve-discrepancy', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const index = parseInt(req.body?.index, 10);
    if (!Number.isInteger(index) || index < 0) {
      return res.status(400).json({ success: false, message: 'index غير صالح' });
    }
    const row = await MedicationReconciliation.findOne({
      _id: req.params.id,
      ...branchFilter(req),
    });
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    if (!row.medications[index]) {
      return res.status(400).json({ success: false, message: 'لا يوجد دواء بهذا الفهرس' });
    }
    row.medications[index].discrepancyResolved = true;
    if (req.body?.note) {
      const prev = row.medications[index].notes || '';
      row.medications[index].notes =
        `${prev ? prev + ' | ' : ''}${String(req.body.note).slice(0, 300)}`;
    }
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'medRec.resolveDiscrepancy');
  }
});

// ── PATCH /:id — correct while still 'draft' ──────────────────────────
router.patch('/:id', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await MedicationReconciliation.findOne({
      _id: req.params.id,
      ...branchFilter(req),
    });
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    if (row.status === 'reconciled') {
      return res.status(409).json({ success: false, message: 'لا يمكن تعديل سجل تمت مطابقته' });
    }
    if ('medications' in req.body) row.medications = sanitizeMedications(req.body.medications);
    const editable = ['reconciliationType', 'prescriberName', 'notes', 'date'];
    for (const k of editable) {
      if (k in req.body) row[k] = req.body[k];
    }
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'medRec.patch');
  }
});

// ── DELETE /:id — admin-only ──────────────────────────────────────────
router.delete('/:id', requireRole(DELETE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await MedicationReconciliation.findOneAndDelete({
      _id: req.params.id,
      ...branchFilter(req),
    });
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    res.json({ success: true, deleted: true, id: req.params.id });
  } catch (err) {
    return safeError(res, err, 'medRec.delete');
  }
});

module.exports = router;
