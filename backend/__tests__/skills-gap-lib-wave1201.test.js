/**
 * W1201 — pure unit tests for intelligence/skills-gap.lib.
 */

'use strict';

const L = require('../intelligence/skills-gap.lib');

const reqs = [
  { competencyKey: 'assessment', competencyNameAr: 'التقييم', requiredLevel: 4, criticality: 'core' },
  { competencyKey: 'documentation', competencyNameAr: 'التوثيق', requiredLevel: 3, criticality: 'important' },
  { competencyKey: 'aac', competencyNameAr: 'AAC', requiredLevel: 3, criticality: 'nice' },
];

describe('W1201 skills-gap.lib — employee gaps', () => {
  test('computes gap, critical-gap, weighted readiness', () => {
    const g = L.employeeGaps(reqs, { assessment: 2, documentation: 3, aac: 1 });
    expect(g.gapCount).toBe(2); // assessment (2) + aac (2)
    expect(g.criticalGapCount).toBe(1); // only assessment is core
    expect(g.totalGap).toBe(4);
    expect(g.metCount).toBe(1); // documentation met
    // weighted: need=4*3+3*2+3*1=21, have=2*3+3*2+1*1=13 → 61.9
    expect(g.readinessPct).toBeCloseTo(61.9, 1);
    expect(g.topGaps[0].competencyKey).toBe('assessment'); // highest weighted gap
  });

  test('all met → readiness 100, zero gaps', () => {
    const g = L.employeeGaps(reqs, { assessment: 4, documentation: 3, aac: 3 });
    expect(g.gapCount).toBe(0);
    expect(g.readinessPct).toBe(100);
  });

  test('missing competency counts as level 0; over-level capped', () => {
    const g = L.employeeGaps([{ competencyKey: 'x', requiredLevel: 3, criticality: 'core' }], { x: 9 });
    expect(g.competencies[0].currentLevel).toBe(5); // clamped
    expect(g.competencies[0].gap).toBe(0); // 5 >= 3
    const g2 = L.employeeGaps([{ competencyKey: 'y', requiredLevel: 3, criticality: 'core' }], {});
    expect(g2.competencies[0].currentLevel).toBe(0);
    expect(g2.competencies[0].gap).toBe(3);
  });

  test('no requirements → 100% ready (nothing to meet)', () => {
    const g = L.employeeGaps([], { a: 1 });
    expect(g.requiredCount).toBe(0);
    expect(g.readinessPct).toBe(100);
  });
});

describe('W1201 skills-gap.lib — org rollup', () => {
  test('priorities sorted by weighted gap; affected% computed', () => {
    const e1 = L.employeeGaps(reqs, { assessment: 2, documentation: 3, aac: 1 }).competencies;
    const e2 = L.employeeGaps(reqs, { assessment: 4, documentation: 3, aac: 3 }).competencies;
    const org = L.orgGapRollup([e1, e2]);
    expect(org.employeesAssessed).toBe(2);
    expect(org.priorities[0].competencyKey).toBe('assessment'); // core weight 3 × gap 2 = 6
    expect(org.priorities[0].affectedPct).toBe(50); // 1 of 2
    expect(org.priorities.find(p => p.competencyKey === 'documentation')).toBeUndefined(); // no gaps
  });
});

describe('W1201 skills-gap.lib — training matching', () => {
  test('matches trainings that cover gap competencies, sorted by coverage', () => {
    const m = L.matchTrainings(
      { assessment: 'التقييم', aac: 'AAC' },
      [
        { _id: 't1', title: 'دورة شاملة', skillsCovered: ['assessment', 'aac'] },
        { _id: 't2', title: 'تقييم', skillsCovered: ['assessment'] },
        { _id: 't3', title: 'غير ذات صلة', skillsCovered: ['x'] },
      ]
    );
    expect(m).toHaveLength(2);
    expect(m[0].trainingId).toBe('t1'); // covers 2
    expect(m[0].coversCount).toBe(2);
  });
});
