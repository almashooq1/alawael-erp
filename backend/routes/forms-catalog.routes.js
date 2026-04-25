/**
 * Forms Catalog — list + materialize ready-to-use form templates.
 *
 * Phase 19 Commit 3. Exposes the registry to admin UIs so a tenant can
 * browse the 32 prebuilt forms (beneficiary / hr / management) and
 * "instantiate" any of them as an editable FormTemplate doc with one
 * call.
 *
 *   GET    /api/v1/forms/catalog                          list
 *   GET    /api/v1/forms/catalog/summary                  counts by audience/category
 *   GET    /api/v1/forms/catalog/by-audience/:audience    filter by audience
 *   GET    /api/v1/forms/catalog/:id                      full detail
 *   POST   /api/v1/forms/catalog/:id/instantiate          create FormTemplate from entry
 *   POST   /api/v1/forms/catalog/instantiate-all          bulk seed (admin only)
 *
 * Auth model:
 *   - Read endpoints: any authenticated user (no role gate).
 *   - Instantiate: requires admin / super_admin / forms_admin role —
 *     materialization is per-tenant and changes shared FormTemplate state.
 */

'use strict';

const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { createFormsCatalogService } = require('../services/formsCatalogService');

function buildRouter({ formTemplateModel } = {}) {
  const router = express.Router();
  const service = createFormsCatalogService({ formTemplateModel });

  router.use(authenticate);

  // ─── Read-only ──────────────────────────────────────────────────────────────

  router.get('/summary', (_req, res) => {
    res.json({ ok: true, summary: service.summary() });
  });

  router.get('/', (req, res) => {
    const { audience, category } = req.query;
    try {
      const items = service.listAll({ audience, category });
      res.json({ ok: true, count: items.length, items });
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  router.get('/by-audience/:audience', (req, res) => {
    try {
      const items = service.listAll({ audience: req.params.audience });
      res.json({ ok: true, audience: req.params.audience, count: items.length, items });
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  router.get('/:id', (req, res) => {
    const item = service.getById(req.params.id);
    if (!item) {
      return res.status(404).json({ ok: false, error: 'CATALOG_NOT_FOUND', id: req.params.id });
    }
    res.json({ ok: true, item });
  });

  // ─── Instantiate (admin only) ──────────────────────────────────────────────

  const adminGate = authorize(['admin', 'super_admin', 'forms_admin']);

  router.post('/:id/instantiate', adminGate, async (req, res) => {
    try {
      const ctx = {
        tenantId: req.user?.tenantId || req.body?.tenantId || null,
        branchId: req.user?.branchId || req.body?.branchId || null,
        createdBy: req.user?._id || req.user?.id || null,
      };
      const result = await service.instantiate(req.params.id, ctx);
      res.status(result.created ? 201 : 200).json({ ok: true, ...result });
    } catch (err) {
      const status = err.code === 'CATALOG_NOT_FOUND' ? 404 : 500;
      res.status(status).json({ ok: false, error: err.message, code: err.code });
    }
  });

  router.post('/instantiate-all', adminGate, async (req, res) => {
    try {
      const ctx = {
        tenantId: req.user?.tenantId || req.body?.tenantId || null,
        branchId: req.user?.branchId || req.body?.branchId || null,
        createdBy: req.user?._id || req.user?.id || null,
      };
      const filter = req.body?.audience ? { audience: req.body.audience } : {};
      const result = await service.instantiateAll(ctx, filter);
      res.json({ ok: true, ...result });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  return router;
}

module.exports = { buildRouter };
