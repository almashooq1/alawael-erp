'use strict';

/**
 * measure-scoring-engine-wave212.test.js — Wave 212.
 *
 * Verifies the per-measure scoring framework:
 *
 *   Contract enforcement (registry refuses bad modules at load time):
 *     - Missing required field
 *     - Bad SemVer
 *     - Invalid enum (derivedType / direction)
 *     - Missing required function
 *
 *   Registry behaviour:
 *     - resolve() returns module by code
 *     - resolveStrict() refuses version mismatch with Measure doc
 *     - list() enumerates all registered modules
 *     - duplicate measureCode is a load-time error
 *
 *   Per-module score correctness:
 *     SCQ:
 *       - sum scoring, item 1 zeroing items 2-7 when absent
 *       - cutoff at 15 → 'at_or_above_cutoff' band
 *       - below cutoff → 'below_cutoff'
 *       - validateRaw rejects wrong length / invalid values
 *
 *     Berg:
 *       - sum across 14 items 0-4 each
 *       - tier bands (0-20 high / 21-40 moderate / 41-56 low)
 *       - missing items count as 0 (per manual)
 *
 *     FIM:
 *       - sum + subscale decomposition (motor/cognitive)
 *       - 5 tiers (L1..L5) at expected cutoffs
 *       - out-of-range rejected at interpret()
 *
 *   Delta + MCID logic:
 *     - Berg: 5-point improvement with MCID=4 → mcidMet=true
 *     - Berg: 3-point improvement with MCID=4 → mcidMet=false
 *     - Direction inversion (SCQ lower_better): decrease = 'improving'
 *     - mcidMet=null when measure.mcid.status='not_applicable' or absent
 *     - sdcMet computed independently
 *
 *   Public service contract:
 *     - score() returns canonical envelope w/ version pinning
 *     - score() refuses version mismatch
 *     - hasModule() reports registration state
 *     - interpret() works without raw items
 */

jest.unmock('mongoose');
jest.setTimeout(30000);

const path = require('path');
const fs = require('fs');
const { validateContract } = require('../measures/scoring/contract');
const registry = require('../measures/scoring');
const scoringEngine = require('../services/measureScoringEngine.service');

// ─── Contract enforcement ─────────────────────────────────────────────

describe('W212 — contract enforcement', () => {
  test('accepts a fully-valid module', () => {
    const ok = {
      measureCode: 'X',
      engineVersion: '1.0.0',
      derivedType: 'sum',
      direction: 'higher_better',
      computeDerived: () => ({ value: 0 }),
      interpret: () => ({ band: 'low' }),
      delta: () => null,
    };
    expect(() => validateContract(ok, 'test')).not.toThrow();
  });

  test('rejects missing measureCode', () => {
    expect(() =>
      validateContract(
        {
          engineVersion: '1.0.0',
          derivedType: 'sum',
          direction: 'higher_better',
          computeDerived: () => ({ value: 0 }),
          interpret: () => ({}),
          delta: () => null,
        },
        'test'
      )
    ).toThrow(/missing or non-string measureCode/);
  });

  test('rejects non-SemVer engineVersion', () => {
    expect(() =>
      validateContract(
        {
          measureCode: 'X',
          engineVersion: 'v1',
          derivedType: 'sum',
          direction: 'higher_better',
          computeDerived: () => ({}),
          interpret: () => ({}),
          delta: () => null,
        },
        'test'
      )
    ).toThrow(/not SemVer/);
  });

  test('rejects invalid derivedType enum', () => {
    expect(() =>
      validateContract(
        {
          measureCode: 'X',
          engineVersion: '1.0.0',
          derivedType: 'magic',
          direction: 'higher_better',
          computeDerived: () => ({}),
          interpret: () => ({}),
          delta: () => null,
        },
        'test'
      )
    ).toThrow(/derivedType 'magic' invalid/);
  });

  test('rejects missing required function', () => {
    expect(() =>
      validateContract(
        {
          measureCode: 'X',
          engineVersion: '1.0.0',
          derivedType: 'sum',
          direction: 'higher_better',
          computeDerived: () => ({}),
          interpret: () => ({}),
          // delta missing
        },
        'test'
      )
    ).toThrow(/missing required function: delta/);
  });
});

// ─── Registry ─────────────────────────────────────────────────────────

describe('W212 — registry', () => {
  test('discovers SCQ + BERG + FIM', () => {
    const codes = registry.list().map(m => m.measureCode);
    expect(codes).toEqual(expect.arrayContaining(['SCQ', 'BERG', 'FIM']));
  });

  test('resolve() returns the module by code', () => {
    const scq = registry.resolve('SCQ');
    expect(scq).toBeTruthy();
    expect(scq.measureCode).toBe('SCQ');
    expect(scq.engineVersion).toBe('1.0.0');
  });

  test('resolve() returns null for unknown code', () => {
    expect(registry.resolve('NOPE')).toBeNull();
  });

  test('has() reports registration state', () => {
    expect(registry.has('SCQ')).toBe(true);
    expect(registry.has('UNREGISTERED')).toBe(false);
  });

  test('resolveStrict() refuses version mismatch', () => {
    expect(() => registry.resolveStrict({ code: 'SCQ', scoringEngineVersion: '9.9.9' })).toThrow(
      /version mismatch/i
    );
  });

  test('resolveStrict() succeeds when versions agree', () => {
    const mod = registry.resolveStrict({ code: 'SCQ', scoringEngineVersion: '1.0.0' });
    expect(mod.measureCode).toBe('SCQ');
  });

  test('resolveStrict() refuses unknown measureCode', () => {
    expect(() => registry.resolveStrict({ code: 'NOPE' })).toThrow(/No scoring module/);
  });

  // Filename-vs-measureCode misalignment — we test by writing a temp
  // broken file under scoring/ and forcing reload.
  test('reload picks up dir changes; bad files trigger load-time error', () => {
    const tmp = path.join(__dirname, '..', 'measures', 'scoring', 'broken-tmp.js');
    fs.writeFileSync(
      tmp,
      `module.exports = {
        measureCode: 'COMPLETELY_DIFFERENT',
        engineVersion: '1.0.0',
        derivedType: 'sum',
        direction: 'higher_better',
        computeDerived: () => ({}),
        interpret: () => ({}),
        delta: () => null,
      };`
    );
    try {
      // Clear require cache so reload picks up the new file.
      delete require.cache[require.resolve(tmp)];
      expect(() => registry.reload()).toThrow(/filename .* doesn't match measureCode/);
    } finally {
      fs.unlinkSync(tmp);
      delete require.cache[require.resolve(tmp)];
      registry.reload(); // back to clean state for the rest of the suite
    }
  });
});

// ─── SCQ scoring ──────────────────────────────────────────────────────

describe('W212 — SCQ module', () => {
  const scq = registry.resolve('SCQ');

  test('validateRaw rejects wrong length', () => {
    const v = scq.validateRaw([0, 1, 0]);
    expect(v.ok).toBe(false);
    expect(v.errors[0]).toMatch(/40 items/);
  });

  test('validateRaw rejects non-binary values', () => {
    const items = Array(40).fill(0);
    items[5] = 2;
    const v = scq.validateRaw(items);
    expect(v.ok).toBe(false);
    expect(v.errors[0]).toMatch(/item 6.*must be 0, 1, or null/);
  });

  test('computeDerived: simple sum with item-1 gate present', () => {
    const items = Array(40).fill(0);
    items[0] = 1; // phrase speech present
    items[5] = 1; // item 6 = 1
    items[10] = 1; // item 11 = 1
    items[20] = 1; // item 21 = 1
    const result = scq.computeDerived(items);
    // Items 1 excluded from total; items 6/11/21 = 3 contributions.
    expect(result.value).toBe(3);
    expect(result.notes.phraseSpeechGate).toBe('present');
  });

  test('computeDerived: gate absent zeros items 2-7', () => {
    const items = Array(40).fill(0);
    items[0] = 0; // gate absent
    items[1] = 1; // would-be item 2 — gets zeroed
    items[5] = 1; // would-be item 6 — gets zeroed
    items[10] = 1; // item 11 — kept
    const result = scq.computeDerived(items);
    expect(result.value).toBe(1); // only item 11 survives
    expect(result.notes.phraseSpeechGate).toBe('absent_items_2_7_zeroed');
  });

  test('interpret: below cutoff', () => {
    const interp = scq.interpret(10);
    expect(interp.band).toBe('below_cutoff');
    expect(interp.severity).toBe('normal');
  });

  test('interpret: at/above cutoff returns referral action', () => {
    const interp = scq.interpret(20);
    expect(interp.band).toBe('at_or_above_cutoff');
    expect(interp.action_ar).toMatch(/ADOS-2/);
  });

  test('delta: lower_better direction reports decrease as improving', () => {
    const d = scq.delta(20, 10, { interpretation: { mcid: { status: 'not_applicable' } } });
    expect(d.absolute).toBe(-10);
    expect(d.direction).toBe('improving');
    expect(d.mcidMet).toBeNull(); // status=not_applicable
  });

  test('delta: crossing the cutoff is flagged', () => {
    const d = scq.delta(20, 12, {});
    expect(d.crossedCutoff).toBe('now_below_cutoff');
  });
});

// ─── Berg scoring ─────────────────────────────────────────────────────

describe('W212 — Berg module', () => {
  const berg = registry.resolve('BERG');

  test('computeDerived: sum across 14 items 0-4', () => {
    const items = Array(14).fill(4); // perfect score
    expect(berg.computeDerived(items).value).toBe(56);
  });

  test('computeDerived: missing items count as 0', () => {
    const items = Array(14).fill(4);
    items[0] = null;
    items[5] = null;
    const r = berg.computeDerived(items);
    expect(r.value).toBe(48); // 14*4 - 2*4
    expect(r.notes.itemsMissing).toBe(2);
  });

  test('validateRaw rejects out-of-range', () => {
    const items = Array(14).fill(2);
    items[3] = 5;
    expect(berg.validateRaw(items).ok).toBe(false);
  });

  test('interpret tiers: 56 = low fall risk', () => {
    expect(berg.interpret(56).tier).toBe('low');
  });

  test('interpret tiers: 30 = moderate', () => {
    expect(berg.interpret(30).tier).toBe('moderate');
  });

  test('interpret tiers: 10 = high', () => {
    expect(berg.interpret(10).tier).toBe('high');
  });

  test('delta + MCID: 5-point improvement, MCID=4, established → mcidMet=true', () => {
    const measure = {
      interpretation: { mcid: { value: 4, status: 'established' }, sdc: { value: 2 } },
    };
    const d = berg.delta(40, 45, measure);
    expect(d.absolute).toBe(5);
    expect(d.direction).toBe('improving');
    expect(d.mcidMet).toBe(true);
    expect(d.sdcMet).toBe(true);
  });

  test('delta + MCID: 3-point change < MCID=4 → mcidMet=false', () => {
    const measure = {
      interpretation: { mcid: { value: 4, status: 'established' }, sdc: { value: 2 } },
    };
    const d = berg.delta(40, 43, measure);
    expect(d.mcidMet).toBe(false);
    expect(d.sdcMet).toBe(true);
  });

  test('delta: literature_pending MCID returns null (no claim)', () => {
    const measure = { interpretation: { mcid: { value: 4, status: 'literature_pending' } } };
    const d = berg.delta(40, 45, measure);
    expect(d.mcidMet).toBeNull();
  });
});

// ─── FIM scoring ──────────────────────────────────────────────────────

describe('W212 — FIM module', () => {
  const fim = registry.resolve('FIM');

  test('computeDerived: subscale decomposition is correct', () => {
    const items = Array(18).fill(4); // 4 across all → total 72
    const r = fim.computeDerived(items);
    expect(r.value).toBe(72);
    expect(r.subscales.motor).toBe(13 * 4);
    expect(r.subscales.cognitive).toBe(5 * 4);
    expect(r.subscales.motorSelfCare).toBe(6 * 4);
  });

  test('validateRaw rejects out-of-range item', () => {
    const items = Array(18).fill(3);
    items[2] = 8;
    expect(fim.validateRaw(items).ok).toBe(false);
  });

  test.each([
    [126, 'L5', 'complete_independence'],
    [115, 'L4', 'modified_independence'],
    [80, 'L3', 'minimal_assistance'],
    [50, 'L2', 'moderate_to_maximal_assistance'],
    [18, 'L1', 'total_dependence'],
  ])('interpret tiers: %i → %s (%s)', (value, expectedTier, expectedBand) => {
    const r = fim.interpret(value);
    expect(r.tier).toBe(expectedTier);
    expect(r.band).toBe(expectedBand);
  });

  test('interpret refuses out-of-range derivedValue', () => {
    expect(() => fim.interpret(200)).toThrow(/outside range/);
  });
});

// ─── Public service ───────────────────────────────────────────────────

describe('W212 — scoringEngine service', () => {
  test('score() returns canonical envelope with version pinning', async () => {
    const items = Array(40).fill(0);
    items[0] = 1;
    items[5] = 1;
    items[10] = 1;
    items[20] = 1;
    const measure = {
      code: 'SCQ',
      version: '1.0.0',
      scoringEngineVersion: '1.0.0',
      interpretation: {
        mcid: { status: 'not_applicable' },
      },
    };
    const result = await scoringEngine.score({ measure, rawItems: items });
    expect(result.measureCode).toBe('SCQ');
    expect(result.engineVersion).toBe('1.0.0');
    expect(result.measureVersion).toBe('1.0.0');
    expect(result.derived.value).toBe(3);
    expect(result.interpretation.band).toBe('below_cutoff');
    expect(result.mcidSnapshot.status).toBe('not_applicable');
  });

  test('score() refuses version mismatch (preserves W211b pinning)', async () => {
    const measure = {
      code: 'SCQ',
      scoringEngineVersion: '9.9.9',
    };
    const items = Array(40).fill(0);
    items[0] = 1;
    await expect(scoringEngine.score({ measure, rawItems: items })).rejects.toThrow(
      /version mismatch/i
    );
  });

  test('score() computes delta when prevDerived provided', async () => {
    const items = Array(14).fill(3); // sum = 42
    const measure = {
      code: 'BERG',
      version: '1.0.0',
      scoringEngineVersion: '1.0.0',
      interpretation: { mcid: { value: 4, status: 'established' }, sdc: { value: 2 } },
    };
    const result = await scoringEngine.score({ measure, rawItems: items, prevDerived: 35 });
    expect(result.derived.value).toBe(42);
    expect(result.delta.absolute).toBe(7);
    expect(result.delta.mcidMet).toBe(true);
  });

  test('score() rejects invalid raw items via INVALID_RAW code', async () => {
    const measure = { code: 'SCQ', scoringEngineVersion: '1.0.0' };
    await expect(scoringEngine.score({ measure, rawItems: [0, 1] })).rejects.toMatchObject({
      code: 'INVALID_RAW',
    });
  });

  test('interpret() works without raw items', async () => {
    const measure = { code: 'BERG', scoringEngineVersion: '1.0.0' };
    const interp = await scoringEngine.interpret(measure, 50);
    expect(interp.tier).toBe('low');
  });

  test('delta() computes against the registered module', async () => {
    const measure = {
      code: 'BERG',
      scoringEngineVersion: '1.0.0',
      interpretation: { mcid: { value: 4, status: 'established' } },
    };
    const d = await scoringEngine.delta(measure, 40, 45);
    expect(d.mcidMet).toBe(true);
  });

  test('list() includes the 3 originally-registered modules', () => {
    // W212 pins the original 3-module contract. W252 added VINELAND-3 + WEEFIM
    // and asserts the exact 5-module list — this test stays as a minimum-set
    // guarantee so it doesn't have to be updated every time a new scoring
    // module ships.
    const codes = scoringEngine
      .list()
      .map(m => m.measureCode)
      .sort();
    expect(codes).toEqual(expect.arrayContaining(['BERG', 'FIM', 'SCQ']));
  });

  test('hasModule() reports registration', () => {
    expect(scoringEngine.hasModule('SCQ')).toBe(true);
    expect(scoringEngine.hasModule('NOPE')).toBe(false);
  });
});
