/**
 * parent-report-digest.test.js — pure-function smoke test for the
 * digest planner. No DB, no email. Just the buildPlan shape.
 */

'use strict';

const { buildPlan } = require('../scripts/parent-report-digest');

describe('parent-report-digest.buildPlan', () => {
  const g = (id, email) => [id, { _id: id, email, firstName_ar: `ولي ${id}` }];
  const guardians = new Map([g('g1', 'a@x.sa'), g('g2', 'b@x.sa'), g('g3', null)]);

  test('empty beneficiaries → empty plan', () => {
    expect(buildPlan([], guardians)).toEqual([]);
  });

  test('children without guardian links are skipped', () => {
    const plan = buildPlan([{ _id: 'c1', guardians: [] }], guardians);
    expect(plan).toEqual([]);
  });

  test('guardian without email is dropped from recipients', () => {
    const plan = buildPlan([{ _id: 'c1', guardians: ['g3'] }], guardians);
    expect(plan).toEqual([]);
  });

  test('happy-path mapping', () => {
    const plan = buildPlan(
      [
        {
          _id: 'c1',
          firstName_ar: 'سارة',
          beneficiaryNumber: 'B-001',
          guardians: ['g1', 'g2'],
        },
      ],
      guardians
    );
    expect(plan).toHaveLength(1);
    expect(plan[0]).toMatchObject({
      childId: 'c1',
      childName: 'سارة',
      beneficiaryNumber: 'B-001',
    });
    expect(plan[0].recipients).toHaveLength(2);
    expect(plan[0].recipients.map(r => r.email)).toEqual(['a@x.sa', 'b@x.sa']);
  });

  test('limit caps the plan size', () => {
    const rows = [
      { _id: 'c1', guardians: ['g1'] },
      { _id: 'c2', guardians: ['g2'] },
      { _id: 'c3', guardians: ['g1'] },
    ];
    const plan = buildPlan(rows, guardians, 2);
    expect(plan).toHaveLength(2);
    expect(plan.map(p => p.childId)).toEqual(['c1', 'c2']);
  });

  test('unresolved guardian id is ignored (no throw)', () => {
    const plan = buildPlan([{ _id: 'c1', guardians: ['missing'] }], guardians);
    expect(plan).toEqual([]);
  });

  test('falls back to firstName when firstName_ar absent', () => {
    const plan = buildPlan([{ _id: 'c1', firstName: 'Sarah', guardians: ['g1'] }], guardians);
    expect(plan[0].childName).toBe('Sarah');
  });
});
