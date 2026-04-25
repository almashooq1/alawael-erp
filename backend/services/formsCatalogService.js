/**
 * formsCatalogService.js — read + materialize ready-to-use form templates.
 *
 * Phase 19 Commit 2. Wraps the pure-data registry with the operations the
 * routes + seed CLI need: filtering, lookup, summary, and the
 * `instantiate` path that turns a catalog entry into a persisted
 * FormTemplate document scoped to a tenant/branch/owner.
 *
 * Design decisions:
 *
 *   1. Service is dependency-injected. The default export wires the live
 *      Mongoose model; the factory (`createFormsCatalogService`) accepts a
 *      `formTemplateModel` so tests can pass an in-memory mock without
 *      touching MongoDB.
 *
 *   2. `instantiate` is idempotent on (catalogId, tenantId, branchId):
 *      calling it twice with the same scope returns the already-persisted
 *      doc rather than duplicating. This matches the seed CLI's behavior
 *      (`--reset` is the only way to recreate).
 *
 *   3. The catalog entry's design is a starting point — once instantiated
 *      it becomes a regular FormTemplate doc and is independently editable.
 *      We tag the doc with `catalogId` + `catalogVersion` so future drift
 *      audits can compare against the source.
 *
 *   4. No event emission here. The route layer is responsible for any
 *      audit log / notification side-effects.
 */

'use strict';

const catalog = require('../config/forms-catalog.registry');

const CATALOG_VERSION = '1.0.0';

function buildTemplateDoc(entry, ctx = {}) {
  return {
    name: entry.id,
    title: entry.title,
    titleEn: entry.titleEn || entry.title,
    description: entry.description || '',
    category: `${entry.audience}.${entry.category}`,
    icon: entry.icon || 'Description',
    status: 'active',
    sections: entry.sections || [],
    fields: entry.fields || [],
    approvalWorkflow: entry.approvalWorkflow || { enabled: false, steps: [] },
    design: entry.design || {},
    metadata: {
      ...(entry.metadata || {}),
      audience: entry.audience,
      categoryName: entry.category,
      catalogId: entry.id,
      catalogVersion: CATALOG_VERSION,
      seededAt: new Date(),
    },
    tenantId: ctx.tenantId || null,
    branchId: ctx.branchId || null,
    createdBy: ctx.createdBy || null,
    isFromCatalog: true,
  };
}

function createFormsCatalogService({ formTemplateModel } = {}) {
  // ─── pure registry reads (no DB) ───────────────────────────────────────────

  function listAll({ audience, category } = {}) {
    let entries = catalog.listAll();
    if (audience) entries = entries.filter(e => e.audience === audience);
    if (category) entries = entries.filter(e => e.category === category);
    return entries.map(toListItem);
  }

  function getById(id) {
    const entry = catalog.getById(id);
    return entry ? toDetail(entry) : null;
  }

  function summary() {
    return catalog.summary();
  }

  // ─── DB-touching operations (require model) ────────────────────────────────

  async function instantiate(id, ctx = {}) {
    if (!formTemplateModel) {
      throw new Error(
        'formTemplateModel is required for instantiate(); create the service via createFormsCatalogService({ formTemplateModel })'
      );
    }
    const entry = catalog.getById(id);
    if (!entry) {
      const err = new Error(`Catalog entry not found: ${id}`);
      err.code = 'CATALOG_NOT_FOUND';
      throw err;
    }

    const lookup = {
      'metadata.catalogId': entry.id,
      tenantId: ctx.tenantId || null,
      branchId: ctx.branchId || null,
    };
    const existing = await formTemplateModel.findOne(lookup).lean();
    if (existing) {
      return { template: existing, created: false };
    }

    const doc = buildTemplateDoc(entry, ctx);
    const created = await formTemplateModel.create(doc);
    return { template: created.toObject ? created.toObject() : created, created: true };
  }

  async function instantiateAll(ctx = {}, { audience } = {}) {
    if (!formTemplateModel) {
      throw new Error('formTemplateModel is required for instantiateAll()');
    }
    const entries = audience ? catalog.listByAudience(audience) : catalog.listAll();
    const results = [];
    for (const entry of entries) {
      try {
        const r = await instantiate(entry.id, ctx);
        results.push({ id: entry.id, status: r.created ? 'created' : 'exists' });
      } catch (err) {
        results.push({ id: entry.id, status: 'error', error: err.message });
      }
    }
    return {
      total: results.length,
      created: results.filter(r => r.status === 'created').length,
      existed: results.filter(r => r.status === 'exists').length,
      errors: results.filter(r => r.status === 'error').length,
      results,
    };
  }

  return {
    listAll,
    getById,
    summary,
    instantiate,
    instantiateAll,
    _internals: { buildTemplateDoc, CATALOG_VERSION },
  };
}

// ─── Lightweight projections ──────────────────────────────────────────────────

function toListItem(entry) {
  return {
    id: entry.id,
    audience: entry.audience,
    category: entry.category,
    title: entry.title,
    titleEn: entry.titleEn,
    description: entry.description,
    icon: entry.icon,
    fieldCount: (entry.fields || []).length,
    sectionCount: (entry.sections || []).length,
    hasApproval: !!(entry.approvalWorkflow && entry.approvalWorkflow.enabled),
    approvalSteps: entry.approvalWorkflow?.steps?.length || 0,
    metadata: entry.metadata || {},
  };
}

function toDetail(entry) {
  return { ...entry };
}

module.exports = {
  createFormsCatalogService,
  buildTemplateDoc,
  CATALOG_VERSION,
};
