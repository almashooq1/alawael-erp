/**
 * behavioral-escalation-source-wave434.test.js — Wave 434 (Phase D2 wire-up).
 *
 * Wires the W433 EscalationPredictor lib into the W286 Risk Orchestrator
 * as a 5th source. Three drift layers:
 *
 *   1. SOURCE_WEIGHTS registry shape — 5 entries, sum = 1.0, new entry
 *      named 'behavioral_escalation', existing four renormalized (no
 *      silent change to the orchestrator's overall composite shape).
 *   2. LOAD_SOURCES wiring — orchestrator.js requires the new source
 *      file at boot. listSources() returns 5 names including the new one.
 *   3. Source plugin behaviour — model unavailable → SOURCE_UNAVAILABLE,
 *      empty series → NO_DATA score=0, populated series → score+factors
 *      derived from predictor.signals[].
 *
 * No real Mongoose — mongoose.model spied per test, BehaviorIncident
 * stubbed in-memory.
 */

'use strict';

const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

const {
  SOURCE_WEIGHTS,
  weightedComposite,
  tierFromScore,
} = require('../intelligence/risk/registry');
const {
  SOURCE_NAME,
  FETCH_WINDOW_DAYS,
  fetch: fetchSource,
} = require('../intelligence/risk/sources/behavioral-escalation.source');
const { listSources } = require('../intelligence/risk/orchestrator');

const ORCHESTRATOR_JS = path.resolve(__dirname, '..', 'intelligence', 'risk', 'orchestrator.js');
const REGISTRY_JS = path.resolve(__dirname, '..', 'intelligence', 'risk', 'registry.js');
const READ = p => fs.readFileSync(p, 'utf8');

afterEach(() => {
  jest.restoreAllMocks();
});

// ──────────────────────────────────────────────────────────────────
//  1. SOURCE_WEIGHTS registry — 5 entries, sum = 1.0
// ──────────────────────────────────────────────────────────────────

describe('W434 — SOURCE_WEIGHTS extended to 5 sources', () => {
  test('contains the new behavioral_escalation slot', () => {
    expect(Object.keys(SOURCE_WEIGHTS).sort()).toEqual(
      ['behavioral_escalation', 'cdss', 'clinical', 'dropout', 'psych_flags'].sort()
    );
  });

  test('sum of all 5 weights = 1.0 (no silent total drift)', () => {
    const sum = Object.values(SOURCE_WEIGHTS).reduce((s, v) => s + v, 0);
    expect(sum).toBeCloseTo(1, 5);
  });

  test('behavioral_escalation weight is 0.15 (mid-tier — between cdss and psych_flags)', () => {
    expect(SOURCE_WEIGHTS.behavioral_escalation).toBe(0.15);
  });

  test('clinical retains majority share (≥30%) — most authoritative source not diluted', () => {
    expect(SOURCE_WEIGHTS.clinical).toBeGreaterThanOrEqual(0.3);
    expect(SOURCE_WEIGHTS.clinical).toBeGreaterThanOrEqual(SOURCE_WEIGHTS.behavioral_escalation);
  });

  test('registry source code declares the new entry with W434 marker', () => {
    const src = READ(REGISTRY_JS);
    expect(src).toMatch(/behavioral_escalation:\s*0\.15.*W434/);
  });
});

// ──────────────────────────────────────────────────────────────────
//  2. weightedComposite handles the 5th source
// ──────────────────────────────────────────────────────────────────

describe('W434 — weightedComposite with behavioral_escalation', () => {
  test('all 5 sources at 100 → composite = 100', () => {
    const r = weightedComposite({
      clinical: 100,
      psych_flags: 100,
      dropout: 100,
      cdss: 100,
      behavioral_escalation: 100,
    });
    expect(r.score).toBe(100);
    expect(r.sourceCount).toBe(5);
    expect(r.weightUsed).toBeCloseTo(1, 5);
  });

  test('only behavioral_escalation = 80 → renormalized to 80 (its weight is sole)', () => {
    const r = weightedComposite({ behavioral_escalation: 80 });
    expect(r.score).toBe(80);
    expect(r.sourceCount).toBe(1);
  });

  test('mixed: clinical=50 + behavioral=80 → weighted by their slice', () => {
    const r = weightedComposite({ clinical: 50, behavioral_escalation: 80 });
    // Weights: clinical=0.35, behavioral=0.15 → totalWeight=0.50
    // composite = (0.35/0.50)*50 + (0.15/0.50)*80 = 35 + 24 = 59
    expect(r.score).toBe(59);
  });

  test('unknown source slot ignored (drift safety)', () => {
    const r = weightedComposite({ behavioral_escalation: 80, made_up_source: 50 });
    expect(r.sourceCount).toBe(1);
  });
});

// ──────────────────────────────────────────────────────────────────
//  3. LOAD_SOURCES wiring (orchestrator boot)
// ──────────────────────────────────────────────────────────────────

describe('W434 — LOAD_SOURCES wiring', () => {
  test('orchestrator.listSources() returns all 5 source names', () => {
    const names = listSources();
    expect(names.sort()).toEqual(
      ['behavioral_escalation', 'cdss', 'clinical', 'dropout', 'psych_flags'].sort()
    );
  });

  test('orchestrator.js source-tree declares the require with W434 marker', () => {
    const src = READ(ORCHESTRATOR_JS);
    expect(src).toMatch(/require\(['"]\.\/sources\/behavioral-escalation\.source['"]\).*W434/);
  });

  test('source plugin module exports the documented contract', () => {
    expect(SOURCE_NAME).toBe('behavioral_escalation');
    expect(typeof fetchSource).toBe('function');
    expect(FETCH_WINDOW_DAYS).toBe(21);
  });
});

// ──────────────────────────────────────────────────────────────────
//  4. fetch() behaviour
// ──────────────────────────────────────────────────────────────────

describe('W434 — fetch() behaviour', () => {
  test('BehaviorIncident model unavailable → SOURCE_UNAVAILABLE', async () => {
    jest.spyOn(mongoose, 'model').mockImplementation(name => {
      if (name === 'BehaviorIncident') throw new Error('not registered');
      return {};
    });
    const r = await fetchSource('ben-1');
    expect(r.available).toBe(false);
    expect(r.reason).toBe('SOURCE_UNAVAILABLE');
    expect(r.score).toBeNull();
    expect(r.factors).toEqual([]);
    expect(r.source).toBe('behavioral_escalation');
  });

  test('empty result → available + NO_DATA + score 0', async () => {
    const model = {
      find: () => ({
        sort: () => ({
          limit: () => ({
            select: () => ({ lean: async () => [] }),
          }),
        }),
      }),
    };
    jest.spyOn(mongoose, 'model').mockImplementation(name => {
      if (name === 'BehaviorIncident') return model;
      return {};
    });
    const r = await fetchSource('ben-1');
    expect(r.available).toBe(true);
    expect(r.reason).toBe('NO_DATA');
    expect(r.score).toBe(0);
    expect(r.factors).toEqual([]);
    expect(r.raw.totalCount).toBe(0);
  });

  test('populated series → score + factors + raw breakdown derived from predictor', async () => {
    const now = Date.now();
    const recent = [
      // ≥3 same-antecedent + major + recent + high-acuity → critical
      {
        observedAt: new Date(now - 1 * 3600_000),
        behaviorType: 'aggression',
        severity: 'major',
        antecedent: 'transition',
      },
      {
        observedAt: new Date(now - 6 * 3600_000),
        behaviorType: 'aggression',
        severity: 'major',
        antecedent: 'transition',
      },
      {
        observedAt: new Date(now - 24 * 3600_000),
        behaviorType: 'self_injury',
        severity: 'major',
        antecedent: 'transition',
      },
      { observedAt: new Date(now - 48 * 3600_000), behaviorType: 'aggression', severity: 'major' },
      {
        observedAt: new Date(now - 72 * 3600_000),
        behaviorType: 'aggression',
        severity: 'moderate',
      },
    ];
    const model = {
      find: () => ({
        sort: () => ({
          limit: () => ({
            select: () => ({ lean: async () => recent }),
          }),
        }),
      }),
    };
    jest.spyOn(mongoose, 'model').mockImplementation(name => {
      if (name === 'BehaviorIncident') return model;
      return {};
    });

    const r = await fetchSource('ben-1');
    expect(r.available).toBe(true);
    expect(r.score).toBeGreaterThan(0);
    expect(r.factors.length).toBeGreaterThan(0);
    // Each factor must carry the orchestrator envelope shape
    for (const f of r.factors) {
      expect(f.source).toBe('behavioral_escalation');
      expect(f.code).toMatch(/^ESCALATION_/);
      expect(f).toHaveProperty('weight');
      expect(f).toHaveProperty('evidence');
    }
    expect(r.raw.recentCount).toBeGreaterThanOrEqual(3);
    expect(['low', 'moderate', 'high', 'critical']).toContain(r.raw.tier);
  });

  test('critical scenario → returns critical tier in raw + composite-ready high score', async () => {
    const now = Date.now();
    const incidents = Array.from({ length: 10 }, (_, i) => ({
      observedAt: new Date(now - (i + 1) * 3600_000),
      behaviorType: 'self_injury',
      severity: 'major',
      antecedent: 'transition',
    }));
    const model = {
      find: () => ({
        sort: () => ({
          limit: () => ({
            select: () => ({ lean: async () => incidents }),
          }),
        }),
      }),
    };
    jest.spyOn(mongoose, 'model').mockImplementation(name => {
      if (name === 'BehaviorIncident') return model;
      return {};
    });
    const r = await fetchSource('ben-1');
    expect(r.score).toBeGreaterThanOrEqual(75);
    expect(r.raw.tier).toBe('critical');
    expect(tierFromScore(r.score)).toBe('critical');
  });
});
