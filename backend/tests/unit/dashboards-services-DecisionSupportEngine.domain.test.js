/**
 * Functional unit tests for DecisionSupportEngine
 * Covers: DECISION_RULES structure, listRules(), runRule() error path, runAllRules() logic
 */
'use strict';

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

let mockModels = {};

jest.mock('mongoose', () => ({
  model: jest.fn(name => mockModels[name] || {}),
  Types: { ObjectId: jest.fn(id => id) },
}));

const {
  decisionSupportEngine,
  DECISION_RULES,
} = require('../../domains/dashboards/services/DecisionSupportEngine');

const EXPECTED_RULE_IDS = [
  'NO_SESSIONS_14D',
  'EPISODE_OVERDUE',
  'GOAL_DECLINE',
  'HIGH_RISK_SCORE',
  'QUALITY_VIOLATION',
  'BEHAVIOR_ESCALATION',
  'FAMILY_DISENGAGED',
  'KPI_BREACH',
];

const VALID_SEVERITIES = ['low', 'medium', 'high', 'critical'];

describe('DECISION_RULES constant', () => {
  test('is an array of 8 rules', () => {
    expect(Array.isArray(DECISION_RULES)).toBe(true);
    expect(DECISION_RULES).toHaveLength(8);
  });

  test.each(EXPECTED_RULE_IDS)('rule "%s" has required shape', id => {
    const rule = DECISION_RULES.find(r => r.id === id);
    expect(rule).toBeDefined();
    expect(typeof rule.name).toBe('string');
    expect(rule.name.length).toBeGreaterThan(0);
    expect(typeof rule.category).toBe('string');
    expect(VALID_SEVERITIES).toContain(rule.severity);
    expect(typeof rule.evaluate).toBe('function');
  });

  test('all severities are valid enum values', () => {
    DECISION_RULES.forEach(r => {
      expect(VALID_SEVERITIES).toContain(r.severity);
    });
  });

  test('all rule IDs are unique', () => {
    const ids = DECISION_RULES.map(r => r.id);
    expect(new Set(ids).size).toBe(DECISION_RULES.length);
  });
});

describe('decisionSupportEngine instance', () => {
  test('is exported as singleton', () => {
    expect(decisionSupportEngine).toBeDefined();
    expect(typeof decisionSupportEngine).toBe('object');
  });

  test('has 8 rules in this.rules', () => {
    expect(Array.isArray(decisionSupportEngine.rules)).toBe(true);
    expect(decisionSupportEngine.rules).toHaveLength(8);
  });
});

describe('decisionSupportEngine.listRules()', () => {
  test('returns all 8 rule IDs', () => {
    const rules = decisionSupportEngine.listRules();
    expect(rules).toHaveLength(8);
    expect(rules.map(r => r.id)).toEqual(expect.arrayContaining(EXPECTED_RULE_IDS));
  });

  test('returned items have id/name/category/severity but no evaluate fn', () => {
    const rules = decisionSupportEngine.listRules();
    rules.forEach(r => {
      expect(r).toHaveProperty('id');
      expect(r).toHaveProperty('name');
      expect(r).toHaveProperty('category');
      expect(r).toHaveProperty('severity');
      expect(r.evaluate).toBeUndefined();
    });
  });
});

describe('decisionSupportEngine.runRule()', () => {
  test('throws when ruleId is unknown', async () => {
    await expect(decisionSupportEngine.runRule('NONEXISTENT_RULE_XYZ')).rejects.toThrow(
      'Rule "NONEXISTENT_RULE_XYZ" not found'
    );
  });
});

describe('decisionSupportEngine.runAllRules()', () => {
  let evaluateSpies;

  beforeEach(() => {
    jest.clearAllMocks();
    mockModels = {
      DecisionAlert: {
        findOne: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ _id: 'alert-1' }),
      },
    };
    const mongoose = require('mongoose');
    mongoose.model.mockImplementation(name => mockModels[name] || {});

    evaluateSpies = decisionSupportEngine.rules.map(r =>
      jest.spyOn(r, 'evaluate').mockResolvedValue([])
    );
  });

  afterEach(() => {
    evaluateSpies.forEach(spy => spy.mockRestore());
  });

  test('returns object with processed, alertsCreated, errors', async () => {
    const result = await decisionSupportEngine.runAllRules();
    expect(result).toHaveProperty('processed');
    expect(result).toHaveProperty('alertsCreated');
    expect(result).toHaveProperty('errors');
  });

  test('processed equals 8 when all rules succeed', async () => {
    const result = await decisionSupportEngine.runAllRules();
    expect(result.processed).toBe(8);
    expect(result.errors).toHaveLength(0);
  });

  test('alertsCreated is 0 when all evaluate() return empty arrays', async () => {
    const result = await decisionSupportEngine.runAllRules();
    expect(result.alertsCreated).toBe(0);
  });

  test('creates alert when finding has no matching active alert', async () => {
    evaluateSpies[0].mockResolvedValue([
      {
        beneficiaryId: 'b1',
        title: 'No sessions for Test User in 14+ days',
        category: 'treatment_gap',
        severity: 'high',
      },
    ]);
    const result = await decisionSupportEngine.runAllRules();
    expect(result.alertsCreated).toBe(1);
    expect(mockModels.DecisionAlert.create).toHaveBeenCalledTimes(1);
  });

  test('skips alert creation when duplicate active alert exists', async () => {
    evaluateSpies[0].mockResolvedValue([
      {
        beneficiaryId: 'b1',
        title: 'Duplicate alert',
        category: 'treatment_gap',
        severity: 'high',
      },
    ]);
    mockModels.DecisionAlert.findOne.mockResolvedValue({ _id: 'existing-alert' });
    const result = await decisionSupportEngine.runAllRules();
    expect(result.alertsCreated).toBe(0);
    expect(mockModels.DecisionAlert.create).not.toHaveBeenCalled();
  });

  test('records error entry when a rule evaluate() throws', async () => {
    evaluateSpies[0].mockRejectedValue(new Error('DB connection lost'));
    const result = await decisionSupportEngine.runAllRules();
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].ruleId).toBe(EXPECTED_RULE_IDS[0]);
    expect(result.errors[0].error).toBe('DB connection lost');
    expect(result.processed).toBe(7);
  });

  test('continues processing remaining rules after one failure', async () => {
    evaluateSpies[2].mockRejectedValue(new Error('timeout'));
    const result = await decisionSupportEngine.runAllRules();
    expect(result.errors).toHaveLength(1);
    expect(result.processed).toBe(7);
  });
});
