/**
 * WebPush — staff browser/device subscriptions.
 *
 *   GET    /api/v1/push/vapid-public-key   public — VAPID app key for subscribe
 *   POST   /api/v1/push/subscribe          auth — register the subscription
 *   POST   /api/v1/push/unsubscribe        auth — remove by endpoint
 *   POST   /api/v1/push/test               admin — send a test push to caller
 *
 * Real delivery requires the `web-push` npm package + VAPID keys set in env:
 *   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:)
 *
 * Generate keys: `npx web-push generate-vapid-keys`.
 *
 * If web-push isn't installed or env vars are missing, subscribe still
 * works (subscriptions are saved) — only the actual send is skipped.
 */

'use strict';

const express = require('express');
const PushSubscription = require('../models/PushSubscription');
const safeError = require('../utils/safeError');

let webpush = null;
try {
  webpush = require('web-push');
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT) {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT,
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
  } else {
    webpush = null; // not configured
  }
} catch {
  /* web-push not installed; subscribe-only mode */
}

let auth = null;
try {
  auth = require('../middleware/auth').authenticate;
} catch {
  /* optional */
}

const publicRouter = express.Router();
const authRouter = express.Router();
if (auth) authRouter.use(auth);

publicRouter.get('/vapid-public-key', (_req, res) => {
  res.json({ ok: true, key: process.env.VAPID_PUBLIC_KEY || null });
});

authRouter.post('/subscribe', async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return res.status(401).json({ ok: false, error: 'NO_USER' });
    const { endpoint, keys, userAgent } = req.body || {};
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ ok: false, error: 'INVALID_SUBSCRIPTION' });
    }
    const sub = await PushSubscription.findOneAndUpdate(
      { endpoint },
      {
        $set: {
          userId,
          keys,
          userAgent: userAgent?.toString().slice(0, 300),
          enabled: true,
          failureCount: 0,
          lastError: '',
        },
      },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );
    res.json({ ok: true, subscription: { id: sub._id } });
  } catch (err) {
    return safeError(res, err, 'push', { shape: 'ok' });
  }
});

authRouter.post('/unsubscribe', async (req, res) => {
  try {
    const { endpoint } = req.body || {};
    if (!endpoint) return res.status(400).json({ ok: false, error: 'ENDPOINT_REQUIRED' });
    await PushSubscription.deleteOne({ endpoint });
    res.json({ ok: true });
  } catch (err) {
    return safeError(res, err, 'push', { shape: 'ok' });
  }
});

// Admin list of all push subscriptions across users.
authRouter.get('/subscriptions', async (req, res) => {
  try {
    const u = req.user || {};
    if (!['admin', 'super_admin'].includes(u.role)) {
      return res.status(403).json({ ok: false, error: 'ADMIN_ONLY' });
    }
    const subs = await PushSubscription.find({})
      .select('-keys')
      .populate({ path: 'userId', select: 'name email role' })
      .sort({ createdAt: -1 })
      .lean();
    res.json({ ok: true, subscriptions: subs });
  } catch (err) {
    return safeError(res, err, 'push', { shape: 'ok' });
  }
});

authRouter.patch('/subscriptions/:id', async (req, res) => {
  try {
    const u = req.user || {};
    if (!['admin', 'super_admin'].includes(u.role)) {
      return res.status(403).json({ ok: false, error: 'ADMIN_ONLY' });
    }
    if (!/^[0-9a-fA-F]{24}$/.test(req.params.id))
      return res.status(400).json({ ok: false, error: 'INVALID_ID' });
    const update = {};
    if (typeof req.body?.enabled === 'boolean') update.enabled = req.body.enabled;
    const sub = await PushSubscription.findByIdAndUpdate(
      req.params.id,
      { $set: update },
      { returnDocument: 'after' }
    ).select('-keys');
    if (!sub) return res.status(404).json({ ok: false, error: 'NOT_FOUND' });
    res.json({ ok: true, subscription: sub });
  } catch (err) {
    return safeError(res, err, 'push', { shape: 'ok' });
  }
});

authRouter.delete('/subscriptions/:id', async (req, res) => {
  try {
    const u = req.user || {};
    if (!['admin', 'super_admin'].includes(u.role)) {
      return res.status(403).json({ ok: false, error: 'ADMIN_ONLY' });
    }
    if (!/^[0-9a-fA-F]{24}$/.test(req.params.id))
      return res.status(400).json({ ok: false, error: 'INVALID_ID' });
    await PushSubscription.deleteOne({ _id: req.params.id });
    res.json({ ok: true });
  } catch (err) {
    return safeError(res, err, 'push', { shape: 'ok' });
  }
});

authRouter.post('/test', async (req, res) => {
  try {
    const u = req.user || {};
    if (!['admin', 'super_admin'].includes(u.role)) {
      return res.status(403).json({ ok: false, error: 'ADMIN_ONLY' });
    }
    const subs = await PushSubscription.find({ userId: u._id || u.id, enabled: true }).lean();
    if (subs.length === 0) {
      return res.status(404).json({ ok: false, error: 'NO_SUBSCRIPTIONS' });
    }
    if (!webpush) {
      return res.status(503).json({
        ok: false,
        error: 'WEBPUSH_NOT_CONFIGURED',
        hint: 'install web-push and set VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT',
      });
    }
    let sent = 0;
    for (const s of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: s.keys },
          JSON.stringify({
            title: 'منصة العواعل',
            body: 'هذا اختبار تنبيه. يصلك إشعار عند ورود طلبات جديدة.',
            url: '/admin/dashboard',
          })
        );
        sent += 1;
      } catch (err) {
        s.failureCount = (s.failureCount || 0) + 1;
        s.lastError = err.message?.slice(0, 300);
        await PushSubscription.updateOne({ _id: s._id }, { $set: s });
      }
    }
    res.json({ ok: true, sent, total: subs.length });
  } catch (err) {
    return safeError(res, err, 'push', { shape: 'ok' });
  }
});

module.exports = { publicRouter, authRouter, sendToAdmins };

// Combined router for safeMount (mounts public + auth routes on the same prefix)
const _combined = require('express').Router();
_combined.use(publicRouter);
_combined.use(authRouter);
module.exports = _combined;
module.exports.publicRouter = publicRouter;
module.exports.authRouter = authRouter;
module.exports.sendToAdmins = sendToAdmins;

/**
 * Helper for other routes to push a notification to all admins with active
 * subscriptions. Called best-effort from public-forms on new submission.
 */
async function sendToAdmins({ title, body, url }) {
  if (!webpush) return { sent: 0, skipped: true, reason: 'webpush_not_configured' };
  const subs = await PushSubscription.find({ enabled: true })
    .populate({ path: 'userId', select: 'role' })
    .lean();
  const adminSubs = subs.filter(s => ['admin', 'super_admin'].includes(s.userId?.role));
  let sent = 0;
  for (const s of adminSubs) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: s.keys },
        JSON.stringify({ title, body, url })
      );
      sent += 1;
    } catch (err) {
      // Subscription may be expired (410). Disable on 410/404.
      if (err.statusCode === 410 || err.statusCode === 404) {
        await PushSubscription.updateOne(
          { _id: s._id },
          { $set: { enabled: false, lastError: 'gone' } }
        );
      }
    }
  }
  return { sent, total: adminSubs.length };
}
