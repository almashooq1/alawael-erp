/**
 * Admin Ops — Dead Letter Queue management surface.
 *
 * Operator endpoints for inspecting failed external-integration calls that
 * the ACL client auto-parked. Read operations list/inspect; write operations
 * discard or replay (replay requires the caller to supply an adapter).
 *
 * Auth: admin only (RBAC). Branch scope not enforced — ops has global view.
 *
 *   GET    /api/v1/admin/ops/dlq              — list (filter: integration, status, limit, offset)
 *   GET    /api/v1/admin/ops/dlq/:id          — detail
 *   POST   /api/v1/admin/ops/dlq/:id/discard  — mark as discarded
 *   POST   /api/v1/admin/ops/dlq/:id/replay   — replay via registered adapter
 *
 * Adapter registry: adapters self-register a replay function at boot via
 * `registerReplayAdapter(name, fn)`. Without a registered adapter, replay
 * returns 501 NOT_IMPLEMENTED.
 */

'use strict';

const express = require('express');
const dlq = require('../infrastructure/deadLetterQueue');
const { authenticate, authorize } = require('../middleware/auth');
const { buildSnapshot } = require('../services/integrationHealthAggregator');

const router = express.Router();
const replayAdapters = new Map();

router.use(authenticate);
router.use(authorize(['admin', 'super_admin']));

// GET /integration-health — mission-control snapshot. Mounted under the same
// /api/v1/admin/ops/ prefix so authorization + auth are inherited.
router.get('/integration-health', (_req, res) => {
  try {
    const snapshot = buildSnapshot();
    res.json({ ok: true, snapshot });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

function registerReplayAdapter(name, fn) {
  if (typeof fn !== 'function') throw new Error('registerReplayAdapter: fn must be a function');
  replayAdapters.set(name, fn);
}

router.get('/dlq', async (req, res) => {
  try {
    const { integration, status, limit, offset } = req.query;
    const result = await dlq.list({
      integration,
      status,
      limit: limit ? Math.min(500, Number(limit)) : 100,
      offset: offset ? Number(offset) : 0,
    });
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/dlq/:id', async (req, res) => {
  try {
    const entry = await dlq.get(req.params.id);
    if (!entry) return res.status(404).json({ ok: false, error: 'NOT_FOUND' });
    res.json({ ok: true, entry });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/dlq/:id/discard', async (req, res) => {
  try {
    const entry = await dlq.discard(req.params.id, req.body?.reason || 'manual');
    if (!entry) return res.status(404).json({ ok: false, error: 'NOT_FOUND' });
    res.json({ ok: true, entry });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/dlq/:id/replay', async (req, res) => {
  try {
    const entry = await dlq.get(req.params.id);
    if (!entry) return res.status(404).json({ ok: false, error: 'NOT_FOUND' });
    const adapter = replayAdapters.get(entry.integration);
    if (!adapter) {
      return res.status(501).json({
        ok: false,
        error: 'NO_REPLAY_ADAPTER',
        integration: entry.integration,
        message: 'No replay adapter registered for this integration',
      });
    }
    const outcome = await dlq.replay(entry.id, adapter);
    res.json({ ok: !!outcome.ok, outcome });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
module.exports.registerReplayAdapter = registerReplayAdapter;
