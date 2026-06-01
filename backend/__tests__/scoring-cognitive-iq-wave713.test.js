'use strict';

/**
 * scoring-cognitive-iq-wave713.test.js — W713
 *
 * Contract + registry + governance + behavioural coverage for two SCORE-ENTRY-
 * ONLY cognitive instruments:
 *   • SB5      — Stanford-Binet Intelligence Scales, Fifth Edition  [proprietary]
 *   • WECHSLER — Wechsler scales (WPPSI-IV / WISC-V / WAIS-IV)       [proprietary]
 *
 * Both modules ship NO test items and NO conversion tables — only the
 * examiner-entered final standard scores + public-domain classification bands.
 * The governance tests assert they are recorded as proprietary and NOT
 * digitizable by default (no on-screen item reproduction).
 *
 * Pure modules (no mongoose) — no DB mocking required.
 */

const { validateContract } = require('../measures/scoring/contract');
const registry = require('../measures/scoring');
const { getLicensing, evaluateDigitization } = require('../measures/governance/licensing.registry');

const CODES = ['SB5', 'WECHSLER'];
const FILES = {
  SB5: '../measures/scoring/sb5',
  WECHSLER: '../measures/scoring/wechsler',
};

describe('W713 — contract compliance', () => {
  test.each(CODES)('%s satisfies the scoring contract', code => {
    const mod = require(FILES[code]);
    expect(() => validateContract(mod)).not.toThrow();
    expect(mod.measureCode).toBe(code);
    expect(mod.direction).toBe('higher_better');
    expect(mod.rawShape).toBe('domain_scores');
  });

  test('neither module ships an itemBank (no copyrighted item reproduction)', () => {
    for (const code of CODES) {
      expect(require(FILES[code]).itemBank).toBeUndefined();
    }
  });
});

describe('W713 — registry wiring', () => {
  test('both resolve from the auto-loading registry', () => {
    for (const code of CODES) {
      expect(registry.has(code)).toBe(true);
      expect(registry.resolve(code).measureCode).toBe(code);
    }
  });

  test('getItemBank returns no items for score-entry-only modules', () => {
    for (const code of CODES) {
      const ib = registry.getItemBank(code);
      // either no wrapper or a wrapper with no items array
      expect(ib == null || ib.itemBank == null).toBe(true);
    }
  });
});

describe('W713 — licensing governance (proprietary, score-entry only)', () => {
  test.each(CODES)('%s is proprietary and NOT digitizable by default', code => {
    const lic = getLicensing(code);
    expect(lic).toBeTruthy();
    expect(lic.licenseType).toBe('proprietary');
    expect(lic.digitizationDefault).toBe(false);
    expect(evaluateDigitization(code, {}).allowed).toBe(false);
  });
});

describe('SB5 — compute / interpret / delta', () => {
  const mod = registry.resolve('SB5');

  test('passes through Full Scale IQ and carries factor indices as subscales', () => {
    const d = mod.computeDerived({
      fsiq: 108,
      indices: { fluidReasoning: 110, workingMemory: 102 },
    });
    expect(d.value).toBe(108);
    expect(d.subscales.fluidReasoning).toBe(110);
    expect(d.notes.scale).toBe('standard_score_mean100_sd15');
    expect(mod.interpret(108).band).toBe('average');
  });

  test('classification ladder across the standard-score range', () => {
    expect(mod.interpret(135).band).toBe('very_superior');
    expect(mod.interpret(122).band).toBe('superior');
    expect(mod.interpret(112).band).toBe('high_average');
    expect(mod.interpret(100).band).toBe('average');
    expect(mod.interpret(84).band).toBe('low_average');
    expect(mod.interpret(74).band).toBe('borderline');
    expect(mod.interpret(60).band).toBe('extremely_low');
    expect(mod.interpret(60).severity).toBe('critical');
  });

  test('rejects out-of-range scores and unknown indices', () => {
    expect(mod.validateRaw({ fsiq: 30 }).ok).toBe(false);
    expect(mod.validateRaw({ fsiq: 165 }).ok).toBe(false);
    expect(mod.validateRaw({ fsiq: 100, indices: { bogus: 100 } }).ok).toBe(false);
    expect(() => mod.computeDerived({ fsiq: 200 })).toThrow(/SB5/);
  });

  test('delta is higher_better and reports band shift', () => {
    const d = mod.delta(72, 92, mod);
    expect(d.direction).toBe('improving');
    expect(d.bandShift).toBe(2); // borderline(1) -> average(3)
  });
});

describe('WECHSLER — compute / interpret / delta', () => {
  const mod = registry.resolve('WECHSLER');

  test('passes through FSIQ, records edition, carries primary indices', () => {
    const d = mod.computeDerived({ fsiq: 76, edition: 'WAIS-IV', indices: { vci: 80, psi: 72 } });
    expect(d.value).toBe(76);
    expect(d.notes.edition).toBe('WAIS-IV');
    expect(d.subscales.vci).toBe(80);
    expect(mod.interpret(76).band).toBe('borderline');
    expect(mod.interpret(76).severity).toBe('severe');
  });

  test('classification ladder', () => {
    expect(mod.interpret(131).band).toBe('very_high');
    expect(mod.interpret(120).band).toBe('high');
    expect(mod.interpret(115).band).toBe('high_average');
    expect(mod.interpret(95).band).toBe('average');
    expect(mod.interpret(82).band).toBe('low_average');
    expect(mod.interpret(68).band).toBe('extremely_low');
  });

  test('rejects bad edition, unknown index, and out-of-range', () => {
    expect(mod.validateRaw({ fsiq: 100, edition: 'BOGUS' }).ok).toBe(false);
    expect(mod.validateRaw({ fsiq: 100, indices: { iq: 100 } }).ok).toBe(false);
    expect(mod.validateRaw({ fsiq: 12 }).ok).toBe(false);
    expect(() => mod.computeDerived('not-an-object')).toThrow(/Wechsler/);
  });

  test('delta improving across bands', () => {
    const d = mod.delta(88, 112, mod);
    expect(d.direction).toBe('improving');
    expect(d.bandShift).toBe(2); // low_average(2) -> high_average(4)
  });
});
