'use strict';

/**
 * W1568 — persistent PHI audit trail on BeneficiaryService mutations (behavioral).
 *
 * Every create/update/status/archive/unarchive/risk-flag/delete now writes a durable
 * AuditLog row (data.created/updated/deleted) in addition to the in-process event.
 * The audit is best-effort (try/catch) so it can never roll back the mutation — this
 * test also proves a mutation still succeeds when the AuditLog model is absent.
 * Pure (no MongoMemoryServer): stubs mongoose.models.AuditLog + a minimal repository.
 */

const mongoose = require('mongoose');
const { BeneficiaryService } = require('../domains/core/services/beneficiary.service');

describe('W1568 persistent PHI audit trail', () => {
  let created;
  let svc;

  beforeEach(() => {
    created = [];
    mongoose.models = mongoose.models || {};
    mongoose.models.AuditLog = {
      create: async d => {
        created.push(d);
        return d;
      },
    };
    const repo = {
      findById: async id => ({ _id: id }),
      deleteById: async () => ({ acknowledged: true }),
      model: { findById: async () => ({}) },
    };
    svc = new BeneficiaryService(repo);
  });

  test('afterCreate writes a data.created audit row', async () => {
    await svc.afterCreate({ _id: 'b1', mrn: 'M1', disability: {} }, { userId: 'u1' });
    const row = created.find(c => c.eventType === 'data.created');
    expect(row).toBeTruthy();
    expect(row.eventCategory).toBe('data');
    expect(row.resource).toBe('Beneficiary/b1');
    expect(String(row.userId)).toBe('u1');
    expect(row.message).toMatch(/Beneficiary created/);
    expect(row.metadata.custom.entityType).toBe('Beneficiary');
  });

  test('afterUpdate on status change writes data.updated with before/after', async () => {
    await svc.afterUpdate({ _id: 'b1', status: 'active' }, { status: 'draft' }, { userId: 'u1' });
    const row = created.find(c => c.eventType === 'data.updated');
    expect(row).toBeTruthy();
    expect(row.changes.fields).toContain('status');
    expect(row.changes.before.status).toBe('draft');
    expect(row.changes.after.status).toBe('active');
  });

  test('afterUpdate on profile change writes data.updated with changed fields', async () => {
    await svc.afterUpdate(
      { _id: 'b1', status: 'active', modifiedPaths: () => ['firstName', 'phone'] },
      { status: 'active' },
      { userId: 'u1' }
    );
    const row = created.find(
      c => c.eventType === 'data.updated' && c.message === 'Beneficiary profile updated'
    );
    expect(row).toBeTruthy();
    expect(row.changes.fields).toEqual(['firstName', 'phone']);
  });

  test('delete writes data.deleted and never throws when the audit model is absent', async () => {
    await svc.delete('b1', { userId: 'u1' });
    expect(created.find(c => c.eventType === 'data.deleted')).toBeTruthy();

    mongoose.models = {}; // audit model gone → mutation must still succeed
    await expect(svc.delete('b2', { userId: 'u1' })).resolves.toBeDefined();
  });
});
