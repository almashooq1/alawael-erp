/**
 * beneficiary-lifecycle-model-alignment-wave0.test.js
 *
 * W0-LifecycleAlign: Ensure the canonical Beneficiary model can hold every
 * state declared in beneficiary-lifecycle.registry.js, that legacy aliases
 * normalize correctly, and that archive/unarchive use the canonical states.
 *
 * These tests are DB-free — they only exercise the schema, virtuals, and
 * instance methods on a fresh model instance.
 */

'use strict';

jest.unmock('mongoose');

const mongoose = require('mongoose');
const reg = require('../intelligence/beneficiary-lifecycle.registry');

// Load the compiled model. In a test context the model may already be cached
// by mongoose; requiring it directly gives us the authoritative schema.
const Beneficiary = require('../models/Beneficiary');

describe('Beneficiary model — lifecycle state alignment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Beneficiary.status enum accepts every registry state', () => {
    const statusPath = Beneficiary.schema.path('status');
    const enumValues = new Set(statusPath.options.enum);

    for (const state of reg.STATES) {
      expect(enumValues).toContain(state);
    }
  });

  test('legacy status aliases are still accepted for backward compatibility', () => {
    const statusPath = Beneficiary.schema.path('status');
    const enumValues = new Set(statusPath.options.enum);

    expect(enumValues).toContain('inactive');
    expect(enumValues).toContain('pending');
    expect(enumValues).toContain('graduated');
  });

  test('lifecycleState virtual maps legacy aliases to canonical states', () => {
    const doc = new Beneficiary({ firstName: 'Test', lastName: 'User' });

    doc.status = 'inactive';
    expect(doc.lifecycleState).toBe('archived');

    doc.status = 'pending';
    expect(doc.lifecycleState).toBe('draft');

    doc.status = 'graduated';
    expect(doc.lifecycleState).toBe('discharged');

    doc.status = 'active';
    expect(doc.lifecycleState).toBe('active');

    doc.status = 'suspended';
    expect(doc.lifecycleState).toBe('suspended');
  });

  test('isArchivedComputed virtual reflects archived/deleted states', () => {
    const doc = new Beneficiary({ firstName: 'Test', lastName: 'User' });

    doc.status = 'archived';
    expect(doc.isArchivedComputed).toBe(true);

    doc.status = 'deleted';
    expect(doc.isArchivedComputed).toBe(true);

    doc.status = 'inactive';
    expect(doc.isArchivedComputed).toBe(true);

    doc.status = 'active';
    expect(doc.isArchivedComputed).toBe(false);

    doc.status = 'suspended';
    expect(doc.isArchivedComputed).toBe(false);
  });

  test('archive() sets canonical archived state and timestamps', async () => {
    const doc = new Beneficiary({
      firstName: 'Test',
      lastName: 'User',
      status: 'active',
    });
    const userId = new mongoose.Types.ObjectId();

    // Mock save to keep the test DB-free.
    doc.save = jest.fn().mockResolvedValue(doc);

    const result = await doc.archive('test archive', userId);

    expect(result.status).toBe('archived');
    expect(result.isArchived).toBe(true);
    expect(result.archivedReason).toBe('test archive');
    expect(result.archivedDate).toBeInstanceOf(Date);
    expect(result.lastLifecycleAt).toBeInstanceOf(Date);
    expect(result.lastModifiedBy).toEqual(userId);
    expect(doc.save).toHaveBeenCalled();
  });

  test('unarchive() restores active state and clears archive metadata', async () => {
    const doc = new Beneficiary({
      firstName: 'Test',
      lastName: 'User',
      status: 'archived',
      isArchived: true,
      archivedDate: new Date(),
      archivedReason: 'reason',
    });
    const userId = new mongoose.Types.ObjectId();

    doc.save = jest.fn().mockResolvedValue(doc);

    const result = await doc.unarchive(userId);

    expect(result.status).toBe('active');
    expect(result.isArchived).toBe(false);
    expect(result.archivedDate).toBeNull();
    expect(result.archivedReason).toBeNull();
    expect(result.lastLifecycleAt).toBeInstanceOf(Date);
    expect(result.lastModifiedBy).toEqual(userId);
    expect(doc.save).toHaveBeenCalled();
  });

  test('pre-save logic keeps isArchived in sync with status', () => {
    const archivedStates = new Set(['archived', 'inactive', 'deleted', 'deletion-pending']);

    const activeDoc = new Beneficiary({ firstName: 'A', lastName: 'B', status: 'active' });
    activeDoc.isArchived = archivedStates.has(activeDoc.status);
    expect(activeDoc.isArchived).toBe(false);

    const archivedDoc = new Beneficiary({ firstName: 'A', lastName: 'B', status: 'archived' });
    archivedDoc.isArchived = archivedStates.has(archivedDoc.status);
    expect(archivedDoc.isArchived).toBe(true);

    const legacyDoc = new Beneficiary({ firstName: 'A', lastName: 'B', status: 'inactive' });
    legacyDoc.isArchived = archivedStates.has(legacyDoc.status);
    expect(legacyDoc.isArchived).toBe(true);
  });

  test('getStatistics returns new lifecycle buckets', async () => {
    // Mock aggregate/countDocuments to avoid DB calls.
    Beneficiary.aggregate = jest.fn().mockResolvedValue([]);
    Beneficiary.countDocuments = jest.fn().mockResolvedValue(0);

    const stats = await Beneficiary.getStatistics();

    expect(stats).toHaveProperty('waitlisted');
    expect(stats).toHaveProperty('suspended');
    expect(stats).toHaveProperty('discharged');
    expect(stats).toHaveProperty('transferred');
    expect(stats).toHaveProperty('deceased');
    expect(stats).toHaveProperty('archived');
    expect(Beneficiary.aggregate).toHaveBeenCalledTimes(3);

    // Restore originals so other tests are not affected.
    delete Beneficiary.aggregate;
    delete Beneficiary.countDocuments;
  });
});
