'use strict';

/**
 * hr-workflow-engine.test.js — Phase 30 (Intelligent HR Platform).
 *
 * Unit coverage for the rule-driven HR workflow engine. Models are mocked so
 * the engine can be exercised without a Mongo connection. The goal is to
 * verify:
 *
 *   - rule registry is complete and self-describing
 *   - rules with missing dependencies skip cleanly (no crashes)
 *   - findings are emitted to the injected notifier
 *   - findings are audited via the injected audit logger
 *   - dry-run does NOT notify or audit
 *   - per-deployment config overrides built-in defaults
 *   - unknown rule ID raises a recognizable error
 */

const { createHrWorkflowEngine, BUILT_IN_RULES } = require('../services/hr/hrWorkflowEngine');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeNotifier() {
  const calls = [];
  return {
    calls,
    async notify(opts) {
      calls.push(opts);
      return { success: true, results: [] };
    },
  };
}

function makeAuditor() {
  const calls = [];
  return {
    calls,
    async log(entry) {
      calls.push(entry);
    },
  };
}

function silentLogger() {
  return { info() {}, warn() {}, error() {}, debug() {} };
}

// Build mock model factories that the engine's rules can call. The shapes
// match the real mongoose lean() return shape.

function staticEmployeeModel(employees) {
  const byId = new Map(employees.map(e => [String(e._id), e]));
  return {
    find(query) {
      let docs = [...employees];
      if (query && query._id && Array.isArray(query._id.$in)) {
        docs = docs.filter(d => query._id.$in.map(String).includes(String(d._id)));
      }
      if (query && query.licenseExpiry) {
        const range = query.licenseExpiry;
        docs = docs.filter(e => {
          const exp = e.licenseExpiry;
          if (!exp) return false;
          if (range.$exists === true && !exp) return false;
          if (range.$ne === null && exp === null) return false;
          if (range.$lte && new Date(exp) > new Date(range.$lte)) return false;
          if (range.$gte && new Date(exp) < new Date(range.$gte)) return false;
          return true;
        });
      }
      return chain(docs);
    },
    findById(id) {
      return chain(byId.get(String(id)) || null);
    },
  };
}

function staticLeaveRequestModel(requests) {
  return {
    find(query) {
      let docs = [...requests];
      if (query && query.status) docs = docs.filter(d => d.status === query.status);
      if (query && query.createdAt && query.createdAt.$lte) {
        const cutoff = new Date(query.createdAt.$lte);
        docs = docs.filter(d => new Date(d.createdAt) <= cutoff);
      }
      return chain(docs);
    },
  };
}

function staticGrievanceModel(items) {
  return {
    find(query) {
      let docs = [...items];
      if (query && query.status && query.status.$in) {
        docs = docs.filter(d => query.status.$in.includes(d.status));
      }
      if (query && query.createdAt && query.createdAt.$lte) {
        const cutoff = new Date(query.createdAt.$lte);
        docs = docs.filter(d => new Date(d.createdAt) <= cutoff);
      }
      return chain(docs);
    },
  };
}

function staticUserModel(users) {
  return {
    find(query) {
      let docs = [...users];
      if (query && query.role) docs = docs.filter(u => u.role === query.role);
      if (query && query.active && query.active.$ne === false) {
        docs = docs.filter(u => u.active !== false);
      }
      return chain(docs);
    },
    findById(id) {
      return chain(users.find(u => String(u._id) === String(id)) || null);
    },
  };
}

function chain(value) {
  const docs = Array.isArray(value) ? value : value;
  const obj = {
    select: () => obj,
    populate: () => obj,
    sort: () => obj,
    limit: () => obj,
    skip: () => obj,
    lean: () => Promise.resolve(docs),
    then: (resolve, reject) => Promise.resolve(docs).then(resolve, reject),
  };
  return obj;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('hrWorkflowEngine', () => {
  test('exports built-in rules with stable shape', () => {
    expect(Array.isArray(BUILT_IN_RULES)).toBe(true);
    expect(BUILT_IN_RULES.length).toBeGreaterThanOrEqual(5);
    for (const rule of BUILT_IN_RULES) {
      expect(rule.id).toMatch(/^[a-z][a-z0-9-]+$/);
      expect(typeof rule.labelAr).toBe('string');
      expect(typeof rule.labelEn).toBe('string');
      expect(rule.default).toEqual(
        expect.objectContaining({
          enabled: expect.any(Boolean),
          params: expect.any(Object),
        })
      );
      expect(typeof rule.evaluate).toBe('function');
    }
  });

  test('listRules reports readiness when models are missing', () => {
    const engine = createHrWorkflowEngine({ models: {}, logger: silentLogger() });
    const rules = engine.listRules();
    expect(rules).toHaveLength(BUILT_IN_RULES.length);
    expect(rules.every(r => r.ready === false || r.missing.length === 0)).toBe(true);
    // With no models, every rule that requires anything must report not-ready.
    const requiringRules = BUILT_IN_RULES.filter(r => r.requires && r.requires.length);
    for (const r of requiringRules) {
      const reported = rules.find(x => x.id === r.id);
      expect(reported.ready).toBe(false);
      expect(reported.missing.length).toBeGreaterThan(0);
    }
  });

  test('rules with missing models report missing_models and do not throw', async () => {
    const engine = createHrWorkflowEngine({ models: {}, logger: silentLogger() });
    const result = await engine.run();
    expect(result.summary).toHaveLength(BUILT_IN_RULES.length);
    expect(result.summary.every(s => s.skipped === 'missing_models')).toBe(true);
  });

  test('leave-pending-too-long fires when a request is older than threshold', async () => {
    const oldRequest = {
      _id: 'lr-old',
      employeeId: 'emp-1',
      leaveType: 'annual',
      status: 'pending',
      createdAt: new Date(Date.now() - 72 * 3600 * 1000), // 72h ago
    };
    const freshRequest = {
      _id: 'lr-fresh',
      employeeId: 'emp-2',
      leaveType: 'sick',
      status: 'pending',
      createdAt: new Date(Date.now() - 2 * 3600 * 1000), // 2h ago
    };
    const employee = {
      _id: 'emp-1',
      fullName: 'سارة أحمد',
      employeeNumber: 'EMP-001',
      managerId: 'mgr-1',
      email: 'sara@test',
    };

    const notifier = makeNotifier();
    const auditor = makeAuditor();
    const engine = createHrWorkflowEngine({
      models: {
        LeaveRequest: staticLeaveRequestModel([oldRequest, freshRequest]),
        Employee: staticEmployeeModel([employee]),
        User: staticUserModel([
          { _id: 'mgr-hr-1', role: 'hr_manager', email: 'hr@test', active: true },
        ]),
      },
      notifier,
      auditLogger: auditor,
      logger: silentLogger(),
    });

    const result = await engine.runRule('leave-pending-too-long');
    expect(result.fired).toBeGreaterThanOrEqual(1);
    expect(result.findings.some(f => f.dedupeKey === 'leave-pending:lr-old')).toBe(true);
    expect(result.findings.some(f => f.dedupeKey === 'leave-pending:lr-fresh')).toBe(false);
    expect(notifier.calls.length).toBeGreaterThanOrEqual(1);
    expect(auditor.calls.length).toBeGreaterThanOrEqual(1);
    expect(auditor.calls[0]).toEqual(
      expect.objectContaining({
        action: 'hr.workflow.rule_fired',
        entityType: 'leave_request',
      })
    );
  });

  test('license-expiring-soon escalates severity as deadline approaches', async () => {
    const now = new Date();
    const employees = [
      // Severity bands: <=alertDays (14) → critical, <=30 → high, else medium
      {
        _id: 'emp-near',
        fullName: 'محمد سعيد',
        licenseExpiry: new Date(now.getTime() + 10 * 86400000),
        licenseNumber: 'L-1',
      },
      {
        _id: 'emp-mid',
        fullName: 'فاطمة',
        licenseExpiry: new Date(now.getTime() + 25 * 86400000),
        licenseNumber: 'L-2',
      },
      {
        _id: 'emp-soft',
        fullName: 'هند',
        licenseExpiry: new Date(now.getTime() + 50 * 86400000),
        licenseNumber: 'L-3',
      },
      {
        _id: 'emp-far',
        fullName: 'سلطان',
        licenseExpiry: new Date(now.getTime() + 200 * 86400000),
        licenseNumber: 'L-4',
      },
    ];
    const engine = createHrWorkflowEngine({
      models: { Employee: staticEmployeeModel(employees), User: staticUserModel([]) },
      logger: silentLogger(),
    });
    const result = await engine.runRule('license-expiring-soon');
    expect(result.findings.length).toBeGreaterThanOrEqual(3);
    const sev = Object.fromEntries(result.findings.map(f => [f.subject.id, f.severity]));
    expect(sev['emp-near']).toBe('critical');
    expect(sev['emp-mid']).toBe('high');
    expect(sev['emp-soft']).toBe('medium');
    // emp-far should be filtered out (>60 days)
    expect(sev['emp-far']).toBeUndefined();
  });

  test('dry-run returns findings without firing notifier/audit', async () => {
    const oldRequest = {
      _id: 'lr-x',
      employeeId: 'emp-x',
      leaveType: 'annual',
      status: 'pending',
      createdAt: new Date(Date.now() - 72 * 3600 * 1000),
    };
    const notifier = makeNotifier();
    const auditor = makeAuditor();
    const engine = createHrWorkflowEngine({
      models: {
        LeaveRequest: staticLeaveRequestModel([oldRequest]),
        Employee: staticEmployeeModel([{ _id: 'emp-x', fullName: 'X' }]),
        User: staticUserModel([]),
      },
      notifier,
      auditLogger: auditor,
      logger: silentLogger(),
    });
    const dry = await engine.dryRun();
    expect(dry.dryRun).toBe(true);
    expect(notifier.calls).toHaveLength(0);
    expect(auditor.calls).toHaveLength(0);
    const leaveRule = dry.summary.find(s => s.ruleId === 'leave-pending-too-long');
    expect(leaveRule.findings.length).toBeGreaterThanOrEqual(1);
  });

  test('per-deployment config overrides built-in defaults', async () => {
    const engine = createHrWorkflowEngine({
      models: {},
      logger: silentLogger(),
      config: { 'leave-pending-too-long': { enabled: false } },
    });
    const rules = engine.listRules();
    const cfg = rules.find(r => r.id === 'leave-pending-too-long');
    expect(cfg.enabled).toBe(false);

    const result = await engine.runRule('leave-pending-too-long');
    expect(result.skipped).toBe('disabled');
  });

  test('runRule rejects unknown rule id', async () => {
    const engine = createHrWorkflowEngine({ models: {}, logger: silentLogger() });
    await expect(engine.runRule('not-a-real-rule')).rejects.toThrow(/unknown rule/);
  });

  test('grievance-unanswered fires for open grievance past threshold', async () => {
    const stale = {
      _id: 'gr-1',
      employeeId: 'emp-9',
      subject: 'مشكلة قسم',
      category: 'workplace',
      status: 'open',
      createdAt: new Date(Date.now() - 7 * 86400000),
    };
    const engine = createHrWorkflowEngine({
      models: {
        Grievance: staticGrievanceModel([stale]),
        User: staticUserModel([
          { _id: 'u-hr', role: 'hr_manager', email: 'hr@test', active: true },
        ]),
      },
      notifier: makeNotifier(),
      auditLogger: makeAuditor(),
      logger: silentLogger(),
    });
    const result = await engine.runRule('grievance-unanswered');
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0].dedupeKey).toBe('grievance-stale:gr-1');
  });
});
