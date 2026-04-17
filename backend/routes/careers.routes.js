/**
 * Careers — public application capture + admin review.
 *
 * POST /api/careers/apply               — public, rate-limited 3/hour/IP
 * GET  /api/careers/admin               — staff-only list with filters
 * PATCH /api/careers/admin/:id/status   — staff-only lifecycle transitions
 */

'use strict';

const express = require('express');
const crypto = require('crypto');
const router = express.Router();

const PublicJobApplication = require('../models/PublicJobApplication');
const { createCustomLimiter } = require('../middleware/rateLimiter');
const { authenticateToken, requireRole } = require('../middleware/auth');
const logger = require('../utils/logger');
const safeError = require('../utils/safeError');

const HR_ROLES = ['admin', 'superadmin', 'super_admin', 'manager', 'hr', 'hr_manager', 'recruiter'];

const applyLimiter = createCustomLimiter({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { success: false, message: 'عدد كبير من الطلبات — حاول بعد ساعة.' },
});

function hashIp(ip) {
  if (!ip) return undefined;
  return crypto.createHash('sha256').update(String(ip)).digest('hex').slice(0, 32);
}

// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u001F\u007F]/g;
function clean(s, max = 500) {
  if (typeof s !== 'string') return '';
  return s.replace(CONTROL_CHARS, '').trim().slice(0, max);
}

// ── POST /apply (public) ────────────────────────────────────────────────────
router.post('/apply', applyLimiter, async (req, res) => {
  try {
    const body = req.body || {};

    const required = ['jobId', 'jobTitle', 'fullName', 'phone', 'email'];
    for (const key of required) {
      if (!body[key] || String(body[key]).trim() === '') {
        return res.status(400).json({ success: false, message: `حقل مطلوب: ${key}` });
      }
    }

    // Honeypot
    if (body.website && String(body.website).trim() !== '') {
      logger.warn('[careers] honeypot triggered', { ua: req.get('user-agent') });
      return res.status(200).json({
        success: true,
        referenceNumber: 'AWHR-SIMULATED',
        message: 'تم استلام طلبك',
      });
    }

    const doc = await PublicJobApplication.create({
      jobId: clean(body.jobId, 80),
      jobTitle: clean(body.jobTitle, 160),
      fullName: clean(body.fullName, 160),
      phone: clean(body.phone, 25),
      email: clean(body.email, 160).toLowerCase(),
      yearsExperience: Math.max(0, Math.min(50, Number(body.yearsExperience) || 0)),
      currentRole: clean(body.currentRole, 160),
      highestEducation: clean(body.highestEducation, 160),
      certifications: clean(body.certifications, 500),
      linkedinUrl: clean(body.linkedinUrl, 300),
      coverLetter: clean(body.coverLetter, 3000),
      source: 'careers-page',
      ipHash: hashIp(req.ip || req.connection?.remoteAddress),
      userAgent: clean(req.get('user-agent') || '', 500),
      consentDataProcessing: Boolean(body.consentDataProcessing),
    });

    logger.info('[careers] application received', {
      id: doc._id.toString(),
      ref: doc.referenceNumber,
      jobId: doc.jobId,
      email: doc.email,
    });

    res.status(201).json({
      success: true,
      referenceNumber: doc.referenceNumber,
      message: 'تم استلام طلبك بنجاح. سيتواصل معك فريق التوظيف خلال 5 أيام عمل.',
    });
  } catch (err) {
    if (err?.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: err.message });
    }
    return safeError(res, err, 'careers.apply');
  }
});

// ── GET /admin (staff-only) ─────────────────────────────────────────────────
router.get('/admin', authenticateToken, requireRole(HR_ROLES), async (req, res) => {
  try {
    const { status, jobId, q, page = 1, limit = 25 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (jobId) filter.jobId = jobId;
    if (q && typeof q === 'string' && q.trim()) {
      const rx = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [
        { fullName: rx },
        { email: rx },
        { phone: rx },
        { referenceNumber: rx },
        { jobTitle: rx },
      ];
    }
    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 25));
    const [items, total] = await Promise.all([
      PublicJobApplication.find(filter)
        .sort({ createdAt: -1 })
        .skip((p - 1) * l)
        .limit(l)
        .lean(),
      PublicJobApplication.countDocuments(filter),
    ]);
    res.json({
      success: true,
      items,
      pagination: { page: p, limit: l, total, pages: Math.ceil(total / l) },
    });
  } catch (err) {
    return safeError(res, err, 'careers.admin.list');
  }
});

// ── PATCH /admin/:id/status ─────────────────────────────────────────────────
router.patch('/admin/:id/status', authenticateToken, requireRole(HR_ROLES), async (req, res) => {
  try {
    const { status, reviewNotes } = req.body || {};
    if (!status || !PublicJobApplication.STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: 'حالة غير صالحة' });
    }
    const update = { status };
    if (typeof reviewNotes === 'string') update.reviewNotes = reviewNotes.slice(0, 4000);
    if (req.user?.id) update.reviewedBy = req.user.id;
    const doc = await PublicJobApplication.findByIdAndUpdate(req.params.id, update, {
      new: true,
    }).lean();
    if (!doc) return res.status(404).json({ success: false, message: 'الطلب غير موجود' });
    res.json({ success: true, item: doc });
  } catch (err) {
    return safeError(res, err, 'careers.admin.updateStatus');
  }
});

module.exports = router;
