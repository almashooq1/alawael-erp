'use strict';

/**
 * standards-traceability.test.js — World-Class QMS Phase 29 Commit 5.
 *
 * Tests for the ISO 9001 registry + the generic standards-traceability
 * service.
 */

jest.unmock('mongoose');
jest.resetModules();

process.env.NODE_ENV = 'test';

const mongoose = require('mongoose');
const standards = require('../config/standards');
const iso9001 = require('../config/standards/iso-9001-2015.registry');
const {
  createStandardsTraceabilityService,
} = require('../services/quality/standardsTraceability.service');

let ownServer = null;
let Trace;
const creator = new mongoose.Types.ObjectId();
const branchA = new mongoose.Types.ObjectId();

beforeAll(async () => {
  const { MongoMemoryServer } = require('mongodb-memory-server');
  ownServer = await MongoMemoryServer.create();
  const uri = ownServer.getUri();
  if (mongoose.connection.readyState !== 0) {
    try {
      await mongoose.disconnect();
    } catch {
      /* ignore */
    }
  }
  await mongoose.connect(uri, { dbName: 'standards-test', serverSelectionTimeoutMS: 10000 });
  Trace = require('../models/quality/StandardsTraceability.model');
}, 60_000);

afterAll(async () => {
  await mongoose.disconnect();
  if (ownServer) await ownServer.stop();
});

afterEach(async () => {
  await Trace.deleteMany({});
});

// ── registry ─────────────────────────────────────────────────────────

describe('ISO 9001:2015 registry', () => {
  test('lists at least 30 clauses', () => {
    expect(iso9001.CLAUSES.length).toBeGreaterThanOrEqual(30);
  });

  test('every clause has a unique code', () => {
    const codes = iso9001.CLAUSES.map(c => c.code);
    const set = new Set(codes);
    expect(set.size).toBe(codes.length);
  });

  test('parent references are valid', () => {
    const codes = new Set(iso9001.CLAUSES.map(c => c.code));
    for (const c of iso9001.CLAUSES) {
      if (c.parentCode) expect(codes.has(c.parentCode)).toBe(true);
    }
  });

  test('top-level audit sections 4-10 present', () => {
    for (const section of ['4', '5', '6', '7', '8', '9', '10']) {
      expect(iso9001.CLAUSES.find(c => c.code === section)).toBeTruthy();
    }
  });

  test('summariseCoverage handles empty + populated lists', () => {
    expect(iso9001.summariseCoverage([]).coverage).toBe(0);
    const s = iso9001.summariseCoverage([
      { status: 'evidence_attached' },
      { status: 'audit_passed' },
      { status: 'not_started' },
      { status: 'in_progress' },
    ]);
    expect(s.coverage).toBeCloseTo(0.5, 2);
    expect(s.evidencedClauses).toBe(2);
  });
});

describe('standards index', () => {
  test('listStandards returns ISO 9001, JCI, CBAHI', () => {
    const list = standards.listStandards();
    const codes = list.map(s => s.code);
    expect(codes).toContain('iso_9001_2015');
    expect(codes).toContain('jci_7th_ed');
    expect(codes).toContain('cbahi_hc_4th_ed');
  });

  test('findClause returns clause or null', () => {
    expect(standards.findClause('iso_9001_2015', '9.3')).toBeTruthy();
    expect(standards.findClause('iso_9001_2015', '99.99')).toBeNull();
  });

  test('getStandard throws for unknown code', () => {
    expect(() => standards.getStandard('bogus')).toThrow();
  });
});

describe('JCI 7th ed. registry', () => {
  const jci = require('../config/standards/jci-7th-ed.registry');

  test('lists 6 IPSGs', () => {
    const ipsgs = jci.CLAUSES.filter(c => c.code.startsWith('IPSG.'));
    expect(ipsgs).toHaveLength(6);
  });

  test('parent codes are valid', () => {
    const codes = new Set(jci.CLAUSES.map(c => c.code));
    for (const c of jci.CLAUSES) {
      if (c.parentCode) expect(codes.has(c.parentCode)).toBe(true);
    }
  });

  test('summariseCoverage works the same way', () => {
    expect(jci.summariseCoverage([]).coverage).toBe(0);
  });
});

describe('ISO 13485:2016 registry', () => {
  const iso13485 = require('../config/standards/iso-13485-2016.registry');

  test('covers device-specific clauses 7.5.5, 7.5.6, 7.5.9, 8.2.3', () => {
    const codes = iso13485.CLAUSES.map(c => c.code);
    expect(codes).toEqual(expect.arrayContaining(['7.5.5', '7.5.6', '7.5.9', '8.2.3']));
  });

  test('every parent code resolves', () => {
    const codes = new Set(iso13485.CLAUSES.map(c => c.code));
    for (const c of iso13485.CLAUSES) {
      if (c.parentCode) expect(codes.has(c.parentCode)).toBe(true);
    }
  });
});

describe('ISO 14971:2019 registry', () => {
  const iso14971 = require('../config/standards/iso-14971-2019.registry');

  test('includes lifecycle sections 4-10', () => {
    const tops = iso14971.CLAUSES.filter(c => c.parentCode === null).map(c => c.code);
    expect(tops).toEqual(expect.arrayContaining(['4', '5', '6', '7', '8', '9', '10']));
  });

  test('risk-management plan + file are evidence-required', () => {
    const plan = iso14971.CLAUSES.find(c => c.code === '4.4');
    const file = iso14971.CLAUSES.find(c => c.code === '4.5');
    expect(plan.evidenceRequired).toBe(true);
    expect(file.evidenceRequired).toBe(true);
  });
});

describe('Standards index — full set', () => {
  test('all 5 standards registered', () => {
    const codes = standards.listStandards().map(s => s.code);
    expect(codes).toEqual(
      expect.arrayContaining([
        'iso_9001_2015',
        'jci_7th_ed',
        'cbahi_hc_4th_ed',
        'iso_13485_2016',
        'iso_14971_2019',
      ])
    );
  });
});

describe('CBAHI 4th ed. registry', () => {
  const cbahi = require('../config/standards/cbahi-hc-4th-ed.registry');

  test('includes the 11 chapter headers', () => {
    const chapters = cbahi.CLAUSES.filter(c => c.parentCode === null);
    const codes = chapters.map(c => c.code);
    expect(codes).toEqual(
      expect.arrayContaining(['LD', 'QM', 'PR', 'AC', 'AS', 'MM', 'IC', 'FS', 'HR', 'IM', 'ESR'])
    );
  });

  test('every clause has both Arabic + English labels', () => {
    for (const c of cbahi.CLAUSES) {
      expect(c.nameAr).toBeTruthy();
      expect(c.nameEn).toBeTruthy();
    }
  });
});

// ── service ──────────────────────────────────────────────────────────

describe('StandardsTraceabilityService.initialiseForBranch', () => {
  test('seeds one record per evidence-required clause', async () => {
    const svc = createStandardsTraceabilityService({ model: Trace });
    const inserted = await svc.initialiseForBranch('iso_9001_2015', branchA, creator);
    const expectedCount = iso9001.CLAUSES.filter(c => c.evidenceRequired).length;
    expect(inserted.length).toBe(expectedCount);
    // idempotent
    const second = await svc.initialiseForBranch('iso_9001_2015', branchA, creator);
    expect(second.length).toBe(0);
  });
});

describe('StandardsTraceabilityService.setStatus + attachEvidence', () => {
  test('setStatus records the transition + emits an event', async () => {
    const events = [];
    const dispatcher = {
      async emit(name, payload) {
        events.push({ name, payload });
      },
    };
    const svc = createStandardsTraceabilityService({ model: Trace, dispatcher });

    let doc = await svc.setStatus(
      'iso_9001_2015',
      '9.3',
      branchA,
      { status: 'in_progress', note: 'ready to gather evidence' },
      creator
    );
    expect(doc.status).toBe('in_progress');
    doc = await svc.setStatus(
      'iso_9001_2015',
      '9.3',
      branchA,
      { status: 'evidence_attached' },
      creator
    );
    expect(doc.status).toBe('evidence_attached');
    expect(doc.reviewHistory).toHaveLength(2);
    expect(events.filter(e => e.name === 'quality.standard.clause_status_changed')).toHaveLength(2);
  });

  test('attachEvidence auto-promotes from not_started → evidence_attached', async () => {
    const svc = createStandardsTraceabilityService({ model: Trace });
    const doc = await svc.attachEvidence(
      'iso_9001_2015',
      '7.2',
      branchA,
      { kind: 'training_record', title: 'Annual competency assessment 2026' },
      creator
    );
    expect(doc.status).toBe('evidence_attached');
    expect(doc.evidenceLinks).toHaveLength(1);
  });

  test('removeEvidence drops back to in_progress when last link removed', async () => {
    const svc = createStandardsTraceabilityService({ model: Trace });
    let doc = await svc.attachEvidence(
      'iso_9001_2015',
      '7.2',
      branchA,
      { kind: 'training_record', title: 'T1' },
      creator
    );
    const linkId = doc.evidenceLinks[0]._id;
    doc = await svc.removeEvidence('iso_9001_2015', '7.2', branchA, linkId, creator);
    expect(doc.evidenceLinks).toHaveLength(0);
    expect(doc.status).toBe('in_progress');
  });

  test('setStatus rejects not_applicable without reason', async () => {
    const svc = createStandardsTraceabilityService({ model: Trace });
    await expect(
      svc.setStatus('iso_9001_2015', '9.3', branchA, { status: 'not_applicable' }, creator)
    ).rejects.toMatchObject({ code: 'VALIDATION' });
  });

  test('rejects unknown clause code', async () => {
    const svc = createStandardsTraceabilityService({ model: Trace });
    await expect(
      svc.setStatus('iso_9001_2015', '99.9', branchA, { status: 'in_progress' }, creator)
    ).rejects.toMatchObject({ code: 'VALIDATION' });
  });
});

describe('StandardsTraceabilityService.getTraceabilityMatrix', () => {
  test('returns coverage % + gap list', async () => {
    const svc = createStandardsTraceabilityService({ model: Trace });
    await svc.attachEvidence(
      'iso_9001_2015',
      '9.3',
      branchA,
      { kind: 'management_review', title: 'Q1 review minutes' },
      creator
    );
    await svc.attachEvidence(
      'iso_9001_2015',
      '7.2',
      branchA,
      { kind: 'training_record', title: 'Competency matrix' },
      creator
    );
    const matrix = await svc.getTraceabilityMatrix('iso_9001_2015', branchA);
    expect(matrix.standard.code).toBe('iso_9001_2015');
    expect(matrix.rows.length).toBe(iso9001.CLAUSES.length);
    expect(matrix.summary.evidencedClauses).toBeGreaterThanOrEqual(2);
    expect(matrix.summary.coveragePercent).toBeGreaterThan(0);
    expect(matrix.gaps.length).toBeGreaterThan(0); // most clauses still in not_started
  });

  test('dashboard summarises every registered standard', async () => {
    const svc = createStandardsTraceabilityService({ model: Trace });
    const out = await svc.getDashboard({ branchId: branchA });
    expect(out.find(d => d.standard.code === 'iso_9001_2015')).toBeTruthy();
  });
});
