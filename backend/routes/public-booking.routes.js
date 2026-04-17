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
const logger = require('../utils/logger');
const safeError = require('../utils/safeError');

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

module.exports = router;
