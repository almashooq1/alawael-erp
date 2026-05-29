'use strict';

/**
 * measures-catalog-seed-wave556.test.js — W556.
 *
 * The flagship-measures catalog feeds the seed that finally binds the
 * scoring modules to real `Measure` documents. Tests lock:
 *   1. crossCheck() (pure) passes for every catalog entry + catches a
 *      deliberately broken entry (drift between catalog ↔ scorer).
 *   2. Every catalog entry validates against the Measure model invariants
 *      (W210 governance — outcome measures need derivedType +
 *      interpretationStyle, MCID value needs a source citation).
 *   3. Every digitally-administrable scoring module (one with an itemBank)
 *      has a catalog entry — so we never ship an item bank with no Measure
 *      doc (the exact dormant-engine gap W556 closes).
 */

jest.unmock('mongoose');
jest.setTimeout(30000);

const mongoose = require('mongoose');
const registry = require('../measures/scoring');
const { crossCheck, MEASURES } = require('../scripts/seed-measures-catalog');

require('../domains/goals/models/Measure');
const Measure = mongoose.model('Measure');

describe('W556 — catalog ↔ scorer cross-check', () => {
  test('every catalog entry passes crossCheck', () => {
    for (const def of MEASURES) {
      const r = crossCheck(def);
      expect(r.errors).toEqual([]);
      expect(r.ok).toBe(true);
    }
  });

  test('crossCheck catches an engineVersion mismatch', () => {
    const broken = { ...MEASURES[0], scoringEngineVersion: '9.9.9' };
    const r = crossCheck(broken);
    expect(r.ok).toBe(false);
    expect(r.errors.join(' ')).toMatch(/engineVersion/);
  });

  test('crossCheck catches a direction mismatch', () => {
    const broken = { ...MEASURES.find(m => m.code === 'PEDSQL'), scoringDirection: 'lower_better' };
    const r = crossCheck(broken);
    expect(r.ok).toBe(false);
    expect(r.errors.join(' ')).toMatch(/direction/);
  });

  test('crossCheck catches an unknown code', () => {
    const r = crossCheck({ code: 'NOPE', scoringEngineVersion: '1.0.0' });
    expect(r.ok).toBe(false);
    expect(r.errors.join(' ')).toMatch(/no scoring module/);
  });
});

describe('W556 — catalog entries satisfy Measure model invariants', () => {
  for (const def of MEASURES) {
    test(`${def.code} validates against the Measure schema`, () => {
      const doc = new Measure(def);
      const err = doc.validateSync();
      expect(err).toBeUndefined();
    });
  }

  test('PedsQL (outcome) declares derivedType + interpretationStyle + MCID source', () => {
    const p = MEASURES.find(m => m.code === 'PEDSQL');
    expect(p.purpose).toBe('outcome');
    expect(p.derivedType).toBe('weighted_sum');
    expect(p.interpretationStyle).toBe('band');
    expect(p.interpretation.mcid.source).toMatch(/Varni/);
  });

  test('interpretScore maps a boundary score to the right band', () => {
    const mchat = new Measure(MEASURES.find(m => m.code === 'M-CHAT-R'));
    expect(mchat.interpretScore(8).severity).toBe('severe'); // high risk starts at 8
    expect(mchat.interpretScore(2).severity).toBe('normal');
  });
});

describe('W556 — no administrable instrument is missing a catalog entry', () => {
  test('every item-bank scoring module has a catalog Measure', () => {
    const catalogCodes = new Set(MEASURES.map(m => m.code));
    const administrable = registry
      .list()
      .filter(m => m.hasItemBank)
      .map(m => m.measureCode);
    for (const code of administrable) {
      expect(catalogCodes.has(code)).toBe(true);
    }
  });
});
