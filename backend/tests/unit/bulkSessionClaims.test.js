'use strict';

const mongoose = require('mongoose');
const { runBulk, ABS_MAX_BATCH, DEFAULT_MAX_BATCH } = require('../../services/bulkSessionClaims');

const id = () => new mongoose.Types.ObjectId();
const sid = oid => String(oid);

// Build a chainable model mock for TherapySession.find().select().limit().lean()
function makeSessionModel(rows) {
  return {
    find: jest.fn(filter => {
      let r = rows;
      if (filter.status) r = r.filter(x => x.status === filter.status);
      if (filter.date?.$gte) r = r.filter(x => x.date >= filter.date.$gte);
      if (filter.date?.$lte) r = r.filter(x => x.date <= filter.date.$lte);
      if (filter.beneficiary?.$in) {
        const ids = filter.beneficiary.$in.map(String);
        r = r.filter(x => ids.includes(String(x.beneficiary)));
      }
      let limit = Infinity;
      const chain = {
        select: jest.fn().mockReturnThis(),
        limit: jest.fn(n => {
          limit = n;
          return chain;
        }),
        lean: jest.fn(() => Promise.resolve(r.slice(0, limit))),
      };
      return chain;
    }),
  };
}

// NphiesClaim mock — supports find({ session: { $in } }).select().lean()
function makeClaimModel(claimedSessionIds = []) {
  return {
    find: jest.fn(filter => {
      const claimed = claimedSessionIds.map(String);
      const wanted = (filter.session?.$in || []).map(String);
      const hits = wanted.filter(w => claimed.includes(w)).map(s => ({ session: s }));
      return {
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(hits),
      };
    }),
  };
}

// Inject a fake bridge so we don't need the real one + can drive its outcomes.
function makeBridge(outcomeFor) {
  return {
    buildClaimFromSession: jest.fn(async (sessionId, _opts) => {
      const outcome = outcomeFor(sessionId);
      if (outcome.throw) throw new Error(outcome.throw);
      return {
        ok: outcome.ok,
        claim: outcome.ok
          ? {
              _id: id(),
              claimNumber: outcome.claimNumber || 'CLM-X',
              totalAmount: outcome.total ?? 100,
            }
          : null,
        errors: outcome.errors || [],
        warnings: outcome.warnings || [],
        priceSource: outcome.priceSource || null,
      };
    }),
  };
}

describe('services/bulkSessionClaims.runBulk', () => {
  describe('input validation', () => {
    test('rejects unparseable dates', async () => {
      const r = await runBulk({ from: 'oops', to: '2026-04-30' });
      expect(r.ok).toBe(false);
      expect(r.reason).toBe('invalid_date_range');
    });

    test('rejects from > to', async () => {
      const r = await runBulk({ from: '2026-05-01', to: '2026-04-01' });
      expect(r.ok).toBe(false);
      expect(r.reason).toBe('from_after_to');
    });
  });

  describe('candidate selection', () => {
    test('finds COMPLETED sessions in date range only', async () => {
      const inRange = id();
      const sessions = [
        { _id: inRange, status: 'COMPLETED', date: new Date('2026-04-15') },
        { _id: id(), status: 'COMPLETED', date: new Date('2025-01-01') }, // before range
        { _id: id(), status: 'SCHEDULED', date: new Date('2026-04-15') }, // wrong status
      ];
      const models = {
        TherapySession: makeSessionModel(sessions),
        NphiesClaim: makeClaimModel([]),
      };
      const bridge = makeBridge(() => ({
        ok: true,
        claimNumber: 'CLM-1',
        total: 200,
      }));

      const r = await runBulk({
        from: '2026-04-01',
        to: '2026-04-30',
        models,
        options: { bridge },
      });

      expect(r.ok).toBe(true);
      expect(r.candidateCount).toBe(1);
      expect(r.created).toHaveLength(1);
      expect(r.created[0].sessionId).toBe(sid(inRange));
      expect(bridge.buildClaimFromSession).toHaveBeenCalledTimes(1);
    });

    test('respects branchBeneficiaryIds scope', async () => {
      const ben1 = id();
      const ben2 = id();
      const sessions = [
        { _id: id(), status: 'COMPLETED', date: new Date('2026-04-15'), beneficiary: ben1 },
        { _id: id(), status: 'COMPLETED', date: new Date('2026-04-15'), beneficiary: ben2 },
      ];
      const models = {
        TherapySession: makeSessionModel(sessions),
        NphiesClaim: makeClaimModel([]),
      };
      const bridge = makeBridge(() => ({ ok: true }));

      const r = await runBulk({
        from: '2026-04-01',
        to: '2026-04-30',
        branchBeneficiaryIds: [ben1],
        models,
        options: { bridge },
      });

      expect(r.candidateCount).toBe(1);
    });

    test('honors maxBatch cap', async () => {
      const sessions = Array.from({ length: 50 }, () => ({
        _id: id(),
        status: 'COMPLETED',
        date: new Date('2026-04-15'),
      }));
      const models = {
        TherapySession: makeSessionModel(sessions),
        NphiesClaim: makeClaimModel([]),
      };
      const bridge = makeBridge(() => ({ ok: true }));

      const r = await runBulk({
        from: '2026-04-01',
        to: '2026-04-30',
        maxBatch: 10,
        models,
        options: { bridge },
      });

      expect(r.candidateCount).toBe(10);
    });

    test('clamps maxBatch to ABS_MAX_BATCH', async () => {
      expect(ABS_MAX_BATCH).toBeGreaterThanOrEqual(DEFAULT_MAX_BATCH);
      // Build many sessions to verify the clamp is enforced.
      const sessions = Array.from({ length: ABS_MAX_BATCH + 100 }, () => ({
        _id: id(),
        status: 'COMPLETED',
        date: new Date('2026-04-15'),
      }));
      const models = {
        TherapySession: makeSessionModel(sessions),
        NphiesClaim: makeClaimModel([]),
      };
      const bridge = makeBridge(() => ({ ok: true }));

      const r = await runBulk({
        from: '2026-04-01',
        to: '2026-04-30',
        maxBatch: ABS_MAX_BATCH * 10,
        models,
        options: { bridge },
      });

      expect(r.candidateCount).toBe(ABS_MAX_BATCH);
    });
  });

  describe('idempotency', () => {
    test('skips sessions that already have a NphiesClaim row', async () => {
      const s1 = id();
      const s2 = id();
      const sessions = [
        { _id: s1, status: 'COMPLETED', date: new Date('2026-04-15') },
        { _id: s2, status: 'COMPLETED', date: new Date('2026-04-15') },
      ];
      const models = {
        TherapySession: makeSessionModel(sessions),
        NphiesClaim: makeClaimModel([s1]), // s1 already claimed
      };
      const bridge = makeBridge(() => ({ ok: true, claimNumber: 'CLM-X' }));

      const r = await runBulk({
        from: '2026-04-01',
        to: '2026-04-30',
        models,
        options: { bridge },
      });

      expect(r.candidateCount).toBe(2);
      expect(r.skipped).toContainEqual(
        expect.objectContaining({ sessionId: sid(s1), reason: 'already_claimed' })
      );
      expect(r.created).toHaveLength(1);
      expect(r.created[0].sessionId).toBe(sid(s2));
      // The bridge should only be invoked for the un-claimed session.
      expect(bridge.buildClaimFromSession).toHaveBeenCalledTimes(1);
      expect(bridge.buildClaimFromSession).toHaveBeenCalledWith(sid(s2), expect.any(Object));
    });
  });

  describe('partition semantics', () => {
    test('errors from bridge become skipped (business-rule rejections)', async () => {
      const s1 = id();
      const s2 = id();
      const sessions = [
        { _id: s1, status: 'COMPLETED', date: new Date('2026-04-15') },
        { _id: s2, status: 'COMPLETED', date: new Date('2026-04-15') },
      ];
      const models = {
        TherapySession: makeSessionModel(sessions),
        NphiesClaim: makeClaimModel([]),
      };
      const bridge = makeBridge(sId => {
        if (sId === sid(s1)) {
          return { ok: false, errors: ['no_insurance_on_file'] };
        }
        return { ok: true, claimNumber: 'CLM-A', total: 200 };
      });

      const r = await runBulk({
        from: '2026-04-01',
        to: '2026-04-30',
        models,
        options: { bridge },
      });

      expect(r.skipped).toContainEqual(
        expect.objectContaining({ sessionId: sid(s1), reason: 'no_insurance_on_file' })
      );
      expect(r.created).toHaveLength(1);
    });

    test('thrown exceptions become failed (not skipped)', async () => {
      const s1 = id();
      const s2 = id();
      const sessions = [
        { _id: s1, status: 'COMPLETED', date: new Date('2026-04-15') },
        { _id: s2, status: 'COMPLETED', date: new Date('2026-04-15') },
      ];
      const models = {
        TherapySession: makeSessionModel(sessions),
        NphiesClaim: makeClaimModel([]),
      };
      const bridge = makeBridge(sId => {
        if (sId === sid(s1)) return { throw: 'db_blew_up' };
        return { ok: true };
      });

      const r = await runBulk({
        from: '2026-04-01',
        to: '2026-04-30',
        models,
        options: { bridge },
      });

      expect(r.failed).toContainEqual(
        expect.objectContaining({ sessionId: sid(s1), error: 'db_blew_up' })
      );
      expect(r.created).toHaveLength(1);
    });

    test('one session failure does not block the rest', async () => {
      const sessions = Array.from({ length: 5 }, () => ({
        _id: id(),
        status: 'COMPLETED',
        date: new Date('2026-04-15'),
      }));
      const models = {
        TherapySession: makeSessionModel(sessions),
        NphiesClaim: makeClaimModel([]),
      };
      let n = 0;
      const bridge = makeBridge(() => {
        n++;
        if (n === 3) return { throw: 'boom' };
        return { ok: true };
      });

      const r = await runBulk({
        from: '2026-04-01',
        to: '2026-04-30',
        models,
        options: { bridge },
      });

      expect(r.candidateCount).toBe(5);
      expect(r.created).toHaveLength(4);
      expect(r.failed).toHaveLength(1);
      expect(r.created.length + r.failed.length + r.skipped.length).toBe(r.candidateCount);
    });
  });

  describe('dry-run', () => {
    test('dryRun: true does not write claimId but still partitions', async () => {
      const sessions = [{ _id: id(), status: 'COMPLETED', date: new Date('2026-04-15') }];
      const models = {
        TherapySession: makeSessionModel(sessions),
        NphiesClaim: makeClaimModel([]),
      };
      const bridge = makeBridge(() => ({ ok: true, claimNumber: 'CLM-X' }));

      const r = await runBulk({
        from: '2026-04-01',
        to: '2026-04-30',
        dryRun: true,
        models,
        options: { bridge },
      });

      expect(r.dryRun).toBe(true);
      expect(r.created).toHaveLength(1);
      expect(r.created[0].claimId).toBeNull();
      expect(bridge.buildClaimFromSession).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ dryRun: true })
      );
    });
  });

  describe('empty case', () => {
    test('returns clean report when no candidates exist', async () => {
      const models = {
        TherapySession: makeSessionModel([]),
        NphiesClaim: makeClaimModel([]),
      };
      const bridge = makeBridge(() => ({ ok: true }));

      const r = await runBulk({
        from: '2026-04-01',
        to: '2026-04-30',
        models,
        options: { bridge },
      });

      expect(r.ok).toBe(true);
      expect(r.candidateCount).toBe(0);
      expect(r.created).toEqual([]);
      expect(r.skipped).toEqual([]);
      expect(r.failed).toEqual([]);
      expect(bridge.buildClaimFromSession).not.toHaveBeenCalled();
    });
  });
});
