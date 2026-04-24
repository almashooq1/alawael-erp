'use strict';

/**
 * hr-webhooks.routes.js — Phase 11 Commit 36 (4.0.53).
 *
 * Admin CRUD over HR webhook subscriptions. The dispatcher (C35)
 * reads this table to figure out where to POST hr.* events; this
 * route is how ops onboards a new receiver (SIEM, Slack bridge,
 * custom alerting) without touching the DB directly.
 *
 *   GET    /api/v1/hr/webhooks/subscriptions                — list
 *   POST   /api/v1/hr/webhooks/subscriptions                — create
 *   GET    /api/v1/hr/webhooks/subscriptions/:id            — detail
 *   PATCH  /api/v1/hr/webhooks/subscriptions/:id            — partial update
 *   DELETE /api/v1/hr/webhooks/subscriptions/:id            — soft-delete
 *   POST   /api/v1/hr/webhooks/subscriptions/:id/rotate-secret
 *
 * Authorization:
 *
 *   MANAGER tier required on EVERY endpoint. Webhooks egress HR
 *   events — including potentially sensitive anomaly payloads — to
 *   external URLs. Configuring one is a security-critical action
 *   that belongs to the governance tier, not line officers.
 *
 * Secret handling:
 *
 *   `hmac_secret` is WRITE-ONLY in the API surface. It is returned
 *   ONCE on create + rotate-secret responses and NEVER on list/get.
 *   The caller must copy it at the moment of creation; if lost, they
 *   rotate and issue a new one to the receiver. This matches how
 *   GitHub/Stripe expose webhook signing secrets.
 *
 *   On rotate, the old secret is overwritten immediately — receivers
 *   that still expect the old one will start failing signature
 *   verification until they pick up the new one. That's intentional;
 *   rotation is a security operation, not a hot-swap.
 *
 * Validation:
 *
 *   - `target_url` must be a well-formed URL. We do NOT enforce
 *     https at this layer (tests + dev use http://localhost); the
 *     admin UI should warn before accepting plain http.
 *   - `event_types` is an array of hr.* strings. Empty means
 *     "subscribe to all" — explicitly allowed.
 *   - `hmac_secret` on create: caller-supplied OR auto-generated
 *     if omitted. Minimum 16 chars when supplied.
 */

const express = require('express');
const crypto = require('crypto');
const mongoose = require('mongoose');

const { writeTierForRole } = require('../../config/hr-admin-editable-fields');

const MIN_SECRET_LEN = 16;
const DEFAULT_SECRET_BYTES = 32; // 64 hex chars

function generateSecret() {
  return crypto.randomBytes(DEFAULT_SECRET_BYTES).toString('hex');
}

function isValidUrl(s) {
  if (typeof s !== 'string' || !s) return false;
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function toPublicView(sub) {
  if (!sub) return null;
  const o = typeof sub.toObject === 'function' ? sub.toObject() : { ...sub };
  delete o.hmac_secret;
  delete o.__v;
  return o;
}

function createHrWebhooksRouter({ subscriptionModel, logger = console } = {}) {
  if (subscriptionModel == null) {
    throw new Error('createHrWebhooksRouter: subscriptionModel is required');
  }
  const router = express.Router();

  function requireManager(req, res) {
    if (!req.user) {
      res.status(401).json({ error: 'auth required' });
      return false;
    }
    if (writeTierForRole(req.user.role) !== 'manager') {
      res.status(403).json({ error: 'requires manager tier' });
      return false;
    }
    return true;
  }

  // ───── GET /webhooks/subscriptions ─────────────────────────

  router.get('/webhooks/subscriptions', async (req, res) => {
    try {
      if (!requireManager(req, res)) return;

      const q = { deleted_at: null };
      if (req.query.is_active === 'true') q.is_active = true;
      if (req.query.is_active === 'false') q.is_active = false;
      if (typeof req.query.event_type === 'string' && req.query.event_type) {
        q.$or = [{ event_types: req.query.event_type }, { event_types: { $size: 0 } }];
      }

      const limit = Math.min(Number.parseInt(req.query.limit || '50', 10) || 50, 200);
      const skip = Math.max(Number.parseInt(req.query.skip || '0', 10) || 0, 0);

      const [items, total] = await Promise.all([
        subscriptionModel.find(q).sort({ createdAt: -1 }).limit(limit).skip(skip).lean(),
        subscriptionModel.countDocuments(q),
      ]);

      return res.json({
        items: items.map(toPublicView),
        total,
        limit,
        skip,
      });
    } catch (err) {
      logger.error && logger.error('[HrWebhooks:list]', err.message || err);
      return res.status(500).json({ error: 'list failed' });
    }
  });

  // ───── POST /webhooks/subscriptions ────────────────────────

  router.post('/webhooks/subscriptions', async (req, res) => {
    try {
      if (!requireManager(req, res)) return;

      const body = req.body || {};
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      const target_url = typeof body.target_url === 'string' ? body.target_url.trim() : '';
      const event_types = Array.isArray(body.event_types)
        ? body.event_types.filter(s => typeof s === 'string' && s)
        : [];
      const is_active = body.is_active !== false;
      let hmac_secret = typeof body.hmac_secret === 'string' ? body.hmac_secret : null;

      if (!name) return res.status(400).json({ error: 'name required' });
      if (!isValidUrl(target_url)) {
        return res.status(400).json({ error: 'target_url must be http(s) URL' });
      }
      if (hmac_secret != null) {
        if (hmac_secret.length < MIN_SECRET_LEN) {
          return res.status(400).json({
            error: `hmac_secret must be at least ${MIN_SECRET_LEN} chars`,
          });
        }
      } else {
        hmac_secret = generateSecret();
      }

      const created = await subscriptionModel.create({
        name,
        target_url,
        hmac_secret,
        event_types,
        is_active,
        created_by: req.user.id || req.user._id || null,
      });

      // Single time the secret is returned — callers must copy it now.
      return res.status(201).json({
        subscription: toPublicView(created),
        hmac_secret,
      });
    } catch (err) {
      logger.error && logger.error('[HrWebhooks:create]', err.message || err);
      return res.status(500).json({ error: 'create failed' });
    }
  });

  // ───── GET /webhooks/subscriptions/:id ─────────────────────

  router.get('/webhooks/subscriptions/:id', async (req, res) => {
    try {
      if (!requireManager(req, res)) return;
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ error: 'invalid id' });
      }
      const doc = await subscriptionModel.findOne({ _id: req.params.id, deleted_at: null }).lean();
      if (!doc) return res.status(404).json({ error: 'not found' });
      return res.json({ subscription: toPublicView(doc) });
    } catch (err) {
      logger.error && logger.error('[HrWebhooks:detail]', err.message || err);
      return res.status(500).json({ error: 'detail failed' });
    }
  });

  // ───── PATCH /webhooks/subscriptions/:id ───────────────────

  router.patch('/webhooks/subscriptions/:id', async (req, res) => {
    try {
      if (!requireManager(req, res)) return;
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ error: 'invalid id' });
      }
      const body = req.body || {};
      const update = {};

      if (body.name !== undefined) {
        if (typeof body.name !== 'string' || !body.name.trim()) {
          return res.status(400).json({ error: 'name must be non-empty string' });
        }
        update.name = body.name.trim();
      }
      if (body.target_url !== undefined) {
        if (!isValidUrl(body.target_url)) {
          return res.status(400).json({ error: 'target_url must be http(s) URL' });
        }
        update.target_url = body.target_url.trim();
      }
      if (body.event_types !== undefined) {
        if (!Array.isArray(body.event_types)) {
          return res.status(400).json({ error: 'event_types must be array' });
        }
        update.event_types = body.event_types.filter(s => typeof s === 'string' && s);
      }
      if (body.is_active !== undefined) {
        update.is_active = Boolean(body.is_active);
      }

      // hmac_secret intentionally NOT accepted here — use rotate-secret.
      if (body.hmac_secret !== undefined) {
        return res.status(400).json({
          error: 'use /rotate-secret to change hmac_secret',
        });
      }

      if (Object.keys(update).length === 0) {
        return res.status(400).json({ error: 'no updatable fields' });
      }

      const doc = await subscriptionModel
        .findOneAndUpdate(
          { _id: req.params.id, deleted_at: null },
          { $set: update },
          { new: true, runValidators: true }
        )
        .lean();
      if (!doc) return res.status(404).json({ error: 'not found' });
      return res.json({ subscription: toPublicView(doc) });
    } catch (err) {
      logger.error && logger.error('[HrWebhooks:patch]', err.message || err);
      return res.status(500).json({ error: 'update failed' });
    }
  });

  // ───── DELETE /webhooks/subscriptions/:id ──────────────────

  router.delete('/webhooks/subscriptions/:id', async (req, res) => {
    try {
      if (!requireManager(req, res)) return;
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ error: 'invalid id' });
      }
      const doc = await subscriptionModel
        .findOneAndUpdate(
          { _id: req.params.id, deleted_at: null },
          { $set: { deleted_at: new Date(), is_active: false } },
          { new: true }
        )
        .lean();
      if (!doc) return res.status(404).json({ error: 'not found' });
      return res.json({ deleted: true, id: req.params.id });
    } catch (err) {
      logger.error && logger.error('[HrWebhooks:delete]', err.message || err);
      return res.status(500).json({ error: 'delete failed' });
    }
  });

  // ───── POST /webhooks/subscriptions/:id/rotate-secret ──────

  router.post('/webhooks/subscriptions/:id/rotate-secret', async (req, res) => {
    try {
      if (!requireManager(req, res)) return;
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ error: 'invalid id' });
      }
      const newSecret = generateSecret();
      const doc = await subscriptionModel
        .findOneAndUpdate(
          { _id: req.params.id, deleted_at: null },
          { $set: { hmac_secret: newSecret } },
          { new: true }
        )
        .lean();
      if (!doc) return res.status(404).json({ error: 'not found' });
      return res.json({
        subscription: toPublicView(doc),
        hmac_secret: newSecret,
      });
    } catch (err) {
      logger.error && logger.error('[HrWebhooks:rotate]', err.message || err);
      return res.status(500).json({ error: 'rotate failed' });
    }
  });

  return router;
}

module.exports = { createHrWebhooksRouter };
