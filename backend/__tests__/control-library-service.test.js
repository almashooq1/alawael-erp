'use strict';

/**
 * control-library-service.test.js — Phase 13 Commit 4 (4.0.58).
 *
 * Tests the full control-library lifecycle: seed → list → record
 * test → auto-check with / without a runner → deprecate /
 * not-applicable / reactivate → coverage aggregation. Also pins
 * registry invariants (counts + framework coverage).
 */

process.env.NODE_ENV = 'test';

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const {
  createControlLibraryService,
  computeNextDue,
} = require('../services/quality/controlLibrary.service');
const { CONTROL_LIBRARY, summarizeByFramework } = require('../config/control-library.registry');

let mongoServer;
let QualityControl;

const userA = new mongoose.Types.ObjectId();
const branch1 = new mongoose.Types.ObjectId();
const branch2 = new mongoose.Types.ObjectId();

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  if (mongoose.connection.readyState !== 0) {
    try {
      await mongoose.disconnect();
    } catch {
      /* ignore */
    }
  }
  await mongoose.connect(mongoServer.getUri(), { dbName: 'control-lib-test' });
  QualityControl = require('../models/quality/QualityControl.model');
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

afterEach(async () => {
  await QualityControl.deleteMany({});
});

// ── tests ──────────────────────────────────────────────────────────

describe('ControlLibraryService', () => {
  function svc(opts = {}) {
    return createControlLibraryService({ model: QualityControl, ...opts });
  }

  describe('registry invariants', () => {
    it('library has a non-trivial number of controls', () => {
      expect(CONTROL_LIBRARY.length).toBeGreaterThanOrEqual(40);
    });

    it('covers the critical frameworks', () => {
      const fws = summarizeByFramework();
      for (const required of ['cbahi', 'jci', 'iso_9001', 'pdpl', 'moh']) {
        expect(fws[required]).toBeGreaterThanOrEqual(1);
      }
    });

    it('every control has a unique id', () => {
      const ids = CONTROL_LIBRARY.map(c => c.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('every control has at least one regulationRef', () => {
      for (const c of CONTROL_LIBRARY) {
        expect(c.regulationRefs.length).toBeGreaterThanOrEqual(1);
      }
    });

    it('every automatic control has an autoTestHint', () => {
      const automatic = CONTROL_LIBRARY.filter(c => c.testMethod === 'automatic');
      for (const c of automatic) {
        expect(c.autoTestHint).toBeTruthy();
        expect(typeof c.autoTestHint.check).toBe('string');
      }
    });
  });

  describe('seed', () => {
    it('creates one row per registry entry on first call', async () => {
      const s = svc();
      const result = await s.seed({ branchId: branch1 });
      expect(result.created).toBe(CONTROL_LIBRARY.length);
      expect(result.updated).toBe(0);
      const count = await QualityControl.countDocuments({ branchId: branch1 });
      expect(count).toBe(CONTROL_LIBRARY.length);
    });

    it('is idempotent — second call refreshes fields without duplicating', async () => {
      const s = svc();
      await s.seed({ branchId: branch1 });
      const result2 = await s.seed({ branchId: branch1 });
      expect(result2.created).toBe(0);
      expect(result2.updated).toBe(CONTROL_LIBRARY.length);
      const count = await QualityControl.countDocuments({ branchId: branch1 });
      expect(count).toBe(CONTROL_LIBRARY.length);
    });

    it('preserves testRuns and lastResult across re-seed', async () => {
      const s = svc();
      await s.seed({ branchId: branch1 });
      const doc = await s.findByControlId('cbahi.hr.01', { branchId: branch1 });
      await s.recordTestRun(doc, { outcome: 'pass', score: 95 }, userA);

      await s.seed({ branchId: branch1 }); // re-seed
      const after = await s.findByControlId('cbahi.hr.01', { branchId: branch1 });
      expect(after.lastResult).toBe('pass');
      expect(after.testRuns).toHaveLength(1);
    });

    it('scopes rows per branch', async () => {
      const s = svc();
      await s.seed({ branchId: branch1 });
      await s.seed({ branchId: branch2 });
      const total = await QualityControl.countDocuments({});
      expect(total).toBe(CONTROL_LIBRARY.length * 2);
    });
  });

  describe('recordTestRun', () => {
    beforeEach(async () => {
      await svc().seed({ branchId: branch1 });
    });

    it('appends a run and updates last* mirrors', async () => {
      const s = svc();
      const selector = { controlId: 'cbahi.pr.01', branchId: branch1 };
      const before = new Date('2026-04-20T10:00:00Z');
      const doc = await s.recordTestRun(
        selector,
        { outcome: 'pass', score: 100, testedAt: before, narrative: 'clean' },
        userA
      );
      expect(doc.lastResult).toBe('pass');
      expect(doc.lastScore).toBe(100);
      expect(doc.testRuns).toHaveLength(1);
      // frequency `on_event` → nextDueAt null
      expect(doc.nextDueAt).toBeNull();
    });

    it('rejects unknown outcome', async () => {
      const s = svc();
      const sel = { controlId: 'cbahi.pr.01', branchId: branch1 };
      await expect(s.recordTestRun(sel, { outcome: 'wtf' }, userA)).rejects.toThrow(/outcome/);
    });

    it('computes nextDueAt from frequency (monthly)', async () => {
      const s = svc();
      const sel = { controlId: 'cbahi.pci.01', branchId: branch1 }; // monthly
      const testedAt = new Date('2026-01-15T00:00:00Z');
      const doc = await s.recordTestRun(sel, { outcome: 'pass', score: 85, testedAt }, userA);
      const expected = new Date(testedAt.getTime() + 30 * 86400000);
      expect(doc.nextDueAt.getTime()).toBe(expected.getTime());
    });

    it('emits compliance.control.tested', async () => {
      const events = [];
      const dispatcher = {
        async emit(name, payload) {
          events.push({ name, payload });
        },
      };
      const s = createControlLibraryService({
        model: QualityControl,
        dispatcher,
      });
      await s.recordTestRun(
        { controlId: 'cbahi.pr.01', branchId: branch1 },
        { outcome: 'pass' },
        userA
      );
      expect(events.some(e => e.name === 'compliance.control.tested')).toBe(true);
    });
  });

  describe('runAutoCheck', () => {
    beforeEach(async () => {
      await svc().seed({ branchId: branch1 });
    });

    it('runs a registered runner and records a pass', async () => {
      const runner = jest.fn(async () => ({ outcome: 'pass', score: 92, details: { n: 14 } }));
      const s = svc({ autoCheckRunners: { scfhs_licenses_valid: runner } });
      const doc = await s.runAutoCheck({ controlId: 'cbahi.hr.01', branchId: branch1 });
      expect(doc.lastResult).toBe('pass');
      expect(doc.lastScore).toBe(92);
      expect(runner).toHaveBeenCalled();
      expect(doc.testRuns[0].autoCheckDetails).toEqual({ n: 14 });
    });

    it('records not_tested with gap when runner is missing', async () => {
      const s = svc({ autoCheckRunners: {} });
      const doc = await s.runAutoCheck({ controlId: 'cbahi.hr.01', branchId: branch1 });
      expect(doc.lastResult).toBe('not_tested');
      expect(doc.testRuns[0].gaps.join(',')).toMatch(/scfhs_licenses_valid/);
    });

    it('records fail when runner throws', async () => {
      const s = svc({
        autoCheckRunners: {
          scfhs_licenses_valid: async () => {
            throw new Error('db down');
          },
        },
      });
      const doc = await s.runAutoCheck({ controlId: 'cbahi.hr.01', branchId: branch1 });
      expect(doc.lastResult).toBe('fail');
      expect(doc.testRuns[0].narrative).toMatch(/db down/);
    });

    it('records not_tested when control has no autoTestHint', async () => {
      const s = svc();
      // cbahi.pr.03 is `evidenced`, no hint
      const doc = await s.runAutoCheck({ controlId: 'cbahi.pr.03', branchId: branch1 });
      expect(doc.lastResult).toBe('not_tested');
      expect(doc.testRuns[0].gaps.join(',')).toMatch(/no autoTestHint/);
    });
  });

  describe('deprecate / not_applicable / reactivate', () => {
    beforeEach(async () => {
      await svc().seed({ branchId: branch1 });
    });

    it('deprecate requires reason', async () => {
      const s = svc();
      await expect(
        s.deprecate({ controlId: 'cbahi.pr.03', branchId: branch1 }, '', userA)
      ).rejects.toThrow(/reason/);
    });

    it('deprecate is idempotent', async () => {
      const s = svc();
      await s.deprecate({ controlId: 'cbahi.pr.03', branchId: branch1 }, 'superseded', userA);
      const again = await s.deprecate(
        { controlId: 'cbahi.pr.03', branchId: branch1 },
        'again',
        userA
      );
      expect(again.status).toBe('deprecated');
      expect(again.deprecatedReason).toBe('superseded');
    });

    it('not_applicable and reactivate round-trip', async () => {
      const s = svc();
      await s.markNotApplicable({ controlId: 'sfda.01', branchId: branch1 }, 'no devices', userA);
      const after = await s.findByControlId('sfda.01', { branchId: branch1 });
      expect(after.status).toBe('not_applicable');
      expect(after.notApplicableReason).toBe('no devices');

      const re = await s.reactivate({ controlId: 'sfda.01', branchId: branch1 }, userA);
      expect(re.status).toBe('active');
      expect(re.notApplicableReason).toBeNull();
    });
  });

  describe('list + getCoverage', () => {
    beforeEach(async () => {
      await svc().seed({ branchId: branch1 });
    });

    it('list filters by category and criticality', async () => {
      const s = svc();
      const ps = await s.list({ branchId: branch1, category: 'patient_safety' });
      expect(ps.length).toBeGreaterThan(0);
      for (const r of ps) expect(r.category).toBe('patient_safety');

      const crit = await s.list({ branchId: branch1, criticality: 'critical' });
      expect(crit.length).toBeGreaterThan(0);
      for (const r of crit) expect(r.criticality).toBe('critical');
    });

    it('list overdueOnly returns only rows with nextDueAt in the past', async () => {
      const s = svc();
      // Force one control to be overdue
      const pre = await s.findByControlId('cbahi.pci.01', { branchId: branch1 });
      pre.nextDueAt = new Date(Date.now() - 86400000);
      await pre.save();

      const overdue = await s.list({ branchId: branch1, overdueOnly: true });
      expect(overdue.map(c => c.controlId)).toContain('cbahi.pci.01');
    });

    it('getCoverage aggregates by framework and outcome', async () => {
      const s = svc();
      // Simulate some results
      await s.recordTestRun(
        { controlId: 'cbahi.hr.01', branchId: branch1 },
        { outcome: 'pass', score: 100 },
        userA
      );
      await s.recordTestRun(
        { controlId: 'pdpl.01', branchId: branch1 },
        { outcome: 'fail', score: 0 },
        userA
      );
      await s.recordTestRun(
        { controlId: 'iso9001.7.5', branchId: branch1 },
        { outcome: 'partial', score: 60 },
        userA
      );

      const cov = await s.getCoverage({ branchId: branch1 });
      expect(cov.total).toBe(CONTROL_LIBRARY.length);
      expect(cov.byOutcome.pass).toBe(1);
      expect(cov.byOutcome.fail).toBe(1);
      expect(cov.byOutcome.partial).toBe(1);
      // the rest are not_tested
      const expectedNotTested = CONTROL_LIBRARY.length - 3;
      expect(cov.byOutcome.not_tested).toBe(expectedNotTested);
      expect(cov.byFramework.cbahi.total).toBeGreaterThan(0);
    });
  });

  describe('computeNextDue helper', () => {
    it('returns null for on_event', () => {
      expect(computeNextDue('on_event', new Date())).toBeNull();
    });

    it('adds 90 days for quarterly', () => {
      const from = new Date('2026-01-01T00:00:00Z');
      const due = computeNextDue('quarterly', from);
      expect(due.getTime()).toBe(from.getTime() + 90 * 86400000);
    });
  });
});
