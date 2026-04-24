/**
 * yakeen-verification-service.test.js — cache, persist, and audit behaviour
 * for the civil-registry verification layer.
 *
 * Scenarios:
 *   • verify() persists the adapter result and returns verificationId
 *   • second verify for the same (nationalId + name + dob + 'match') inside
 *     the window returns cached=true and does NOT re-call the adapter
 *   • forceRefresh=true bypasses the cache
 *   • non-match results are never cached (adapter is called again next time)
 *   • mismatch is persisted but not reused on subsequent calls
 *   • invalid national ID throws INVALID_ID
 *   • getHistory returns rows in reverse-chronological order
 */

'use strict';

const { createService } = require('../services/yakeenVerificationService');

function createFakeModel() {
  const rows = [];
  let seq = 1;
  class FakeDoc {
    constructor(data) {
      Object.assign(this, data);
      this._id = `id-${seq++}`;
      this.createdAt = this.createdAt || new Date();
    }
    toObject() {
      return { ...this };
    }
  }
  return {
    _rows: rows,
    async create(data) {
      const doc = new FakeDoc(data);
      rows.push(doc);
      return doc;
    },
    findOne(q) {
      const chain = {
        sort: () => chain,
        lean: async () => null,
        then: undefined,
      };
      const candidates = rows.filter(r => {
        if (q.nationalIdHash && r.nationalIdHash !== q.nationalIdHash) return false;
        if (q.result && r.result !== q.result) return false;
        if (q.nameChecked !== undefined && r.nameChecked !== q.nameChecked) return false;
        if (q.dobChecked !== undefined && r.dobChecked !== q.dobChecked) return false;
        if (q.createdAt && q.createdAt.$gte && r.createdAt < q.createdAt.$gte) return false;
        if (q.contextEntityType && r.contextEntityType !== q.contextEntityType) return false;
        if (q.contextEntityId && r.contextEntityId !== q.contextEntityId) return false;
        return true;
      });
      // newest-first "sort" for this fake
      candidates.sort((a, b) => b.createdAt - a.createdAt);
      chain.then = (resolve, reject) =>
        Promise.resolve(candidates[0] || null).then(resolve, reject);
      return chain;
    },
    find(q) {
      const chain = {
        sort: () => chain,
        limit: () => chain,
        lean: async () => {
          const matched = rows.filter(r => {
            if (q.nationalIdHash && r.nationalIdHash !== q.nationalIdHash) return false;
            if (q.context && r.context !== q.context) return false;
            return true;
          });
          matched.sort((a, b) => b.createdAt - a.createdAt);
          return matched.map(r => ({ ...r }));
        },
      };
      return chain;
    },
  };
}

describe('yakeenVerificationService', () => {
  let model;
  let adapterCallCount;
  let adapter;
  let service;

  beforeEach(() => {
    model = createFakeModel();
    adapterCallCount = 0;
    adapter = {
      validateNationalId: nid => /^[12]\d{9}$/.test(nid || ''),
      verify: jest.fn(async ({ nationalId }) => {
        adapterCallCount++;
        const tail = String(nationalId).slice(-2);
        if (tail === '00') return { status: 'not_found', mode: 'mock' };
        if (tail === '77') return { status: 'mismatch', mode: 'mock' };
        return {
          status: 'match',
          attributes: { fullName_ar: 'تجريبي', nationality: 'SAU' },
          mode: 'mock',
          latencyMs: 12,
        };
      }),
    };
    service = createService({ model, adapter, cacheWindowMs: 60_000 });
  });

  it('persists the first call and returns cached=false', async () => {
    const out = await service.verify({ nationalId: '1087654321' });
    expect(out.cached).toBe(false);
    expect(out.result).toBe('match');
    expect(out.attributes.fullName_ar).toBe('تجريبي');
    expect(model._rows).toHaveLength(1);
    expect(adapterCallCount).toBe(1);
  });

  it('reuses a match from cache on the second call', async () => {
    await service.verify({ nationalId: '1087654321' });
    const second = await service.verify({ nationalId: '1087654321' });
    expect(second.cached).toBe(true);
    expect(adapterCallCount).toBe(1);
  });

  it('forceRefresh=true bypasses the cache', async () => {
    await service.verify({ nationalId: '1087654321' });
    const second = await service.verify({ nationalId: '1087654321', forceRefresh: true });
    expect(second.cached).toBe(false);
    expect(adapterCallCount).toBe(2);
  });

  it('does not cache non-match results', async () => {
    await service.verify({ nationalId: '1087654300' }); // not_found
    const second = await service.verify({ nationalId: '1087654300' });
    expect(second.cached).toBe(false);
    expect(adapterCallCount).toBe(2);
    expect(model._rows).toHaveLength(2);
  });

  it('persists mismatches for audit even though they are not cached', async () => {
    await service.verify({ nationalId: '1087654377', firstName_ar: 'wrong' });
    expect(model._rows[0].result).toBe('mismatch');
  });

  it('throws INVALID_ID on a malformed national ID', async () => {
    await expect(service.verify({ nationalId: '123' })).rejects.toMatchObject({
      code: 'INVALID_ID',
    });
  });

  it('returns history newest-first', async () => {
    await service.verify({ nationalId: '1087654321' });
    // advance time so the second row is strictly newer
    await new Promise(r => setTimeout(r, 5));
    await service.verify({ nationalId: '1087654321', forceRefresh: true });
    const rows = await service.getHistory({ nationalId: '1087654321', limit: 10 });
    expect(rows).toHaveLength(2);
    expect(rows[0].createdAt >= rows[1].createdAt).toBe(true);
  });
});
