/**
 * reports-inbox.routes.js — portal-facing inbox for delivered reports.
 *
 * Phase 10 Commit 4.
 *
 * Mount pattern:
 *
 *   app.use(
 *     '/api/v1/reports/inbox',
 *     authenticateToken,
 *     buildRouter({ DeliveryModel, artifactStore, urlSigner, logger }),
 *   );
 *
 * Endpoints:
 *   GET    /inbox                 — list current user's deliveries
 *   GET    /inbox/:id             — fetch one (does NOT flip read)
 *   POST   /inbox/:id/seen        — explicit read receipt (records access)
 *   GET    /inbox/:id/download    — returns a signed download URL
 *
 * Authorization contract (enforced here as a second layer on top of
 * whatever upstream middleware applied):
 *   - Non-admin callers only see deliveries where `recipientId` matches
 *     the authenticated user id.
 *   - Admins (`req.user.role === 'admin' || L1 || L2`) can pass a
 *     `?recipientId=...` override.
 *   - Confidential deliveries require an authenticated session with a
 *     non-null user id.
 */

'use strict';

const express = require('express');

const ADMIN_ROLES = new Set(['admin', 'L1', 'L2', 'ceo', 'coo']);

function asyncWrap(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

function currentUserId(req) {
  return req.user && (req.user.id || req.user._id || req.user.userId);
}

function isAdmin(req) {
  return !!(req.user && (ADMIN_ROLES.has(req.user.role) || req.user.isAdmin));
}

function assertCanAccess(delivery, req) {
  if (!delivery) return { ok: false, status: 404, error: 'not_found' };
  const uid = currentUserId(req);
  if (isAdmin(req)) return { ok: true };
  if (!uid) return { ok: false, status: 401, error: 'unauthenticated' };
  if (String(delivery.recipientId) !== String(uid)) {
    return { ok: false, status: 403, error: 'forbidden' };
  }
  // Confidential reports: require a "real" authenticated user (we're
  // already there by the uid check — extra belt on the suspenders).
  if (delivery.confidentiality === 'confidential' && !uid) {
    return { ok: false, status: 403, error: 'forbidden_confidential' };
  }
  return { ok: true };
}

function buildRouter({ DeliveryModel, artifactStore, urlSigner, logger = console } = {}) {
  if (!DeliveryModel) throw new Error('reports-inbox.routes: DeliveryModel required');
  const router = express.Router();
  const Model = DeliveryModel.model || DeliveryModel;

  // ─── LIST ────────────────────────────────────────────────────
  router.get(
    '/',
    asyncWrap(async (req, res) => {
      const { unreadOnly, channel, reportId, limit = '50' } = req.query || {};
      const filter = {};
      const uid = currentUserId(req);
      const recipientId = isAdmin(req) ? req.query.recipientId || uid : uid;
      if (!recipientId) return res.status(401).json({ error: 'unauthenticated' });
      filter.recipientId = recipientId;
      if (unreadOnly === 'true' || unreadOnly === '1') filter.readAt = null;
      if (channel) filter.channel = channel;
      if (reportId) filter.reportId = reportId;
      // Hide cancelled from end-users; admins see everything.
      if (!isAdmin(req)) filter.status = { $ne: 'CANCELLED' };
      const lim = Math.min(200, parseInt(limit, 10) || 50);
      const docs = await Model.find(filter).sort({ createdAt: -1 }).limit(lim);
      const unread = docs.filter(d => !d.readAt).length;
      return res.json({ count: docs.length, unread, deliveries: docs });
    })
  );

  // ─── VIEW (does NOT flip read) ───────────────────────────────
  router.get(
    '/:id',
    asyncWrap(async (req, res) => {
      const doc = await Model.findById(req.params.id);
      const check = assertCanAccess(doc, req);
      if (!check.ok) return res.status(check.status).json({ error: check.error });
      return res.json(doc);
    })
  );

  // ─── MARK READ (explicit receipt) ────────────────────────────
  router.post(
    '/:id/seen',
    asyncWrap(async (req, res) => {
      const doc = await Model.findById(req.params.id);
      const check = assertCanAccess(doc, req);
      if (!check.ok) return res.status(check.status).json({ error: check.error });
      if (typeof doc.isTerminal === 'function' && doc.isTerminal()) {
        return res.json({ ok: true, delivery: doc, alreadyTerminal: true });
      }
      if (typeof doc.recordAccess === 'function') {
        doc.recordAccess({
          at: new Date(),
          actor: currentUserId(req),
          action: 'view',
          ip: req.ip,
          userAgent: req.get && req.get('user-agent'),
        });
      } else if (typeof doc.markRead === 'function') {
        doc.markRead();
      }
      if (typeof doc.save === 'function') await doc.save();
      return res.json({ ok: true, delivery: doc });
    })
  );

  // ─── DOWNLOAD ────────────────────────────────────────────────
  router.get(
    '/:id/download',
    asyncWrap(async (req, res) => {
      const doc = await Model.findById(req.params.id);
      const check = assertCanAccess(doc, req);
      if (!check.ok) return res.status(check.status).json({ error: check.error });
      const uri = doc.artifactUri;
      if (!uri) return res.status(404).json({ error: 'no_artifact' });
      // If a signer is wired, hand back a signed URL; otherwise stream
      // directly via artifactStore.fetch (tests inject fakes).
      if (urlSigner && typeof urlSigner.sign === 'function') {
        try {
          const signed = await urlSigner.sign({
            uri,
            ttlSeconds: 15 * 60,
            reportId: doc.reportId,
            recipientId: String(doc.recipientId),
          });
          // Record the access BEFORE redirecting.
          if (typeof doc.recordAccess === 'function') {
            doc.recordAccess({
              at: new Date(),
              actor: currentUserId(req),
              action: 'download',
              ip: req.ip,
              userAgent: req.get && req.get('user-agent'),
            });
            if (typeof doc.save === 'function') await doc.save();
          }
          return res.json({ url: signed.url, expiresAt: signed.expiresAt });
        } catch (err) {
          logger.warn && logger.warn(`inbox download sign failed: ${err.message}`);
          return res.status(502).json({ error: 'signer_failed' });
        }
      }
      // Fallback: if artifactStore.fetch exists, stream bytes.
      if (artifactStore && typeof artifactStore.fetch === 'function') {
        try {
          const blob = await artifactStore.fetch(uri);
          if (!blob || !blob.content) {
            return res.status(404).json({ error: 'artifact_missing' });
          }
          if (typeof doc.recordAccess === 'function') {
            doc.recordAccess({
              at: new Date(),
              actor: currentUserId(req),
              action: 'download',
              ip: req.ip,
            });
            if (typeof doc.save === 'function') await doc.save();
          }
          res.set('Content-Type', blob.contentType || 'application/pdf');
          res.set('Content-Disposition', `attachment; filename="${blob.filename || 'report.pdf'}"`);
          return res.send(blob.content);
        } catch (err) {
          logger.warn && logger.warn(`inbox download fetch failed: ${err.message}`);
          return res.status(502).json({ error: 'artifact_fetch_failed' });
        }
      }
      return res.status(501).json({ error: 'no_signer_or_store' });
    })
  );

  return router;
}

module.exports = { buildRouter, assertCanAccess, asyncWrap };
