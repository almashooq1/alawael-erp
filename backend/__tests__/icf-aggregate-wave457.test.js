'use strict';

/**
 * W457 drift guard — ICF profile aggregation library.
 *
 * Locks the pure aggregation surface that powers branch + national
 * ICF outcome reports (governance dashboards + Disability Authority
 * submissions + Phase G Equity Engine).
 *
 * Pure-lib tests only. No DB, no mongoose, no I/O.
 */

const lib = require('../intelligence/icf-aggregate.lib');

describe('W457 — module surface', () => {
  it('exports the documented public API', () => {
    expect(typeof lib.aggregateByBranch).toBe('function');
    expect(typeof lib.aggregateImprovements).toBe('function');
    expect(typeof lib.disaggregateByDemographic).toBe('function');
  });

  it('exposes VALID_COMPONENTS', () => {
    expect(lib.VALID_COMPONENTS).toEqual([
      'bodyFunctions',
      'bodyStructures',
      'activitiesParticipation',
      'environmentalFactors',
    ]);
  });

  it('module export is frozen', () => {
    expect(Object.isFrozen(lib)).toBe(true);
  });
});

describe('W457 — aggregateByBranch', () => {
  it('returns empty shape on empty input', () => {
    const r = lib.aggregateByBranch([], { branchId: 'b1' });
    expect(r.branchId).toBe('b1');
    expect(r.beneficiaryCount).toBe(0);
    expect(r.assessmentCount).toBe(0);
    expect(r.topImpaired).toEqual([]);
    expect(r.byComponent.bodyFunctions.count).toBe(0);
  });

  it('counts unique beneficiaries (dedupes via Set)', () => {
    const r = lib.aggregateByBranch([
      { beneficiaryId: 'A', icfCodes: [] },
      { beneficiaryId: 'A', icfCodes: [] }, // same beneficiary, second assessment
      { beneficiaryId: 'B', icfCodes: [] },
    ]);
    expect(r.beneficiaryCount).toBe(2);
    expect(r.assessmentCount).toBe(3);
  });

  it('aggregates by component', () => {
    const r = lib.aggregateByBranch([
      {
        beneficiaryId: 'A',
        icfCodes: [
          { code: 'b117', component: 'bodyFunctions', qualifier: 2 },
          { code: 'b134', component: 'bodyFunctions', qualifier: 1 },
          { code: 'd450', component: 'activitiesParticipation', qualifier: 3 },
        ],
      },
    ]);
    expect(r.byComponent.bodyFunctions.count).toBe(2);
    expect(r.byComponent.bodyFunctions.averageQualifier).toBe(1.5);
    expect(r.byComponent.activitiesParticipation.count).toBe(1);
    expect(r.byComponent.activitiesParticipation.averageQualifier).toBe(3);
  });

  it('returns top 10 most-impaired codes sorted by average qualifier desc', () => {
    const assessments = [];
    for (let i = 0; i < 15; i++) {
      assessments.push({
        beneficiaryId: `b${i}`,
        icfCodes: [{ code: `b${100 + i}`, component: 'bodyFunctions', qualifier: i % 5 }],
      });
    }
    const r = lib.aggregateByBranch(assessments);
    expect(r.topImpaired.length).toBeLessThanOrEqual(10);
    // Sorted descending
    for (let i = 1; i < r.topImpaired.length; i++) {
      expect(r.topImpaired[i - 1].averageQualifier).toBeGreaterThanOrEqual(
        r.topImpaired[i].averageQualifier
      );
    }
  });

  it('handles missing qualifiers gracefully', () => {
    const r = lib.aggregateByBranch([
      {
        beneficiaryId: 'A',
        icfCodes: [
          { code: 'b117', component: 'bodyFunctions' }, // no qualifier
          { code: 'b134', component: 'bodyFunctions', qualifier: 2 },
        ],
      },
    ]);
    expect(r.byComponent.bodyFunctions.count).toBe(2);
    // Average computed only over codes WITH qualifier
    expect(r.byComponent.bodyFunctions.averageQualifier).toBe(2);
  });

  it('aggregates demographics when present', () => {
    const r = lib.aggregateByBranch([
      { beneficiaryId: 'A', icfCodes: [], demographics: { gender: 'male', ageBand: '5-10' } },
      { beneficiaryId: 'B', icfCodes: [], demographics: { gender: 'female', ageBand: '5-10' } },
      { beneficiaryId: 'C', icfCodes: [], demographics: { gender: 'male', ageBand: '10-15' } },
    ]);
    expect(r.demographics.byGender.male).toBe(2);
    expect(r.demographics.byGender.female).toBe(1);
    expect(r.demographics.byAgeBand['5-10']).toBe(2);
  });

  it('infers component from code prefix when not provided', () => {
    const r = lib.aggregateByBranch([
      {
        beneficiaryId: 'A',
        icfCodes: [{ code: 'd450', qualifier: 2 }], // component omitted
      },
    ]);
    // Should still aggregate (component inferred from 'd' prefix)
    expect(r.assessmentCount).toBe(1);
  });
});

describe('W457 — aggregateImprovements', () => {
  it('returns empty shape on empty input', () => {
    const r = lib.aggregateImprovements([]);
    expect(r.improvedCodes).toEqual([]);
    expect(r.declinedCodes).toEqual([]);
    expect(r.summary.paired).toBe(0);
  });

  it('detects improvements (lower qualifier after)', () => {
    const r = lib.aggregateImprovements([
      {
        beneficiaryId: 'A',
        before: { icfCodes: [{ code: 'b117', qualifier: 3 }] },
        after: { icfCodes: [{ code: 'b117', qualifier: 1 }] },
      },
    ]);
    expect(r.improvedCodes.length).toBe(1);
    expect(r.improvedCodes[0].code).toBe('b117');
    expect(r.improvedCodes[0].averageDelta).toBe(-2);
    expect(r.improvedCodes[0].improvements).toBe(1);
  });

  it('detects declines (higher qualifier after)', () => {
    const r = lib.aggregateImprovements([
      {
        beneficiaryId: 'A',
        before: { icfCodes: [{ code: 'b117', qualifier: 1 }] },
        after: { icfCodes: [{ code: 'b117', qualifier: 3 }] },
      },
    ]);
    expect(r.declinedCodes.length).toBe(1);
    expect(r.declinedCodes[0].averageDelta).toBe(2);
  });

  it('separates stable codes', () => {
    const r = lib.aggregateImprovements([
      {
        beneficiaryId: 'A',
        before: { icfCodes: [{ code: 'b117', qualifier: 2 }] },
        after: { icfCodes: [{ code: 'b117', qualifier: 2 }] },
      },
    ]);
    expect(r.stableCodes.length).toBe(1);
  });

  it('summary counts pairs + codes analyzed', () => {
    const r = lib.aggregateImprovements([
      {
        beneficiaryId: 'A',
        before: { icfCodes: [{ code: 'b117', qualifier: 1 }] },
        after: { icfCodes: [{ code: 'b117', qualifier: 0 }] },
      },
      {
        beneficiaryId: 'B',
        before: { icfCodes: [{ code: 'd450', qualifier: 2 }] },
        after: { icfCodes: [{ code: 'd450', qualifier: 1 }] },
      },
    ]);
    expect(r.summary.paired).toBe(2);
    expect(r.summary.codesAnalyzed).toBe(2);
  });
});

describe('W457 — disaggregateByDemographic', () => {
  const sample = [
    {
      beneficiaryId: 'A',
      icfCodes: [{ code: 'b117', qualifier: 2, component: 'bodyFunctions' }],
      demographics: { gender: 'male', severityTier: 'moderate' },
    },
    {
      beneficiaryId: 'B',
      icfCodes: [{ code: 'b117', qualifier: 3, component: 'bodyFunctions' }],
      demographics: { gender: 'female', severityTier: 'severe' },
    },
    {
      beneficiaryId: 'C',
      icfCodes: [{ code: 'b117', qualifier: 1, component: 'bodyFunctions' }],
      demographics: { gender: 'male', severityTier: 'mild' },
    },
  ];

  it('returns empty object for empty input', () => {
    expect(lib.disaggregateByDemographic([], 'gender')).toEqual({});
  });

  it('disaggregates by gender', () => {
    const r = lib.disaggregateByDemographic(sample, 'gender');
    expect(r.male).toBeDefined();
    expect(r.male.beneficiaryCount).toBe(2);
    expect(r.female).toBeDefined();
    expect(r.female.beneficiaryCount).toBe(1);
  });

  it('disaggregates by severity', () => {
    const r = lib.disaggregateByDemographic(sample, 'severityTier');
    expect(r.mild).toBeDefined();
    expect(r.moderate).toBeDefined();
    expect(r.severe).toBeDefined();
  });

  it('handles missing demographic value via unknown bucket', () => {
    const r = lib.disaggregateByDemographic(
      [{ beneficiaryId: 'A', icfCodes: [], demographics: {} }],
      'gender'
    );
    expect(r.unknown).toBeDefined();
  });
});

describe('W655 — small-sample reliability flag', () => {
  it('exports a documented MIN_RELIABLE_SAMPLE threshold of 5', () => {
    expect(lib.MIN_RELIABLE_SAMPLE).toBe(5);
  });

  it('flags a low-n top-impaired code as not reliable and a high-n one as reliable', () => {
    // 'b110' scored once (qualifier 4); 'b280' scored 5 times (qualifier 2 each).
    const assessments = [
      { beneficiaryId: 'A', icfCodes: [{ code: 'b110', qualifier: 4 }] },
      ...Array.from({ length: 5 }, (_, i) => ({
        beneficiaryId: `P${i}`,
        icfCodes: [{ code: 'b280', qualifier: 2 }],
      })),
    ];
    const r = lib.aggregateByBranch(assessments);
    const byCode = Object.fromEntries(r.topImpaired.map(c => [c.code, c]));
    // The n=1 code ranks highest by average (4 > 2) — exactly the misleading
    // ordering the flag exists to qualify.
    expect(r.topImpaired[0].code).toBe('b110');
    expect(byCode.b110.reliable).toBe(false);
    expect(byCode.b280.reliable).toBe(true);
  });

  it('flags improvement deltas by paired sample size', () => {
    const lowN = {
      beneficiaryId: 'A',
      before: { icfCodes: [{ code: 'd450', qualifier: 3 }] },
      after: { icfCodes: [{ code: 'd450', qualifier: 1 }] },
    };
    const highN = Array.from({ length: 5 }, (_, i) => ({
      beneficiaryId: `P${i}`,
      before: { icfCodes: [{ code: 'd550', qualifier: 3 }] },
      after: { icfCodes: [{ code: 'd550', qualifier: 2 }] },
    }));
    const r = lib.aggregateImprovements([lowN, ...highN]);
    const byCode = Object.fromEntries(r.improvedCodes.map(c => [c.code, c]));
    expect(byCode.d450.paired).toBe(1);
    expect(byCode.d450.reliable).toBe(false);
    expect(byCode.d550.paired).toBe(5);
    expect(byCode.d550.reliable).toBe(true);
  });
});
