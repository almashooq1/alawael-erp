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

let unifiedNotifier = null;
try {
  unifiedNotifier = require('../services/unifiedNotifier');
} catch {
  /* notifier optional */
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

    // Welcome email — fire-and-forget so a slow SMTP doesn't delay the
    // response. Skipped if the row already existed (no $setOnInsert hit
    // means consent was already given before).
    const wasInserted =
      doc.createdAt && Math.abs(Date.now() - new Date(doc.createdAt).getTime()) < 5000;
    if (wasInserted && unifiedNotifier?.notify) {
      const greet = name ? `مرحباً ${name}،` : 'مرحباً،';
      const body = [
        greet,
        '',
        'شكراً لاشتراكك في نشرة العواعل البريدية.',
        'ستصلك آخر الأخبار والفعاليات والبرامج الجديدة عبر هذا البريد.',
        '',
        'لإلغاء الاشتراك في أي وقت، استخدم الرابط في تذييل الرسائل القادمة.',
        '',
        '— منصة العواعل لإعادة التأهيل',
        'https://alaweal.org',
      ].join('\n');
      unifiedNotifier
        .notify({
          to: { email },
          subject: 'مرحباً بك في نشرة العواعل',
          body,
          templateKey: 'newsletter.welcome',
          metadata: { subscriberId: String(doc._id) },
        })
        .catch(err => logger.warn('newsletter welcome notify failed:', err.message));
    }
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

// ─── Broadcast (admin) ─────────────────────────────────────────────────────
//
// Sends a one-off message to every active subscriber via unifiedNotifier.
// Best-effort, fire-and-forget per recipient — the response returns the
// queued count immediately so the UI can show "تم الإرسال إلى N مشترك"
// without waiting on every SMTP/SMS delivery.

if (authenticate) router.use('/broadcast', authenticate);

router.post('/broadcast', async (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ success: false, message: 'ADMIN_ONLY' });
    const subject = (req.body?.subject || '').toString().trim().slice(0, 200);
    const body = (req.body?.body || '').toString().trim().slice(0, 4000);
    if (!subject || !body) {
      return res.status(400).json({ success: false, message: 'subject وbody مطلوبان' });
    }
    if (!unifiedNotifier?.notify) {
      return res
        .status(503)
        .json({ success: false, message: 'unifiedNotifier غير متاح على هذا الخادم' });
    }
    const subs = await Newsletter.find({ status: 'active' }).select('email name').lean();
    res.json({
      success: true,
      queued: subs.length,
      message: `تم وضع ${subs.length} رسالة في القائمة`,
    });

    // Background dispatch — bounded concurrency so we don't slam SMTP.
    let i = 0;
    const concurrency = 5;
    async function worker() {
      while (i < subs.length) {
        const s = subs[i++];
        if (!s.email) continue;
        const personalized = body.replace(/\{name\}/g, s.name || 'صديقنا الكريم');
        try {
          await unifiedNotifier.notify({
            to: { email: s.email },
            subject,
            body: personalized,
            templateKey: 'newsletter.broadcast',
          });
        } catch (err) {
          logger.warn('newsletter broadcast send failed', { email: s.email, error: err.message });
        }
      }
    }
    Promise.all(Array.from({ length: concurrency }, () => worker())).catch(() => {});
  } catch (err) {
    return safeError(res, err, 'newsletter.broadcast');
  }
});

module.exports = router;
