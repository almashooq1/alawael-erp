/**
 * mongo-dlq-adapter.test.js — verifies the Mongo adapter shape using an
 * in-memory fake for the Mongoose Model (no live mongo).
 *
 * We cannot import the real DeadLetterEntry model in a test context that
 * doesn't boot mongoose with a memory server, so this test injects a
 * model-shaped object that implements the five methods the adapter calls:
 * create / findById / find / countDocuments / findByIdAndUpdate / deleteOne.
 *
 * Scenarios:
 *   • add() inserts with _id = entry.id
 *   • get() returns { ...doc, id }
 *   • list() applies integration + status filters, paginates, and returns total
 *   • listForReplay() filters status=parked and respects olderThanMs
 *   • updateStatus() sets status + updatedAt and returns the new doc
 *   • remove() returns true when the row existed
 */

'use strict';

const { MongoDeadLetterStore } = require('../infrastructure/adapters/mongoDeadLetterStore');

function createFakeModel() {
  const rows = new Map();

  function lean() {
    return this;
  }
  function sort() {
    return this;
  }
  function skip(n) {
    this._skip = n;
    return this;
  }
  function limit(n) {
    this._limit = n;
    return this;
  }

  return {
    _rows: rows,

    async create(doc) {
      rows.set(doc._id, { ...doc });
      return doc;
    },

    findById(id) {
      const chain = {
        _id: id,
        lean: async () => rows.get(id) || null,
      };
      return chain;
    },

    find(q) {
      let results = [...rows.values()];
      if (q.integration) results = results.filter(r => r.integration === q.integration);
      if (q.status) results = results.filter(r => r.status === q.status);
      if (q.updatedAt && q.updatedAt.$lt != null) {
        results = results.filter(r => r.updatedAt < q.updatedAt.$lt);
      }
      const chain = {
        _results: results,
        _skip: 0,
        _limit: results.length,
        sort(_s) {
          // Most-recent-first for list(), oldest-first for listForReplay()
          if (_s && _s.createdAt === -1) this._results.sort((a, b) => b.createdAt - a.createdAt);
          if (_s && _s.updatedAt === 1) this._results.sort((a, b) => a.updatedAt - b.updatedAt);
          return this;
        },
        skip(n) {
          this._skip = n;
          return this;
        },
        limit(n) {
          this._limit = n;
          return this;
        },
        lean: async function () {
          return this._results.slice(this._skip, this._skip + this._limit);
        },
      };
      return chain;
    },

    async countDocuments(q) {
      let results = [...rows.values()];
      if (q.integration) results = results.filter(r => r.integration === q.integration);
      if (q.status) results = results.filter(r => r.status === q.status);
      return results.length;
    },

    findByIdAndUpdate(id, update, _opts) {
      const doc = rows.get(id);
      if (!doc) return { lean: async () => null };
      const next = { ...doc, ...(update.$set || {}) };
      rows.set(id, next);
      return { lean: async () => next };
    },

    async deleteOne({ _id }) {
      const existed = rows.has(_id);
      rows.delete(_id);
      return { deletedCount: existed ? 1 : 0 };
    },
  };
}

describe('MongoDeadLetterStore', () => {
  let model;
  let store;

  beforeEach(() => {
    model = createFakeModel();
    store = new MongoDeadLetterStore(model);
  });

  function sampleEntry(over = {}) {
    return {
      id: over.id || 'id-' + Math.random().toString(36).slice(2, 8),
      integration: 'zatca',
      status: 'parked',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      attempts: 3,
      replayCount: 0,
      ...over,
    };
  }

  it('add() persists with _id = entry.id', async () => {
    const e = sampleEntry({ id: 'a1' });
    await store.add(e);
    expect(model._rows.has('a1')).toBe(true);
  });

  it('get() returns doc with id field populated', async () => {
    await store.add(sampleEntry({ id: 'a2' }));
    const r = await store.get('a2');
    expect(r.id).toBe('a2');
    expect(r.integration).toBe('zatca');
  });

  it('list() filters by integration + paginates', async () => {
    for (let i = 0; i < 5; i++) {
      await store.add(sampleEntry({ id: 'z' + i, integration: 'zatca', createdAt: 1000 + i }));
    }
    for (let i = 0; i < 3; i++) {
      await store.add(sampleEntry({ id: 'n' + i, integration: 'nafath', createdAt: 2000 + i }));
    }

    const all = await store.list({ integration: 'zatca' });
    expect(all.total).toBe(5);
    expect(all.rows).toHaveLength(5);

    const page = await store.list({ integration: 'zatca', limit: 2, offset: 1 });
    expect(page.total).toBe(5);
    expect(page.rows).toHaveLength(2);
  });

  it('listForReplay() filters by status=parked + olderThanMs', async () => {
    const now = Date.now();
    await store.add(sampleEntry({ id: 'fresh', updatedAt: now }));
    await store.add(sampleEntry({ id: 'aged', updatedAt: now - 60_000 }));
    await store.add(sampleEntry({ id: 'resolved', status: 'resolved', updatedAt: now - 60_000 }));

    const eligible = await store.listForReplay({ batchSize: 10, olderThanMs: 30_000 });
    expect(eligible.map(r => r.id)).toEqual(['aged']);
  });

  it('updateStatus() updates status + updatedAt', async () => {
    await store.add(sampleEntry({ id: 'u1' }));
    const updated = await store.updateStatus('u1', 'resolved', { resolvedAt: Date.now() });
    expect(updated.status).toBe('resolved');
    expect(typeof updated.updatedAt).toBe('number');
  });

  it('remove() returns true when doc existed', async () => {
    await store.add(sampleEntry({ id: 'r1' }));
    expect(await store.remove('r1')).toBe(true);
    expect(await store.remove('r1')).toBe(false);
  });
});
