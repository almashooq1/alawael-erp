'use strict';

/**
 * W453 drift guard — MeasurementMaster ↔ ICF qualifier mapping.
 *
 * Locks:
 *   • MeasurementMaster.defaultIcfMapping schema (primary, secondary,
 *     qualifierAlgorithm enum, qualifierBands).
 *   • MeasurementResult.icfQualifier schema.
 *   • icf-qualifier-mapping.lib.js pure functions: validateMapping,
 *     mapValueToQualifier (direct/inverse/threshold), buildQualifierSnapshot.
 *   • Index on 'defaultIcfMapping.primary' on MeasurementMaster.
 *
 * Pure-lib tests + static analysis. No mongoose, no DB.
 */

const fs = require('fs');
const path = require('path');

const lib = require('../intelligence/icf-qualifier-mapping.lib');

const MASTER_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'models', 'measurement', 'MeasurementMaster.model.js'),
  'utf8'
);
const RESULT_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'models', 'measurement', 'MeasurementResult.model.js'),
  'utf8'
);

describe('W453 — MeasurementMaster.defaultIcfMapping schema', () => {
  it('declares defaultIcfMapping field', () => {
    expect(MASTER_SRC).toMatch(/defaultIcfMapping\s*:/);
  });

  it('declares primary + secondary + qualifierAlgorithm + qualifierBands', () => {
    const block = MASTER_SRC.match(/defaultIcfMapping[\s\S]+?\]\s*,?\s*\}/)[0];
    expect(block).toMatch(/primary\s*:/);
    expect(block).toMatch(/secondary\s*:/);
    expect(block).toMatch(/qualifierAlgorithm\s*:/);
    expect(block).toMatch(/qualifierBands\s*:/);
  });

  it('primary + secondary carry /^[bsde]\\d+$/ format constraint', () => {
    const block = MASTER_SRC.match(/defaultIcfMapping[\s\S]+?\]\s*,?\s*\}/)[0];
    const matches = block.match(/match:\s*\/\^\[bsde\]\\d\+\$\//g);
    expect(matches).not.toBeNull();
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });

  it('qualifierAlgorithm enum contains the 4 canonical algorithms', () => {
    const block = MASTER_SRC.match(/defaultIcfMapping[\s\S]+?\]\s*,?\s*\}/)[0];
    expect(block).toMatch(/'direct_5_band'/);
    expect(block).toMatch(/'inverse_5_band'/);
    expect(block).toMatch(/'threshold_based'/);
    expect(block).toMatch(/'manual'/);
  });

  it('declares index on defaultIcfMapping.primary', () => {
    expect(MASTER_SRC).toMatch(/['"]defaultIcfMapping\.primary['"]/);
  });
});

describe('W453 — MeasurementResult.icfQualifier schema', () => {
  it('declares icfQualifier field', () => {
    expect(RESULT_SRC).toMatch(/icfQualifier\s*:/);
  });

  it('icfQualifier has code + qualifier + confidence + mappedAutomatically + mappedAt', () => {
    const block = RESULT_SRC.match(/icfQualifier:\s*\{[\s\S]+?mappedAt[^}]*\}[\s\S]+?\},/)[0];
    expect(block).toMatch(/code\s*:/);
    expect(block).toMatch(/qualifier\s*:/);
    expect(block).toMatch(/confidence\s*:/);
    expect(block).toMatch(/mappedAutomatically\s*:/);
    expect(block).toMatch(/mappedAt\s*:/);
  });

  it('code field carries the /^[bsde]\\d+$/ format constraint', () => {
    const block = RESULT_SRC.match(/icfQualifier:\s*\{[\s\S]+?mappedAt[^}]*\}[\s\S]+?\},/)[0];
    expect(block).toMatch(/match:\s*\/\^\[bsde\]\\d\+\$\//);
  });
});

describe('W453 — validateMapping (pure lib)', () => {
  it('accepts a valid direct_5_band mapping', () => {
    const result = lib.validateMapping({
      primary: 'b117',
      qualifierAlgorithm: 'direct_5_band',
      qualifierBands: [
        { minValue: 0, maxValue: 20, qualifier: 0 },
        { minValue: 21, maxValue: 40, qualifier: 1 },
      ],
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('rejects invalid primary code', () => {
    const result = lib.validateMapping({
      primary: 'xyz999',
      qualifierAlgorithm: 'direct_5_band',
      qualifierBands: [{ minValue: 0, maxValue: 10, qualifier: 0 }],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('INVALID_PRIMARY_CODE'))).toBe(true);
  });

  it('rejects invalid qualifierAlgorithm', () => {
    const result = lib.validateMapping({
      primary: 'b117',
      qualifierAlgorithm: 'random_thing',
      qualifierBands: [],
    });
    expect(result.valid).toBe(false);
  });

  it('rejects missing bands when algorithm is not manual', () => {
    const result = lib.validateMapping({
      primary: 'b117',
      qualifierAlgorithm: 'direct_5_band',
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('MISSING_QUALIFIER_BANDS');
  });

  it('accepts manual algorithm without bands', () => {
    const result = lib.validateMapping({
      primary: 'b117',
      qualifierAlgorithm: 'manual',
    });
    expect(result.valid).toBe(true);
  });

  it('rejects inverted bands (min > max)', () => {
    const result = lib.validateMapping({
      primary: 'b117',
      qualifierAlgorithm: 'direct_5_band',
      qualifierBands: [{ minValue: 50, maxValue: 10, qualifier: 0 }],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.startsWith('BAND_INVERTED'))).toBe(true);
  });

  it('rejects qualifier outside 0-4 range', () => {
    const result = lib.validateMapping({
      primary: 'b117',
      qualifierAlgorithm: 'direct_5_band',
      qualifierBands: [{ minValue: 0, maxValue: 10, qualifier: 5 }],
    });
    expect(result.valid).toBe(false);
  });
});

describe('W453 — mapValueToQualifier (pure lib)', () => {
  const directMapping = {
    primary: 'b117',
    qualifierAlgorithm: 'direct_5_band',
    qualifierBands: [
      { minValue: 0, maxValue: 20, qualifier: 4 },
      { minValue: 21, maxValue: 40, qualifier: 3 },
      { minValue: 41, maxValue: 60, qualifier: 2 },
      { minValue: 61, maxValue: 80, qualifier: 1 },
      { minValue: 81, maxValue: 100, qualifier: 0 },
    ],
  };

  it('maps value clearly within a band → high confidence', () => {
    const r = lib.mapValueToQualifier(50, directMapping);
    expect(r).not.toBeNull();
    expect(r.qualifier).toBe(2);
    expect(r.confidence).toBe('high');
  });

  it('maps value near band boundary → medium confidence', () => {
    const r = lib.mapValueToQualifier(21, directMapping);
    expect(r.qualifier).toBe(3);
    expect(r.confidence).toBe('medium');
  });

  it('returns null for value outside all bands', () => {
    const r = lib.mapValueToQualifier(999, directMapping);
    expect(r).toBeNull();
  });

  it('returns null for manual algorithm', () => {
    const r = lib.mapValueToQualifier(50, { qualifierAlgorithm: 'manual' });
    expect(r).toBeNull();
  });

  it('returns null for non-numeric value', () => {
    const r = lib.mapValueToQualifier('abc', directMapping);
    expect(r).toBeNull();
    const r2 = lib.mapValueToQualifier(null, directMapping);
    expect(r2).toBeNull();
  });

  it('threshold_based picks the highest matching band', () => {
    const thresholdMapping = {
      primary: 'b280',
      qualifierAlgorithm: 'threshold_based',
      qualifierBands: [
        { minValue: 10, maxValue: Infinity, qualifier: 4 },
        { minValue: 5, maxValue: Infinity, qualifier: 2 },
      ],
    };
    expect(lib.mapValueToQualifier(15, thresholdMapping).qualifier).toBe(4);
    expect(lib.mapValueToQualifier(6, thresholdMapping).qualifier).toBe(2);
    expect(lib.mapValueToQualifier(2, thresholdMapping).qualifier).toBe(0);
  });

  it('returns null for null/undefined mapping', () => {
    expect(lib.mapValueToQualifier(50, null)).toBeNull();
    expect(lib.mapValueToQualifier(50, undefined)).toBeNull();
  });
});

describe('W453 — buildQualifierSnapshot', () => {
  it('returns full snapshot when mapping succeeds', () => {
    const snap = lib.buildQualifierSnapshot(50, {
      primary: 'b117',
      qualifierAlgorithm: 'direct_5_band',
      qualifierBands: [{ minValue: 0, maxValue: 100, qualifier: 2 }],
    });
    expect(snap).toMatchObject({
      code: 'b117',
      qualifier: 2,
      confidence: expect.any(String),
      mappedAutomatically: true,
    });
    expect(snap.mappedAt).toBeInstanceOf(Date);
  });

  it('returns null when no primary code', () => {
    expect(lib.buildQualifierSnapshot(50, { qualifierAlgorithm: 'direct_5_band' })).toBeNull();
  });

  it('returns null when value unmappable', () => {
    expect(
      lib.buildQualifierSnapshot(999, {
        primary: 'b117',
        qualifierAlgorithm: 'direct_5_band',
        qualifierBands: [{ minValue: 0, maxValue: 10, qualifier: 0 }],
      })
    ).toBeNull();
  });
});

describe('W453 — exposed constants', () => {
  it('exports ALLOWED_ALGORITHMS as a 4-entry list', () => {
    expect(lib.ALLOWED_ALGORITHMS).toEqual([
      'direct_5_band',
      'inverse_5_band',
      'threshold_based',
      'manual',
    ]);
  });

  it('exports VALID_QUALIFIERS as 0-4', () => {
    expect(lib.VALID_QUALIFIERS).toEqual([0, 1, 2, 3, 4]);
  });

  it('exports CODE_FORMAT regex', () => {
    expect(lib.CODE_FORMAT).toBeInstanceOf(RegExp);
    expect('b117').toMatch(lib.CODE_FORMAT);
    expect('xyz').not.toMatch(lib.CODE_FORMAT);
  });
});
