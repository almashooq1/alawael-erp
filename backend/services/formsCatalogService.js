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

// Map our catalog audience → FormTemplate model's category enum.
// The model only accepts: beneficiary, hr, administration, finance, general,
// medical, therapy, legal, reports, custom. We preserve the original
// audience.category slug in metadata + subcategory for filtering.
const AUDIENCE_TO_CATEGORY = {
  beneficiary: 'beneficiary',
  hr: 'hr',
  management: 'administration',
};

function buildTemplateDoc(entry, ctx = {}) {
  // Tag the template with catalog provenance using only fields the model
  // declares (no `metadata` field on FormTemplate — strict mode drops it).
  // `templateId` is the unique slug, `isBuiltIn` flags catalog seeds, and
  // `tags` carries audience/category/version for filtering.
  return {
    // Identity (model required fields)
    templateId: entry.id,
    name: entry.title,
    nameEn: entry.titleEn || entry.title,
    description: entry.description || '',
    category: AUDIENCE_TO_CATEGORY[entry.audience] || 'custom',
    subcategory: `${entry.audience}.${entry.category}`,
    tags: [
      'catalog',
      `aud:${entry.audience}`,
      `cat:${entry.category}`,
      `ver:${CATALOG_VERSION}`,
      ...((entry.metadata && entry.metadata.references) || []).map(r => `ref:${r}`),
    ],

    // Visual
    icon: entry.icon || '📄',

    // Structure
    sections: entry.sections || [],
    fields: entry.fields || [],
    approvalWorkflow: entry.approvalWorkflow || { enabled: false, steps: [] },
    design: entry.design || {},

    // Tenancy + status
    tenantId: ctx.tenantId || undefined,
    createdBy: ctx.createdBy || undefined,
    isActive: true,
    isBuiltIn: true, // catalog seeds are built-in
    isPublished: true,
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

    // Idempotency: templateId is unique on the model. For multi-tenant
    // installs we scope by tenantId so each tenant gets its own copy of
    // the same template with a derived templateId (or, if running global,
    // the bare templateId is the catalog id).
    const scopedTemplateId = ctx.tenantId ? `${entry.id}:${ctx.tenantId}` : entry.id;
    const lookup = { templateId: scopedTemplateId };
    const existing = await formTemplateModel.findOne(lookup).lean();
    if (existing) {
      return { template: existing, created: false };
    }

    const doc = buildTemplateDoc(entry, ctx);
    // Apply tenant-scoped templateId override
    doc.templateId = scopedTemplateId;
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
