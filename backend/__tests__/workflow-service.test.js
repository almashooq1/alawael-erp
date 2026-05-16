/**
 * workflow-service.test.js — Wave 12.
 *
 * Verifies the operator-action surface that lives in
 * `alerts/workflow.service.js`: acknowledge, assign, snooze, mute,
 * resolveAlertManually, commentAlert, recordReopen.
 *
 * Uses a fake AlertModel with the chainable-thenable pattern from
 * the parent-care-plan-sign tests so we don't touch Mongo.
 */

'use strict';

const { createAlertWorkflow, BOUNDS } = require('../alerts/workflow.service');

// ─── Fake Alert model + factory ──────────────────────────────────
// Each call returns a fresh "alert document" with .save() that
// flips a flag so we can assert persistence happened.
class FakeAlert {
  constructor(initial = {}) {
    Object.assign(this, {
      _id: initial._id || 'a-1',
      ruleId: initial.ruleId || 'r',
      key: initial.key || 'k1',
      severity: initial.severity || 'warning',
      ackedAt: null,
      ackedBy: null,
      resolvedAt: null,
      resolveNote: null,
      resolvedBy: null,
      snoozeUntil: null,
      mutedUntil: null,
      muteReason: null,
      ownership: { assignedTo: null, assignedAt: null, assignedBy: null },
      escalation: {
        currentTier: 1,
        tier1At: new Date(),
        tier2At: null,
        tier3At: null,
        tier2NotifiedRoles: [],
        tier3NotifiedRoles: [],
      },
      state: { current: 'OPEN', transitions: [] },
      comments: [],
      reopens: [],
      ...initial,
    });
    this._saved = 0;
  }
  deriveState() {
    if (this.resolvedAt) return 'RESOLVED';
    if (this.mutedUntil && this.mutedUntil > new Date()) return 'MUTED';
    if (this.snoozeUntil && this.snoozeUntil > new Date()) return 'SNOOZED';
    if (this.ownership.assignedTo) return 'ASSIGNED';
    if (this.ackedAt) return 'ACKNOWLEDGED';
    return 'OPEN';
  }
  async save() {
    this._saved += 1;
    return this;
  }
}

function makeFakeModel(byId = {}) {
  return {
    model: {
      findById: jest.fn(async id => byId[String(id)] || null),
    },
  };
}

function makeAuditLogger() {
  return { log: jest.fn(async () => {}) };
}

// ─── acknowledge ─────────────────────────────────────────────────
describe('acknowledgeAlert', () => {
  test('flips ackedAt + state, pushes transition, audit fires', async () => {
    const alert = new FakeAlert();
    const model = makeFakeModel({ 'a-1': alert });
    const audit = makeAuditLogger();
    const svc = createAlertWorkflow({ alertModel: model, auditLogger: audit });

    const result = await svc.acknowledgeAlert({
      alertId: 'a-1',
      actor: { userId: 'u-1', role: 'hr_supervisor', ip: '1.2.3.4' },
    });

    expect(result.ok).toBe(true);
    expect(alert.ackedAt).toBeTruthy();
    expect(alert.ackedBy).toBe('u-1');
    expect(alert.state.current).toBe('ACKNOWLEDGED');
    expect(alert.state.transitions).toHaveLength(1);
    expect(alert.state.transitions[0]).toMatchObject({
      from: 'OPEN',
      to: 'ACKNOWLEDGED',
      byRole: 'hr_supervisor',
      byUserId: 'u-1',
      ip: '1.2.3.4',
    });
    expect(alert._saved).toBe(1);
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'alert.acknowledge' })
    );
  });

  test('returns noop on already-acked alert (idempotent)', async () => {
    const alert = new FakeAlert({ ackedAt: new Date() });
    const model = makeFakeModel({ 'a-1': alert });
    const svc = createAlertWorkflow({ alertModel: model });
    const result = await svc.acknowledgeAlert({ alertId: 'a-1', actor: { userId: 'u' } });
    expect(result.ok).toBe(true);
    expect(result.noop).toBe(true);
    expect(alert._saved).toBe(0);
  });

  test('rejects ack on resolved alert', async () => {
    const alert = new FakeAlert({ resolvedAt: new Date() });
    const model = makeFakeModel({ 'a-1': alert });
    const svc = createAlertWorkflow({ alertModel: model });
    const result = await svc.acknowledgeAlert({ alertId: 'a-1', actor: { userId: 'u' } });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('ALREADY_RESOLVED');
  });

  test('NOT_FOUND when alert missing', async () => {
    const model = makeFakeModel({});
    const svc = createAlertWorkflow({ alertModel: model });
    const r = await svc.acknowledgeAlert({ alertId: 'missing', actor: {} });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('NOT_FOUND');
  });
});

// ─── assign ──────────────────────────────────────────────────────
describe('assignAlert', () => {
  test('sets ownership + state + audit', async () => {
    const alert = new FakeAlert();
    const model = makeFakeModel({ 'a-1': alert });
    const audit = makeAuditLogger();
    const svc = createAlertWorkflow({ alertModel: model, auditLogger: audit });

    const r = await svc.assignAlert({
      alertId: 'a-1',
      assigneeUserId: 'u-assignee',
      actor: { userId: 'u-manager', role: 'hr_manager' },
    });

    expect(r.ok).toBe(true);
    expect(alert.ownership.assignedTo).toBe('u-assignee');
    expect(alert.ownership.assignedBy).toBe('u-manager');
    expect(alert.state.current).toBe('ASSIGNED');
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'alert.assign',
        metadata: expect.objectContaining({ assigneeUserId: 'u-assignee' }),
      })
    );
  });

  test('rejects when assigneeUserId missing', async () => {
    const svc = createAlertWorkflow({ alertModel: makeFakeModel() });
    const r = await svc.assignAlert({ alertId: 'a-1', actor: {} });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('ASSIGNEE_REQUIRED');
  });

  test('rejects on resolved alert', async () => {
    const alert = new FakeAlert({ resolvedAt: new Date() });
    const model = makeFakeModel({ 'a-1': alert });
    const svc = createAlertWorkflow({ alertModel: model });
    const r = await svc.assignAlert({ alertId: 'a-1', assigneeUserId: 'u', actor: {} });
    expect(r.reason).toBe('ALREADY_RESOLVED');
  });
});

// ─── snooze ──────────────────────────────────────────────────────
describe('snoozeAlert', () => {
  test('snoozes for valid minutes window', async () => {
    const alert = new FakeAlert();
    const svc = createAlertWorkflow({ alertModel: makeFakeModel({ 'a-1': alert }) });
    const r = await svc.snoozeAlert({
      alertId: 'a-1',
      minutes: 60,
      actor: { userId: 'u' },
      reason: 'will fix tomorrow',
    });
    expect(r.ok).toBe(true);
    expect(alert.snoozeUntil).toBeTruthy();
    expect(alert.snoozeUntil.getTime()).toBeGreaterThan(Date.now() + 59 * 60 * 1000);
    expect(alert.state.current).toBe('SNOOZED');
  });

  test('rejects too-short / too-long durations', async () => {
    const svc = createAlertWorkflow({ alertModel: makeFakeModel({ 'a-1': new FakeAlert() }) });
    for (const bad of [0, 4, BOUNDS.MAX_SNOOZE_MIN + 1, -1, 'string']) {
      const r = await svc.snoozeAlert({ alertId: 'a-1', minutes: bad, actor: { userId: 'u' } });
      expect(r.ok).toBe(false);
      expect(r.reason).toBe('INVALID_SNOOZE_DURATION');
    }
  });
});

// ─── mute ────────────────────────────────────────────────────────
describe('muteAlert', () => {
  test('mutes for valid window + reason ≥ 10 chars', async () => {
    const alert = new FakeAlert();
    const svc = createAlertWorkflow({ alertModel: makeFakeModel({ 'a-1': alert }) });
    const r = await svc.muteAlert({
      alertId: 'a-1',
      hours: 24,
      reason: 'duplicate ticket already in jira PROD-1234',
      actor: { userId: 'u', role: 'branch_manager' },
    });
    expect(r.ok).toBe(true);
    expect(alert.mutedUntil).toBeTruthy();
    expect(alert.muteReason).toContain('PROD-1234');
    expect(alert.state.current).toBe('MUTED');
    expect(alert.state.transitions[0].reason).toContain('PROD-1234');
  });

  test('rejects mute without reason / short reason', async () => {
    const svc = createAlertWorkflow({ alertModel: makeFakeModel({ 'a-1': new FakeAlert() }) });
    for (const bad of [undefined, '', 'short']) {
      const r = await svc.muteAlert({
        alertId: 'a-1',
        hours: 24,
        reason: bad,
        actor: { userId: 'u' },
      });
      expect(r.reason).toBe('MUTE_REASON_REQUIRED');
    }
  });

  test('rejects invalid hours window', async () => {
    const svc = createAlertWorkflow({ alertModel: makeFakeModel({ 'a-1': new FakeAlert() }) });
    for (const bad of [0, BOUNDS.MAX_MUTE_HOURS + 1, -1]) {
      const r = await svc.muteAlert({
        alertId: 'a-1',
        hours: bad,
        reason: 'long enough reason',
        actor: { userId: 'u' },
      });
      expect(r.reason).toBe('INVALID_MUTE_DURATION');
    }
  });
});

// ─── resolveAlertManually ────────────────────────────────────────
describe('resolveAlertManually', () => {
  test('writes resolvedAt + transition + audit', async () => {
    const alert = new FakeAlert();
    const audit = makeAuditLogger();
    const svc = createAlertWorkflow({
      alertModel: makeFakeModel({ 'a-1': alert }),
      auditLogger: audit,
    });

    const r = await svc.resolveAlertManually({
      alertId: 'a-1',
      note: 'fixed manually via SCFHS portal',
      actor: { userId: 'u', role: 'hr_supervisor' },
    });

    expect(r.ok).toBe(true);
    expect(alert.resolvedAt).toBeTruthy();
    expect(alert.resolveNote).toContain('SCFHS');
    expect(alert.state.current).toBe('RESOLVED');
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'alert.resolve_manual' })
    );
  });

  test('idempotent on already-resolved alert', async () => {
    const alert = new FakeAlert({ resolvedAt: new Date() });
    const svc = createAlertWorkflow({ alertModel: makeFakeModel({ 'a-1': alert }) });
    const r = await svc.resolveAlertManually({ alertId: 'a-1', actor: { userId: 'u' } });
    expect(r.ok).toBe(true);
    expect(r.noop).toBe(true);
    expect(alert._saved).toBe(0);
  });

  test('rejects note over 2000 chars', async () => {
    const svc = createAlertWorkflow({ alertModel: makeFakeModel({ 'a-1': new FakeAlert() }) });
    const r = await svc.resolveAlertManually({
      alertId: 'a-1',
      note: 'x'.repeat(2001),
      actor: {},
    });
    expect(r.reason).toBe('RESOLVE_NOTE_TOO_LONG');
  });
});

// ─── commentAlert ────────────────────────────────────────────────
describe('commentAlert', () => {
  test('appends a comment + audit, state unchanged', async () => {
    const alert = new FakeAlert();
    const audit = makeAuditLogger();
    const svc = createAlertWorkflow({
      alertModel: makeFakeModel({ 'a-1': alert }),
      auditLogger: audit,
    });

    const r = await svc.commentAlert({
      alertId: 'a-1',
      text: 'تواصلت مع الموظف، الوثائق ستصل غداً',
      actor: { userId: 'u-1', role: 'hr_supervisor' },
    });

    expect(r.ok).toBe(true);
    expect(alert.comments).toHaveLength(1);
    expect(alert.comments[0].text).toContain('الموظف');
    expect(alert.state.current).toBe('OPEN'); // unchanged
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'alert.comment' }));
  });

  test('rejects empty / whitespace-only text', async () => {
    const svc = createAlertWorkflow({ alertModel: makeFakeModel({ 'a-1': new FakeAlert() }) });
    for (const bad of ['', '   ', null, undefined]) {
      const r = await svc.commentAlert({
        alertId: 'a-1',
        text: bad,
        actor: { userId: 'u' },
      });
      expect(r.reason).toBe('COMMENT_TEXT_REQUIRED');
    }
  });

  test('rejects comment > 2000 chars', async () => {
    const svc = createAlertWorkflow({ alertModel: makeFakeModel({ 'a-1': new FakeAlert() }) });
    const r = await svc.commentAlert({
      alertId: 'a-1',
      text: 'x'.repeat(2001),
      actor: { userId: 'u' },
    });
    expect(r.reason).toBe('COMMENT_TEXT_TOO_LONG');
  });

  test('rejects when actor.userId missing', async () => {
    const svc = createAlertWorkflow({ alertModel: makeFakeModel({ 'a-1': new FakeAlert() }) });
    const r = await svc.commentAlert({ alertId: 'a-1', text: 'ok', actor: {} });
    expect(r.reason).toBe('ACTOR_REQUIRED');
  });
});

// ─── recordReopen ────────────────────────────────────────────────
describe('recordReopen', () => {
  test('clears resolvedAt, pushes reopen entry, resets escalation', async () => {
    const past = new Date(Date.now() - 86400000);
    const alert = new FakeAlert({
      resolvedAt: past,
      resolveNote: 'was fixed',
      resolvedBy: 'u',
      escalation: {
        currentTier: 3,
        tier1At: past,
        tier2At: past,
        tier3At: past,
        tier2NotifiedRoles: ['hr_manager'],
        tier3NotifiedRoles: ['super_admin'],
      },
    });

    const audit = makeAuditLogger();
    const svc = createAlertWorkflow({
      alertModel: makeFakeModel({ 'a-1': alert }),
      auditLogger: audit,
    });

    const r = await svc.recordReopen({
      alertId: 'a-1',
      previousResolvedAt: past,
      reason: 'engine_redetected',
    });

    expect(r.ok).toBe(true);
    expect(alert.resolvedAt).toBe(null);
    expect(alert.resolveNote).toBe(null);
    expect(alert.state.current).toBe('OPEN');
    expect(alert.reopens).toHaveLength(1);
    expect(alert.reopens[0]).toMatchObject({
      previousResolvedAt: past,
      reason: 'engine_redetected',
    });
    expect(alert.escalation.currentTier).toBe(1);
    expect(alert.escalation.tier2At).toBe(null);
    expect(alert.escalation.tier3At).toBe(null);
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'alert.reopen' }));
  });

  test('noop when alert not resolved', async () => {
    const alert = new FakeAlert();
    const svc = createAlertWorkflow({ alertModel: makeFakeModel({ 'a-1': alert }) });
    const r = await svc.recordReopen({ alertId: 'a-1' });
    expect(r.ok).toBe(true);
    expect(r.noop).toBe(true);
    expect(alert._saved).toBe(0);
  });
});

// ─── BOUNDS export ───────────────────────────────────────────────
describe('BOUNDS export', () => {
  test('exposes the canonical validation thresholds', () => {
    expect(BOUNDS.MIN_SNOOZE_MIN).toBe(5);
    expect(BOUNDS.MAX_SNOOZE_MIN).toBe(10080); // 7 days
    expect(BOUNDS.MIN_MUTE_HOURS).toBe(1);
    expect(BOUNDS.MIN_MUTE_REASON_LEN).toBe(10);
    expect(BOUNDS.MAX_COMMENT_LEN).toBe(2000);
  });
});
