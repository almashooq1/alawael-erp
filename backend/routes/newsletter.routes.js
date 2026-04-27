/**
 * Newsletter — simple email capture for marketing updates.
 *
 * POST /api/newsletter/subscribe       — public, rate-limited (10/hour per IP).
 * POST /api/newsletter/unsubscribe     — public, marks email status = 'unsubscribed'.
 * GET  /api/newsletter/list            — admin only, paginated list.
 * GET  /api/newsletter/export.csv      — admin only, CSV of active subscribers.
 */

'use strict';

const express = require('express');
const crypto = require('crypto');
const router = express.Router();

const Newsletter = require('../models/NewsletterSubscription');
const { createCustomLimiter } = require('../middleware/rateLimiter');
const logger = require('../utils/logger');
const safeError = require('../utils/safeError');

let authenticate = null;
try {
  authenticate = require('../middleware/auth').authenticate;
} catch {
  /* optional */
}

function isAdmin(req) {
  const u = req.user || {};
  return ['admin', 'super_admin'].includes(u.role);
}

const limiter = createCustomLimiter({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'عدد كبير من المحاولات — حاول لاحقاً.' },
});

function hashIp(ip) {
  if (!ip) return undefined;
  return crypto.createHash('sha256').update(String(ip)).digest('hex').slice(0, 32);
}

router.post('/subscribe', limiter, async (req, res) => {
  try {
    const email = String(req.body?.email || '')
      .trim()
      .toLowerCase();
    const name = String(req.body?.name || '')
      .trim()
      .slice(0, 120);
    const locale = req.body?.locale === 'en' ? 'en' : 'ar';
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, message: 'بريد إلكتروني غير صالح' });
    }

    // Honeypot — hidden `website` field; silently succeed on bot submissions.
    if (req.body?.website && String(req.body.website).trim() !== '') {
      return res.status(200).json({ success: true, message: 'تم الاشتراك بنجاح' });
    }

    const doc = await Newsletter.findOneAndUpdate(
      { email },
      {
        $setOnInsert: {
          email,
          source: 'landing',
          locale,
          ipHash: hashIp(req.ip || req.connection?.remoteAddress),
        },
        $set: {
          name,
          status: 'active',
        },
        $unset: { unsubscribedAt: '' },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    logger.info('[newsletter] subscribe', { id: doc._id.toString(), email });

    res.status(200).json({
      success: true,
      message: 'تم اشتراكك بنجاح — ستصلك آخر أخبار مراكز الأوائل قريباً.',
    });
  } catch (err) {
    if (err?.code === 11000) {
      // Concurrent upsert — already subscribed. Treat as success.
      return res.status(200).json({ success: true, message: 'هذا البريد مشترك بالفعل.' });
    }
    return safeError(res, err, 'newsletter.subscribe');
  }
});

router.post('/unsubscribe', limiter, async (req, res) => {
  try {
    const email = String(req.body?.email || '')
      .trim()
      .toLowerCase();
    if (!email) return res.status(400).json({ success: false, message: 'البريد مطلوب' });
    await Newsletter.findOneAndUpdate(
      { email },
      { $set: { status: 'unsubscribed', unsubscribedAt: new Date() } }
    );
    res.json({ success: true, message: 'تم إلغاء الاشتراك.' });
  } catch (err) {
    return safeError(res, err, 'newsletter.unsubscribe');
  }
});

// ─── Admin (auth-gated) ────────────────────────────────────────────────────

if (authenticate) {
  router.use('/list', authenticate);
  router.use('/export.csv', authenticate);
}

router.get('/list', async (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ success: false, message: 'ADMIN_ONLY' });
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    const limit = Math.min(Number(req.query.limit) || 200, 1000);
    const items = await Newsletter.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
    const total = await Newsletter.countDocuments(filter);
    res.json({ success: true, subscribers: items, total });
  } catch (err) {
    return safeError(res, err, 'newsletter.list');
  }
});

router.get('/export.csv', async (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(403).send('Forbidden');
    const subs = await Newsletter.find({ status: 'active' })
      .select('email name source locale createdAt')
      .sort({ createdAt: 1 })
      .lean();
    const rows = [
      ['email', 'name', 'source', 'locale', 'subscribed_at'],
      ...subs.map(s => [
        s.email || '',
        s.name || '',
        s.source || '',
        s.locale || '',
        s.createdAt?.toISOString() || '',
      ]),
    ];
    const csv = rows
      .map(r =>
        r
          .map(c => {
            const v = String(c ?? '');
            return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
          })
          .join(',')
      )
      .join('\n');
    res.set('Content-Type', 'text/csv; charset=utf-8');
    res.set(
      'Content-Disposition',
      `attachment; filename="newsletter-${new Date().toISOString().slice(0, 10)}.csv"`
    );
    res.send('\uFEFF' + csv);
  } catch (err) {
    return safeError(res, err, 'newsletter.export');
  }
});

module.exports = router;
