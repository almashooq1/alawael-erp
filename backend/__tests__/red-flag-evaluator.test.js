/**
 * red-flag-evaluator.test.js — Beneficiary-360 Foundation Commit 2.
 *
 * Exhaustive coverage of the pure evaluator: path extraction,
 * condition operators, and flag-level orchestration. Pure-function
 * tests — no DB, no I/O, no mocks of services.
 */

'use strict';

const {
  extractPath,
  evaluateCondition,
  evaluateFlag,
  _tokenize,
} = require('../services/redFlagEvaluator');
const { RED_FLAGS, byId } = require('../config/red-flags.registry');

// ─── Tokenizer ──────────────────────────────────────────────────

describe('extractPath — tokenizer', () => {
  it('parses a simple property', () => {
    expect(_tokenize('foo')).toEqual([{ type: 'property', name: 'foo' }]);
  });

  it('parses a nested path', () => {
    expect(_tokenize('a.b.c')).toEqual([
      { type: 'property', name: 'a' },
      { type: 'property', name: 'b' },
      { type: 'property', name: 'c' },
    ]);
  });

  it('parses a filter token with single-quoted value', () => {
    expect(_tokenize("[?severity=='CRITICAL']")).toEqual([
      { type: 'filter', field: 'severity', value: 'CRITICAL' },
    ]);
  });

  it('parses a filter followed by a property', () => {
    expect(_tokenize("[?severity=='CRITICAL'].length")).toEqual([
      { type: 'filter', field: 'severity', value: 'CRITICAL' },
      { type: 'property', name: 'length' },
    ]);
  });

  it('rejects unsupported tokens', () => {
    expect(() => _tokenize('foo.bar[0]')).toThrow(/unsupported token/);
    expect(() => _tokenize('foo..bar')).not.toThrow(); // empty segment is dropped by filter
    expect(() => _tokenize('foo.!')).toThrow(/unsupported token/);
  });
});

// ─── Path extraction ────────────────────────────────────────────

describe('extractPath — property access', () => {
  it('returns the object when path is empty or null', () => {
    expect(extractPath({ a: 1 }, '')).toEqual({ a: 1 });
    expect(extractPath({ a: 1 }, null)).toEqual({ a: 1 });
  });

  it('returns undefined when object is null', () => {
    expect(extractPath(null, 'a')).toBeUndefined();
    expect(extractPath(undefined, 'a.b')).toBeUndefined();
  });

  it('reads a shallow property', () => {
    expect(extractPath({ attendanceRate: 92 }, 'attendanceRate')).toBe(92);
  });

  it('reads a nested property', () => {
    expect(extractPath({ counts: { seizure: 3, fall: 1 } }, 'counts.seizure')).toBe(3);
  });

  it('reads a property that resolves to false-y primitives', () => {
    expect(extractPath({ treatmentActive: false }, 'treatmentActive')).toBe(false);
    expect(extractPath({ overdueCount: 0 }, 'overdueCount')).toBe(0);
    expect(extractPath({ note: '' }, 'note')).toBe('');
  });

  it('short-circuits to undefined on a missing intermediate', () => {
    expect(extractPath({ a: null }, 'a.b.c')).toBeUndefined();
    expect(extractPath({}, 'a.b.c')).toBeUndefined();
  });
});

describe('extractPath — filters and arrays', () => {
  const sample = [
    { severity: 'CRITICAL', count: 2, avg: 4.1 },
    { severity: 'HIGH', count: 7, avg: 11 },
    { severity: 'LOW', count: 0, avg: 30 },
  ];

  it('filters by equality and returns the matching array', () => {
    expect(extractPath(sample, "[?severity=='CRITICAL']")).toEqual([
      { severity: 'CRITICAL', count: 2, avg: 4.1 },
    ]);
  });

  it('filter + .length returns the match count', () => {
    expect(extractPath(sample, "[?severity=='CRITICAL'].length")).toBe(1);
    expect(extractPath(sample, "[?severity=='MISSING'].length")).toBe(0);
  });

  it('filter + .field picks the field from the first match', () => {
    expect(extractPath(sample, "[?severity=='CRITICAL'].avg")).toBe(4.1);
    expect(extractPath(sample, "[?severity=='CRITICAL'].count")).toBe(2);
  });

  it('returns undefined when filter matches nothing and field is requested', () => {
    expect(extractPath(sample, "[?severity=='NOPE'].count")).toBeUndefined();
  });

  it('coerces both sides of the filter equality to strings', () => {
    const numeric = [
      { code: 1, note: 'one' },
      { code: 2, note: 'two' },
    ];
    expect(extractPath(numeric, "[?code=='1'].note")).toBe('one');
  });

  it('returns undefined when filtering a non-array', () => {
    expect(extractPath({ counts: 3 }, "counts.[?x=='y']")).toBeUndefined();
  });

  it('.length on an array without prior filter still works', () => {
    expect(extractPath({ items: [1, 2, 3] }, 'items.length')).toBe(3);
  });
});

// ─── Condition evaluation ───────────────────────────────────────

describe('evaluateCondition — existence operators', () => {
  it("'exists' is true for any present value including 0 and ''", () => {
    expect(evaluateCondition({ operator: 'exists' }, 0)).toBe(true);
    expect(evaluateCondition({ operator: 'exists' }, '')).toBe(true);
    expect(evaluateCondition({ operator: 'exists' }, false)).toBe(true);
    expect(evaluateCondition({ operator: 'exists' }, [])).toBe(true);
  });

  it("'exists' is false for null and undefined", () => {
    expect(evaluateCondition({ operator: 'exists' }, null)).toBe(false);
    expect(evaluateCondition({ operator: 'exists' }, undefined)).toBe(false);
  });

  it("'missing' is the negation of 'exists'", () => {
    expect(evaluateCondition({ operator: 'missing' }, null)).toBe(true);
    expect(evaluateCondition({ operator: 'missing' }, undefined)).toBe(true);
    expect(evaluateCondition({ operator: 'missing' }, 0)).toBe(false);
    expect(evaluateCondition({ operator: 'missing' }, false)).toBe(false);
  });
});

describe('evaluateCondition — equality operators', () => {
  it("'==' matches primitives strictly", () => {
    expect(evaluateCondition({ operator: '==', value: true }, true)).toBe(true);
    expect(evaluateCondition({ operator: '==', value: false }, false)).toBe(true);
    expect(evaluateCondition({ operator: '==', value: 'abc' }, 'abc')).toBe(true);
    expect(evaluateCondition({ operator: '==', value: 5 }, 5)).toBe(true);
  });

  it("'==' coerces numeric strings to numbers", () => {
    expect(evaluateCondition({ operator: '==', value: 5 }, '5')).toBe(true);
    expect(evaluateCondition({ operator: '==', value: '5' }, 5)).toBe(true);
  });

  it("'==' returns false across mismatched types with no numeric bridge", () => {
    expect(evaluateCondition({ operator: '==', value: true }, 'true')).toBe(false);
    expect(evaluateCondition({ operator: '==', value: 'foo' }, 5)).toBe(false);
  });

  it("'==' with null or undefined on either side stays false", () => {
    expect(evaluateCondition({ operator: '==', value: null }, 0)).toBe(false);
    expect(evaluateCondition({ operator: '==', value: 0 }, null)).toBe(false);
    expect(evaluateCondition({ operator: '==', value: null }, null)).toBe(true); // both strict
  });

  it("'!=' is the negation of '==' for present values", () => {
    expect(evaluateCondition({ operator: '!=', value: 5 }, 5)).toBe(false);
    expect(evaluateCondition({ operator: '!=', value: 5 }, 7)).toBe(true);
    expect(evaluateCondition({ operator: '!=', value: 'abc' }, 'abc')).toBe(false);
  });
});

describe('evaluateCondition — relational operators', () => {
  it("'<' / '<=' / '>' / '>=' compare as numbers", () => {
    expect(evaluateCondition({ operator: '<', value: 10 }, 9)).toBe(true);
    expect(evaluateCondition({ operator: '<', value: 10 }, 10)).toBe(false);
    expect(evaluateCondition({ operator: '<=', value: 10 }, 10)).toBe(true);
    expect(evaluateCondition({ operator: '>', value: 10 }, 11)).toBe(true);
    expect(evaluateCondition({ operator: '>=', value: 10 }, 10)).toBe(true);
  });

  it("'crossed' is '>=' at the pure layer", () => {
    expect(evaluateCondition({ operator: 'crossed', value: 30 }, 30)).toBe(true);
    expect(evaluateCondition({ operator: 'crossed', value: 30 }, 31)).toBe(true);
    expect(evaluateCondition({ operator: 'crossed', value: 30 }, 29)).toBe(false);
  });

  it('relational operators return false for null/undefined observed value', () => {
    expect(evaluateCondition({ operator: '<', value: 10 }, null)).toBe(false);
    expect(evaluateCondition({ operator: '>=', value: 10 }, undefined)).toBe(false);
  });

  it('relational operators return false for NaN or non-numeric strings', () => {
    expect(evaluateCondition({ operator: '<', value: 10 }, 'not-a-number')).toBe(false);
    expect(evaluateCondition({ operator: '>=', value: 10 }, NaN)).toBe(false);
  });

  it('negative threshold comparisons work (regression vs baseline)', () => {
    // clinical.progress.regression.significant → value: -20, operator: '<='
    expect(evaluateCondition({ operator: '<=', value: -20 }, -21)).toBe(true);
    expect(evaluateCondition({ operator: '<=', value: -20 }, -20)).toBe(true);
    expect(evaluateCondition({ operator: '<=', value: -20 }, -19)).toBe(false);
    expect(evaluateCondition({ operator: '<=', value: -20 }, 10)).toBe(false);
  });
});

describe('evaluateCondition — error paths', () => {
  it('throws on composite operators', () => {
    expect(() => evaluateCondition({ operator: 'and', value: null }, 1)).toThrow(/composite/);
    expect(() => evaluateCondition({ operator: 'or', value: null }, 1)).toThrow(/composite/);
  });

  it('throws on unknown operator', () => {
    expect(() => evaluateCondition({ operator: 'wat', value: 1 }, 1)).toThrow(/unknown operator/);
  });

  it('throws when operator is missing', () => {
    expect(() => evaluateCondition({}, 1)).toThrow(/operator missing/);
    expect(() => evaluateCondition(null, 1)).toThrow(/operator missing/);
  });
});

// ─── Flag-level orchestration ───────────────────────────────────

describe('evaluateFlag — against the canonical registry', () => {
  it('raises attendance.monthly.rate.low_70 when attendanceRate < 70', () => {
    const flag = byId('attendance.monthly.rate.low_70');
    const verdict = evaluateFlag(flag, { attendanceRate: 62 });
    expect(verdict.raised).toBe(true);
    expect(verdict.observedValue).toBe(62);
    expect(verdict.flagId).toBe('attendance.monthly.rate.low_70');
    expect(verdict.reason).toBe('condition-tripped');
  });

  it('does NOT raise attendance.monthly.rate.low_70 at exactly 70', () => {
    const flag = byId('attendance.monthly.rate.low_70');
    const verdict = evaluateFlag(flag, { attendanceRate: 70 });
    expect(verdict.raised).toBe(false);
    expect(verdict.reason).toBe('condition-clear');
  });

  it('raises clinical.progress.regression.significant on -25% delta', () => {
    const flag = byId('clinical.progress.regression.significant');
    const verdict = evaluateFlag(flag, { deltaPct: -25 });
    expect(verdict.raised).toBe(true);
  });

  it('does not raise clinical.progress.regression.significant on +5% delta', () => {
    const flag = byId('clinical.progress.regression.significant');
    const verdict = evaluateFlag(flag, { deltaPct: 5 });
    expect(verdict.raised).toBe(false);
  });

  it('raises clinical.consent.treatment.missing_pre_session when treatmentActive === false', () => {
    const flag = byId('clinical.consent.treatment.missing_pre_session');
    const verdict = evaluateFlag(flag, { treatmentActive: false });
    expect(verdict.raised).toBe(true);
  });

  it('clears clinical.consent.treatment.missing_pre_session when treatmentActive === true', () => {
    const flag = byId('clinical.consent.treatment.missing_pre_session');
    const verdict = evaluateFlag(flag, { treatmentActive: true });
    expect(verdict.raised).toBe(false);
  });

  it('raises safety.incident.critical.open via filter + length path', () => {
    const flag = byId('safety.incident.critical.open');
    const verdict = evaluateFlag(flag, [
      { severity: 'CRITICAL', id: 'INC-1' },
      { severity: 'HIGH', id: 'INC-2' },
      { severity: 'CRITICAL', id: 'INC-3' },
    ]);
    expect(verdict.raised).toBe(true);
    expect(verdict.observedValue).toBe(2);
  });

  it('does not raise safety.incident.critical.open on empty list', () => {
    const flag = byId('safety.incident.critical.open');
    const verdict = evaluateFlag(flag, []);
    expect(verdict.raised).toBe(false);
    expect(verdict.observedValue).toBe(0);
  });

  it('raises safety.medication.interaction.detected when hasInteraction is true', () => {
    const flag = byId('safety.medication.interaction.detected');
    const verdict = evaluateFlag(flag, { hasInteraction: true });
    expect(verdict.raised).toBe(true);
  });

  it('records evaluatedAt as an ISO timestamp', () => {
    const flag = byId('attendance.monthly.rate.low_70');
    const fixed = new Date('2026-04-22T10:00:00.000Z');
    const verdict = evaluateFlag(flag, { attendanceRate: 50 }, { now: fixed });
    expect(verdict.evaluatedAt).toBe('2026-04-22T10:00:00.000Z');
  });
});

describe('evaluateFlag — error resilience', () => {
  it('returns raised:false with reason when path errors on malformed data', () => {
    const flag = byId('attendance.monthly.rate.low_70');
    // Use a flag whose path is non-trivial and feed it junk.
    const verdict = evaluateFlag(flag, { unrelated: 'junk' });
    // attendanceRate is undefined → '<' 70 returns false (not raised)
    expect(verdict.raised).toBe(false);
  });

  it('throws on registry misconfiguration (composite operator)', () => {
    const badFlag = {
      id: 'test.composite',
      trigger: {
        source: { service: 'x', method: 'y', path: 'v' },
        condition: { operator: 'and', value: null },
      },
    };
    expect(() => evaluateFlag(badFlag, { v: 1 })).toThrow(/composite/);
  });

  it('throws when flag or trigger is missing', () => {
    expect(() => evaluateFlag(null, {})).toThrow(/flag or flag.trigger/);
    expect(() => evaluateFlag({ id: 'x' }, {})).toThrow(/flag or flag.trigger/);
  });
});

describe('evaluateFlag — canonical registry coverage smoke', () => {
  // Ensure every flag in the registry evaluates without throwing
  // against a trivial null observation. This catches registry
  // entries with unsupported operators or malformed conditions.
  it.each(RED_FLAGS.map(f => [f.id, f]))(
    '%s evaluates without crashing on null observation',
    (_, flag) => {
      // Some flags use 'missing'/'exists' and will raise on null;
      // we only assert no throw, not a specific outcome.
      expect(() => evaluateFlag(flag, null)).not.toThrow();
    }
  );
});
