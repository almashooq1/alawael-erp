/**
 * W1200 — workforceIntelligenceService.summary() behaviour.
 * Mocks the three sub-services to verify section assembly, headline flags, and
 * Promise.allSettled degradation (a failing sub-analysis → null section + error).
 */

'use strict';

jest.mock('../services/hr/payEquityService', () => ({ analyze: jest.fn() }));
jest.mock('../services/hr/talentGridService', () => ({ gridSummary: jest.fn() }));
jest.mock('../services/hr/diversityService', () => ({ analyze: jest.fn() }));

const payEquity = require('../services/hr/payEquityService');
const talent = require('../services/hr/talentGridService');
const diversity = require('../services/hr/diversityService');
const svc = require('../services/hr/workforceIntelligenceService');

const healthyPay = { headcount: 20, equityScore: 92, genderGap: { reportable: true, medianGapPct: 4 }, nationalityGap: { reportable: false }, cohortOutliers: { count: 0 } };
const healthyTalent = { total: 20, hiPo: { count: 4, ratePct: 20 }, risk: { count: 2, ratePct: 10 }, counts: {} };
const healthyDiv = { headcount: 20, saudizationRatePct: 60, diversityIndex: { genderBlau: 0.5, nationalityBlau: 0.48 }, seniorityLens: { gender: { topVsBottomDelta: { female: -5 } } } };

beforeEach(() => {
  payEquity.analyze.mockReset();
  talent.gridSummary.mockReset();
  diversity.analyze.mockReset();
});

describe('W1200 workforce-intelligence summary — assembly', () => {
  test('rolls all three sections + zero flags on a healthy branch', async () => {
    payEquity.analyze.mockResolvedValue(healthyPay);
    talent.gridSummary.mockResolvedValue(healthyTalent);
    diversity.analyze.mockResolvedValue(healthyDiv);
    const s = await svc.summary({ branchId: 'bA' });
    expect(s.branchId).toBe('bA');
    expect(s.sections.payEquity.equityScore).toBe(92);
    expect(s.sections.talent.hiPo.ratePct).toBe(20);
    expect(s.sections.diversity.saudizationRatePct).toBe(60);
    expect(s.flags).toEqual([]);
    expect(s.flagCount).toBe(0);
  });

  test('passes branchId/department/reviewCycle through to each sub-service', async () => {
    payEquity.analyze.mockResolvedValue(healthyPay);
    talent.gridSummary.mockResolvedValue(healthyTalent);
    diversity.analyze.mockResolvedValue(healthyDiv);
    await svc.summary({ branchId: 'bX', department: 'PT', reviewCycle: '2026-H1' });
    expect(payEquity.analyze).toHaveBeenCalledWith({ branchId: 'bX', department: 'PT' });
    expect(talent.gridSummary).toHaveBeenCalledWith({ branchId: 'bX', reviewCycle: '2026-H1' });
    expect(diversity.analyze).toHaveBeenCalledWith({ branchId: 'bX', department: 'PT' });
  });
});

describe('W1200 workforce-intelligence summary — headline flags', () => {
  test('low equity score + high gender gap', async () => {
    payEquity.analyze.mockResolvedValue({ ...healthyPay, equityScore: 55, genderGap: { reportable: true, medianGapPct: 22 } });
    talent.gridSummary.mockResolvedValue(healthyTalent);
    diversity.analyze.mockResolvedValue(healthyDiv);
    const s = await svc.summary({ branchId: 'bA' });
    expect(s.flags).toEqual(expect.arrayContaining(['pay_equity_score_low', 'gender_pay_gap_high']));
  });

  test('talent risk concentration (≥25%) + gender glass ceiling (female top delta ≤ -20)', async () => {
    payEquity.analyze.mockResolvedValue(healthyPay);
    talent.gridSummary.mockResolvedValue({ ...healthyTalent, risk: { count: 6, ratePct: 30 } });
    diversity.analyze.mockResolvedValue({ ...healthyDiv, seniorityLens: { gender: { topVsBottomDelta: { female: -40 } } } });
    const s = await svc.summary({ branchId: 'bA' });
    expect(s.flags).toEqual(expect.arrayContaining(['talent_risk_concentration', 'glass_ceiling_gender']));
  });
});

describe('W1200 workforce-intelligence summary — degradation', () => {
  test('a failing sub-analysis → null section + recorded error, others survive', async () => {
    payEquity.analyze.mockRejectedValue(new Error('pay boom'));
    talent.gridSummary.mockResolvedValue(healthyTalent);
    diversity.analyze.mockResolvedValue(healthyDiv);
    const s = await svc.summary({ branchId: 'bA' });
    expect(s.sections.payEquity).toBeNull();
    expect(s.errors.payEquity).toMatch(/pay boom/);
    expect(s.sections.talent).not.toBeNull(); // others unaffected
    expect(s.sections.diversity).not.toBeNull();
  });
});
