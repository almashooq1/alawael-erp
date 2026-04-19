/**
 * cpe-admin.routes.js — SCFHS CPE credit admin surface.
 *
 * Mount at /api/admin/hr/cpe.
 *
 * Endpoints:
 *   GET  /                        — paginated list with filters
 *   GET  /employee/:id            — all records for one employee
 *   GET  /employee/:id/summary    — compliance verdict + deficit breakdown
 *   POST /                        — create new record
 *   PATCH /:id                    — update fields
 *   DELETE /:id                   — remove record
 *   POST /:id/verify              — HR marks record verified
 *   GET  /overview                — dashboard counters (compliant / attention / non-compliant)
 *   GET  /export.csv              — CSV download with employee hydrated (SCFHS audit sheet)
 *
 * All routes authenticated; read roles include clinical_supervisor
 * for peer review; write + verify are HR-only.
 */

'use strict';

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateToken, requireRole } = require('../middleware/auth');

const CpeRecord = require('../models/CpeRecord');
const Employee = require('../models/HR/Employee');
const cpe = require('../services/cpeService');
const safeError = require('../utils/safeError');

router.use(authenticateToken);

const READ_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'hr',
  'hr_manager',
  'clinical_supervisor',
];
const WRITE_ROLES = ['admin', 'superadmin', 'super_admin', 'manager', 'hr', 'hr_manager'];

// Default cycle end = scfhs_expiry when present on employee, else now + 5y.
function resolveCycleEnd(employeeDoc) {
  if (employeeDoc?.scfhs_expiry) return new Date(employeeDoc.scfhs_expiry);
  const d = new Date();
  d.setFullYear(d.getFullYear() + 5);
  return d;
}

// ── GET / — list with filters + pagination ────────────────────────────────
router.get('/', requireRole(READ_ROLES), async (req, res) => {
  try {
    const { employeeId, category, verified, from, to, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (employeeId && mongoose.isValidObjectId(employeeId)) filter.employeeId = employeeId;
    if (category) filter.category = String(category);
    if (verified != null) filter.verified = verified === 'true' || verified === true;
    if (from || to) {
      filter.activityDate = {};
      if (from) filter.activityDate.$gte = new Date(from);
      if (to) {
        const d = new Date(to);
        d.setHours(23, 59, 59, 999);
        filter.activityDate.$lte = d;
      }
    }

    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));

    const [items, total] = await Promise.all([
      CpeRecord.find(filter)
        .sort({ activityDate: -1 })
        .skip((p - 1) * l)
        .limit(l)
        .lean(),
      CpeRecord.countDocuments(filter),
    ]);

    res.json({
      success: true,
      items,
      pagination: { page: p, limit: l, total, pages: Math.ceil(total / l) },
    });
  } catch (err) {
    return safeError(res, err, 'cpe.list');
  }
});

// ── GET /employee/:id — all records for one therapist ────────────────────
router.get('/employee/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const items = await CpeRecord.find({ employeeId: req.params.id })
      .sort({ activityDate: -1 })
      .lean();
    res.json({ success: true, items, count: items.length });
  } catch (err) {
    return safeError(res, err, 'cpe.byEmployee');
  }
});

// ── GET /employee/:id/summary — compliance verdict ───────────────────────
router.get('/employee/:id/summary', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const employee = await Employee.findById(req.params.id).lean();
    if (!employee) return res.status(404).json({ success: false, message: 'الموظف غير موجود' });

    const cycleEnd = req.query.cycleEnd ? new Date(req.query.cycleEnd) : resolveCycleEnd(employee);
    const records = await CpeRecord.find({ employeeId: req.params.id }).lean();
    const summary = cpe.summarize(records, cycleEnd);
    const daysUntilDeadline = cpe.daysUntilDeadline(cycleEnd);
    const needsAttention = cpe.needsAttention(summary, cycleEnd);

    res.json({
      success: true,
      employee: {
        _id: employee._id,
        name: [employee.firstName_ar, employee.lastName_ar].filter(Boolean).join(' '),
        scfhs_number: employee.scfhs_number,
        scfhs_expiry: employee.scfhs_expiry,
      },
      summary,
      daysUntilDeadline,
      needsAttention,
    });
  } catch (err) {
    return safeError(res, err, 'cpe.summary');
  }
});

// ── POST / — create new record ───────────────────────────────────────────
router.post('/', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const { employeeId, activityName, category, creditHours, activityDate } = req.body || {};
    if (!employeeId || !mongoose.isValidObjectId(employeeId)) {
      return res.status(400).json({ success: false, message: 'employeeId مطلوب' });
    }
    if (!activityName) {
      return res.status(400).json({ success: false, message: 'activityName مطلوب' });
    }
    if (!['1', '2', '3'].includes(String(category))) {
      return res.status(400).json({ success: false, message: 'category يجب أن تكون 1 أو 2 أو 3' });
    }
    if (!(Number(creditHours) > 0)) {
      return res.status(400).json({ success: false, message: 'creditHours يجب أن تكون > 0' });
    }
    if (!activityDate) {
      return res.status(400).json({ success: false, message: 'activityDate مطلوب' });
    }

    const row = await CpeRecord.create({
      ...req.body,
      category: String(category),
      creditHours: Number(creditHours),
      activityDate: new Date(activityDate),
    });
    res.status(201).json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'cpe.create');
  }
});

// ── PATCH /:id — update fields ────────────────────────────────────────────
router.patch('/:id', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    // Don't let consumers flip verified via PATCH — dedicated endpoint
    // handles that so the verifiedBy/verifiedAt fields stay honest.
    const body = { ...(req.body || {}) };
    delete body.verified;
    delete body.verifiedBy;
    delete body.verifiedAt;
    if (body.creditHours != null) body.creditHours = Number(body.creditHours);
    if (body.activityDate) body.activityDate = new Date(body.activityDate);

    const row = await CpeRecord.findByIdAndUpdate(req.params.id, body, { new: true });
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'cpe.update');
  }
});

// ── POST /:id/verify — HR flips verified=true ────────────────────────────
router.post('/:id/verify', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await CpeRecord.findByIdAndUpdate(
      req.params.id,
      { verified: true, verifiedBy: req.user?.id, verifiedAt: new Date() },
      { new: true }
    );
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    res.json({ success: true, data: row, message: 'تم توثيق السجل' });
  } catch (err) {
    return safeError(res, err, 'cpe.verify');
  }
});

// ── DELETE /:id ──────────────────────────────────────────────────────────
router.delete('/:id', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await CpeRecord.findByIdAndDelete(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    res.json({ success: true, message: 'تم الحذف' });
  } catch (err) {
    return safeError(res, err, 'cpe.delete');
  }
});

// ── GET /overview — dashboard counters ──────────────────────────────────
router.get('/overview', requireRole(READ_ROLES), async (req, res) => {
  try {
    // Pull only licensed therapists — the ones SCFHS cares about.
    const employees = await Employee.find({
      scfhs_number: { $exists: true, $ne: '' },
      status: { $ne: 'terminated' },
    })
      .select('firstName_ar lastName_ar scfhs_number scfhs_expiry')
      .lean();

    // One $in query instead of N per-employee lookups. Group records by
    // employeeId in memory — the dashboard hits this endpoint on every
    // page load, and at 50+ therapists the old 1+N pattern noticeably
    // lagged behind the stat cards rendering.
    const empIds = employees.map(e => e._id);
    const allRecords = empIds.length
      ? await CpeRecord.find({ employeeId: { $in: empIds } }).lean()
      : [];
    const recordsByEmp = new Map();
    for (const r of allRecords) {
      const key = String(r.employeeId);
      if (!recordsByEmp.has(key)) recordsByEmp.set(key, []);
      recordsByEmp.get(key).push(r);
    }

    let compliant = 0;
    let attention = 0;
    let nonCompliant = 0;
    const soonExpiring = [];

    for (const e of employees) {
      const cycleEnd = resolveCycleEnd(e);
      const records = recordsByEmp.get(String(e._id)) || [];
      const summary = cpe.summarize(records, cycleEnd);
      const days = cpe.daysUntilDeadline(cycleEnd);

      if (summary.compliant) {
        compliant += 1;
      } else if (cpe.needsAttention(summary, cycleEnd)) {
        attention += 1;
        soonExpiring.push({
          employeeId: e._id,
          name: [e.firstName_ar, e.lastName_ar].filter(Boolean).join(' '),
          daysUntilDeadline: days,
          deficit: summary.totalStatus.deficit,
        });
      } else {
        nonCompliant += 1;
      }
    }

    res.json({
      success: true,
      total: employees.length,
      compliant,
      attention,
      nonCompliant,
      soonExpiring: soonExpiring
        .sort((a, b) => a.daysUntilDeadline - b.daysUntilDeadline)
        .slice(0, 20),
    });
  } catch (err) {
    return safeError(res, err, 'cpe.overview');
  }
});

// ── GET /export.csv — CSV download (SCFHS audit / HR archive) ───────────
router.get('/export.csv', requireRole(READ_ROLES), async (req, res) => {
  try {
    const { employeeId, category, verified, from, to } = req.query;
    const filter = {};
    if (employeeId && mongoose.isValidObjectId(employeeId)) filter.employeeId = employeeId;
    if (category) filter.category = String(category);
    if (verified != null) filter.verified = verified === 'true' || verified === true;
    if (from || to) {
      filter.activityDate = {};
      if (from) filter.activityDate.$gte = new Date(from);
      if (to) {
        const d = new Date(to);
        d.setHours(23, 59, 59, 999);
        filter.activityDate.$lte = d;
      }
    }

    const items = await CpeRecord.find(filter).sort({ activityDate: -1 }).limit(10_000).lean();
    // Hydrate minimal employee display data so the sheet is readable
    // on its own — SCFHS inspectors may open this without DB access.
    const empIds = [...new Set(items.map(r => String(r.employeeId)).filter(Boolean))];
    const emps = empIds.length
      ? await Employee.find({ _id: { $in: empIds } })
          .select('firstName_ar lastName_ar scfhs_number')
          .lean()
      : [];
    const empMap = new Map(emps.map(e => [String(e._id), e]));

    const csvEscape = v => {
      if (v == null) return '';
      const s = String(v);
      if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
      return s;
    };

    const header = [
      'activityDate',
      'employeeName',
      'scfhsNumber',
      'category',
      'creditHours',
      'activityNameAr',
      'activityName',
      'provider',
      'accreditationNumber',
      'verified',
      'verifiedAt',
    ];
    const rows = items.map(r => {
      const e = empMap.get(String(r.employeeId));
      return [
        r.activityDate?.toISOString()?.slice(0, 10),
        e ? [e.firstName_ar, e.lastName_ar].filter(Boolean).join(' ') : '',
        e?.scfhs_number || '',
        r.category,
        r.creditHours,
        r.activityNameAr,
        r.activityName,
        r.provider,
        r.accreditationNumber,
        r.verified,
        r.verifiedAt?.toISOString(),
      ]
        .map(csvEscape)
        .join(',');
    });

    const body = '\uFEFF' + header.join(',') + '\n' + rows.join('\n') + '\n';
    const filename = `cpe-records-${new Date().toISOString().slice(0, 10)}.csv`;
    res.set('Content-Type', 'text/csv; charset=utf-8');
    res.set('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(body);
  } catch (err) {
    return safeError(res, err, 'cpe.export');
  }
});

module.exports = router;
