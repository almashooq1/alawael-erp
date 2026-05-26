'use strict';

/**
 * facility-asset.routes.js — Wave 369.
 *
 * Building infrastructure PPM + inspection surface. Mounted at
 * /api/(v1/)?facility-asset.
 *
 * Endpoints:
 *   GET    /                        — list w/ filters (category/status/criticality)
 *   GET    /due-inspection
 *   GET    /due-maintenance
 *   GET    /out-of-service
 *   GET    /expired-certificates
 *   GET    /life-safety              — criticality=life_safety + status filter
 *   GET    /stats
 *   GET    /:id
 *   POST   /
 *   PATCH  /:id
 *   POST   /:id/inspection           — log inspection event (advances nextDue)
 *   POST   /:id/certificate
 *   POST   /:id/start-maintenance
 *   POST   /:id/return-to-service
 *   POST   /:id/out-of-service
 *   POST   /:id/retire
 *   DELETE /:id/inspections/:inspId
 *   DELETE /:id/certificates/:certId
 *   DELETE /:id                     — admin
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateToken, requireRole } = require('../middleware/auth');

const Asset = require('../models/FacilityAsset');
const safeError = require('../utils/safeError');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');

router.use(authenticateToken);
// W445: branch-scope every endpoint. Model carries `branchId`; pre-W445
// list filters were optional + instance loads bare findById, opening
// cross-tenant IDOR (read/modify/delete any branch by ObjectId guess).
router.use(requireBranchAccess);

const READ_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'branch_manager',
  'facility_manager',
  'maintenance',
  'safety_officer',
  'compliance',
  'quality',
];
const WRITE_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'branch_manager',
  'facility_manager',
  'maintenance',
  'safety_officer',
];
const RETIRE_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'branch_manager',
  'facility_manager',
];
const DELETE_ROLES = ['admin', 'superadmin', 'super_admin'];

const { CATEGORIES, STATUSES, CRITICALITY, INSPECTION_KINDS, INSPECTION_OUTCOMES } = Asset;

function pushCappedInspection(doc, entry) {
  doc.inspections.push(entry);
  if (doc.inspections.length > 50) doc.inspections = doc.inspections.slice(-50);
}

// ── GET / ───────────────────────────────────────────────────────────
router.get('/', requireRole(READ_ROLES), async (req, res) => {
  try {
    const filter = { ...branchFilter(req) }; /* W445 */
    if (req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      filter.branchId = req.query.branchId;
    }
    if (req.query.category && CATEGORIES.includes(String(req.query.category))) {
      filter.category = String(req.query.category);
    }
    if (req.query.status && STATUSES.includes(String(req.query.status))) {
      filter.status = String(req.query.status);
    }
    if (req.query.criticality && CRITICALITY.includes(String(req.query.criticality))) {
      filter.criticality = String(req.query.criticality);
    }
    const p = Math.max(1, parseInt(req.query.page, 10) || 1);
    const l = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const [items, total] = await Promise.all([
      Asset.find(filter)
        .sort({ criticality: -1, updatedAt: -1 })
        .skip((p - 1) * l)
        .limit(l)
        .lean(),
      Asset.countDocuments(filter),
    ]);
    res.json({
      success: true,
      items,
      pagination: { page: p, limit: l, total, pages: Math.ceil(total / l) },
    });
  } catch (err) {
    return safeError(res, err, 'facility.list');
  }
});

// ── GET /due-inspection ─────────────────────────────────────────────
router.get('/due-inspection', requireRole(READ_ROLES), async (req, res) => {
  try {
    const now = new Date();
    const filter = {
      ...branchFilter(req), // W445
      status: { $ne: 'retired' },
      nextInspectionDue: { $ne: null, $lt: now },
    };
    if (req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      filter.branchId = req.query.branchId;
    }
    const items = await Asset.find(filter).sort({ nextInspectionDue: 1 }).limit(200).lean();
    res.json({ success: true, items, count: items.length });
  } catch (err) {
    return safeError(res, err, 'facility.dueInspection');
  }
});

// ── GET /due-maintenance ────────────────────────────────────────────
router.get('/due-maintenance', requireRole(READ_ROLES), async (req, res) => {
  try {
    const now = new Date();
    const filter = {
      ...branchFilter(req), // W445
      status: { $ne: 'retired' },
      nextMaintenanceDue: { $ne: null, $lt: now },
    };
    if (req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      filter.branchId = req.query.branchId;
    }
    const items = await Asset.find(filter).sort({ nextMaintenanceDue: 1 }).limit(200).lean();
    res.json({ success: true, items, count: items.length });
  } catch (err) {
    return safeError(res, err, 'facility.dueMaintenance');
  }
});

// ── GET /out-of-service ─────────────────────────────────────────────
router.get('/out-of-service', requireRole(READ_ROLES), async (req, res) => {
  try {
    const filter = {
      ...branchFilter(req), // W445
      status: { $in: ['out_of_service', 'inspection_failed'] },
    };
    if (req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      filter.branchId = req.query.branchId;
    }
    const items = await Asset.find(filter)
      .sort({ criticality: -1, outOfServiceSince: 1 })
      .limit(200)
      .lean();
    res.json({ success: true, items, count: items.length });
  } catch (err) {
    return safeError(res, err, 'facility.outOfService');
  }
});

// ── GET /expired-certificates ───────────────────────────────────────
router.get('/expired-certificates', requireRole(READ_ROLES), async (req, res) => {
  try {
    const now = new Date();
    const filter = {
      ...branchFilter(req), // W445
      'certificates.expiresAt': { $lt: now },
    };
    if (req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      filter.branchId = req.query.branchId;
    }
    const items = await Asset.find(filter).limit(200).lean();
    res.json({ success: true, items, count: items.length });
  } catch (err) {
    return safeError(res, err, 'facility.expiredCerts');
  }
});

// ── GET /life-safety ────────────────────────────────────────────────
router.get('/life-safety', requireRole(READ_ROLES), async (req, res) => {
  try {
    const filter = { ...branchFilter(req), criticality: 'life_safety' }; /* W445 */
    if (req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      filter.branchId = req.query.branchId;
    }
    if (req.query.status && STATUSES.includes(String(req.query.status))) {
      filter.status = String(req.query.status);
    }
    const items = await Asset.find(filter).sort({ status: 1, updatedAt: -1 }).limit(200).lean();
    res.json({ success: true, items, count: items.length });
  } catch (err) {
    return safeError(res, err, 'facility.lifeSafety');
  }
});

// ── GET /stats ──────────────────────────────────────────────────────
router.get('/stats', requireRole(READ_ROLES), async (req, res) => {
  try {
    const filter = { ...branchFilter(req) }; /* W445 */
    if (req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      filter.branchId = req.query.branchId;
    }
    const raw = await Asset.find(filter)
      .select(
        'category status criticality nextInspectionDue nextMaintenanceDue certificates outOfServiceSince'
      )
      .lean();
    const byCategory = CATEGORIES.reduce((acc, c) => ((acc[c] = 0), acc), {});
    const byStatus = STATUSES.reduce((acc, s) => ((acc[s] = 0), acc), {});
    const byCriticality = CRITICALITY.reduce((acc, c) => ((acc[c] = 0), acc), {});
    let dueInspection = 0;
    let dueMaintenance = 0;
    let expiredCertificates = 0;
    let lifeSafetyOOS = 0;
    const now = Date.now();
    for (const a of raw) {
      byCategory[a.category] = (byCategory[a.category] || 0) + 1;
      byStatus[a.status] = (byStatus[a.status] || 0) + 1;
      byCriticality[a.criticality] = (byCriticality[a.criticality] || 0) + 1;
      if (a.status !== 'retired') {
        if (a.nextInspectionDue && new Date(a.nextInspectionDue).getTime() < now) dueInspection++;
        if (a.nextMaintenanceDue && new Date(a.nextMaintenanceDue).getTime() < now)
          dueMaintenance++;
      }
      if (Array.isArray(a.certificates)) {
        for (const c of a.certificates) {
          if (c.expiresAt && new Date(c.expiresAt).getTime() < now) {
            expiredCertificates++;
            break;
          }
        }
      }
      if (
        a.criticality === 'life_safety' &&
        ['out_of_service', 'inspection_failed'].includes(a.status)
      ) {
        lifeSafetyOOS++;
      }
    }
    res.json({
      success: true,
      total: raw.length,
      byCategory,
      byStatus,
      byCriticality,
      dueInspection,
      dueMaintenance,
      expiredCertificates,
      lifeSafetyOutOfService: lifeSafetyOOS,
    });
  } catch (err) {
    return safeError(res, err, 'facility.stats');
  }
});

// ── GET /:id ────────────────────────────────────────────────────────
router.get('/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Asset.findOne({ _id: req.params.id, ...branchFilter(req) }) /* W445 */
      .lean();
    if (!row) return res.status(404).json({ success: false, message: 'الأصل غير موجود' });
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'facility.get');
  }
});

// ── POST / ──────────────────────────────────────────────────────────
router.post('/', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const body = req.body || {};
    if (!String(body.assetTag || '').trim()) {
      return res.status(400).json({ success: false, message: 'assetTag مطلوب' });
    }
    if (!String(body.name || '').trim()) {
      return res.status(400).json({ success: false, message: 'name مطلوب' });
    }
    if (!CATEGORIES.includes(String(body.category))) {
      return res.status(400).json({ success: false, message: 'category غير صالحة' });
    }
    if (!body.branchId || !mongoose.isValidObjectId(body.branchId)) {
      return res.status(400).json({ success: false, message: 'branchId مطلوب' });
    }
    const doc = await Asset.create({
      assetTag: String(body.assetTag).slice(0, 50),
      name: String(body.name).slice(0, 200),
      nameAr: String(body.nameAr || '').slice(0, 200),
      category: body.category,
      description: String(body.description || '').slice(0, 1000),
      branchId: body.branchId,
      building: String(body.building || '').slice(0, 100),
      floor: String(body.floor || '').slice(0, 50),
      room: String(body.room || '').slice(0, 100),
      locationDescription: String(body.locationDescription || '').slice(0, 500),
      manufacturer: String(body.manufacturer || '').slice(0, 150),
      modelNumber: String(body.modelNumber || '').slice(0, 100),
      serialNumber: String(body.serialNumber || '').slice(0, 150),
      installedAt: body.installedAt ? new Date(body.installedAt) : null,
      installationCost:
        typeof body.installationCost === 'number' ? Math.max(0, body.installationCost) : 0,
      expectedLifespanYears:
        typeof body.expectedLifespanYears === 'number' ? body.expectedLifespanYears : null,
      warrantyExpiresAt: body.warrantyExpiresAt ? new Date(body.warrantyExpiresAt) : null,
      vendorContact: String(body.vendorContact || '').slice(0, 300),
      criticality: CRITICALITY.includes(String(body.criticality))
        ? String(body.criticality)
        : 'medium',
      inspectionIntervalDays:
        typeof body.inspectionIntervalDays === 'number' ? body.inspectionIntervalDays : null,
      maintenanceIntervalDays:
        typeof body.maintenanceIntervalDays === 'number' ? body.maintenanceIntervalDays : null,
      nextInspectionDue: body.nextInspectionDue ? new Date(body.nextInspectionDue) : null,
      nextMaintenanceDue: body.nextMaintenanceDue ? new Date(body.nextMaintenanceDue) : null,
      status: 'in_service',
      notes: String(body.notes || '').slice(0, 2000),
    });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    return safeError(res, err, 'facility.create');
  }
});

// ── PATCH /:id ──────────────────────────────────────────────────────
router.patch('/:id', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Asset.findOne({ _id: req.params.id, ...branchFilter(req) }); /* W445 */
    if (!row) return res.status(404).json({ success: false, message: 'الأصل غير موجود' });
    if (row.status === 'retired') {
      return res.status(409).json({ success: false, message: 'الأصل متقاعد' });
    }
    const editable = [
      'name',
      'nameAr',
      'description',
      'building',
      'floor',
      'room',
      'locationDescription',
      'manufacturer',
      'modelNumber',
      'vendorContact',
      'criticality',
      'inspectionIntervalDays',
      'maintenanceIntervalDays',
      'warrantyExpiresAt',
      'notes',
    ];
    for (const k of editable) {
      if (k in req.body) row[k] = req.body[k];
    }
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'facility.patch');
  }
});

// ── POST /:id/inspection ────────────────────────────────────────────
router.post('/:id/inspection', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Asset.findOne({ _id: req.params.id, ...branchFilter(req) }); /* W445 */
    if (!row) return res.status(404).json({ success: false, message: 'الأصل غير موجود' });
    const body = req.body || {};
    if (!INSPECTION_KINDS.includes(String(body.kind))) {
      return res
        .status(400)
        .json({ success: false, message: `kind يجب أن يكون: ${INSPECTION_KINDS.join(' | ')}` });
    }
    if (!INSPECTION_OUTCOMES.includes(String(body.outcome))) {
      return res.status(400).json({
        success: false,
        message: `outcome يجب أن يكون: ${INSPECTION_OUTCOMES.join(' | ')}`,
      });
    }
    const defects = Array.isArray(body.defectsFound)
      ? body.defectsFound.slice(0, 20).map(s => String(s).slice(0, 200))
      : [];
    if (body.outcome === 'fail' && defects.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: 'fail outcome requires defectsFound[]' });
    }
    const entry = {
      kind: body.kind,
      performedAt: body.performedAt ? new Date(body.performedAt) : new Date(),
      performedByName: req.user?.name || String(body.performedByName || '').slice(0, 100),
      vendorName: String(body.vendorName || '').slice(0, 150),
      vendorLicense: String(body.vendorLicense || '').slice(0, 100),
      outcome: body.outcome,
      findings: String(body.findings || '').slice(0, 2000),
      defectsFound: defects,
      correctiveActionsRequired: Array.isArray(body.correctiveActionsRequired)
        ? body.correctiveActionsRequired.slice(0, 20).map(s => String(s).slice(0, 200))
        : [],
      cost: typeof body.cost === 'number' ? Math.max(0, body.cost) : 0,
      nextDueAt: body.nextDueAt ? new Date(body.nextDueAt) : null,
      certificateRef: String(body.certificateRef || '').slice(0, 100),
    };
    pushCappedInspection(row, entry);

    // Advance schedule based on outcome
    if (body.outcome === 'pass' || body.outcome === 'pass_with_observations') {
      if (entry.nextDueAt) {
        if (body.kind === 'regulatory_annual' || body.kind === 'safety_check') {
          row.nextInspectionDue = entry.nextDueAt;
        } else if (
          body.kind === 'preventive_maintenance' ||
          body.kind === 'corrective_repair' ||
          body.kind === 'calibration'
        ) {
          row.nextMaintenanceDue = entry.nextDueAt;
        }
      } else if (row.inspectionIntervalDays && body.kind === 'regulatory_annual') {
        row.nextInspectionDue = new Date(Date.now() + row.inspectionIntervalDays * 86400000);
      } else if (row.maintenanceIntervalDays && body.kind === 'preventive_maintenance') {
        row.nextMaintenanceDue = new Date(Date.now() + row.maintenanceIntervalDays * 86400000);
      }
      // pass restores in_service if currently inspection_failed
      if (row.status === 'inspection_failed' && body.outcome === 'pass') {
        row.status = 'in_service';
      }
    } else if (body.outcome === 'fail') {
      row.status = 'inspection_failed';
    }

    await row.save();
    const created = row.inspections[row.inspections.length - 1];
    res.status(201).json({ success: true, data: created, asset: row });
  } catch (err) {
    return safeError(res, err, 'facility.inspection');
  }
});

// ── POST /:id/certificate ───────────────────────────────────────────
router.post('/:id/certificate', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Asset.findOne({ _id: req.params.id, ...branchFilter(req) }); /* W445 */
    if (!row) return res.status(404).json({ success: false, message: 'الأصل غير موجود' });
    const body = req.body || {};
    if (!String(body.number || '').trim()) {
      return res.status(400).json({ success: false, message: 'certificate number مطلوب' });
    }
    if (!String(body.issuingAuthority || '').trim()) {
      return res.status(400).json({ success: false, message: 'issuingAuthority مطلوب' });
    }
    if (!body.expiresAt) {
      return res.status(400).json({ success: false, message: 'expiresAt مطلوب' });
    }
    row.certificates.push({
      name: String(body.name || '').slice(0, 150),
      number: String(body.number).slice(0, 100),
      issuingAuthority: String(body.issuingAuthority).slice(0, 200),
      issuedAt: body.issuedAt ? new Date(body.issuedAt) : new Date(),
      expiresAt: new Date(body.expiresAt),
      fileUrl: String(body.fileUrl || '').slice(0, 500),
    });
    await row.save();
    res.status(201).json({
      success: true,
      data: row.certificates[row.certificates.length - 1],
      asset: row,
    });
  } catch (err) {
    return safeError(res, err, 'facility.cert');
  }
});

// ── POST /:id/start-maintenance ─────────────────────────────────────
router.post('/:id/start-maintenance', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Asset.findOne({ _id: req.params.id, ...branchFilter(req) }); /* W445 */
    if (!row) return res.status(404).json({ success: false, message: 'الأصل غير موجود' });
    if (row.status === 'retired') {
      return res.status(409).json({ success: false, message: 'الأصل متقاعد' });
    }
    row.status = 'maintenance';
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'facility.startMaint');
  }
});

// ── POST /:id/return-to-service ─────────────────────────────────────
router.post('/:id/return-to-service', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Asset.findOne({ _id: req.params.id, ...branchFilter(req) }); /* W445 */
    if (!row) return res.status(404).json({ success: false, message: 'الأصل غير موجود' });
    if (!['maintenance', 'out_of_service', 'inspection_failed'].includes(row.status)) {
      return res.status(409).json({
        success: false,
        message: 'الأصل ليس متاحاً للإرجاع للخدمة (الحالة: ' + row.status + ')',
      });
    }
    row.status = 'in_service';
    row.outOfServiceReason = '';
    row.outOfServiceSince = null;
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'facility.returnToService');
  }
});

// ── POST /:id/out-of-service ────────────────────────────────────────
router.post('/:id/out-of-service', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Asset.findOne({ _id: req.params.id, ...branchFilter(req) }); /* W445 */
    if (!row) return res.status(404).json({ success: false, message: 'الأصل غير موجود' });
    if (!String(req.body?.reason || '').trim()) {
      return res.status(400).json({ success: false, message: 'سبب الإيقاف مطلوب' });
    }
    row.outOfServiceReason = String(req.body.reason).slice(0, 500);
    row.outOfServiceSince = new Date();
    row.status = 'out_of_service';
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'facility.oos');
  }
});

// ── POST /:id/retire ────────────────────────────────────────────────
router.post('/:id/retire', requireRole(RETIRE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Asset.findOne({ _id: req.params.id, ...branchFilter(req) }); /* W445 */
    if (!row) return res.status(404).json({ success: false, message: 'الأصل غير موجود' });
    if (!String(req.body?.reason || '').trim()) {
      return res.status(400).json({ success: false, message: 'سبب التقاعد مطلوب' });
    }
    row.retirementReason = String(req.body.reason).slice(0, 500);
    row.retiredAt = new Date();
    row.status = 'retired';
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'facility.retire');
  }
});

// ── DELETE /:id/inspections/:inspId ────────────────────────────────
router.delete('/:id/inspections/:inspId', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Asset.findOne({ _id: req.params.id, ...branchFilter(req) }); /* W445 */
    if (!row) return res.status(404).json({ success: false, message: 'الأصل غير موجود' });
    const before = row.inspections.length;
    row.inspections = row.inspections.filter(e => String(e._id) !== String(req.params.inspId));
    if (row.inspections.length === before) {
      return res.status(404).json({ success: false, message: 'الفحص غير موجود' });
    }
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'facility.deleteInsp');
  }
});

// ── DELETE /:id/certificates/:certId ───────────────────────────────
router.delete('/:id/certificates/:certId', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Asset.findOne({ _id: req.params.id, ...branchFilter(req) }); /* W445 */
    if (!row) return res.status(404).json({ success: false, message: 'الأصل غير موجود' });
    const before = row.certificates.length;
    row.certificates = row.certificates.filter(c => String(c._id) !== String(req.params.certId));
    if (row.certificates.length === before) {
      return res.status(404).json({ success: false, message: 'الشهادة غير موجودة' });
    }
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'facility.deleteCert');
  }
});

// ── DELETE /:id ────────────────────────────────────────────────────
router.delete('/:id', requireRole(DELETE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Asset.findOneAndDelete({
      _id: req.params.id,
      ...branchFilter(req),
    }); /* W445 */
    if (!row) return res.status(404).json({ success: false, message: 'الأصل غير موجود' });
    res.json({ success: true, deleted: true, id: req.params.id });
  } catch (err) {
    return safeError(res, err, 'facility.delete');
  }
});

module.exports = router;
