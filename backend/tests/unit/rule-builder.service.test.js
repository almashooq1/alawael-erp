/**
 * Unit tests for ruleBuilder.service.js (741L)
 * EventEmitter class — in-memory rule engine with Maps
 * Singleton export: module.exports = new RuleBuilderService()
 */

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

global.__rbUuidCtr = 0;
jest.mock('uuid', () => ({ v4: () => `test-uuid-${++global.__rbUuidCtr}` }));

const svc = require('../../services/ruleBuilder.service');

describe('RuleBuilderService', () => {
  beforeEach(() => {
    // Reset rules (keep templates/conditions/actions from _initializeDefaults)
    svc.rules.clear();
    global.__rbUuidCtr = 0;
  });

  /* ════════════════════ Initialization ════════════════════ */

  describe('initialization', () => {
    it('initializes default conditions', () => {
      expect(svc.conditions.size).toBe(9);
      expect(svc.conditions.has('time')).toBe(true);
      expect(svc.conditions.has('role')).toBe(true);
      expect(svc.conditions.has('location')).toBe(true);
      expect(svc.conditions.has('ipAddress')).toBe(true);
      expect(svc.conditions.has('deviceType')).toBe(true);
      expect(svc.conditions.has('riskLevel')).toBe(true);
    });

    it('initializes default actions', () => {
      expect(svc.actions.size).toBe(8);
      expect(svc.actions.has('allow')).toBe(true);
      expect(svc.actions.has('deny')).toBe(true);
      expect(svc.actions.has('require_mfa')).toBe(true);
    });

    it('initializes default templates', () => {
      const templates = svc.getTemplates();
      expect(templates.length).toBe(4);
      const names = templates.map(t => t.name);
      expect(names).toContain('Business Hours Only');
      expect(names).toContain('MFA Required');
      expect(names).toContain('Sensitive Data Access');
      expect(names).toContain('Location-Based Access');
    });
  });

  /* ════════════════════ createRule ════════════════════ */

  describe('createRule', () => {
    const validRule = {
      name: 'Test Rule',
      description: 'A test rule',
      conditions: [{ type: 'role', operator: 'equals', value: 'admin' }],
      actions: [{ id: 'allow' }],
      priority: 100,
    };

    it('creates a valid rule', () => {
      const rule = svc.createRule(validRule);
      expect(rule.name).toBe('Test Rule');
      expect(rule.enabled).toBe(true);
      expect(rule.id).toContain('rule-');
      expect(rule.metadata.executionCount).toBe(0);
    });

    it('emits rule:created event', () => {
      const fn = jest.fn();
      svc.on('rule:created', fn);
      svc.createRule(validRule);
      expect(fn).toHaveBeenCalledTimes(1);
      svc.removeListener('rule:created', fn);
    });

    it('throws without name', () => {
      expect(() =>
        svc.createRule({
          conditions: [{ type: 'role', operator: 'equals', value: 'admin' }],
          actions: [{ id: 'allow' }],
        })
      ).toThrow('Rule name is required');
    });

    it('throws without conditions', () => {
      expect(() =>
        svc.createRule({ name: 'Bad', conditions: [], actions: [{ id: 'allow' }] })
      ).toThrow('At least one condition is required');
    });

    it('throws without actions', () => {
      expect(() =>
        svc.createRule({
          name: 'Bad',
          conditions: [{ type: 'role', operator: 'equals', value: 'a' }],
          actions: [],
        })
      ).toThrow('At least one action is required');
    });

    it('throws for unknown condition type', () => {
      expect(() =>
        svc.createRule({
          name: 'Bad',
          conditions: [{ type: 'unknown_type', operator: 'equals', value: 'x' }],
          actions: [{ id: 'allow' }],
        })
      ).toThrow('Unknown condition type');
    });

    it('throws for invalid operator on condition', () => {
      expect(() =>
        svc.createRule({
          name: 'Bad',
          conditions: [{ type: 'role', operator: 'badOp', value: 'admin' }],
          actions: [{ id: 'allow' }],
        })
      ).toThrow("Invalid operator 'badOp'");
    });

    it('throws for unknown action type', () => {
      expect(() =>
        svc.createRule({
          name: 'Bad',
          conditions: [{ type: 'role', operator: 'equals', value: 'admin' }],
          actions: [{ id: 'nonexistent_action' }],
        })
      ).toThrow('Unknown action type');
    });
  });

  /* ════════════════════ Condition Validation ════════════════════ */

  describe('_validateCondition', () => {
    it('validates time condition requires start/end for between', () => {
      expect(() =>
        svc._validateCondition({ type: 'time', operator: 'between', value: {} })
      ).toThrow('Time range requires start and end');
    });

    it('validates ipAddress with matches checks regex', () => {
      expect(() =>
        svc._validateCondition({ type: 'ipAddress', operator: 'matches', value: '[invalid' })
      ).toThrow('Invalid IP pattern regex');
    });

    it('validates role "in" requires array', () => {
      expect(() =>
        svc._validateCondition({ type: 'role', operator: 'in', value: 'single' })
      ).toThrow("Operator 'in' requires array value");
    });

    it('validates location "in" requires array', () => {
      expect(() =>
        svc._validateCondition({ type: 'location', operator: 'in', value: 'single' })
      ).toThrow('requires array value');
    });

    it('throws without type', () => {
      expect(() => svc._validateCondition({ operator: 'equals', value: 'x' })).toThrow(
        'Condition type is required'
      );
    });

    it('throws without operator', () => {
      expect(() => svc._validateCondition({ type: 'role', value: 'x' })).toThrow(
        'Condition operator is required'
      );
    });

    it('throws without value', () => {
      expect(() => svc._validateCondition({ type: 'role', operator: 'equals' })).toThrow(
        'Condition value is required'
      );
    });
  });

  /* ════════════════════ updateRule ════════════════════ */

  describe('updateRule', () => {
    it('updates rule fields', () => {
      const rule = svc.createRule({
        name: 'R1',
        conditions: [{ type: 'role', operator: 'equals', value: 'admin' }],
        actions: [{ id: 'allow' }],
      });
      svc.updateRule(rule.id, { name: 'Updated Name' });
      const updated = svc.rules.get(rule.id);
      expect(updated.name).toBe('Updated Name');
    });

    it('throws if rule not found', () => {
      expect(() => svc.updateRule('fake-id', {})).toThrow('Rule not found');
    });

    it('throws if rule is locked', () => {
      const rule = svc.createRule({
        name: 'Locked',
        conditions: [{ type: 'role', operator: 'equals', value: 'a' }],
        actions: [{ id: 'allow' }],
      });
      rule.metadata.isLocked = true;
      expect(() => svc.updateRule(rule.id, { name: 'New' })).toThrow('Cannot modify locked rule');
    });

    it('validates updated conditions', () => {
      const rule = svc.createRule({
        name: 'R2',
        conditions: [{ type: 'role', operator: 'equals', value: 'admin' }],
        actions: [{ id: 'allow' }],
      });
      expect(() =>
        svc.updateRule(rule.id, {
          conditions: [{ type: 'badType', operator: 'equals', value: 'x' }],
        })
      ).toThrow('Unknown condition type');
    });
  });

  /* ════════════════════ deleteRule ════════════════════ */

  describe('deleteRule', () => {
    it('deletes a rule', () => {
      const rule = svc.createRule({
        name: 'Del',
        conditions: [{ type: 'role', operator: 'equals', value: 'a' }],
        actions: [{ id: 'allow' }],
      });
      svc.deleteRule(rule.id);
      expect(svc.rules.has(rule.id)).toBe(false);
    });

    it('throws if rule not found', () => {
      expect(() => svc.deleteRule('fake')).toThrow('Rule not found');
    });

    it('throws if system rule', () => {
      const rule = svc.createRule({
        name: 'Sys',
        conditions: [{ type: 'role', operator: 'equals', value: 'a' }],
        actions: [{ id: 'allow' }],
      });
      rule.isSystem = true;
      expect(() => svc.deleteRule(rule.id)).toThrow('Cannot delete system rule');
    });
  });

  /* ════════════════════ setRuleEnabled ════════════════════ */

  describe('setRuleEnabled', () => {
    it('disables a rule', () => {
      const rule = svc.createRule({
        name: 'Toggle',
        conditions: [{ type: 'role', operator: 'equals', value: 'a' }],
        actions: [{ id: 'allow' }],
      });
      svc.setRuleEnabled(rule.id, false);
      expect(svc.rules.get(rule.id).enabled).toBe(false);
    });

    it('emits rule:status_changed event', () => {
      const fn = jest.fn();
      svc.on('rule:status_changed', fn);
      const rule = svc.createRule({
        name: 'Ev',
        conditions: [{ type: 'role', operator: 'equals', value: 'a' }],
        actions: [{ id: 'allow' }],
      });
      svc.setRuleEnabled(rule.id, false);
      expect(fn).toHaveBeenCalled();
      svc.removeListener('rule:status_changed', fn);
    });

    it('throws if not found', () => {
      expect(() => svc.setRuleEnabled('fake', true)).toThrow('Rule not found');
    });
  });

  /* ════════════════════ evaluateRule ════════════════════ */

  describe('evaluateRule', () => {
    it('matches rule with satisfied conditions', () => {
      const rule = svc.createRule({
        name: 'Role Match',
        conditions: [{ type: 'role', operator: 'equals', value: 'admin' }],
        actions: [{ id: 'allow' }],
      });
      const result = svc.evaluateRule(rule.id, { role: 'admin' });
      expect(result.matched).toBe(true);
      expect(result.actions).toEqual([{ id: 'allow' }]);
    });

    it('does not match with unsatisfied conditions', () => {
      const rule = svc.createRule({
        name: 'Role Mismatch',
        conditions: [{ type: 'role', operator: 'equals', value: 'admin' }],
        actions: [{ id: 'allow' }],
      });
      const result = svc.evaluateRule(rule.id, { role: 'user' });
      expect(result.matched).toBe(false);
    });

    it('returns not matched for disabled rule', () => {
      const rule = svc.createRule({
        name: 'Disabled',
        conditions: [{ type: 'role', operator: 'equals', value: 'a' }],
        actions: [{ id: 'allow' }],
      });
      svc.setRuleEnabled(rule.id, false);
      const result = svc.evaluateRule(rule.id, { role: 'a' });
      expect(result.matched).toBe(false);
      expect(result.reason).toBe('Rule is disabled');
    });

    it('increments execution count', () => {
      const rule = svc.createRule({
        name: 'Count',
        conditions: [{ type: 'role', operator: 'equals', value: 'a' }],
        actions: [{ id: 'allow' }],
      });
      svc.evaluateRule(rule.id, { role: 'a' });
      svc.evaluateRule(rule.id, { role: 'b' });
      expect(svc.rules.get(rule.id).metadata.executionCount).toBe(2);
    });

    it('returns not-matched for non-existent rule', () => {
      const result = svc.evaluateRule('fake', {});
      expect(result.matched).toBe(false);
    });
  });

  /* ════════════════════ Condition Evaluators ════════════════════ */

  describe('condition evaluators', () => {
    it('evaluates role "in" condition', () => {
      const rule = svc.createRule({
        name: 'RoleIn',
        conditions: [{ type: 'role', operator: 'in', value: ['admin', 'manager'] }],
        actions: [{ id: 'allow' }],
      });
      expect(svc.evaluateRule(rule.id, { role: 'manager' }).matched).toBe(true);
      expect(svc.evaluateRule(rule.id, { role: 'user' }).matched).toBe(false);
    });

    it('evaluates role "notIn" condition', () => {
      const rule = svc.createRule({
        name: 'RoleNotIn',
        conditions: [{ type: 'role', operator: 'notIn', value: ['guest'] }],
        actions: [{ id: 'allow' }],
      });
      expect(svc.evaluateRule(rule.id, { role: 'admin' }).matched).toBe(true);
      expect(svc.evaluateRule(rule.id, { role: 'guest' }).matched).toBe(false);
    });

    it('evaluates location "equals" condition', () => {
      const rule = svc.createRule({
        name: 'LocEq',
        conditions: [{ type: 'location', operator: 'equals', value: 'office' }],
        actions: [{ id: 'allow' }],
      });
      expect(svc.evaluateRule(rule.id, { location: 'office' }).matched).toBe(true);
      expect(svc.evaluateRule(rule.id, { location: 'home' }).matched).toBe(false);
    });

    it('evaluates location "startsWith" condition', () => {
      const rule = svc.createRule({
        name: 'LocSW',
        conditions: [{ type: 'location', operator: 'startsWith', value: 'building' }],
        actions: [{ id: 'allow' }],
      });
      expect(svc.evaluateRule(rule.id, { location: 'building-A' }).matched).toBe(true);
    });

    it('evaluates ipAddress "equals" condition', () => {
      const rule = svc.createRule({
        name: 'IPEq',
        conditions: [{ type: 'ipAddress', operator: 'equals', value: '192.168.1.1' }],
        actions: [{ id: 'allow' }],
      });
      expect(svc.evaluateRule(rule.id, { ipAddress: '192.168.1.1' }).matched).toBe(true);
    });

    it('evaluates ipAddress "matches" regex condition', () => {
      const rule = svc.createRule({
        name: 'IPRegex',
        conditions: [{ type: 'ipAddress', operator: 'matches', value: '^192\\.168\\.' }],
        actions: [{ id: 'allow' }],
      });
      expect(svc.evaluateRule(rule.id, { ipAddress: '192.168.1.5' }).matched).toBe(true);
      expect(svc.evaluateRule(rule.id, { ipAddress: '10.0.0.1' }).matched).toBe(false);
    });

    it('evaluates userAttribute "equals" condition', () => {
      const rule = svc.createRule({
        name: 'AttrEq',
        conditions: [
          {
            type: 'userAttribute',
            operator: 'equals',
            value: { field: 'mfaEnabled', value: true },
          },
        ],
        actions: [{ id: 'allow' }],
      });
      expect(svc.evaluateRule(rule.id, { attributes: { mfaEnabled: true } }).matched).toBe(true);
    });

    it('evaluates userAttribute "contains" condition', () => {
      const rule = svc.createRule({
        name: 'AttrContains',
        conditions: [
          {
            type: 'userAttribute',
            operator: 'contains',
            value: { field: 'department', value: 'Eng' },
          },
        ],
        actions: [{ id: 'allow' }],
      });
      expect(svc.evaluateRule(rule.id, { attributes: { department: 'Engineering' } }).matched).toBe(
        true
      );
    });

    it('evaluates dataClassification condition', () => {
      const rule = svc.createRule({
        name: 'DataClass',
        conditions: [{ type: 'dataClassification', operator: 'equals', value: 'sensitive' }],
        actions: [{ id: 'require_mfa' }],
      });
      expect(svc.evaluateRule(rule.id, { dataClassification: 'sensitive' }).matched).toBe(true);
    });

    it('evaluates deviceType condition', () => {
      const rule = svc.createRule({
        name: 'Device',
        conditions: [{ type: 'deviceType', operator: 'in', value: ['desktop', 'laptop'] }],
        actions: [{ id: 'allow' }],
      });
      expect(svc.evaluateRule(rule.id, { deviceType: 'desktop' }).matched).toBe(true);
      expect(svc.evaluateRule(rule.id, { deviceType: 'mobile' }).matched).toBe(false);
    });

    it('returns not matched for missing context field', () => {
      const rule = svc.createRule({
        name: 'Missing',
        conditions: [{ type: 'role', operator: 'equals', value: 'admin' }],
        actions: [{ id: 'allow' }],
      });
      expect(svc.evaluateRule(rule.id, {}).matched).toBe(false);
    });
  });

  /* ════════════════════ getAllRules ════════════════════ */

  describe('getAllRules', () => {
    it('returns all rules', () => {
      svc.createRule({
        name: 'R1',
        description: 'Rule one',
        conditions: [{ type: 'role', operator: 'equals', value: 'a' }],
        actions: [{ id: 'allow' }],
        priority: 100,
      });
      svc.createRule({
        name: 'R2',
        description: 'Rule two',
        conditions: [{ type: 'role', operator: 'equals', value: 'b' }],
        actions: [{ id: 'deny' }],
        priority: 200,
      });
      const rules = svc.getAllRules();
      expect(rules.length).toBe(2);
      // Sorted by priority desc
      expect(rules[0].priority).toBeGreaterThanOrEqual(rules[1].priority);
    });

    it('filters by enabled state', () => {
      const r = svc.createRule({
        name: 'Disabled',
        description: 'A disabled rule',
        conditions: [{ type: 'role', operator: 'equals', value: 'a' }],
        actions: [{ id: 'allow' }],
      });
      svc.setRuleEnabled(r.id, false);
      svc.createRule({
        name: 'Enabled',
        description: 'An enabled rule',
        conditions: [{ type: 'role', operator: 'equals', value: 'b' }],
        actions: [{ id: 'allow' }],
      });
      expect(svc.getAllRules({ enabled: true }).length).toBe(1);
      expect(svc.getAllRules({ enabled: false }).length).toBe(1);
    });

    it('filters by search term', () => {
      svc.createRule({
        name: 'Admin Rule',
        description: 'Controls admin access',
        conditions: [{ type: 'role', operator: 'equals', value: 'a' }],
        actions: [{ id: 'allow' }],
      });
      svc.createRule({
        name: 'Guest Rule',
        description: 'Controls guest access',
        conditions: [{ type: 'role', operator: 'equals', value: 'b' }],
        actions: [{ id: 'deny' }],
      });
      expect(svc.getAllRules({ search: 'admin' }).length).toBe(1);
    });
  });

  /* ════════════════════ getStatistics ════════════════════ */

  describe('getStatistics', () => {
    it('returns statistics', () => {
      svc.createRule({
        name: 'S1',
        conditions: [{ type: 'role', operator: 'equals', value: 'a' }],
        actions: [{ id: 'allow' }],
      });
      const stats = svc.getStatistics();
      expect(stats.totalRules).toBe(1);
      expect(stats.enabledRules).toBe(1);
      expect(stats.disabledRules).toBe(0);
      expect(stats.templates).toBe(4);
      expect(stats.conditions).toBe(9);
      expect(stats.actions).toBe(8);
    });

    it('calculates average executions', () => {
      const r = svc.createRule({
        name: 'E1',
        conditions: [{ type: 'role', operator: 'equals', value: 'a' }],
        actions: [{ id: 'allow' }],
      });
      svc.evaluateRule(r.id, { role: 'a' });
      svc.evaluateRule(r.id, { role: 'a' });
      const stats = svc.getStatistics();
      expect(stats.totalExecutions).toBe(2);
      expect(parseFloat(stats.averageExecutionsPerRule)).toBe(2);
    });
  });
});
