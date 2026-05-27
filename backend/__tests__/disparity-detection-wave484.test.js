'use strict';

/**
 * W484 drift guard — disparity-detection.lib.js (Phase G).
 *
 * Pure-function tests + source-shape assertions. No mongoose required.
 */

const path = require('path');
const fs = require('fs');

const LIB_PATH = path.join(__dirname, '..', 'intelligence', 'disparity-detection.lib.js');
const SRC = fs.readFileSync(LIB_PATH, 'utf8');
const lib = require(LIB_PATH);

describe('W484 — disparity-detection structural', () => {
  it('exports 5 functions + 3 constants', () => {
    expect(typeof lib.groupByDimension).toBe('function');
    expect(typeof lib.computeCohortStats).toBe('function');
    expect(typeof lib.detectDisparities).toBe('function');
    expect(typeof lib.detectBinaryDisparities).toBe('function');
    expect(typeof lib.auditDimension).toBe('function');
  });

  it('declares 7 DISPARITY_DIMENSIONS', () => {
    expect(lib.DISPARITY_DIMENSIONS).toHaveLength(7);
    expect(lib.DISPARITY_DIMENSIONS).toEqual(
      expect.arrayContaining([
        'gender',
        'age_band',
        'disability_type',
        'region',
        'primary_language',
        'insurance_band',
        'nationality_band',
      ])
    );
  });

  it('declares 7 METRIC_KINDS', () => {
    expect(lib.METRIC_KINDS).toHaveLength(7);
  });

  it('SIGNIFICANCE_THRESHOLDS uses Cohen d + relative risk', () => {
    expect(lib.SIGNIFICANCE_THRESHOLDS.effectSizeMinor).toBe(0.2);
    expect(lib.SIGNIFICANCE_THRESHOLDS.effectSizeModerate).toBe(0.5);
    expect(lib.SIGNIFICANCE_THRESHOLDS.effectSizeMajor).toBe(0.8);
    expect(lib.SIGNIFICANCE_THRESHOLDS.minCohortSize).toBe(30);
  });

  it('all constants + module frozen', () => {
    expect(Object.isFrozen(lib)).toBe(true);
    expect(Object.isFrozen(lib.DISPARITY_DIMENSIONS)).toBe(true);
    expect(Object.isFrozen(lib.SIGNIFICANCE_THRESHOLDS)).toBe(true);
    expect(Object.isFrozen(lib.METRIC_KINDS)).toBe(true);
  });

  it('source references Innovation 8 + Equity Engine', () => {
    expect(SRC).toMatch(/Innovation 8/);
    expect(SRC).toMatch(/Equity Engine/);
  });
});

describe('W484 — groupByDimension', () => {
  it('groups observations by dimension key', () => {
    const obs = [
      { beneficiaryId: 'b1', gender: 'M', metricValue: 40 },
      { beneficiaryId: 'b2', gender: 'F', metricValue: 45 },
      { beneficiaryId: 'b3', gender: 'M', metricValue: 38 },
    ];
    const r = lib.groupByDimension(obs, 'gender');
    expect(r.M).toHaveLength(2);
    expect(r.F).toHaveLength(1);
  });

  it('skips observations missing the dimension', () => {
    const obs = [
      { beneficiaryId: 'b1', gender: 'M', metricValue: 40 },
      { beneficiaryId: 'b2', metricValue: 45 },
      { beneficiaryId: 'b3', gender: null, metricValue: 38 },
    ];
    const r = lib.groupByDimension(obs, 'gender');
    expect(r.M).toHaveLength(1);
    expect(Object.keys(r)).toHaveLength(1);
  });

  it('returns empty object on no input', () => {
    expect(lib.groupByDimension(null, 'gender')).toEqual({});
  });
});

describe('W484 — computeCohortStats', () => {
  it('computes mean + sd + n', () => {
    const grouped = {
      M: [{ metricValue: 40 }, { metricValue: 42 }, { metricValue: 44 }],
      F: [{ metricValue: 50 }, { metricValue: 52 }],
    };
    const r = lib.computeCohortStats(grouped);
    expect(r.M.n).toBe(3);
    expect(r.M.mean).toBeCloseTo(42, 1);
    expect(r.M.sd).toBeGreaterThan(0);
    expect(r.F.mean).toBeCloseTo(51, 1);
  });

  it('handles empty cohorts', () => {
    const r = lib.computeCohortStats({ M: [] });
    expect(r.M.n).toBe(0);
    expect(r.M.mean).toBeNull();
  });

  it('filters non-numeric metric values', () => {
    const r = lib.computeCohortStats({
      M: [{ metricValue: 40 }, { metricValue: 'bad' }, { metricValue: null }],
    });
    expect(r.M.n).toBe(1);
  });
});

describe('W484 — detectDisparities (effect size)', () => {
  function buildCohort(n, mean, spread = 5) {
    return Array.from({ length: n }, (_, i) => ({
      metricValue: mean + ((i % spread) - spread / 2),
    }));
  }

  it('flags major disparity when effect size >=0.8', () => {
    const ref = buildCohort(40, 50, 4);
    const minority = buildCohort(35, 35, 4); // ~3.7 SD apart → major
    const stats = lib.computeCohortStats({ ref, minority });
    const r = lib.detectDisparities(stats, 'ref');
    const m = r.find(x => x.cohort === 'minority');
    expect(m.vsReference.severity).toBe('major');
    expect(m.vsReference.flagged).toBe(true);
  });

  it('flags none when cohorts are similar', () => {
    const ref = buildCohort(40, 50, 4);
    const peer = buildCohort(35, 50.1, 4);
    const stats = lib.computeCohortStats({ ref, peer });
    const r = lib.detectDisparities(stats, 'ref');
    const p = r.find(x => x.cohort === 'peer');
    expect(p.vsReference.severity).toBe('none');
    expect(p.vsReference.flagged).toBe(false);
  });

  it('returns insufficient_n when cohort below minCohortSize', () => {
    const ref = buildCohort(40, 50);
    const tiny = buildCohort(5, 30);
    const stats = lib.computeCohortStats({ ref, tiny });
    const r = lib.detectDisparities(stats, 'ref');
    const t = r.find(x => x.cohort === 'tiny');
    expect(t.vsReference.severity).toBe('insufficient_n');
    expect(t.vsReference.flagged).toBe(false);
  });

  it('returns [] when fewer than 2 cohorts', () => {
    const stats = lib.computeCohortStats({ only: [{ metricValue: 40 }] });
    expect(lib.detectDisparities(stats)).toEqual([]);
  });

  it('picks largest cohort as reference when omitted', () => {
    const big = Array.from({ length: 50 }, () => ({ metricValue: 50 }));
    const small = Array.from({ length: 35 }, () => ({ metricValue: 30 }));
    const stats = lib.computeCohortStats({ big, small });
    const r = lib.detectDisparities(stats);
    expect(r[0].vsReference.referenceKey).toBe('big');
  });
});

describe('W484 — detectBinaryDisparities', () => {
  function buildBinary(n, eventRate) {
    return Array.from({ length: n }, (_, i) => ({
      metricValue: i < n * eventRate,
    }));
  }

  it('flags major when relative risk >=2.0', () => {
    const grouped = {
      ref: buildBinary(40, 0.1),
      bad: buildBinary(40, 0.4),
    };
    const r = lib.detectBinaryDisparities(grouped, 'ref');
    const b = r.find(x => x.cohort === 'bad');
    expect(b.vsReference.severity).toBe('major');
    expect(b.vsReference.flagged).toBe(true);
  });

  it('flags none when rates close', () => {
    const grouped = {
      ref: buildBinary(40, 0.5),
      peer: buildBinary(40, 0.5),
    };
    const r = lib.detectBinaryDisparities(grouped, 'ref');
    const p = r.find(x => x.cohort === 'peer');
    expect(p.vsReference.severity).toBe('none');
  });

  it('insufficient_n for cohorts below minCohortSize', () => {
    const grouped = {
      ref: buildBinary(40, 0.1),
      tiny: buildBinary(5, 0.4),
    };
    const r = lib.detectBinaryDisparities(grouped, 'ref');
    const t = r.find(x => x.cohort === 'tiny');
    expect(t.vsReference.severity).toBe('insufficient_n');
  });

  it('flags inverse risk (protective effect at major level)', () => {
    const grouped = {
      ref: buildBinary(40, 0.5),
      protected: buildBinary(40, 0.05),
    };
    const r = lib.detectBinaryDisparities(grouped, 'ref');
    const p = r.find(x => x.cohort === 'protected');
    expect(p.vsReference.severity).toBe('major');
  });
});

describe('W484 — auditDimension', () => {
  it('rejects invalid dimension', () => {
    const r = lib.auditDimension({ observations: [], dimension: 'unknown' });
    expect(r.error).toBe('INVALID_DIMENSION');
  });

  it('rejects invalid metricKind', () => {
    const r = lib.auditDimension({
      observations: [],
      dimension: 'gender',
      metricKind: 'bogus',
    });
    expect(r.error).toBe('INVALID_METRIC_KIND');
  });

  it('returns full continuous audit', () => {
    const observations = [
      ...Array.from({ length: 40 }, () => ({ gender: 'M', metricValue: 50 })),
      ...Array.from({ length: 40 }, () => ({ gender: 'F', metricValue: 35 })),
    ];
    const r = lib.auditDimension({
      observations,
      dimension: 'gender',
      metricKind: 'gas_avg_tscore',
    });
    expect(r.cohortCount).toBe(2);
    expect(r.findings).toHaveLength(1);
    expect(r.flaggedCount).toBeGreaterThan(0);
    expect(r.overallSeverity).toMatch(/major|moderate/);
  });

  it('returns binary audit when isBinary=true', () => {
    const observations = [
      ...Array.from({ length: 40 }, (_, i) => ({ gender: 'M', metricValue: i < 4 })),
      ...Array.from({ length: 40 }, (_, i) => ({ gender: 'F', metricValue: i < 16 })),
    ];
    const r = lib.auditDimension({
      observations,
      dimension: 'gender',
      metricKind: 'complaint_rate',
      isBinary: true,
    });
    expect(r.findings).toHaveLength(1);
    expect(r.findings[0].vsReference.riskRatio).toBeGreaterThan(1);
  });
});
