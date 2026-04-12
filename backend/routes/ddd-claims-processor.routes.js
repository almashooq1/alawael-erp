'use strict';
/**
 * ClaimsProcessor Routes
 * Auto-extracted from services/dddClaimsProcessor.js
 * 23 endpoints — Auth required on all
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const safeError = require('../utils/safeError');
const v = require('../validations/claims-processor.validation');

// Service singleton — use directly (no `new`)
const svc = require('../services/dddClaimsProcessor');

// Service imported as singleton above;

/* ── Claims ── */
router.get('/claims', authenticate, async (req, res) => {
  try {
    res.json({ success: true, data: await svc.listClaims(req.query) });
  } catch (e) {
    safeError(res, e, 'claims-processor');
  }
});
router.get('/claims/summary', authenticate, async (req, res) => {
  try {
    res.json({ success: true, data: await svc.getClaimsSummary(req.query) });
  } catch (e) {
    safeError(res, e, 'claims-processor');
  }
});
router.get('/claims/aging', authenticate, async (_req, res) => {
  try {
    res.json({ success: true, data: await svc.getAgingReport() });
  } catch (e) {
    safeError(res, e, 'claims-processor');
  }
});
router.get('/claims/:id', authenticate, async (req, res) => {
  try {
    const d = await svc.getClaim(req.params.id);
    d
      ? res.json({ success: true, data: d })
      : res.status(404).json({ success: false, error: 'Not found' });
  } catch (e) {
    safeError(res, e, 'claims-processor');
  }
});
router.post('/claims', authenticate, validate(v.createClaim), async (req, res) => {
  try {
    res.status(201).json({ success: true, data: await svc.createClaim(req.body) });
  } catch (e) {
    safeError(res, e, 'claims-processor');
  }
});
router.put('/claims/:id', authenticate, validate(v.updateClaim), async (req, res) => {
  try {
    res.json({ success: true, data: await svc.updateClaim(req.params.id, req.body) });
  } catch (e) {
    safeError(res, e, 'claims-processor');
  }
});
router.post('/claims/:id/validate', authenticate, async (req, res) => {
  try {
    res.json({ success: true, data: await svc.validateClaim(req.params.id) });
  } catch (e) {
    safeError(res, e, 'claims-processor');
  }
});
router.post('/claims/:id/submit', authenticate, validate(v.submitClaim), async (req, res) => {
  try {
    res.json({ success: true, data: await svc.submitClaim(req.params.id, req.body.userId) });
  } catch (e) {
    safeError(res, e, 'claims-processor');
  }
});
router.post(
  '/claims/:id/adjudicate',
  authenticate,
  validate(v.adjudicateClaim),
  async (req, res) => {
    try {
      res.json({ success: true, data: await svc.adjudicateClaim(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'claims-processor');
    }
  }
);
router.post('/claims/:id/mark-paid', authenticate, validate(v.markClaimPaid), async (req, res) => {
  try {
    res.json({ success: true, data: await svc.markClaimPaid(req.params.id, req.body) });
  } catch (e) {
    safeError(res, e, 'claims-processor');
  }
});

/* ── Batches ── */
router.get('/claims/batches/list', authenticate, async (req, res) => {
  try {
    res.json({ success: true, data: await svc.listBatches(req.query) });
  } catch (e) {
    safeError(res, e, 'claims-processor');
  }
});
router.get('/claims/batches/:id', authenticate, async (req, res) => {
  try {
    const d = await svc.getBatch(req.params.id);
    d
      ? res.json({ success: true, data: d })
      : res.status(404).json({ success: false, error: 'Not found' });
  } catch (e) {
    safeError(res, e, 'claims-processor');
  }
});
router.post('/claims/batches', authenticate, validate(v.createBatch), async (req, res) => {
  try {
    res.status(201).json({ success: true, data: await svc.createBatch(req.body) });
  } catch (e) {
    safeError(res, e, 'claims-processor');
  }
});
router.post(
  '/claims/batches/:id/submit',
  authenticate,
  validate(v.submitBatch),
  async (req, res) => {
    try {
      res.json({ success: true, data: await svc.submitBatch(req.params.id, req.body.userId) });
    } catch (e) {
      safeError(res, e, 'claims-processor');
    }
  }
);

/* ── Appeals ── */
router.get('/claims/appeals/list', authenticate, async (req, res) => {
  try {
    res.json({ success: true, data: await svc.listAppeals(req.query) });
  } catch (e) {
    safeError(res, e, 'claims-processor');
  }
});
router.get('/claims/appeals/:id', authenticate, async (req, res) => {
  try {
    const d = await svc.getAppeal(req.params.id);
    d
      ? res.json({ success: true, data: d })
      : res.status(404).json({ success: false, error: 'Not found' });
  } catch (e) {
    safeError(res, e, 'claims-processor');
  }
});
router.post('/claims/appeals', authenticate, validate(v.createAppeal), async (req, res) => {
  try {
    res.status(201).json({ success: true, data: await svc.createAppeal(req.body) });
  } catch (e) {
    safeError(res, e, 'claims-processor');
  }
});
router.post(
  '/claims/appeals/:id/submit',
  authenticate,
  validate(v.submitAppeal),
  async (req, res) => {
    try {
      res.json({ success: true, data: await svc.submitAppeal(req.params.id, req.body.userId) });
    } catch (e) {
      safeError(res, e, 'claims-processor');
    }
  }
);
router.post(
  '/claims/appeals/:id/resolve',
  authenticate,
  validate(v.resolveAppeal),
  async (req, res) => {
    try {
      res.json({ success: true, data: await svc.resolveAppeal(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'claims-processor');
    }
  }
);

/* ── EOBs ── */
router.get('/claims/eobs', authenticate, async (req, res) => {
  try {
    res.json({ success: true, data: await svc.listEOBs(req.query) });
  } catch (e) {
    safeError(res, e, 'claims-processor');
  }
});
router.get('/claims/eobs/:id', authenticate, async (req, res) => {
  try {
    const d = await svc.getEOB(req.params.id);
    d
      ? res.json({ success: true, data: d })
      : res.status(404).json({ success: false, error: 'Not found' });
  } catch (e) {
    safeError(res, e, 'claims-processor');
  }
});
router.post('/claims/eobs', authenticate, validate(v.createEOB), async (req, res) => {
  try {
    res.status(201).json({ success: true, data: await svc.createEOB(req.body) });
  } catch (e) {
    safeError(res, e, 'claims-processor');
  }
});

/* ── Health ── */
router.get('/claims/health', authenticate, async (_req, res) => {
  try {
    res.json({ success: true, data: await svc.healthCheck() });
  } catch (e) {
    safeError(res, e, 'claims-processor');
  }
});

module.exports = router;
