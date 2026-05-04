/**
 * Unit tests for domains/quality/services/QualityEngine.js
 * Tests pure audit rules and helper methods — no DB required.
 */
'use strict';

jest.mock('mongoose', () => ({ model: jest.fn() }));
jest.mock('../../utils/logger', () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }));

const { qualityEngine, QualityEngine } = require('../../domains/quality/services/QualityEngine');

// ─── Module exports ───────────────────────────────────────────────────────────

describe('QualityEngine module exports', () => {
  test('exports QualityEngine class', () => {
    expect(typeof QualityEngine).toBe('function');
  });
  test('exports qualityEngine singleton', () => {
    expect(qualityEngine).toBeInstanceOf(QualityEngine);
  });
  test('singleton has rules array', () => {
    expect(Array.isArray(qualityEngine.rules)).toBe(true);
    expect(qualityEngine.rules.length).toBeGreaterThan(0);
  });
});

// ─── listRules ────────────────────────────────────────────────────────────────

describe('QualityEngine.listRules()', () => {
  test('returns array of rule summaries', () => {
    const rules = qualityEngine.listRules();
    expect(Array.isArray(rules)).toBe(true);
    expect(rules.length).toBeGreaterThan(0);
  });
  test('each rule has required fields', () => {
    const rules = qualityEngine.listRules();
    for (const r of rules) {
      expect(r).toHaveProperty('code');
      expect(r).toHaveProperty('name');
      expect(r).toHaveProperty('category');
      expect(r).toHaveProperty('severity');
    }
  });
  test('includes known rule codes', () => {
    const codes = qualityEngine.listRules().map(r => r.code);
    expect(codes).toContain('QA_CARE_PLAN_EXISTS');
    expect(codes).toContain('QA_INITIAL_ASSESSMENT');
    expect(codes).toContain('QA_GOALS_DEFINED');
  });
});

// ─── _kpiStatus ──────────────────────────────────────────────────────────────

describe('QualityEngine._kpiStatus()', () => {
  test.each([
    [100, 80, 'met'],
    [80, 80, 'met'],
    [70, 80, 'near_target'], // 70 >= 80*0.8=64
    [50, 80, 'below_target'], // 50 >= 80*0.5=40
    [30, 80, 'critical'], // 30 < 40
  ])('value=%d target=%d → %s', (value, target, expected) => {
    expect(qualityEngine._kpiStatus(value, target)).toBe(expected);
  });
});

// ─── _ruleToKpi ──────────────────────────────────────────────────────────────

describe('QualityEngine._ruleToKpi()', () => {
  test.each([
    ['QA_CARE_PLAN_EXISTS', 'documentation_completeness'],
    ['QA_SESSION_DOC_TIMELINESS', 'documentation_timeliness'],
    ['QA_REASSESSMENT_ON_TIME', 'reassessment_compliance'],
    ['QA_SESSION_FREQUENCY', 'care_plan_adherence'],
    ['QA_SOAP_COMPLETENESS', 'session_documentation_rate'],
    ['QA_FAMILY_CONTACT', 'family_engagement_rate'],
    ['QA_ATTENDANCE_RATE', 'attendance_rate'],
    ['UNKNOWN_RULE', 'documentation_completeness'],
  ])('rule %s → kpi %s', (code, expected) => {
    expect(qualityEngine._ruleToKpi(code)).toBe(expected);
  });
});

// ─── _findingToActionType ─────────────────────────────────────────────────────

describe('QualityEngine._findingToActionType()', () => {
  test.each([
    ['QA_CARE_PLAN_EXISTS', 'update_care_plan'],
    ['QA_INITIAL_ASSESSMENT', 'schedule_reassessment'],
    ['QA_REASSESSMENT_ON_TIME', 'schedule_reassessment'],
    ['QA_GOALS_DEFINED', 'update_care_plan'],
    ['QA_SOAP_COMPLETENESS', 'complete_documentation'],
    ['QA_FAMILY_CONTACT', 'contact_family'],
    ['UNKNOWN', 'complete_documentation'],
  ])('ruleCode %s → actionType %s', (ruleCode, expected) => {
    expect(qualityEngine._findingToActionType({ ruleCode })).toBe(expected);
  });
});

// ─── _findingToRequiredAction ─────────────────────────────────────────────────

describe('QualityEngine._findingToRequiredAction()', () => {
  test('returns Arabic required action for known rule', () => {
    const action = qualityEngine._findingToRequiredAction({
      ruleCode: 'QA_CARE_PLAN_EXISTS',
      description: '',
    });
    expect(typeof action).toBe('string');
    expect(action.length).toBeGreaterThan(0);
  });
  test('falls back to description-based action for unknown rule', () => {
    const action = qualityEngine._findingToRequiredAction({
      ruleCode: 'UNKNOWN_RULE',
      description: 'test finding',
    });
    expect(action).toContain('test finding');
  });
});

// ─── Audit Rules — QA_CARE_PLAN_EXISTS ───────────────────────────────────────

describe('AUDIT_RULE: QA_CARE_PLAN_EXISTS', () => {
  const rule = () => qualityEngine.rules.find(r => r.code === 'QA_CARE_PLAN_EXISTS');

  test('fails when no care plan', () => {
    const result = rule().check({ carePlan: null });
    expect(result.passed).toBe(false);
  });
  test('passes when care plan exists', () => {
    const result = rule().check({ carePlan: { _id: '123' } });
    expect(result.passed).toBe(true);
    expect(result.score).toBe(100);
  });
});

// ─── Audit Rules — QA_INITIAL_ASSESSMENT ─────────────────────────────────────

describe('AUDIT_RULE: QA_INITIAL_ASSESSMENT', () => {
  const rule = () => qualityEngine.rules.find(r => r.code === 'QA_INITIAL_ASSESSMENT');

  test('fails when no assessments', () => {
    expect(rule().check({ assessments: [] }).passed).toBe(false);
  });
  test('fails when no initial assessment in list', () => {
    expect(rule().check({ assessments: [{ type: 'progress' }] }).passed).toBe(false);
  });
  test('passes when initial assessment exists', () => {
    const result = rule().check({ assessments: [{ type: 'initial' }] });
    expect(result.passed).toBe(true);
  });
});

// ─── Audit Rules — QA_GOALS_DEFINED ──────────────────────────────────────────

describe('AUDIT_RULE: QA_GOALS_DEFINED', () => {
  const rule = () => qualityEngine.rules.find(r => r.code === 'QA_GOALS_DEFINED');

  test('fails when no goals', () => {
    expect(rule().check({ goals: [] }).passed).toBe(false);
  });
  test('fails when goals exist but none active', () => {
    const result = rule().check({ goals: [{ status: 'achieved' }] });
    expect(result.passed).toBe(false);
  });
  test('passes when active goal exists', () => {
    const result = rule().check({ goals: [{ status: 'active' }] });
    expect(result.passed).toBe(true);
  });
  test('passes when in_progress goal exists', () => {
    const result = rule().check({ goals: [{ status: 'in_progress' }] });
    expect(result.passed).toBe(true);
  });
});

// ─── Audit Rules — QA_BENEFICIARY_PROFILE_COMPLETE ───────────────────────────

describe('AUDIT_RULE: QA_BENEFICIARY_PROFILE_COMPLETE', () => {
  const rule = () => qualityEngine.rules.find(r => r.code === 'QA_BENEFICIARY_PROFILE_COMPLETE');

  test('fails when beneficiary is null', () => {
    expect(rule().check({ beneficiary: null }).passed).toBe(false);
  });
  test('fails when required fields missing', () => {
    const result = rule().check({ beneficiary: { personalInfo: {} } });
    expect(result.passed).toBe(false);
  });
  test('passes when all required fields present', () => {
    const result = rule().check({
      beneficiary: {
        personalInfo: { firstName: 'Ali', lastName: 'Hassan', dateOfBirth: '2000-01-01' },
      },
    });
    expect(result.passed).toBe(true);
    expect(result.score).toBe(100);
  });
});

// ─── Audit Rules — QA_SESSION_DOC_TIMELINESS ─────────────────────────────────

describe('AUDIT_RULE: QA_SESSION_DOC_TIMELINESS', () => {
  const rule = () => qualityEngine.rules.find(r => r.code === 'QA_SESSION_DOC_TIMELINESS');

  test('passes when no sessions', () => {
    expect(rule().check({ sessions: [] }).passed).toBe(true);
  });
  test('passes when all sessions documented within 48h', () => {
    const now = new Date();
    const sessionDate = new Date(now - 24 * 3600000);
    const result = rule().check({
      sessions: [{ status: 'completed', sessionDate, updatedAt: now }],
    });
    expect(result.passed).toBe(true);
  });
  test('detects late documentation', () => {
    const sessionDate = new Date('2024-01-01');
    const updatedAt = new Date('2024-01-05'); // 4 days later
    const result = rule().check({
      sessions: [{ status: 'completed', sessionDate, updatedAt }],
    });
    expect(result.passed).toBe(false);
  });
});

// ─── Audit Rules — QA_REASSESSMENT_ON_TIME ───────────────────────────────────

describe('AUDIT_RULE: QA_REASSESSMENT_ON_TIME', () => {
  const rule = () => qualityEngine.rules.find(r => r.code === 'QA_REASSESSMENT_ON_TIME');

  test('passes with partial score when no assessments', () => {
    const result = rule().check({ assessments: [] });
    expect(result.passed).toBe(true);
    expect(result.score).toBe(50);
  });
  test('passes when latest assessment is within 90 days', () => {
    const recentDate = new Date(Date.now() - 30 * 86400000);
    const result = rule().check({ assessments: [{ assessmentDate: recentDate, _id: 'x' }] });
    expect(result.passed).toBe(true);
  });
  test('fails when latest assessment is older than 90 days', () => {
    const oldDate = new Date(Date.now() - 120 * 86400000);
    const result = rule().check({ assessments: [{ assessmentDate: oldDate, _id: 'x' }] });
    expect(result.passed).toBe(false);
  });
});

// ─── Audit Rules — QA_SESSION_FREQUENCY ──────────────────────────────────────

describe('AUDIT_RULE: QA_SESSION_FREQUENCY', () => {
  const rule = () => qualityEngine.rules.find(r => r.code === 'QA_SESSION_FREQUENCY');

  test('passes with score 80 when fewer than 4 sessions total', () => {
    const result = rule().check({ sessions: [{ sessionDate: new Date() }] });
    expect(result.passed).toBe(true);
    expect(result.score).toBe(80);
  });
  test('fails when fewer than 4 sessions in last 30 days', () => {
    const old = new Date(Date.now() - 60 * 86400000);
    const sessions = Array(5).fill({ sessionDate: old });
    const result = rule().check({ sessions });
    expect(result.passed).toBe(false);
  });
  test('passes when 4+ sessions in last 30 days', () => {
    const recent = new Date(Date.now() - 5 * 86400000);
    const sessions = Array(6).fill({ sessionDate: recent });
    const result = rule().check({ sessions });
    expect(result.passed).toBe(true);
  });
});

// ─── Audit Rules — QA_SOAP_COMPLETENESS ──────────────────────────────────────

describe('AUDIT_RULE: QA_SOAP_COMPLETENESS', () => {
  const rule = () => qualityEngine.rules.find(r => r.code === 'QA_SOAP_COMPLETENESS');
  const completeSoap = { subjective: 's', objective: 'o', assessment: 'a', plan: 'p' };

  test('passes when no sessions', () => {
    expect(rule().check({ sessions: [] }).passed).toBe(true);
  });
  test('passes when all completed sessions have full SOAP', () => {
    const sessions = Array(5).fill({ status: 'completed', soapNote: completeSoap });
    expect(rule().check({ sessions }).passed).toBe(true);
  });
  test('fails when SOAP completeness < 80%', () => {
    const sessions = [
      { status: 'completed', soapNote: completeSoap },
      { status: 'completed', soapNote: null },
      { status: 'completed', soapNote: null },
      { status: 'completed', soapNote: null },
      { status: 'completed', soapNote: null },
    ];
    const result = rule().check({ sessions });
    expect(result.passed).toBe(false);
    expect(result.score).toBe(20);
  });
});

// ─── Audit Rules — QA_FAMILY_CONTACT ─────────────────────────────────────────

describe('AUDIT_RULE: QA_FAMILY_CONTACT', () => {
  const rule = () => qualityEngine.rules.find(r => r.code === 'QA_FAMILY_CONTACT');

  test('passes with score 50 when no familyEvents', () => {
    const result = rule().check({ familyEvents: null });
    expect(result.passed).toBe(true);
    expect(result.score).toBe(50);
  });
  test('fails when no recent events', () => {
    const old = new Date(Date.now() - 60 * 86400000);
    expect(rule().check({ familyEvents: [{ timestamp: old }] }).passed).toBe(false);
  });
  test('fails with low score when only 1 recent event', () => {
    const recent = new Date();
    const result = rule().check({ familyEvents: [{ timestamp: recent }] });
    expect(result.passed).toBe(false);
    expect(result.score).toBe(40);
  });
  test('passes when 2+ recent events', () => {
    const recent = new Date();
    const result = rule().check({ familyEvents: [{ timestamp: recent }, { timestamp: recent }] });
    expect(result.passed).toBe(true);
  });
});

// ─── Audit Rules — QA_ATTENDANCE_RATE ────────────────────────────────────────

describe('AUDIT_RULE: QA_ATTENDANCE_RATE', () => {
  const rule = () => qualityEngine.rules.find(r => r.code === 'QA_ATTENDANCE_RATE');

  test('passes with score 80 when fewer than 5 sessions', () => {
    const result = rule().check({ sessions: [{}] });
    expect(result.passed).toBe(true);
  });
  test('passes when attendance rate >= 70%', () => {
    const sessions = [
      ...Array(8).fill({ attendance: { status: 'present' } }),
      ...Array(2).fill({ attendance: { status: 'absent' } }),
    ];
    expect(rule().check({ sessions }).passed).toBe(true);
  });
  test('fails when attendance rate < 70%', () => {
    const sessions = [
      ...Array(5).fill({ attendance: { status: 'present' } }),
      ...Array(5).fill({ attendance: { status: 'absent' } }),
    ];
    const result = rule().check({ sessions });
    expect(result.passed).toBe(false);
    expect(result.score).toBe(50);
  });
  test('counts status=completed as attended', () => {
    const sessions = Array(10).fill({ status: 'completed' });
    const result = rule().check({ sessions });
    expect(result.passed).toBe(true);
  });
});
