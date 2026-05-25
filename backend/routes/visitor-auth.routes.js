/**
 * Visitor authentication via SMS/Email OTP — passwordless login.
 *
 *   POST /api/v1/public/visitor/request-otp   { contact }   send 6-digit OTP
 *   POST /api/v1/public/visitor/verify-otp    { contact, otp } return JWT + submissions list
 *
 * "contact" is an email or a phone (auto-detect by '@'). The OTP is
 * stored in-memory (Map) with a 5-min TTL — for multi-instance setups
 * swap to Redis. Verified callers get a short-lived JWT (24h) to use
 * with /my-submissions.
 *
 * Pattern: identical privacy posture to /forms/track — only PUB-numbers
 * the visitor actually submitted are returned, never PII of others.
 */

'use strict';

const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const FormSubmission = require('../models/FormSubmission');

let unifiedNotifier = null;
try {
  unifiedNotifier = require('../services/unifiedNotifier');
} catch {
  /* notifier optional — without it OTP is logged */
}

const router = express.Router();

// ── In-memory OTP store ────────────────────────────────────────────────────
const TTL_MS = 5 * 60 * 1000;
const otps = new Map(); // contact → { code, expiresAt, attempts }

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of otps.entries()) {
    if (v.expiresAt < now) otps.delete(k);
  }
}, 60 * 1000).unref?.();

// ── Per-IP rate limit ──────────────────────────────────────────────────────
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 5;
const buckets = new Map();
function rateLimit(req, res, next) {
  const ip = req.headers['x-forwarded-for']?.toString().split(',')[0].trim() || req.ip || 'unknown';
  const now = Date.now();
  let b = buckets.get(ip);
  if (!b || now - b.windowStart > RATE_WINDOW_MS) {
    b = { count: 0, windowStart: now };
    buckets.set(ip, b);
  }
  b.count += 1;
  if (b.count > RATE_MAX) {
    return res.status(429).json({ ok: false, error: 'RATE_LIMITED' });
  }
  next();
}

function normalize(c) {
  return String(c || '')
    .trim()
    .toLowerCase();
}

function isEmail(c) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c);
}

function isPhone(c) {
  return /^\+?\d[\d\s-]{6,}$/.test(c);
}

router.post('/request-otp', rateLimit, async (req, res) => {
  try {
    const contact = normalize(req.body?.contact);
    if (!contact) return res.status(400).json({ ok: false, error: 'CONTACT_REQUIRED' });
    if (!isEmail(contact) && !isPhone(contact)) {
      return res.status(400).json({ ok: false, error: 'INVALID_CONTACT' });
    }

    // Confirm the visitor actually has at least one PUB-* submission.
    // This avoids using the endpoint as an SMS oracle (sending OTPs to
    // arbitrary numbers).
    const filter = isEmail(contact)
      ? { 'submittedBy.email': contact, 'submittedBy.role': 'public' }
      : { 'submittedBy.phone': contact, 'submittedBy.role': 'public' };
    const exists = await FormSubmission.exists(filter);
    if (!exists) {
      // Pretend success so attackers can't enumerate which numbers used the platform.
      return res.json({
        ok: true,
        message: 'إذا كان لديك إرسالات سابقة بهذا الاتصال، ستصلك رسالة برمز.',
      });
    }

    const code = String(crypto.randomInt(100000, 1000000)); // 6 digits
    otps.set(contact, { code, expiresAt: Date.now() + TTL_MS, attempts: 0 });

    const body = `رمز الدخول: ${code}\n\nصالح لمدة 5 دقائق.\n— منصة العواعل`;
    if (unifiedNotifier?.notify) {
      const to = isEmail(contact) ? { email: contact } : { phone: contact };
      unifiedNotifier
        .notify({
          to,
          subject: 'رمز الدخول — منصة العواعل',
          body,
          priority: 'high',
          templateKey: 'visitor.login.otp',
        })
        .catch(err => console.warn('visitor-otp send failed:', err.message));
    } else {
      console.log(`[visitor-otp dev] ${contact} → ${code}`);
    }

    res.json({ ok: true, message: 'تم إرسال الرمز.' });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/verify-otp', rateLimit, async (req, res) => {
  try {
    const contact = normalize(req.body?.contact);
    const otp = String(req.body?.otp || '').trim();
    if (!contact || !otp) return res.status(400).json({ ok: false, error: 'MISSING_FIELDS' });
    const record = otps.get(contact);
    if (!record) return res.status(401).json({ ok: false, error: 'OTP_NOT_FOUND' });
    if (record.expiresAt < Date.now()) {
      otps.delete(contact);
      return res.status(401).json({ ok: false, error: 'OTP_EXPIRED' });
    }
    record.attempts = (record.attempts || 0) + 1;
    if (record.attempts > 5) {
      otps.delete(contact);
      return res.status(429).json({ ok: false, error: 'TOO_MANY_ATTEMPTS' });
    }
    if (record.code !== otp) {
      return res.status(401).json({ ok: false, error: 'INVALID_OTP' });
    }
    otps.delete(contact);

    const secret = process.env.JWT_SECRET || process.env.AUTH_SECRET || 'dev-fallback';
    const token = jwt.sign({ contact, role: 'visitor' }, secret, { expiresIn: '24h' });

    res.json({ ok: true, token, contact });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/my-submissions', async (req, res) => {
  try {
    const auth = req.headers.authorization || '';
    const m = /^Bearer (.+)$/.exec(auth);
    if (!m) return res.status(401).json({ ok: false, error: 'NO_TOKEN' });
    const secret = process.env.JWT_SECRET || process.env.AUTH_SECRET || 'dev-fallback';
    let payload;
    try {
      payload = jwt.verify(m[1], secret, { algorithms: ['HS256'] });
    } catch {
      return res.status(401).json({ ok: false, error: 'INVALID_TOKEN' });
    }
    if (payload.role !== 'visitor' || !payload.contact) {
      return res.status(401).json({ ok: false, error: 'NOT_VISITOR_TOKEN' });
    }
    const filter = isEmail(payload.contact)
      ? { 'submittedBy.email': payload.contact, 'submittedBy.role': 'public' }
      : { 'submittedBy.phone': payload.contact, 'submittedBy.role': 'public' };
    const subs = await FormSubmission.find(filter)
      .select(
        'submissionNumber templateName status priority submittedAt approvals currentApprovalStep rejectionReason returnReason createdAt updatedAt'
      )
      .sort({ submittedAt: -1, createdAt: -1 })
      .limit(100)
      .lean();
    res.json({ ok: true, contact: payload.contact, submissions: subs });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
