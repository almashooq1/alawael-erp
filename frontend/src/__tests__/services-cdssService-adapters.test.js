/**
 * Behavioral tests for services/cdssService.js — backend→frontend adapters.
 *
 * The canonical backend (66666 `/api/v1/cdss`) returns paginated envelopes
 * ({ data: [...] }) and a nested stats object ({ stats: { X: { value } } }),
 * with field/enum names that differ from what CDSSDashboard renders. These
 * tests lock the normalization so the dashboard shows REAL data (not the
 * silent demo-data fallback) and never receives a shape it would crash on.
 */

jest.mock('utils/logger', () => ({
  __esModule: true,
  default: { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} },
}));

const mockApi = { get: jest.fn(), post: jest.fn(), patch: jest.fn(), put: jest.fn() };
jest.mock('../services/api.client', () => ({ __esModule: true, default: mockApi }));

const svc = require('../services/cdssService');

const ok = data => Promise.resolve({ data });
const fail = () => Promise.reject(new Error('boom'));

beforeEach(() => {
  Object.values(mockApi).forEach(fn => fn.mockReset());
});

describe('getStats — nested envelope → flat numbers', () => {
  test('unwraps { stats: { X: { value } } } into flat KPI numbers', async () => {
    mockApi.get.mockReturnValueOnce(
      ok({
        stats: {
          activeAlerts: { title: 'x', value: 23, icon: 'bell' },
          criticalAlerts: { value: 4 },
          pendingSuggestions: { value: 11 },
          activeRules: { value: 58 },
          highRiskPatients: { value: 6 },
        },
      })
    );
    const s = await svc.getStats();
    expect(s.activeAlerts).toBe(23);
    expect(s.criticalAlerts).toBe(4);
    expect(s.pendingSuggestions).toBe(11);
    expect(s.rulesActive).toBe(58); // activeRules → rulesActive
    expect(s.highRiskPatients).toBe(6);
  });

  test('falls back to demo stats when the request throws', async () => {
    mockApi.get.mockImplementationOnce(fail);
    const s = await svc.getStats();
    expect(typeof s.activeAlerts).toBe('number');
  });
});

describe('getAlerts — paginated envelope + populated refs + severity map', () => {
  test('reads { data: [...] } and normalizes each alert', async () => {
    mockApi.get.mockReturnValueOnce(
      ok({
        data: [
          {
            _id: 'a1',
            severity: 'emergency', // → critical
            alertType: 'drug_interaction',
            message: 'EN',
            messageAr: 'تنبيه',
            beneficiaryId: { _id: 'b1', fullNameAr: 'أحمد' },
            ruleId: { _id: 'r1', code: 'DR-INT-001' },
            triggeredAt: '2026-05-30T10:00:00Z',
            status: 'active',
          },
        ],
        total: 1,
      })
    );
    const alerts = await svc.getAlerts();
    expect(Array.isArray(alerts)).toBe(true);
    expect(alerts).toHaveLength(1);
    const a = alerts[0];
    expect(a.severity).toBe('critical'); // emergency → critical
    expect(a.message).toBe('تنبيه'); // Arabic preferred
    expect(a.beneficiaryName).toBe('أحمد'); // from populated ref
    expect(a.beneficiaryId).toBe('b1'); // id flattened
    expect(a.ruleCode).toBe('DR-INT-001');
  });
});

describe('getRules — Mixed conditions/actions → text + category map', () => {
  test('stringifies conditions[] and maps backend category', async () => {
    mockApi.get.mockReturnValueOnce(
      ok({
        data: [
          {
            _id: 'r1',
            code: 'C1',
            nameAr: 'قاعدة',
            category: 'drug_interaction', // → medication
            severity: 'critical',
            conditions: [{ field: 'x', operator: '>', value: 3 }],
            actions: [{ message: 'إشعار' }],
            isActive: true,
          },
        ],
      })
    );
    const rules = await svc.getRules();
    expect(rules[0].name).toBe('قاعدة');
    expect(rules[0].category).toBe('medication');
    expect(rules[0].condition).toContain('x');
    expect(rules[0].action).toContain('إشعار');
    expect(rules[0].triggerCount).toBe(0);
    expect(rules[0].evidenceLevel).toBeDefined();
  });
});

describe('getDrugLibrary — field rename + interaction codes', () => {
  test('maps genericNameAr→name and drugInteractions→string codes', async () => {
    mockApi.get.mockReturnValueOnce(
      ok({
        data: [
          {
            _id: 'd1',
            code: 'BACLO',
            genericNameAr: 'باكلوفين',
            drugClassAr: 'مرخيات',
            drugInteractions: [{ drug_code: 'DIAZ', severity: 'critical' }],
            contraindications: ['فشل كلوي'],
            isControlled: true,
          },
        ],
      })
    );
    const drugs = await svc.getDrugLibrary();
    expect(drugs[0].name).toBe('باكلوفين');
    expect(drugs[0].category).toBe('مرخيات');
    expect(drugs[0].interactions).toEqual(['DIAZ']);
    expect(drugs[0].contraindications).toEqual(['فشل كلوي']);
    expect(drugs[0].highRisk).toBe(true); // from isControlled
    expect(drugs[0].code).toBe('BACLO'); // retained for interaction checks
  });
});

describe('getRehabSuggestions — 0–1 confidence → percent', () => {
  test('maps confidenceScore and plan fields', async () => {
    mockApi.get.mockReturnValueOnce(
      ok({
        data: [
          {
            _id: 's1',
            beneficiaryId: { _id: 'b9', fullNameAr: 'فاطمة' },
            confidenceScore: 0.78,
            suggestedFrequency: { sessionsPerWeek: 3 },
            suggestedInterventions: [{ type: 'PT' }],
            suggestedGoals: [{ goal: 'هدف' }],
            estimatedDurationWeeks: 8,
            status: 'pending',
          },
        ],
      })
    );
    const sg = await svc.getRehabSuggestions();
    expect(sg[0].beneficiaryName).toBe('فاطمة');
    expect(sg[0].confidenceScore).toBe(78); // 0.78 → 78%
    expect(sg[0].suggestedPlan.sessions).toBe(3);
    expect(sg[0].suggestedPlan.modalities).toEqual(['PT']);
    expect(sg[0].suggestedPlan.goals).toEqual(['هدف']);
    expect(sg[0].suggestedPlan.duration).toContain('8');
  });
});

describe('getDecisionLog — decisionType → action', () => {
  test('maps decision fields the log table renders', async () => {
    mockApi.get.mockReturnValueOnce(
      ok({
        data: [
          {
            _id: 'l1',
            decisionType: 'alert_override',
            contextType: 'cdss_alert',
            userId: { name: 'د. هاني' },
            rationale: 'سبب',
            decisionAt: '2026-05-30T09:00:00Z',
          },
        ],
      })
    );
    const log = await svc.getDecisionLog();
    expect(log[0].action).toBe('override');
    expect(log[0].clinician).toBe('د. هاني');
    expect(log[0].reason).toBe('سبب');
  });
});

describe('mutation payloads match backend contract', () => {
  test('overrideAlert sends { overrideReason }', async () => {
    mockApi.patch.mockReturnValueOnce(ok({ message: 'ok' }));
    await svc.overrideAlert('a1', 'مبرر سريري مفصل');
    expect(mockApi.patch).toHaveBeenCalledWith(expect.stringContaining('/alerts/a1/override'), {
      overrideReason: 'مبرر سريري مفصل',
    });
  });

  test('checkDrugInteractions sends { drugCodes } and derives safe flag', async () => {
    mockApi.post.mockReturnValueOnce(ok({ interactions: [], hasCritical: false }));
    const res = await svc.checkDrugInteractions(['BACLO', 'DIAZ']);
    expect(mockApi.post).toHaveBeenCalledWith(
      expect.stringContaining('/drugs/check-interactions'),
      { drugCodes: ['BACLO', 'DIAZ'] }
    );
    expect(res.safe).toBe(true);
  });

  test('checkDrugInteractions reports unsafe when a critical interaction exists', async () => {
    mockApi.post.mockReturnValueOnce(
      ok({ interactions: [{ severity: 'critical' }], hasCritical: true })
    );
    const res = await svc.checkDrugInteractions(['A', 'B']);
    expect(res.safe).toBe(false);
    expect(res.interactions).toHaveLength(1);
  });

  test('createRule maps the flat form onto the ClinicalRule schema', async () => {
    mockApi.post.mockReturnValueOnce(ok({ data: { _id: 'new1', nameAr: 'ق', code: 'X' } }));
    await svc.createRule({
      name: 'ق',
      code: 'X',
      condition: 'a > 1',
      action: 'do',
      category: 'medication',
      severity: 'critical',
    });
    const [, body] = mockApi.post.mock.calls[0];
    expect(body.nameAr).toBe('ق'); // required server-side
    expect(Array.isArray(body.conditions)).toBe(true);
    expect(Array.isArray(body.actions)).toBe(true);
  });
});

describe('lists never throw on a surprising payload', () => {
  test('non-array / object payloads degrade to []', async () => {
    mockApi.get.mockReturnValueOnce(ok('<!DOCTYPE html>')); // e.g. mis-routed HTML
    const alerts = await svc.getAlerts();
    expect(alerts).toEqual([]);
  });
});
