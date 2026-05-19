'use strict';

/**
 * stub-missing.routes.js — graceful 200 stubs for routes the web-admin
 * frontend (apps/web-admin in alawael-rehab-platform) was built to call
 * but that don't exist in this Express backend yet.
 *
 * Each handler returns the empty-but-well-shaped response the frontend
 * expects, so list pages render "no data" instead of throwing an error
 * banner. Real implementations will replace these as features ship.
 *
 * Mount BEFORE any conflicting catch-all routes in app.js (e.g. the
 * `/api/v1/notifications` router whose `:id` handler swallows
 * `/notifications/unread-count` due to declaration order).
 */

const express = require('express');
const router = express.Router();

const emptyList = () => ({ data: [], total: 0, page: 1, limit: 20 });

// ── Quality module ─────────────────────────────────────────────────
router.get('/measures', (_req, res) => {
  res.json({
    success: true,
    statusCode: 200,
    message: 'OK',
    data: [],
    total: 0,
    page: 1,
    limit: 200,
  });
});

router.get('/measure-categories', (_req, res) => {
  res.json({ success: true, statusCode: 200, message: 'OK', data: [] });
});

router.get('/outcomes', (_req, res) => {
  res.json({ success: true, statusCode: 200, message: 'OK', data: [], total: 0 });
});

// ── HR module ──────────────────────────────────────────────────────
router.get('/departments', (_req, res) => {
  res.json({ success: true, statusCode: 200, message: 'OK', ...emptyList() });
});

// ── Notifications unread-count: declared as a top-level path because
//    the existing /api/v1/notifications router matches '/:id' before
//    '/unread-count' and rejects it as an invalid ObjectId.
router.get('/notifications/unread-count', (_req, res) => {
  res.json({ success: true, statusCode: 200, message: 'OK', data: { count: 0 }, count: 0 });
});

module.exports = router;
