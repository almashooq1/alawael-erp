/**
 * forms-catalog-service.test.js — Phase 19 service contract.
 *
 * Tests pure registry reads, then exercises instantiate / instantiateAll
 * against an in-memory mock FormTemplate model. No mongoose connection.
 */

'use strict';

const {
  createFormsCatalogService,
  buildTemplateDoc,
  CATALOG_VERSION,
} = require('../services/formsCatalogService');

// ─── Mock model ─────────────────────────────────────────────────────────────

function createMockModel() {
  const docs = [];
  let nextId = 1;
  function search(filter) {
    return (
      docs.find(d => {
        if (filter['metadata.catalogId'] && d.metadata.catalogId !== filter['metadata.catalogId'])
          return false;
        if (filter.tenantId !== undefined && d.tenantId !== filter.tenantId) return false;
        if (filter.branchId !== undefined && d.branchId !== filter.branchId) return false;
        return true;
      }) || null
    );
  }
  return {
    docs,
    findOne(filter) {
      // Mimic mongoose Query: chainable .lean() that returns a Promise.
      return { lean: async () => search(filter) };
    },
    async create(doc) {
      const stored = { ...doc, _id: `mock-${nextId++}` };
      docs.push(stored);
      return { ...stored, toObject: () => stored };
    },
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('formsCatalogService — pure reads (no model)', () => {
  const svc = createFormsCatalogService();

  test('listAll returns at least 32 list-items', () => {
    const items = svc.listAll();
    expect(items.length).toBeGreaterThanOrEqual(32);
  });

  test('listAll filters by audience', () => {
    expect(svc.listAll({ audience: 'hr' }).every(i => i.audience === 'hr')).toBe(true);
    expect(svc.listAll({ audience: 'beneficiary' }).every(i => i.audience === 'beneficiary')).toBe(
      true
    );
  });

  test('listAll filters by category', () => {
    const intake = svc.listAll({ category: 'intake' });
    expect(intake.length).toBeGreaterThan(0);
    expect(intake.every(i => i.category === 'intake')).toBe(true);
  });

  test('list-item is a slim projection (no full fields/sections)', () => {
    const item = svc.listAll()[0];
    expect(item).toHaveProperty('id');
    expect(item).toHaveProperty('fieldCount');
    expect(item).toHaveProperty('sectionCount');
    expect(item).toHaveProperty('hasApproval');
    expect(item.fields).toBeUndefined();
    expect(item.sections).toBeUndefined();
  });

  test('getById returns full detail', () => {
    const detail = svc.getById('hr.leave.annual');
    expect(detail.id).toBe('hr.leave.annual');
    expect(Array.isArray(detail.fields)).toBe(true);
    expect(detail.fields.length).toBeGreaterThan(0);
  });

  test('getById returns null for unknown id', () => {
    expect(svc.getById('not.a.real.id')).toBeNull();
  });

  test('summary mirrors registry summary', () => {
    const s = svc.summary();
    expect(s.total).toBeGreaterThanOrEqual(32);
    expect(s.byAudience.hr).toBeGreaterThanOrEqual(10);
  });

  test('instantiate without model throws', async () => {
    await expect(svc.instantiate('hr.leave.annual')).rejects.toThrow(
      /formTemplateModel is required/
    );
  });
});

describe('formsCatalogService — instantiate (with mock model)', () => {
  test('instantiate creates a doc tagged with catalog metadata', async () => {
    const mock = createMockModel();
    const svc = createFormsCatalogService({ formTemplateModel: mock });

    const r = await svc.instantiate('hr.leave.annual', {
      tenantId: 'T1',
      branchId: 'B1',
      createdBy: 'U1',
    });

    expect(r.created).toBe(true);
    expect(r.template.metadata.catalogId).toBe('hr.leave.annual');
    expect(r.template.metadata.catalogVersion).toBe(CATALOG_VERSION);
    expect(r.template.metadata.audience).toBe('hr');
    expect(r.template.tenantId).toBe('T1');
    expect(r.template.branchId).toBe('B1');
    expect(r.template.createdBy).toBe('U1');
    expect(r.template.isFromCatalog).toBe(true);
  });

  test('instantiate is idempotent on (catalogId, tenant, branch)', async () => {
    const mock = createMockModel();
    const svc = createFormsCatalogService({ formTemplateModel: mock });

    const a = await svc.instantiate('hr.leave.annual', { tenantId: 'T1', branchId: 'B1' });
    const b = await svc.instantiate('hr.leave.annual', { tenantId: 'T1', branchId: 'B1' });
    expect(a.created).toBe(true);
    expect(b.created).toBe(false);
    expect(mock.docs.length).toBe(1);
  });

  test('instantiate creates fresh doc when tenant/branch differ', async () => {
    const mock = createMockModel();
    const svc = createFormsCatalogService({ formTemplateModel: mock });

    await svc.instantiate('hr.leave.annual', { tenantId: 'T1', branchId: 'B1' });
    const r = await svc.instantiate('hr.leave.annual', { tenantId: 'T1', branchId: 'B2' });
    expect(r.created).toBe(true);
    expect(mock.docs.length).toBe(2);
  });

  test('instantiate throws CATALOG_NOT_FOUND for unknown id', async () => {
    const mock = createMockModel();
    const svc = createFormsCatalogService({ formTemplateModel: mock });
    await expect(svc.instantiate('does.not.exist')).rejects.toMatchObject({
      code: 'CATALOG_NOT_FOUND',
    });
  });

  test('instantiateAll seeds every entry once', async () => {
    const mock = createMockModel();
    const svc = createFormsCatalogService({ formTemplateModel: mock });

    const result = await svc.instantiateAll({ tenantId: 'T1', branchId: 'B1' });

    expect(result.total).toBeGreaterThanOrEqual(32);
    expect(result.created).toBe(result.total);
    expect(result.existed).toBe(0);
    expect(result.errors).toBe(0);

    // Re-run: nothing new
    const second = await svc.instantiateAll({ tenantId: 'T1', branchId: 'B1' });
    expect(second.created).toBe(0);
    expect(second.existed).toBe(result.total);
  });

  test('instantiateAll honors audience filter', async () => {
    const mock = createMockModel();
    const svc = createFormsCatalogService({ formTemplateModel: mock });

    const result = await svc.instantiateAll({ tenantId: 'T1', branchId: 'B1' }, { audience: 'hr' });
    expect(result.created).toBeGreaterThanOrEqual(10);
    expect(result.results.every(r => r.id.startsWith('hr.'))).toBe(true);
  });
});

describe('buildTemplateDoc helper', () => {
  test('attaches catalog metadata + scope context', () => {
    const catalog = require('../config/forms-catalog.registry');
    const entry = catalog.getById('beneficiary.intake.registration');
    const doc = buildTemplateDoc(entry, { tenantId: 'T1', branchId: 'B1', createdBy: 'U1' });

    expect(doc.name).toBe('beneficiary.intake.registration');
    expect(doc.title).toBe(entry.title);
    expect(doc.metadata.catalogId).toBe(entry.id);
    expect(doc.metadata.catalogVersion).toBe(CATALOG_VERSION);
    expect(doc.metadata.audience).toBe('beneficiary');
    expect(doc.isFromCatalog).toBe(true);
    expect(doc.tenantId).toBe('T1');
    expect(doc.branchId).toBe('B1');
    expect(doc.createdBy).toBe('U1');
  });
});
