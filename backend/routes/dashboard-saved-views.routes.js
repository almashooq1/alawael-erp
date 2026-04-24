/**
 * dashboard-saved-views.routes.js — HTTP surface for saved views
 * (Phase 18 Commit 9).
 *
 * Mounted at `/api/v1/dashboards/saved-views`, BEFORE the main
 * `/api/v1/dashboards/:id` router so the `saved-views` prefix is
 * not captured as a dashboard id. Reads the store off
 * `req.app._savedViewStore`.
 *
 * Endpoints:
 *
 *   GET    /                — list views visible to the caller
 *                             (ownerUserId or sharedWithRoles match, or public)
 *                             supports `?dashboardId=` filter
 *   POST   /                — create a view
 *   GET    /:id             — fetch one view (public OR owner-visible)
 *   PATCH  /:id             — update title / filters / sharedWithRoles
 *                             only the owner can update
 *   DELETE /:id             — delete — only the owner can delete
 */

'use strict';

const express = require('express');

function asyncWrap(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

function pickUserId(req) {
  const u = req.user || {};
  return u.id || u._id || u.userId || null;
}

function pickRole(req) {
  const u = req.user || {};
  return u.primaryRole || u.role || (Array.isArray(u.roles) && u.roles[0]) || null;
}

function getStore(req) {
  const store = req.app && req.app._savedViewStore;
  if (!store || typeof store.create !== 'function') return null;
  return store;
}

function canSee(view, { userId, role }) {
  if (!view) return false;
  if (!view.ownerUserId && (!view.sharedWithRoles || view.sharedWithRoles.length === 0))
    return true;
  if (userId && view.ownerUserId === userId) return true;
  if (role && Array.isArray(view.sharedWithRoles) && view.sharedWithRoles.includes(role))
    return true;
  return false;
}

function buildRouter() {
  const router = express.Router();
  router.use(express.json());

  router.get(
    '/',
    asyncWrap(async (req, res) => {
      const store = getStore(req);
      if (!store) return res.status(503).json({ ok: false, error: 'saved_view_store_not_ready' });
      const userId = pickUserId(req);
      const role = pickRole(req);
      const dashboardId =
        typeof req.query['dashboardId'] === 'string' ? req.query['dashboardId'] : null;
      const views = store.listVisibleTo({ userId, role, dashboardId });
      res.json({ ok: true, views, count: views.length });
    })
  );

  router.post(
    '/',
    asyncWrap(async (req, res) => {
      const store = getStore(req);
      if (!store) return res.status(503).json({ ok: false, error: 'saved_view_store_not_ready' });
      const body = req.body || {};
      try {
        const view = store.create({
          dashboardId: body.dashboardId,
          title: body.title,
          filters: body.filters,
          ownerUserId: pickUserId(req),
          sharedWithRoles: body.sharedWithRoles,
        });
        res.status(201).json({ ok: true, view });
      } catch (err) {
        if (err && err.code === 'SAVED_VIEW_INVALID') {
          return res.status(400).json({ ok: false, error: err.message });
        }
        throw err;
      }
    })
  );

  router.get(
    '/:id',
    asyncWrap(async (req, res) => {
      const store = getStore(req);
      if (!store) return res.status(503).json({ ok: false, error: 'saved_view_store_not_ready' });
      const view = store.get(req.params.id);
      if (!view) return res.status(404).json({ ok: false, error: 'saved_view_not_found' });
      const userId = pickUserId(req);
      const role = pickRole(req);
      if (!canSee(view, { userId, role })) {
        return res.status(403).json({ ok: false, error: 'saved_view_forbidden' });
      }
      res.json({ ok: true, view });
    })
  );

  router.patch(
    '/:id',
    asyncWrap(async (req, res) => {
      const store = getStore(req);
      if (!store) return res.status(503).json({ ok: false, error: 'saved_view_store_not_ready' });
      const view = store.get(req.params.id);
      if (!view) return res.status(404).json({ ok: false, error: 'saved_view_not_found' });
      const userId = pickUserId(req);
      if (view.ownerUserId && view.ownerUserId !== userId) {
        return res.status(403).json({ ok: false, error: 'saved_view_forbidden' });
      }
      const updated = store.update(req.params.id, req.body || {});
      res.json({ ok: true, view: updated });
    })
  );

  router.delete(
    '/:id',
    asyncWrap(async (req, res) => {
      const store = getStore(req);
      if (!store) return res.status(503).json({ ok: false, error: 'saved_view_store_not_ready' });
      const view = store.get(req.params.id);
      if (!view) return res.status(404).json({ ok: false, error: 'saved_view_not_found' });
      const userId = pickUserId(req);
      if (view.ownerUserId && view.ownerUserId !== userId) {
        return res.status(403).json({ ok: false, error: 'saved_view_forbidden' });
      }
      store.remove(req.params.id);
      res.json({ ok: true });
    })
  );

  return router;
}

module.exports = { buildRouter };
