/**
 * Unit tests for PolicyEngine Service
 * @module tests/unit/policy-engine.service.test
 */

'use strict';

jest.mock('uuid', () => ({ v4: jest.fn(() => 'test-uuid-1234') }));
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

const { EventEmitter } = require('events');
const service = require('../../services/policyEngine.service');
const logger = require('../../utils/logger');
const { v4: uuidv4 } = require('uuid');

/* ── Helpers ────────────────────────────────────────────────────────── */

const validPolicyData = (overrides = {}) => ({
  name: 'Test Policy',
  description: 'A test policy',
  effect: 'Allow',
  rules: [
    {
      conditions: [{ type: 'role', value: 'tester' }],
      actions: ['read'],
      resources: ['test_resource'],
    },
  ],
  priority: 100,
  ...overrides,
});

const adminCtx = (overrides = {}) => ({
  userId: 'admin-1',
  action: 'delete',
  resource: 'beneficiaries',
  userContext: {
    roles: ['admin'],
    department: 'IT',
    location: 'HQ',
    device: 'desktop',
    ipAddress: '10.0.0.1',
  },
  ...overrides,
});

const userCtx = (overrides = {}) => ({
  userId: 'user-1',
  action: 'read',
  resource: 'own_resources',
  userContext: {
    roles: ['user'],
    department: 'Rehab',
    location: 'Branch-A',
    device: 'tablet',
    ipAddress: '192.168.1.50',
  },
  ...overrides,
});

/* ── Suite ──────────────────────────────────────────────────────────── */

describe('PolicyEngine Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    uuidv4.mockReturnValue('test-uuid-1234');

    // Remove all non-system policies
    Array.from(service.policies.values())
      .filter(p => !p.isSystem)
      .forEach(p => {
        service.policies.delete(p.id);
      });

    // Ensure every policy (including system ones) has metadata
    service.policies.forEach(policy => {
      if (!policy.metadata) {
        policy.metadata = {
          createdAt: new Date(),
          updatedAt: new Date(),
          evaluations: 0,
          lastEvaluated: null,
        };
      } else {
        policy.metadata.evaluations = 0;
        policy.metadata.lastEvaluated = null;
      }
    });

    // Clear evaluation cache
    service.evaluationCache.clear();
  });

  /* ================================================================
   * 1. Module Exports
   * ================================================================ */
  describe('Module Exports', () => {
    it('should export a singleton instance', () => {
      const same = require('../../services/policyEngine.service');
      expect(service).toBe(same);
    });

    it('should be an instance of EventEmitter', () => {
      expect(service).toBeInstanceOf(EventEmitter);
    });

    it('should expose all public methods', () => {
      const expected = [
        'createPolicy',
        'updatePolicy',
        'deletePolicy',
        'getPolicy',
        'getAllPolicies',
        'getPoliciesByEffect',
        'duplicatePolicy',
        'evaluatePolicies',
        'getStatistics',
      ];
      expected.forEach(m => expect(typeof service[m]).toBe('function'));
    });
  });

  /* ================================================================
   * 2. Default Policies
   * ================================================================ */
  describe('Default Policies (_initializeDefaultPolicies)', () => {
    it('should initialise exactly 3 system policies', () => {
      const sys = service.getAllPolicies().filter(p => p.isSystem);
      expect(sys).toHaveLength(3);
    });

    it('should have policy-admin-full-access with priority 1000', () => {
      const p = service.getPolicy('policy-admin-full-access');
      expect(p.name).toBe('Admin Full Access');
      expect(p.priority).toBe(1000);
      expect(p.effect).toBe('Allow');
    });

    it('should have policy-user-basic-access with priority 500', () => {
      const p = service.getPolicy('policy-user-basic-access');
      expect(p.name).toBe('User Basic Access');
      expect(p.priority).toBe(500);
      expect(p.effect).toBe('Allow');
    });

    it('should have policy-deny-after-hours with priority 800', () => {
      const p = service.getPolicy('policy-deny-after-hours');
      expect(p.name).toBe('Deny After Hours Access');
      expect(p.priority).toBe(800);
      expect(p.effect).toBe('Deny');
    });

    it('should mark all system policies isSystem:true', () => {
      service
        .getAllPolicies()
        .filter(p => p.isSystem)
        .forEach(p => expect(p.isSystem).toBe(true));
    });

    it('should mark all system policies isActive:true', () => {
      service
        .getAllPolicies()
        .filter(p => p.isSystem)
        .forEach(p => expect(p.isActive).toBe(true));
    });
  });

  /* ================================================================
   * 3. createPolicy
   * ================================================================ */
  describe('createPolicy', () => {
    it('should create a policy with valid data and return it', () => {
      const p = service.createPolicy(validPolicyData());
      expect(p).toBeDefined();
      expect(p.name).toBe('Test Policy');
      expect(p.effect).toBe('Allow');
    });

    it('should generate id as "policy-<uuid>"', () => {
      const p = service.createPolicy(validPolicyData());
      expect(p.id).toBe('policy-test-uuid-1234');
    });

    it('should set isSystem:false on custom policies', () => {
      const p = service.createPolicy(validPolicyData());
      expect(p.isSystem).toBe(false);
    });

    it('should populate metadata with timestamps and zero evaluations', () => {
      const p = service.createPolicy(validPolicyData());
      expect(p.metadata.createdAt).toBeInstanceOf(Date);
      expect(p.metadata.updatedAt).toBeInstanceOf(Date);
      expect(p.metadata.evaluations).toBe(0);
      expect(p.metadata.lastEvaluated).toBeNull();
    });

    it('should clamp priority below 1 to 1', () => {
      const p = service.createPolicy(validPolicyData({ priority: -10 }));
      expect(p.priority).toBe(1);
    });

    it('should clamp priority above 1000 to 1000', () => {
      uuidv4.mockReturnValueOnce('high-pri');
      const p = service.createPolicy(validPolicyData({ priority: 9999, name: 'High' }));
      expect(p.priority).toBe(1000);
    });

    it('should use default priority 500 when omitted', () => {
      const data = { ...validPolicyData() };
      delete data.priority;
      const p = service.createPolicy(data);
      expect(p.priority).toBe(500);
    });

    it('should throw when name is missing', () => {
      expect(() => service.createPolicy(validPolicyData({ name: '' }))).toThrow(
        'Policy name is required'
      );
    });

    it('should throw when name is undefined', () => {
      expect(() => service.createPolicy(validPolicyData({ name: undefined }))).toThrow(
        'Policy name is required'
      );
    });

    it('should throw when effect is missing', () => {
      expect(() => service.createPolicy(validPolicyData({ effect: '' }))).toThrow(/Invalid effect/);
    });

    it('should throw when effect is invalid', () => {
      expect(() => service.createPolicy(validPolicyData({ effect: 'Maybe' }))).toThrow(
        /Invalid effect/
      );
    });

    it('should throw when rules is empty array', () => {
      expect(() => service.createPolicy(validPolicyData({ rules: [] }))).toThrow(
        'At least one rule is required'
      );
    });

    it('should throw when rules is not an array', () => {
      expect(() => service.createPolicy(validPolicyData({ rules: 'bad' }))).toThrow(
        'At least one rule is required'
      );
    });

    it('should throw when a rule has an invalid condition type', () => {
      expect(() =>
        service.createPolicy(
          validPolicyData({
            rules: [
              {
                conditions: [{ type: 'weather', value: 'sunny' }],
                actions: ['read'],
                resources: ['r'],
              },
            ],
          })
        )
      ).toThrow(/Invalid condition type/);
    });

    it('should emit policy:created event', () => {
      const handler = jest.fn();
      service.on('policy:created', handler);
      service.createPolicy(validPolicyData());
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ policyId: 'policy-test-uuid-1234' })
      );
      service.removeListener('policy:created', handler);
    });

    it('should log info on successful creation', () => {
      service.createPolicy(validPolicyData());
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Policy created'));
    });
  });

  /* ================================================================
   * 4. updatePolicy
   * ================================================================ */
  describe('updatePolicy', () => {
    let created;

    beforeEach(() => {
      uuidv4.mockReturnValueOnce('upd-test');
      created = service.createPolicy(validPolicyData({ name: 'Updatable' }));
      jest.clearAllMocks();
    });

    it('should update allowed fields (name, isActive)', () => {
      const u = service.updatePolicy(created.id, { name: 'New Name', isActive: false });
      expect(u.name).toBe('New Name');
      expect(u.isActive).toBe(false);
    });

    it('should update metadata.updatedAt', () => {
      const before = new Date(created.metadata.updatedAt);
      const u = service.updatePolicy(created.id, { description: 'changed' });
      expect(u.metadata.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });

    it('should throw when policy not found', () => {
      expect(() => service.updatePolicy('nope', {})).toThrow(/Policy not found/);
    });

    it('should throw when policy is system', () => {
      expect(() => service.updatePolicy('policy-admin-full-access', { name: 'x' })).toThrow(
        'Cannot modify system policies'
      );
    });

    it('should re-validate rules on update', () => {
      expect(() =>
        service.updatePolicy(created.id, {
          rules: [{ conditions: 'bad', actions: ['r'], resources: ['r'] }],
        })
      ).toThrow('Rule must have conditions array');
    });

    it('should validate condition types in updated rules', () => {
      expect(() =>
        service.updatePolicy(created.id, {
          rules: [{ conditions: [{ type: 'invalid_type' }], actions: ['r'], resources: ['r'] }],
        })
      ).toThrow(/Invalid condition type/);
    });

    it('should clamp priority on update', () => {
      const u = service.updatePolicy(created.id, { priority: 5000 });
      expect(u.priority).toBe(1000);
    });

    it('should clear cache on update', () => {
      service.evaluationCache.set('some', { result: {}, timestamp: Date.now() });
      service.updatePolicy(created.id, { name: 'cc' });
      expect(service.evaluationCache.size).toBe(0);
    });

    it('should emit policy:updated event', () => {
      const handler = jest.fn();
      service.on('policy:updated', handler);
      service.updatePolicy(created.id, { name: 'Evented' });
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({ policyId: created.id }));
      service.removeListener('policy:updated', handler);
    });
  });

  /* ================================================================
   * 5. deletePolicy
   * ================================================================ */
  describe('deletePolicy', () => {
    let toDelete;

    beforeEach(() => {
      uuidv4.mockReturnValueOnce('del-test');
      toDelete = service.createPolicy(validPolicyData({ name: 'Deletable' }));
      jest.clearAllMocks();
    });

    it('should delete an existing custom policy', () => {
      service.deletePolicy(toDelete.id);
      expect(() => service.getPolicy(toDelete.id)).toThrow(/Policy not found/);
    });

    it('should return undefined (void)', () => {
      expect(service.deletePolicy(toDelete.id)).toBeUndefined();
    });

    it('should throw when policy not found', () => {
      expect(() => service.deletePolicy('nonexistent')).toThrow(/Policy not found/);
    });

    it('should throw when policy is system', () => {
      expect(() => service.deletePolicy('policy-admin-full-access')).toThrow(
        'Cannot delete system policies'
      );
    });

    it('should clear cache on delete', () => {
      service.evaluationCache.set('k', { result: {}, timestamp: Date.now() });
      service.deletePolicy(toDelete.id);
      expect(service.evaluationCache.size).toBe(0);
    });

    it('should emit policy:deleted event', () => {
      const handler = jest.fn();
      service.on('policy:deleted', handler);
      service.deletePolicy(toDelete.id);
      expect(handler).toHaveBeenCalledWith({ policyId: toDelete.id });
      service.removeListener('policy:deleted', handler);
    });
  });

  /* ================================================================
   * 6. getPolicy
   * ================================================================ */
  describe('getPolicy', () => {
    it('should return existing system policy', () => {
      const p = service.getPolicy('policy-admin-full-access');
      expect(p.id).toBe('policy-admin-full-access');
    });

    it('should return custom policy after creation', () => {
      uuidv4.mockReturnValueOnce('get-cust');
      const c = service.createPolicy(validPolicyData());
      expect(service.getPolicy(c.id)).toBe(c);
    });

    it('should throw when policy not found', () => {
      expect(() => service.getPolicy('nope')).toThrow(/Policy not found/);
    });

    it('should log error when policy not found', () => {
      try {
        service.getPolicy('nope');
      } catch (_) {
        /* expected */
      }
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Error getting policy'));
    });
  });

  /* ================================================================
   * 7. getAllPolicies
   * ================================================================ */
  describe('getAllPolicies', () => {
    it('should return all policies sorted by priority DESC', () => {
      const policies = service.getAllPolicies();
      expect(policies.length).toBeGreaterThanOrEqual(3);
      for (let i = 1; i < policies.length; i++) {
        expect(policies[i - 1].priority).toBeGreaterThanOrEqual(policies[i].priority);
      }
    });

    it('should filter by active:true', () => {
      uuidv4.mockReturnValueOnce('inact-f');
      service.createPolicy(validPolicyData({ name: 'Inact', isActive: false }));
      service.getAllPolicies({ active: true }).forEach(p => expect(p.isActive).toBe(true));
    });

    it('should filter by active:false', () => {
      uuidv4.mockReturnValueOnce('inact-g');
      service.createPolicy(validPolicyData({ name: 'Inact2', isActive: false }));
      const inactive = service.getAllPolicies({ active: false });
      expect(inactive.length).toBeGreaterThanOrEqual(1);
      inactive.forEach(p => expect(p.isActive).toBe(false));
    });

    it('should filter by effect:Allow', () => {
      service.getAllPolicies({ effect: 'Allow' }).forEach(p => expect(p.effect).toBe('Allow'));
    });

    it('should filter by effect:Deny', () => {
      const denies = service.getAllPolicies({ effect: 'Deny' });
      expect(denies.length).toBeGreaterThanOrEqual(1);
      denies.forEach(p => expect(p.effect).toBe('Deny'));
    });

    it('should filter by search term in name (case-insensitive)', () => {
      uuidv4.mockReturnValueOnce('srch-n');
      service.createPolicy(validPolicyData({ name: 'ZxUniqueSearchName' }));
      const found = service.getAllPolicies({ search: 'zxunique' });
      expect(found).toHaveLength(1);
      expect(found[0].name).toBe('ZxUniqueSearchName');
    });

    it('should filter by search term in description', () => {
      uuidv4.mockReturnValueOnce('srch-d');
      service.createPolicy(validPolicyData({ name: 'DescP', description: 'wqSpecialDesc' }));
      const found = service.getAllPolicies({ search: 'wqspecial' });
      expect(found).toHaveLength(1);
    });

    it('should combine multiple filters', () => {
      uuidv4.mockReturnValueOnce('combo-a');
      service.createPolicy(validPolicyData({ name: 'ComboA', effect: 'Allow', isActive: true }));
      uuidv4.mockReturnValueOnce('combo-b');
      service.createPolicy(validPolicyData({ name: 'ComboB', effect: 'Deny', isActive: false }));
      const result = service.getAllPolicies({ active: true, effect: 'Allow', search: 'combo' });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('ComboA');
    });
  });

  /* ================================================================
   * 8. getPoliciesByEffect
   * ================================================================ */
  describe('getPoliciesByEffect', () => {
    it('should return all Allow policies', () => {
      const allows = service.getPoliciesByEffect('Allow');
      expect(allows.length).toBeGreaterThanOrEqual(2);
      allows.forEach(p => expect(p.effect).toBe('Allow'));
    });

    it('should return all Deny policies', () => {
      const denies = service.getPoliciesByEffect('Deny');
      expect(denies.length).toBeGreaterThanOrEqual(1);
      denies.forEach(p => expect(p.effect).toBe('Deny'));
    });

    it('should sort by priority DESC', () => {
      const allows = service.getPoliciesByEffect('Allow');
      for (let i = 1; i < allows.length; i++) {
        expect(allows[i - 1].priority).toBeGreaterThanOrEqual(allows[i].priority);
      }
    });

    it('should return empty array for unknown effect', () => {
      expect(service.getPoliciesByEffect('Unknown')).toEqual([]);
    });
  });

  /* ================================================================
   * 9. duplicatePolicy
   * ================================================================ */
  describe('duplicatePolicy', () => {
    it('should duplicate with a new name', () => {
      uuidv4.mockReturnValueOnce('dup-1');
      const d = service.duplicatePolicy('policy-admin-full-access', { name: 'AdminCopy' });
      expect(d.name).toBe('AdminCopy');
      expect(d.id).toBe('policy-dup-1');
    });

    it('should auto-generate "(Copy)" name when none given', () => {
      uuidv4.mockReturnValueOnce('dup-2');
      const d = service.duplicatePolicy('policy-admin-full-access');
      expect(d.name).toBe('Admin Full Access (Copy)');
    });

    it('should throw when original not found', () => {
      expect(() => service.duplicatePolicy('nonexistent')).toThrow(/Policy not found/);
    });

    it('should set isActive:false on the copy', () => {
      uuidv4.mockReturnValueOnce('dup-3');
      expect(service.duplicatePolicy('policy-admin-full-access').isActive).toBe(false);
    });

    it('should set isSystem:false on the copy', () => {
      uuidv4.mockReturnValueOnce('dup-4');
      expect(service.duplicatePolicy('policy-admin-full-access').isSystem).toBe(false);
    });

    it('should deep-copy rules (not same reference)', () => {
      uuidv4.mockReturnValueOnce('dup-5');
      const d = service.duplicatePolicy('policy-admin-full-access');
      const orig = service.getPolicy('policy-admin-full-access');
      expect(d.rules).toEqual(orig.rules);
      expect(d.rules).not.toBe(orig.rules);
    });

    it('should emit policy:duplicated event', () => {
      const handler = jest.fn();
      service.on('policy:duplicated', handler);
      uuidv4.mockReturnValueOnce('dup-evt');
      service.duplicatePolicy('policy-admin-full-access');
      expect(handler).toHaveBeenCalledWith({
        original: 'policy-admin-full-access',
        duplicated: 'policy-dup-evt',
      });
      service.removeListener('policy:duplicated', handler);
    });
  });

  /* ================================================================
   * 10. getStatistics
   * ================================================================ */
  describe('getStatistics', () => {
    it('should return correct initial statistics for 3 system policies', () => {
      const s = service.getStatistics();
      expect(s.total).toBe(3);
      expect(s.active).toBe(3);
      expect(s.inactive).toBe(0);
      expect(s.systemPolicies).toBe(3);
      expect(s.customPolicies).toBe(0);
    });

    it('should count Allow & Deny correctly', () => {
      const s = service.getStatistics();
      expect(s.allowPolicies).toBe(2);
      expect(s.denyPolicies).toBe(1);
    });

    it('should update after creating custom policies', () => {
      uuidv4.mockReturnValueOnce('st-1');
      service.createPolicy(validPolicyData({ name: 'S1' }));
      uuidv4.mockReturnValueOnce('st-2');
      service.createPolicy(validPolicyData({ name: 'S2', effect: 'Deny' }));
      const s = service.getStatistics();
      expect(s.total).toBe(5);
      expect(s.customPolicies).toBe(2);
    });

    it('should track totalEvaluations', () => {
      service.evaluatePolicies(adminCtx());
      service.evaluationCache.clear();
      service.evaluatePolicies(adminCtx({ userId: 'a2' }));
      const s = service.getStatistics();
      expect(s.totalEvaluations).toBeGreaterThanOrEqual(0);
    });

    it('should return mostEvaluated as an array', () => {
      expect(Array.isArray(service.getStatistics().mostEvaluated)).toBe(true);
    });
  });

  /* ================================================================
   * 11. evaluatePolicies
   * ================================================================ */
  describe('evaluatePolicies', () => {
    it('should allow admin full access to any resource/action', () => {
      const r = service.evaluatePolicies(adminCtx());
      expect(r.decision).toBe('Allow');
      expect(r.reason).toContain('Admin Full Access');
    });

    it('should allow user read on own_resources', () => {
      const r = service.evaluatePolicies(userCtx());
      expect(r.decision).toBe('Allow');
      expect(r.reason).toContain('User Basic Access');
    });

    it('should deny user for non-allowed action on unmatched resource', () => {
      const r = service.evaluatePolicies(userCtx({ action: 'delete', resource: 'someOther' }));
      expect(r.decision).toBe('Deny');
    });

    it('should default-deny when no policy matches', () => {
      const r = service.evaluatePolicies({
        userId: 'visitor',
        action: 'fly',
        resource: 'sky',
        userContext: { roles: ['guest'] },
      });
      expect(r.decision).toBe('Deny');
      expect(r.reason).toBe('No matching allow policy found');
    });

    it('should deny after-hours for sensitive operations', () => {
      const hSpy = jest.spyOn(Date.prototype, 'getHours').mockReturnValue(20);
      const mSpy = jest.spyOn(Date.prototype, 'getMinutes').mockReturnValue(0);

      const r = service.evaluatePolicies({
        userId: 'user-ah',
        action: 'delete',
        resource: 'sensitive_data',
        userContext: { roles: ['user'], department: 'IT' },
      });
      expect(r.decision).toBe('Deny');
      expect(r.reason).toContain('Deny After Hours');

      hSpy.mockRestore();
      mSpy.mockRestore();
    });

    it('should NOT deny outside after-hours range for sensitive operations', () => {
      const hSpy = jest.spyOn(Date.prototype, 'getHours').mockReturnValue(10);
      const mSpy = jest.spyOn(Date.prototype, 'getMinutes').mockReturnValue(0);

      const r = service.evaluatePolicies({
        userId: 'user-bh',
        action: 'delete',
        resource: 'sensitive_data',
        userContext: { roles: ['user'], department: 'IT' },
      });
      // deny-after-hours won't match because time is not in range
      // user-basic-access won't match because resource is 'sensitive_data' not 'own_resources'
      expect(r.decision).toBe('Deny');
      expect(r.reason).toBe('No matching allow policy found');

      hSpy.mockRestore();
      mSpy.mockRestore();
    });

    it('should use cache on second evaluation with same context', () => {
      const ctx = adminCtx();
      service.evaluatePolicies(ctx);
      jest.clearAllMocks();
      const r2 = service.evaluatePolicies(ctx);
      expect(r2.decision).toBe('Allow');
      expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('cache'));
    });

    it('should include context info in result', () => {
      const r = service.evaluatePolicies(adminCtx());
      expect(r.context).toEqual({ userId: 'admin-1', action: 'delete', resource: 'beneficiaries' });
      expect(r.timestamp).toBeInstanceOf(Date);
    });

    it('should include evaluatedPolicies in result', () => {
      const r = service.evaluatePolicies(adminCtx());
      expect(Array.isArray(r.evaluatedPolicies)).toBe(true);
      expect(r.evaluatedPolicies.length).toBeGreaterThanOrEqual(1);
      expect(r.evaluatedPolicies[0]).toHaveProperty('policyId');
      expect(r.evaluatedPolicies[0]).toHaveProperty('effect');
    });

    it('should emit policy:evaluated event (not from cache)', () => {
      const handler = jest.fn();
      service.on('policy:evaluated', handler);
      service.evaluatePolicies(adminCtx({ userId: 'evt-eval' }));
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({ decision: 'Allow' }));
      service.removeListener('policy:evaluated', handler);
    });

    it('should handle internal errors gracefully → deny', () => {
      const orig = service.policies;
      service.policies = {
        values: () => {
          throw new Error('Boom');
        },
      };

      const r = service.evaluatePolicies(adminCtx({ userId: 'err-eval' }));
      expect(r.decision).toBe('Deny');
      expect(r.reason).toBe('حدث خطأ داخلي');

      service.policies = orig;
    });

    it('should evaluate in priority order (highest first keeps deny)', () => {
      uuidv4.mockReturnValueOnce('hi-deny');
      service.createPolicy({
        name: 'HighDeny',
        effect: 'Deny',
        rules: [
          { conditions: [{ type: 'role', value: 'tester' }], actions: ['*'], resources: ['*'] },
        ],
        priority: 900,
      });
      uuidv4.mockReturnValueOnce('lo-allow');
      service.createPolicy({
        name: 'LowAllow',
        effect: 'Allow',
        rules: [
          { conditions: [{ type: 'role', value: 'tester' }], actions: ['*'], resources: ['*'] },
        ],
        priority: 100,
      });

      const r = service.evaluatePolicies({
        userId: 'tester-1',
        action: 'read',
        resource: 'data',
        userContext: { roles: ['tester'] },
      });
      expect(r.decision).toBe('Deny');
      expect(r.reason).toContain('HighDeny');
    });

    it('should skip inactive policies', () => {
      uuidv4.mockReturnValueOnce('inact-ev');
      service.createPolicy(validPolicyData({ name: 'InactiveEval', isActive: false }));

      const r = service.evaluatePolicies({
        userId: 'u1',
        action: 'read',
        resource: 'test_resource',
        userContext: { roles: ['tester'] },
      });
      const ids = r.evaluatedPolicies.map(p => p.policyId);
      expect(ids).not.toContain('policy-inact-ev');
    });

    it('should allow admin to access various resources/actions', () => {
      ['read', 'write', 'delete', 'modify_permissions'].forEach((action, i) => {
        service.evaluationCache.clear();
        const r = service.evaluatePolicies({
          userId: `adm-${i}`,
          action,
          resource: ['beneficiaries', 'reports', 'settings', 'sensitive_data'][i],
          userContext: { roles: ['admin'] },
        });
        expect(r.decision).toBe('Allow');
      });
    });

    it('should not modify the context object passed in', () => {
      const ctx = adminCtx();
      const snap = JSON.parse(JSON.stringify(ctx));
      service.evaluatePolicies(ctx);
      expect(ctx.userId).toBe(snap.userId);
      expect(ctx.action).toBe(snap.action);
    });
  });

  /* ================================================================
   * 12. Condition Evaluators
   * ================================================================ */
  describe('Condition Evaluators', () => {
    /* ── Time ── */
    describe('_evaluateTimeCondition', () => {
      afterEach(() => jest.restoreAllMocks());

      it('should match when current time is within a normal range', () => {
        jest.spyOn(Date.prototype, 'getHours').mockReturnValue(10);
        jest.spyOn(Date.prototype, 'getMinutes').mockReturnValue(30);
        expect(
          service._evaluateTimeCondition({ value: { start: '09:00', end: '17:00' } }, {})
        ).toBe(true);
      });

      it('should NOT match when current time is outside a normal range', () => {
        jest.spyOn(Date.prototype, 'getHours').mockReturnValue(20);
        jest.spyOn(Date.prototype, 'getMinutes').mockReturnValue(0);
        expect(
          service._evaluateTimeCondition({ value: { start: '09:00', end: '17:00' } }, {})
        ).toBe(false);
      });

      it('should handle midnight wrap — late night within range', () => {
        jest.spyOn(Date.prototype, 'getHours').mockReturnValue(23);
        jest.spyOn(Date.prototype, 'getMinutes').mockReturnValue(30);
        expect(
          service._evaluateTimeCondition({ value: { start: '22:00', end: '06:00' } }, {})
        ).toBe(true);
      });

      it('should handle midnight wrap — early morning within range', () => {
        jest.spyOn(Date.prototype, 'getHours').mockReturnValue(3);
        jest.spyOn(Date.prototype, 'getMinutes').mockReturnValue(0);
        expect(
          service._evaluateTimeCondition({ value: { start: '22:00', end: '06:00' } }, {})
        ).toBe(true);
      });

      it('should NOT match midday for midnight-wrap range', () => {
        jest.spyOn(Date.prototype, 'getHours').mockReturnValue(12);
        jest.spyOn(Date.prototype, 'getMinutes').mockReturnValue(0);
        expect(
          service._evaluateTimeCondition({ value: { start: '22:00', end: '06:00' } }, {})
        ).toBe(false);
      });

      it('should return true when no start/end specified', () => {
        expect(service._evaluateTimeCondition({ value: {} }, {})).toBe(true);
      });
    });

    /* ── Location ── */
    describe('_evaluateLocationCondition', () => {
      it('should match exact string', () => {
        expect(
          service._evaluateLocationCondition({ value: 'HQ' }, { userContext: { location: 'HQ' } })
        ).toBe(true);
      });

      it('should NOT match different string', () => {
        expect(
          service._evaluateLocationCondition(
            { value: 'HQ' },
            { userContext: { location: 'Branch' } }
          )
        ).toBe(false);
      });

      it('should match location in array', () => {
        expect(
          service._evaluateLocationCondition(
            { value: ['HQ', 'Branch-A'] },
            { userContext: { location: 'Branch-A' } }
          )
        ).toBe(true);
      });

      it('should return false when userContext.location is missing', () => {
        expect(service._evaluateLocationCondition({ value: 'HQ' }, { userContext: {} })).toBe(
          false
        );
      });
    });

    /* ── Device ── */
    describe('_evaluateDeviceCondition', () => {
      it('should match exact device', () => {
        expect(
          service._evaluateDeviceCondition(
            { value: 'desktop' },
            { userContext: { device: 'desktop' } }
          )
        ).toBe(true);
      });

      it('should match device in array', () => {
        expect(
          service._evaluateDeviceCondition(
            { value: ['desktop', 'laptop'] },
            { userContext: { device: 'laptop' } }
          )
        ).toBe(true);
      });

      it('should return false when device is missing', () => {
        expect(service._evaluateDeviceCondition({ value: 'desktop' }, { userContext: {} })).toBe(
          false
        );
      });

      it('should NOT match wrong device', () => {
        expect(
          service._evaluateDeviceCondition(
            { value: 'desktop' },
            { userContext: { device: 'mobile' } }
          )
        ).toBe(false);
      });
    });

    /* ── IP Address ── */
    describe('_evaluateIpAddressCondition', () => {
      it('should match exact IP', () => {
        expect(
          service._evaluateIpAddressCondition(
            { value: '10.0.0.1' },
            { userContext: { ipAddress: '10.0.0.1' } }
          )
        ).toBe(true);
      });

      it('should match wildcard IP 192.168.*.*', () => {
        expect(
          service._evaluateIpAddressCondition(
            { value: '192.168.*.*' },
            { userContext: { ipAddress: '192.168.1.100' } }
          )
        ).toBe(true);
      });

      it('should NOT match different IP', () => {
        expect(
          service._evaluateIpAddressCondition(
            { value: '10.0.0.1' },
            { userContext: { ipAddress: '10.0.0.2' } }
          )
        ).toBe(false);
      });

      it('should match IP in value array', () => {
        expect(
          service._evaluateIpAddressCondition(
            { value: ['10.0.0.1', '10.0.0.2'] },
            { userContext: { ipAddress: '10.0.0.2' } }
          )
        ).toBe(true);
      });

      it('should return false when ipAddress is missing', () => {
        expect(
          service._evaluateIpAddressCondition({ value: '10.0.0.1' }, { userContext: {} })
        ).toBe(false);
      });
    });

    /* ── Role ── */
    describe('_evaluateRoleCondition', () => {
      it('should match single value when role exists', () => {
        expect(
          service._evaluateRoleCondition(
            { value: 'admin' },
            { userContext: { roles: ['admin', 'user'] } }
          )
        ).toBe(true);
      });

      it('should match from value array', () => {
        expect(
          service._evaluateRoleCondition(
            { value: ['admin', 'manager'] },
            { userContext: { roles: ['manager'] } }
          )
        ).toBe(true);
      });

      it('should NOT match when role absent', () => {
        expect(
          service._evaluateRoleCondition({ value: 'admin' }, { userContext: { roles: ['user'] } })
        ).toBe(false);
      });

      it('should handle empty roles array', () => {
        expect(
          service._evaluateRoleCondition({ value: 'admin' }, { userContext: { roles: [] } })
        ).toBe(false);
      });

      it('should handle missing roles key', () => {
        expect(service._evaluateRoleCondition({ value: 'admin' }, { userContext: {} })).toBe(false);
      });
    });

    /* ── Department ── */
    describe('_evaluateDepartmentCondition', () => {
      it('should match exact department', () => {
        expect(
          service._evaluateDepartmentCondition(
            { value: 'IT' },
            { userContext: { department: 'IT' } }
          )
        ).toBe(true);
      });

      it('should match department in array', () => {
        expect(
          service._evaluateDepartmentCondition(
            { value: ['IT', 'HR'] },
            { userContext: { department: 'HR' } }
          )
        ).toBe(true);
      });

      it('should NOT match different department', () => {
        expect(
          service._evaluateDepartmentCondition(
            { value: 'IT' },
            { userContext: { department: 'Sales' } }
          )
        ).toBe(false);
      });

      it('should return false when department is missing', () => {
        expect(service._evaluateDepartmentCondition({ value: 'IT' }, { userContext: {} })).toBe(
          false
        );
      });
    });

    /* ── Resource ── */
    describe('_evaluateResourceCondition', () => {
      it('should match wildcard *', () => {
        expect(service._evaluateResourceCondition({ value: '*' }, { resource: 'anything' })).toBe(
          true
        );
      });

      it('should match exact resource', () => {
        expect(
          service._evaluateResourceCondition(
            { value: 'beneficiaries' },
            { resource: 'beneficiaries' }
          )
        ).toBe(true);
      });

      it('should match resource prefix (resource:sub)', () => {
        expect(
          service._evaluateResourceCondition(
            { value: 'beneficiaries' },
            { resource: 'beneficiaries:123' }
          )
        ).toBe(true);
      });

      it('should NOT match different resource', () => {
        expect(
          service._evaluateResourceCondition({ value: 'reports' }, { resource: 'beneficiaries' })
        ).toBe(false);
      });

      it('should match from value array', () => {
        expect(
          service._evaluateResourceCondition(
            { value: ['reports', 'beneficiaries'] },
            { resource: 'beneficiaries' }
          )
        ).toBe(true);
      });

      it('should match wildcard in value array', () => {
        expect(
          service._evaluateResourceCondition({ value: ['specific', '*'] }, { resource: 'anything' })
        ).toBe(true);
      });
    });

    /* ── Action ── */
    describe('_evaluateActionCondition', () => {
      it('should match wildcard *', () => {
        expect(service._evaluateActionCondition({ value: '*' }, { action: 'delete' })).toBe(true);
      });

      it('should match exact action', () => {
        expect(service._evaluateActionCondition({ value: 'read' }, { action: 'read' })).toBe(true);
      });

      it('should NOT match different action', () => {
        expect(service._evaluateActionCondition({ value: 'read' }, { action: 'delete' })).toBe(
          false
        );
      });

      it('should match from value array', () => {
        expect(
          service._evaluateActionCondition({ value: ['read', 'write'] }, { action: 'write' })
        ).toBe(true);
      });

      it('should match wildcard in value array', () => {
        expect(
          service._evaluateActionCondition({ value: ['read', '*'] }, { action: 'anything' })
        ).toBe(true);
      });
    });

    /* ── Custom ── */
    describe('_evaluateCustomCondition', () => {
      it('should evaluate simple numeric comparison (true)', () => {
        expect(service._evaluateCustomCondition({ expression: '5 > 3' }, {})).toBe(true);
      });

      it('should evaluate simple numeric comparison (false)', () => {
        expect(service._evaluateCustomCondition({ expression: '10 < 5' }, {})).toBe(false);
      });

      it('should evaluate string comparison', () => {
        expect(service._evaluateCustomCondition({ expression: "'hello' === 'hello'" }, {})).toBe(
          true
        );
      });

      it('should evaluate equality with ===', () => {
        expect(service._evaluateCustomCondition({ expression: '42 === 42' }, {})).toBe(true);
      });

      it('should evaluate inequality with !==', () => {
        expect(service._evaluateCustomCondition({ expression: '1 !== 2' }, {})).toBe(true);
      });

      it('should block dangerous: require', () => {
        expect(
          service._evaluateCustomCondition(
            { expression: "require('fs').readFileSync('/etc/passwd')" },
            {}
          )
        ).toBe(false);
        expect(logger.warn).toHaveBeenCalled();
      });

      it('should block dangerous: process', () => {
        expect(service._evaluateCustomCondition({ expression: 'process.exit(1)' }, {})).toBe(false);
      });

      it('should block dangerous: eval', () => {
        expect(service._evaluateCustomCondition({ expression: "eval('code')" }, {})).toBe(false);
      });

      it('should block dangerous: import', () => {
        expect(service._evaluateCustomCondition({ expression: "import('fs')" }, {})).toBe(false);
      });

      it('should block dangerous: constructor', () => {
        expect(service._evaluateCustomCondition({ expression: 'constructor.apply()' }, {})).toBe(
          false
        );
      });

      it('should return false for empty expression', () => {
        expect(service._evaluateCustomCondition({ expression: '' }, {})).toBe(false);
      });

      it('should return false for missing expression key', () => {
        expect(service._evaluateCustomCondition({}, {})).toBe(false);
      });

      it('should return false for too-complex expression', () => {
        expect(service._evaluateCustomCondition({ expression: 'a && b || c' }, {})).toBe(false);
      });
    });
  });

  /* ================================================================
   * 13. Cache Management
   * ================================================================ */
  describe('Cache Management', () => {
    describe('_generateCacheKey', () => {
      it('should build "userId:action:resource"', () => {
        expect(service._generateCacheKey({ userId: 'u1', action: 'read', resource: 'data' })).toBe(
          'u1:read:data'
        );
      });

      it('should handle undefined values', () => {
        const key = service._generateCacheKey({ userId: undefined, action: 'a', resource: 'r' });
        expect(key).toBe('undefined:a:r');
      });
    });

    describe('_getCachedEvaluation', () => {
      it('should return null for missing key', () => {
        expect(service._getCachedEvaluation('nope')).toBeNull();
      });

      it('should return cached result within TTL', () => {
        service._cacheEvaluation('ck', { decision: 'Allow' });
        expect(service._getCachedEvaluation('ck')).toEqual({ decision: 'Allow' });
      });

      it('should return null for expired entry (>5 min)', () => {
        service.evaluationCache.set('exp', {
          result: { decision: 'Allow' },
          timestamp: Date.now() - 6 * 60 * 1000,
        });
        expect(service._getCachedEvaluation('exp')).toBeNull();
      });

      it('should delete expired entry from the map', () => {
        service.evaluationCache.set('exp2', {
          result: {},
          timestamp: Date.now() - 10 * 60 * 1000,
        });
        service._getCachedEvaluation('exp2');
        expect(service.evaluationCache.has('exp2')).toBe(false);
      });
    });

    describe('_cacheEvaluation', () => {
      it('should store result with a timestamp', () => {
        service._cacheEvaluation('store', { decision: 'Allow' });
        const entry = service.evaluationCache.get('store');
        expect(entry.result).toEqual({ decision: 'Allow' });
        expect(typeof entry.timestamp).toBe('number');
      });

      it('should evict oldest entry when exceeding 10 000', () => {
        for (let i = 0; i <= 10000; i++) {
          service.evaluationCache.set(`k${i}`, { result: {}, timestamp: Date.now() });
        }
        service._cacheEvaluation('overflow', { decision: 'Deny' });
        expect(service.evaluationCache.size).toBeLessThanOrEqual(10001);
      });
    });

    describe('_clearCacheForPolicy', () => {
      it('should clear entire cache', () => {
        service._cacheEvaluation('a', {});
        service._cacheEvaluation('b', {});
        service._clearCacheForPolicy('any');
        expect(service.evaluationCache.size).toBe(0);
      });

      it('should be safe when cache is already empty', () => {
        expect(() => service._clearCacheForPolicy('any')).not.toThrow();
      });
    });
  });

  /* ================================================================
   * 14. Rule Validation (_validateRule)
   * ================================================================ */
  describe('_validateRule', () => {
    const baseRule = () => ({
      conditions: [{ type: 'role', value: 'admin' }],
      actions: ['read'],
      resources: ['data'],
    });

    it('should accept a valid rule and return it', () => {
      const r = service._validateRule(baseRule());
      expect(r.conditions).toEqual(baseRule().conditions);
      expect(r.actions).toEqual(['read']);
      expect(r.resources).toEqual(['data']);
    });

    it('should default effect to "Allow"', () => {
      expect(service._validateRule(baseRule()).effect).toBe('Allow');
    });

    it('should preserve custom effect', () => {
      expect(service._validateRule({ ...baseRule(), effect: 'Deny' }).effect).toBe('Deny');
    });

    it('should throw when conditions is missing', () => {
      const r = baseRule();
      delete r.conditions;
      expect(() => service._validateRule(r)).toThrow('Rule must have conditions array');
    });

    it('should throw when conditions is not an array', () => {
      expect(() => service._validateRule({ ...baseRule(), conditions: 'bad' })).toThrow(
        'Rule must have conditions array'
      );
    });

    it('should throw when actions is missing', () => {
      const r = baseRule();
      delete r.actions;
      expect(() => service._validateRule(r)).toThrow('Rule must have actions array');
    });

    it('should throw when actions is empty array', () => {
      expect(() => service._validateRule({ ...baseRule(), actions: [] })).toThrow(
        'Rule must have actions array'
      );
    });

    it('should throw when resources is missing', () => {
      const r = baseRule();
      delete r.resources;
      expect(() => service._validateRule(r)).toThrow('Rule must have resources array');
    });

    it('should throw when resources is empty array', () => {
      expect(() => service._validateRule({ ...baseRule(), resources: [] })).toThrow(
        'Rule must have resources array'
      );
    });

    it('should throw for invalid condition type', () => {
      expect(() =>
        service._validateRule({
          conditions: [{ type: 'weather', value: 'x' }],
          actions: ['r'],
          resources: ['r'],
        })
      ).toThrow(/Invalid condition type: weather/);
    });
  });

  /* ================================================================
   * 15. IP Matching (_ipMatches)
   * ================================================================ */
  describe('_ipMatches', () => {
    it('should match exact IP', () => {
      expect(service._ipMatches('10.0.0.1', '10.0.0.1')).toBe(true);
    });

    it('should NOT match different exact IP', () => {
      expect(service._ipMatches('10.0.0.1', '10.0.0.2')).toBe(false);
    });

    it('should match wildcard 192.168.*.*', () => {
      expect(service._ipMatches('192.168.1.100', '192.168.*.*')).toBe(true);
    });

    it('should NOT match wildcard for different subnet', () => {
      expect(service._ipMatches('10.0.1.100', '192.168.*.*')).toBe(false);
    });

    it('should match partial wildcard 10.0.0.*', () => {
      expect(service._ipMatches('10.0.0.99', '10.0.0.*')).toBe(true);
    });

    it('should NOT match partial wildcard with different segment', () => {
      expect(service._ipMatches('10.0.1.99', '10.0.0.*')).toBe(false);
    });

    it('should match broad wildcard *.*.*.*', () => {
      expect(service._ipMatches('172.16.5.3', '*.*.*.*')).toBe(true);
    });
  });

  /* ================================================================
   * 16. Event Emissions (integration)
   * ================================================================ */
  describe('Event Emissions', () => {
    it('should emit policy:created with policyId and policy', done => {
      uuidv4.mockReturnValueOnce('ev-cr');
      service.once('policy:created', data => {
        expect(data.policyId).toBe('policy-ev-cr');
        expect(data.policy).toBeDefined();
        done();
      });
      service.createPolicy(validPolicyData({ name: 'EvtCr' }));
    });

    it('should emit policy:updated with policyId and updates', done => {
      uuidv4.mockReturnValueOnce('ev-up');
      const p = service.createPolicy(validPolicyData({ name: 'EvtUp' }));
      service.once('policy:updated', data => {
        expect(data.policyId).toBe(p.id);
        expect(data.updates).toEqual({ name: 'EvtUpChanged' });
        done();
      });
      service.updatePolicy(p.id, { name: 'EvtUpChanged' });
    });

    it('should emit policy:deleted with policyId', done => {
      uuidv4.mockReturnValueOnce('ev-del');
      const p = service.createPolicy(validPolicyData({ name: 'EvtDel' }));
      service.once('policy:deleted', data => {
        expect(data.policyId).toBe(p.id);
        done();
      });
      service.deletePolicy(p.id);
    });

    it('should emit policy:duplicated with original and duplicated', done => {
      uuidv4.mockReturnValueOnce('ev-dup');
      service.once('policy:duplicated', data => {
        expect(data.original).toBe('policy-admin-full-access');
        expect(data.duplicated).toBe('policy-ev-dup');
        done();
      });
      service.duplicatePolicy('policy-admin-full-access');
    });

    it('should emit policy:evaluated with decision', done => {
      service.once('policy:evaluated', data => {
        expect(data.decision).toBeDefined();
        expect(Array.isArray(data.evaluatedPolicies)).toBe(true);
        done();
      });
      service.evaluatePolicies(adminCtx({ userId: 'ev-eval' }));
    });
  });

  /* ================================================================
   * 17. _evaluateRule (private)
   * ================================================================ */
  describe('_evaluateRule', () => {
    const mkRule = (overrides = {}) => ({
      conditions: [{ type: 'role', value: 'admin' }],
      actions: ['*'],
      resources: ['*'],
      ...overrides,
    });

    it('should return true when resource, action, conditions all match', () => {
      expect(
        service._evaluateRule(mkRule(), {
          action: 'read',
          resource: 'data',
          userContext: { roles: ['admin'] },
        })
      ).toBe(true);
    });

    it('should return false when resource does not match', () => {
      expect(
        service._evaluateRule(mkRule({ resources: ['specific'] }), {
          action: 'read',
          resource: 'other',
          userContext: { roles: ['admin'] },
        })
      ).toBe(false);
    });

    it('should return false when action does not match', () => {
      expect(
        service._evaluateRule(mkRule({ actions: ['read'] }), {
          action: 'delete',
          resource: 'data',
          userContext: { roles: ['admin'] },
        })
      ).toBe(false);
    });

    it('should return false when a condition fails', () => {
      expect(
        service._evaluateRule(mkRule(), {
          action: 'read',
          resource: 'data',
          userContext: { roles: ['user'] },
        })
      ).toBe(false);
    });

    it('should use AND logic for multiple conditions', () => {
      const rule = mkRule({
        conditions: [
          { type: 'role', value: 'admin' },
          { type: 'department', value: 'IT' },
        ],
      });
      expect(
        service._evaluateRule(rule, {
          action: 'r',
          resource: 'r',
          userContext: { roles: ['admin'], department: 'IT' },
        })
      ).toBe(true);
      expect(
        service._evaluateRule(rule, {
          action: 'r',
          resource: 'r',
          userContext: { roles: ['admin'], department: 'HR' },
        })
      ).toBe(false);
    });

    it('should match resource by prefix (resource:sub)', () => {
      expect(
        service._evaluateRule(mkRule({ resources: ['beneficiaries'] }), {
          action: 'read',
          resource: 'beneficiaries:123',
          userContext: { roles: ['admin'] },
        })
      ).toBe(true);
    });

    it('should return false on error (null context)', () => {
      expect(service._evaluateRule(mkRule(), null)).toBe(false);
    });
  });

  /* ================================================================
   * 18. Edge Cases
   * ================================================================ */
  describe('Edge Cases', () => {
    it('should handle createPolicy with minimum fields (defaults filled)', () => {
      const p = service.createPolicy({
        name: 'Min',
        effect: 'Allow',
        rules: [{ conditions: [{ type: 'role', value: 'x' }], actions: ['r'], resources: ['r'] }],
      });
      expect(p.priority).toBe(500);
      expect(p.isActive).toBe(true);
      expect(p.description).toBe('');
    });

    it('should handle getAllPolicies with empty filter object', () => {
      expect(service.getAllPolicies({}).length).toBeGreaterThanOrEqual(3);
    });

    it('should handle evaluatePolicies with empty userContext', () => {
      const r = service.evaluatePolicies({
        userId: 'u',
        action: 'read',
        resource: 'data',
        userContext: {},
      });
      expect(r.decision).toBe('Deny');
    });

    it('should handle evaluatePolicies without userContext key', () => {
      const r = service.evaluatePolicies({
        userId: 'u',
        action: 'read',
        resource: 'data',
      });
      expect(r.decision).toBe('Deny');
    });

    it('should generate unique IDs across multiple creates', () => {
      let counter = 0;
      uuidv4.mockImplementation(() => `seq-${++counter}`);
      const p1 = service.createPolicy(validPolicyData({ name: 'M1' }));
      const p2 = service.createPolicy(validPolicyData({ name: 'M2' }));
      expect(p1.id).not.toBe(p2.id);
      uuidv4.mockReturnValue('test-uuid-1234');
    });

    it('should handle _evaluateLocationCondition when userContext itself is missing', () => {
      const r = service._evaluateLocationCondition({ value: 'HQ' }, {});
      expect(r).toBe(false);
    });

    it('should handle _evaluateRoleCondition when userContext.roles is undefined', () => {
      expect(service._evaluateRoleCondition({ value: 'admin' }, { userContext: {} })).toBe(false);
    });

    it('should handle _ipMatches with empty strings', () => {
      expect(service._ipMatches('', '')).toBe(true);
    });

    it('should return 0 totalEvaluations initially', () => {
      const s = service.getStatistics();
      expect(s.totalEvaluations).toBe(0);
      expect(s.mostEvaluated).toEqual([]);
    });

    it('should handle multiple listeners on same event', () => {
      const h1 = jest.fn();
      const h2 = jest.fn();
      service.on('policy:created', h1);
      service.on('policy:created', h2);
      uuidv4.mockReturnValueOnce('multi-evt');
      service.createPolicy(validPolicyData({ name: 'MultiEvt' }));
      expect(h1).toHaveBeenCalled();
      expect(h2).toHaveBeenCalled();
      service.removeListener('policy:created', h1);
      service.removeListener('policy:created', h2);
    });
  });
});
