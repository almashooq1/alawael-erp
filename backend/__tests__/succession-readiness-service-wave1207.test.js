/**
 * W1207 — successionReadinessService integration (models mocked via mongoose.model).
 * Verifies employeeReadiness fuses 9-box + target-role competency + tenure, and
 * candidatesForRole ranks. No DB.
 */

'use strict';

const mongoose = require('mongoose');

// chainable query stubs
const lean = (val) => ({ lean: async () => val });
const selectLean = (val) => ({ select: () => lean(val) });
const sortSelectLean = (val) => ({ sort: () => selectLean(val) });

function installModels({ emp, tr, reqs, comps }) {
  jest.spyOn(mongoose, 'model').mockImplementation((name) => {
    if (name === 'Employee') {
      return {
        findById: () => selectLean(emp),
        find: () => ({ select: () => ({ limit: () => lean([{ _id: 'e1' }]) }) }),
      };
    }
    if (name === 'TalentReview') return { findOne: () => sortSelectLean(tr) };
    if (name === 'RoleCompetencyRequirement') return { find: () => lean(reqs) };
    if (name === 'EmployeeCompetency') return { find: () => selectLean(comps) };
    throw new Error(`unexpected model ${name}`);
  });
}

const svc = require('../services/hr/successionReadinessService');

afterEach(() => jest.restoreAllMocks());

describe('W1207 successionReadinessService.employeeReadiness', () => {
  test('fuses talent + target competency + tenure into a ready_now score', () => {
    installModels({
      emp: { _id: 'e1', full_name: 'سارة', job_title_en: 'Therapist', hire_date: new Date('2021-01-01'), department: 'PT' },
      tr: { performanceBand: 3, potentialBand: 3, box: 9 },
      // target role 'Senior' requires assessment@4 — she has it at 4 → 100% readiness
      reqs: [{ competencyKey: 'assessment', competencyNameAr: 'التقييم', requiredLevel: 4, criticality: 'core' }],
      comps: [{ competencyKey: 'assessment', currentLevel: 4 }],
    });
    return svc.employeeReadiness({ employeeId: 'e1', targetJobTitle: 'Senior' }).then((r) => {
      expect(r.name).toBe('سارة');
      expect(r.box).toBe(9);
      expect(r.components.competency).toBe(100);
      expect(r.components.talent).toBe(100);
      expect(r.level.key).toBe('ready_now');
      expect(r.score).toBeGreaterThanOrEqual(80);
    });
  });

  test('no TalentReview + no role baseline → tenure-only, graceful', () => {
    installModels({
      emp: { _id: 'e1', name: 'X', hire_date: new Date('2024-01-01') },
      tr: null,
      reqs: [], // no baseline for target → competency null
      comps: [],
    });
    return svc.employeeReadiness({ employeeId: 'e1', targetJobTitle: 'Unknown' }).then((r) => {
      expect(r.coverage.hasTalentReview).toBe(false);
      expect(r.coverage.hasRoleBaseline).toBe(false);
      expect(typeof r.score).toBe('number');
    });
  });

  test('returns null when the employee is missing', () => {
    installModels({ emp: null, tr: null, reqs: [], comps: [] });
    return svc.employeeReadiness({ employeeId: 'nope' }).then((r) => expect(r).toBeNull());
  });
});

describe('W1207 successionReadinessService.candidatesForRole', () => {
  test('requires a targetJobTitle', async () => {
    installModels({ emp: null, tr: null, reqs: [], comps: [] });
    await expect(svc.candidatesForRole({ branchId: 'b1' })).rejects.toThrow(/targetJobTitle/);
  });
  test('ranks the branch workforce for a target role', () => {
    installModels({
      emp: { _id: 'e1', name: 'X', hire_date: new Date('2022-01-01') },
      tr: { performanceBand: 2, potentialBand: 2, box: 5 },
      reqs: [{ competencyKey: 'k', competencyNameAr: 'ك', requiredLevel: 3, criticality: 'core' }],
      comps: [{ competencyKey: 'k', currentLevel: 2 }],
    });
    return svc.candidatesForRole({ branchId: 'b1', targetJobTitle: 'Senior' }).then((d) => {
      expect(d.targetJobTitle).toBe('Senior');
      expect(d.assessed).toBe(1);
      expect(d.candidates).toHaveLength(1);
      expect(typeof d.candidates[0].score).toBe('number');
    });
  });
});
