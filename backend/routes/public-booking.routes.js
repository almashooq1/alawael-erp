/**
 * Public booking — unauthenticated lead capture from the landing page.
 *
 * POST /api/appointments/public
 *   Accepts the booking-form payload, stores it as a PublicBookingRequest,
 *   and returns a confirmation number. Intake staff later convert the lead
 *   into a Beneficiary + Appointment.
 *
 * Rate-limited per IP (5/hour) to resist abuse. IPs are hashed before
 * storage (sha256) for PDPL-friendly retention.
 *
 * GET /api/appointments/public/health
 *   Returns {ok:true, conditions, timeSlots} so the frontend form can
 *   self-populate dropdowns from the server's authoritative list without
 *   a rebuild.
 */

'use strict';

const express = require('express');
const crypto = require('crypto');
const router = express.Router();

const PublicBookingRequest = require('../models/PublicBookingRequest');
const { createCustomLimiter } = require('../middleware/rateLimiter');
const { authenticateToken, requireRole } = require('../middleware/auth');
const logger = require('../utils/logger');
const safeError = require('../utils/safeError');

// Staff roles allowed to view/manage bookings (broad set — front-desk + managers).
const STAFF_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'receptionist',
  'coordinator',
];

// Rate limit: 5 bookings per hour from the same IP.
const bookingLimiter = createCustomLimiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'تجاوزت عدد الطلبات المسموح. حاول بعد ساعة.' },
});

function hashIp(ip) {
  if (!ip) return undefined;
  return crypto.createHash('sha256').update(String(ip)).digest('hex').slice(0, 32);
}

// Strip ASCII control chars (C0 + DEL) and trim. Intentional use of a
// control-character range — disable the generic lint rule just here.
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u001F\u007F]/g;
function sanitizeString(s, max = 500) {
  if (typeof s !== 'string') return '';
  return s.replace(CONTROL_CHARS, '').trim().slice(0, max);
}

// ── GET /health — dropdown options ──────────────────────────────────────────
router.get('/public/health', (_req, res) => {
  res.json({
    ok: true,
    conditions: PublicBookingRequest.CONDITIONS,
    timeSlots: PublicBookingRequest.TIME_SLOTS,
  });
});

// ── POST /public — lead capture ─────────────────────────────────────────────
router.post('/public', bookingLimiter, async (req, res) => {
  try {
    const body = req.body || {};
    const required = [
      'parentName',
      'parentPhone',
      'childName',
      'childAge',
      'conditionType',
      'branchPreference',
      'preferredTime',
    ];
    for (const key of required) {
      if (body[key] === undefined || body[key] === null || body[key] === '') {
        return res.status(400).json({ success: false, message: `حقل مطلوب: ${key}` });
      }
    }

    // Honeypot: a hidden form field humans won't fill. If present and non-empty, silently accept + drop.
    if (body.website && String(body.website).trim() !== '') {
      logger.warn('[public-booking] honeypot triggered', { ua: req.get('user-agent') });
      // Respond success-shaped so the bot doesn't learn the honeypot exists.
      return res.status(200).json({
        success: true,
        confirmationNumber: 'AW-SIMULATED',
        message: 'تم استلام طلبك',
      });
    }

    // Map audience-in-parentheses branch string ("فرع المغرزات (بنات)") back to raw branch name.
    const branchRaw = sanitizeString(body.branchPreference, 120);
    const branchPreference = branchRaw.replace(/\s*\(.*?\)\s*$/, '') || branchRaw;

    const doc = await PublicBookingRequest.create({
      parentName: sanitizeString(body.parentName, 120),
      parentPhone: sanitizeString(body.parentPhone, 25),
      parentEmail: sanitizeString(body.parentEmail, 160).toLowerCase(),
      childName: sanitizeString(body.childName, 120),
      childAge: Number(body.childAge),
      childGender: ['male', 'female'].includes(body.childGender) ? body.childGender : '',
      conditionType: sanitizeString(body.conditionType, 120),
      branchPreference,
      preferredTime: sanitizeString(body.preferredTime, 120),
      notes: sanitizeString(body.notes, 2000),
      source: 'website',
      referrer: sanitizeString(req.get('referer') || '', 500),
      userAgent: sanitizeString(req.get('user-agent') || '', 500),
      ipHash: hashIp(req.ip || req.connection?.remoteAddress),
      consentMarketing: Boolean(body.consentMarketing),
    });

    logger.info('[public-booking] received', {
      id: doc._id.toString(),
      confirmation: doc.confirmationNumber,
      branch: doc.branchPreference,
      condition: doc.conditionType,
    });

    res.status(201).json({
      success: true,
      confirmationNumber: doc.confirmationNumber,
      message: 'تم استلام طلبك بنجاح. سيتواصل معك فريق الاستقبال خلال 24 ساعة.',
    });
  } catch (err) {
    if (err && err.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: err.message });
    }
    return safeError(res, err, 'public-booking.create');
  }
});

// ═══════════════════════════════════════════════════════════════════════
// Admin-facing endpoints (staff-only) — list, stats, update, export.
// ═══════════════════════════════════════════════════════════════════════

// GET /admin — list with filters + pagination.
//   Query: ?status=new&branch=فرع%20المغرزات&from=ISO&to=ISO&q=search&page=1&limit=25
router.get('/admin', authenticateToken, requireRole(STAFF_ROLES), async (req, res) => {
  try {
    const { status, branch, from, to, q, page = 1, limit = 25 } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (branch) filter.branchPreference = branch;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }
    if (q && typeof q === 'string' && q.trim()) {
      const rx = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [
        { parentName: rx },
        { parentPhone: rx },
        { childName: rx },
        { confirmationNumber: rx },
      ];
    }

    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 25));

    const [items, total] = await Promise.all([
      PublicBookingRequest.find(filter)
        .sort({ createdAt: -1 })
        .skip((p - 1) * l)
        .limit(l)
        .lean(),
      PublicBookingRequest.countDocuments(filter),
    ]);

    res.json({
      success: true,
      items,
      pagination: { page: p, limit: l, total, pages: Math.ceil(total / l) },
    });
  } catch (err) {
    return safeError(res, err, 'public-booking.admin.list');
  }
});

// GET /admin/stats — aggregated dashboard counters.
router.get('/admin/stats', authenticateToken, requireRole(STAFF_ROLES), async (_req, res) => {
  try {
    const since = new Date();
    since.setDate(since.getDate() - 30);

    const [byStatus, byBranch, last30days, total] = await Promise.all([
      PublicBookingRequest.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      PublicBookingRequest.aggregate([
        { $group: { _id: '$branchPreference', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      PublicBookingRequest.countDocuments({ createdAt: { $gte: since } }),
      PublicBookingRequest.countDocuments({}),
    ]);

    const statusMap = {};
    PublicBookingRequest.STATUSES.forEach(s => {
      statusMap[s] = 0;
    });
    byStatus.forEach(r => {
      statusMap[r._id] = r.count;
    });

    res.json({
      success: true,
      total,
      last30days,
      byStatus: statusMap,
      byBranch: byBranch.map(r => ({ branch: r._id, count: r.count })),
    });
  } catch (err) {
    return safeError(res, err, 'public-booking.admin.stats');
  }
});

// PATCH /admin/:id/status — advance lifecycle.
router.patch('/admin/:id/status', authenticateToken, requireRole(STAFF_ROLES), async (req, res) => {
  try {
    const { status, internalNotes } = req.body || {};
    if (!status || !PublicBookingRequest.STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: 'حالة غير صالحة' });
    }
    const update = { status };
    if (status === 'contacted') update.contactedAt = new Date();
    if (status === 'converted') update.convertedAt = new Date();
    if (typeof internalNotes === 'string') update.internalNotes = internalNotes.slice(0, 4000);
    if (req.user?.id) update.assignedTo = req.user.id;

    const doc = await PublicBookingRequest.findByIdAndUpdate(req.params.id, update, {
      new: true,
    }).lean();
    if (!doc) return res.status(404).json({ success: false, message: 'الطلب غير موجود' });

    logger.info('[public-booking] status update', {
      id: req.params.id,
      by: req.user?.id,
      status,
    });

    res.json({ success: true, item: doc });
  } catch (err) {
    return safeError(res, err, 'public-booking.admin.updateStatus');
  }
});

// GET /admin/export.csv — CSV export (UTF-8 + BOM for Excel Arabic).
router.get('/admin/export.csv', authenticateToken, requireRole(STAFF_ROLES), async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;

    const rows = await PublicBookingRequest.find(filter).sort({ createdAt: -1 }).limit(5000).lean();

    const escape = v => {
      if (v === null || v === undefined) return '';
      const s = String(v).replace(/"/g, '""');
      return /[",\n\r]/.test(s) ? `"${s}"` : s;
    };

    const header = [
      'رقم التأكيد',
      'التاريخ',
      'الحالة',
      'ولي الأمر',
      'الجوال',
      'الطفل',
      'العمر',
      'نوع الحالة',
      'الفرع',
      'الفترة',
      'الملاحظات',
    ].join(',');

    const lines = rows.map(r =>
      [
        r.confirmationNumber,
        r.createdAt?.toISOString() || '',
        r.status,
        r.parentName,
        r.parentPhone,
        r.childName,
        r.childAge,
        r.conditionType,
        r.branchPreference,
        r.preferredTime,
        r.notes || '',
      ]
        .map(escape)
        .join(',')
    );

    const csv = '\uFEFF' + header + '\n' + lines.join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="alawael-bookings-${Date.now()}.csv"`
    );
    res.send(csv);
  } catch (err) {
    return safeError(res, err, 'public-booking.admin.export');
  }
});

module.exports = router;
