/**
 * Public Forms — fill+submit WITHOUT authentication.
 *
 * Phase 29 Commit 2. Lets website visitors submit a controlled subset of
 * forms (those flagged `isPublic: true` on FormTemplate). Used for
 * complaint / suggestion / intake-style submissions linked from the
 * public landing page.
 *
 *   GET    /api/v1/public/forms                 list public templates
 *   GET    /api/v1/public/forms/:templateId     single template (public only)
 *   POST   /api/v1/public/forms/:templateId/submit   create FormSubmission
 *
 * Mount: app.use('/api/v1/public/forms', router)
 *
 * Hardening:
 *   - Only `isPublic: true && isActive: true` templates are exposed
 *   - Per-IP rate limit: 10 submissions / 10 minutes (in-memory)
 *   - submittedBy.userId is null; we capture name/phone/email from the
 *     submission data so admins can follow up
 *   - Submitter gets a `submissionNumber` (ticket id) as the response so
 *     they can reference it in follow-ups
 */

'use strict';

const express = require('express');
const FormTemplate = require('../models/FormTemplate');
const FormSubmission = require('../models/FormSubmission');

const router = express.Router();

// ─── In-memory rate limiter (per IP) ─────────────────────────────────────────
// Buckets reset every 10 minutes. For a multi-instance deploy swap to redis.

const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 10;
const buckets = new Map(); // ip → { count, windowStart }

function rateLimit(req, res, next) {
  const ip =
    req.headers['x-forwarded-for']?.toString().split(',')[0].trim() ||
    req.ip ||
    req.connection?.remoteAddress ||
    'unknown';
  const now = Date.now();
  let b = buckets.get(ip);
  if (!b || now - b.windowStart > RATE_WINDOW_MS) {
    b = { count: 0, windowStart: now };
    buckets.set(ip, b);
  }
  b.count += 1;
  if (b.count > RATE_MAX) {
    res.set('Retry-After', String(Math.ceil((b.windowStart + RATE_WINDOW_MS - now) / 1000)));
    return res.status(429).json({
      ok: false,
      error: 'RATE_LIMITED',
      message: 'تجاوزت العدد المسموح من الإرسالات. حاول لاحقاً.',
    });
  }
  next();
}

// Periodic cleanup so the Map doesn't grow unbounded
setInterval(() => {
  const cutoff = Date.now() - RATE_WINDOW_MS * 2;
  for (const [ip, b] of buckets.entries()) {
    if (b.windowStart < cutoff) buckets.delete(ip);
  }
}, RATE_WINDOW_MS).unref?.();

// ─── Public read ─────────────────────────────────────────────────────────────

router.get('/', async (_req, res) => {
  try {
    const templates = await FormTemplate.find({
      isPublic: true,
      isActive: true,
    })
      .select('templateId name nameEn description category subcategory icon tags')
      .sort({ name: 1 })
      .lean();
    res.set('Cache-Control', 'public, max-age=120');
    res.json({ ok: true, templates });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ─── Public track (no auth, by submission number) ───────────────────────────
//
// Visitor submitted via /forms/[id], got back a PUB-XXXX number, and now
// wants to check status. Returns ONLY non-PII metadata: status, dates,
// template name, approval progress. Never returns submission `data` (which
// can contain phone/email/diagnoses/etc) or the submitter object.
//
// Defense-in-depth: submissionNumbers are PUB-{base36-time}-{4-base36-rand}
// (~37 bits of entropy), so guessing is expensive. Rate-limit lookups too.

const trackBuckets = new Map(); // ip → { count, windowStart }
const TRACK_WINDOW_MS = 60 * 1000;
const TRACK_MAX = 30;

function trackRateLimit(req, res, next) {
  const ip = req.headers['x-forwarded-for']?.toString().split(',')[0].trim() || req.ip || 'unknown';
  const now = Date.now();
  let b = trackBuckets.get(ip);
  if (!b || now - b.windowStart > TRACK_WINDOW_MS) {
    b = { count: 0, windowStart: now };
    trackBuckets.set(ip, b);
  }
  b.count += 1;
  if (b.count > TRACK_MAX) {
    return res.status(429).json({ ok: false, error: 'RATE_LIMITED' });
  }
  next();
}

router.get('/track/:submissionNumber', trackRateLimit, async (req, res) => {
  try {
    const num = String(req.params.submissionNumber || '').trim();
    // Only PUB- prefixed numbers are visible to the public lookup
    if (!/^PUB-[a-z0-9-]+$/i.test(num)) {
      return res.status(400).json({ ok: false, error: 'INVALID_NUMBER' });
    }
    const sub = await FormSubmission.findOne({ submissionNumber: num })
      .select(
        'submissionNumber templateName status priority submittedAt approvals currentApprovalStep rejectionReason returnReason createdAt updatedAt'
      )
      .lean();
    if (!sub) {
      return res.status(404).json({ ok: false, error: 'NOT_FOUND' });
    }
    const approvalsPublic = (sub.approvals || []).map(a => ({
      step: a.step,
      label: a.label,
      status: a.status,
      date: a.date,
    }));
    res.set('Cache-Control', 'no-store');
    res.json({
      ok: true,
      submission: {
        submissionNumber: sub.submissionNumber,
        templateName: sub.templateName,
        status: sub.status,
        priority: sub.priority,
        submittedAt: sub.submittedAt || sub.createdAt,
        updatedAt: sub.updatedAt,
        approvals: approvalsPublic,
        currentApprovalStep: sub.currentApprovalStep,
        rejectionReason: sub.rejectionReason,
        returnReason: sub.returnReason,
      },
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

setInterval(() => {
  const cutoff = Date.now() - TRACK_WINDOW_MS * 4;
  for (const [ip, b] of trackBuckets.entries()) {
    if (b.windowStart < cutoff) trackBuckets.delete(ip);
  }
}, TRACK_WINDOW_MS).unref?.();

router.get('/:templateId', async (req, res) => {
  try {
    let tpl = await FormTemplate.findOne({
      templateId: req.params.templateId,
      isPublic: true,
      isActive: true,
    }).lean();
    if (!tpl && /^[0-9a-fA-F]{24}$/.test(req.params.templateId)) {
      tpl = await FormTemplate.findOne({
        _id: req.params.templateId,
        isPublic: true,
        isActive: true,
      }).lean();
    }
    if (!tpl) {
      return res.status(404).json({ ok: false, error: 'NOT_PUBLIC_OR_NOT_FOUND' });
    }
    res.set('Cache-Control', 'public, max-age=120');
    res.json({ ok: true, template: tpl });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ─── Public submit (rate-limited) ────────────────────────────────────────────

router.post('/:templateId/submit', rateLimit, async (req, res) => {
  try {
    let tpl = await FormTemplate.findOne({
      templateId: req.params.templateId,
      isPublic: true,
      isActive: true,
    });
    if (!tpl && /^[0-9a-fA-F]{24}$/.test(req.params.templateId)) {
      tpl = await FormTemplate.findOne({
        _id: req.params.templateId,
        isPublic: true,
        isActive: true,
      });
    }
    if (!tpl) {
      return res.status(404).json({ ok: false, error: 'NOT_PUBLIC_OR_NOT_FOUND' });
    }

    const data = req.body?.data || {};

    // Capture submitter contact info from the form payload so the admin
    // can follow up. We try common field names — the catalog uses these.
    const submitterName =
      data.submitter_name ||
      data.full_name_ar ||
      data.full_name ||
      data.guardian_name ||
      data.name ||
      'زائر مجهول';
    const submitterPhone = data.phone || data.submitter_phone || data.contact_phone || null;
    const submitterEmail = data.email || data.submitter_email || null;

    const approvals = [];
    if (tpl.approvalWorkflow && tpl.approvalWorkflow.enabled) {
      const steps = (tpl.approvalWorkflow.steps || [])
        .slice()
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      steps.forEach((s, i) => {
        approvals.push({ step: i, role: s.role, label: s.label || s.role, status: 'pending' });
      });
    }

    const submissionNumber = `PUB-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 6)
      .toUpperCase()}`;

    const sub = await FormSubmission.create({
      templateId: tpl.templateId || String(tpl._id),
      templateName: tpl.name,
      templateVersion: tpl.version || 1,
      submissionNumber,
      submittedBy: {
        // userId stays null — the visitor isn't authenticated
        name: submitterName,
        email: submitterEmail,
        phone: submitterPhone,
        role: 'public',
      },
      data,
      status: approvals.length > 0 ? 'under_review' : 'submitted',
      priority: 'normal',
      approvals,
      currentApprovalStep: 0,
      currentRevision: 1,
      submittedAt: new Date(),
    });

    res.status(201).json({
      ok: true,
      submissionNumber: sub.submissionNumber,
      message: 'تم استلام طلبك. شكراً لك.',
      messageEn: 'Your submission was received. Thank you.',
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
