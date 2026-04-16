/**
 * Break-Glass engine tests.
 */

const { BreakGlassEngine } = require('../authorization/break-glass');

function setup({ now = new Date('2026-04-17T00:00:00Z'), monthlyLimit = 3 } = {}) {
  const events = [];
  const eng = new BreakGlassEngine({
    now: () => now,
    monthlyLimit,
    onActivate: s => events.push({ type: 'activate', id: s.id }),
    onCoSign: s => events.push({ type: 'cosign', id: s.id }),
    onExpire: s => events.push({ type: 'expire', id: s.id }),
  });
  return { eng, events };
}

describe('BreakGlassEngine — activate', () => {
  test('creates an active session with expected fields', () => {
    const { eng } = setup();
    const s = eng.activate({
      userId: 'u-1',
      scope: 'clinical_read',
      purpose: 'Medical emergency — urgent caseload not reachable',
      branchId: 'br-1',
    });
    expect(s.id).toMatch(/^bg-/);
    expect(s.scope).toBe('clinical_read');
    expect(s.expiresAt.getTime() - s.activatedAt.getTime()).toBe(4 * 3600 * 1000);
    expect(s.coSignRequiredBy.getTime() - s.activatedAt.getTime()).toBe(24 * 3600 * 1000);
    expect(s.coSignedAt).toBeNull();
  });

  test('rejects invalid scope', () => {
    const { eng } = setup();
    expect(() =>
      eng.activate({ userId: 'u-1', scope: 'nope', purpose: 'valid purpose here' })
    ).toThrow('break_glass_scope_invalid');
  });

  test('rejects short purpose', () => {
    const { eng } = setup();
    expect(() => eng.activate({ userId: 'u-1', scope: 'clinical_read', purpose: 'x' })).toThrow(
      'break_glass_purpose_too_short'
    );
  });

  test('enforces monthly limit', () => {
    const { eng } = setup({ monthlyLimit: 2 });
    for (let i = 0; i < 2; i++) {
      eng.activate({ userId: 'u-1', scope: 'clinical_read', purpose: `run ${i} reason enough` });
    }
    expect(() =>
      eng.activate({ userId: 'u-1', scope: 'clinical_read', purpose: 'third one reason enough' })
    ).toThrow('break_glass_monthly_limit_reached');
  });
});

describe('BreakGlassEngine — coSign', () => {
  test('successful cosign by L2+ approver', () => {
    const { eng, events } = setup();
    const s = eng.activate({ userId: 'u-1', scope: 'clinical_read', purpose: 'urgent reason ok' });
    const out = eng.coSign(s.id, {
      approverUserId: 'u-mgr',
      approverRoles: ['head_office_admin'],
      note: 'ok',
    });
    expect(out.coSignedAt).toBeInstanceOf(Date);
    expect(out.coSignedBy).toBe('u-mgr');
    expect(events.map(e => e.type)).toEqual(['activate', 'cosign']);
  });

  test('rejects self co-sign', () => {
    const { eng } = setup();
    const s = eng.activate({ userId: 'u-1', scope: 'clinical_read', purpose: 'urgent reason ok' });
    expect(() =>
      eng.coSign(s.id, { approverUserId: 'u-1', approverRoles: ['head_office_admin'] })
    ).toThrow('break_glass_cosign_cannot_be_self');
  });

  test('rejects insufficient role', () => {
    const { eng } = setup();
    const s = eng.activate({ userId: 'u-1', scope: 'clinical_read', purpose: 'urgent reason ok' });
    expect(() => eng.coSign(s.id, { approverUserId: 'u-mgr', approverRoles: ['manager'] })).toThrow(
      'break_glass_cosign_requires_L2_plus_role'
    );
  });

  test('rejects cosign after window closed', () => {
    const start = new Date('2026-04-17T00:00:00Z');
    const { eng } = setup({ now: start });
    const s = eng.activate({ userId: 'u-1', scope: 'clinical_read', purpose: 'urgent reason ok' });
    eng.now = () => new Date(start.getTime() + 25 * 3600 * 1000);
    expect(() =>
      eng.coSign(s.id, { approverUserId: 'u-mgr', approverRoles: ['head_office_admin'] })
    ).toThrow('break_glass_cosign_window_closed');
  });
});

describe('BreakGlassEngine — lifecycle', () => {
  test('isActive returns live session', () => {
    const { eng } = setup();
    const s = eng.activate({ userId: 'u-1', scope: 'clinical_read', purpose: 'urgent reason ok' });
    const live = eng.isActive('u-1');
    expect(live && live.id).toBe(s.id);
  });

  test('isActive returns null after close', () => {
    const { eng } = setup();
    const s = eng.activate({ userId: 'u-1', scope: 'clinical_read', purpose: 'urgent reason ok' });
    eng.close(s.id, { actorId: 'u-1', reason: 'resolved' });
    expect(eng.isActive('u-1')).toBeNull();
  });

  test('sweepExpired flags sessions past co-sign window', () => {
    const start = new Date('2026-04-17T00:00:00Z');
    const { eng, events } = setup({ now: start });
    eng.activate({ userId: 'u-1', scope: 'clinical_read', purpose: 'urgent reason ok' });
    eng.activate({ userId: 'u-2', scope: 'financial_read', purpose: 'need to check books' });

    eng.now = () => new Date(start.getTime() + 26 * 3600 * 1000);
    const flagged = eng.sweepExpired();
    expect(flagged.length).toBe(2);
    expect(events.filter(e => e.type === 'expire').length).toBe(2);
  });

  test('listPending returns only sessions still within co-sign window', () => {
    const start = new Date('2026-04-17T00:00:00Z');
    const { eng } = setup({ now: start });
    eng.activate({ userId: 'u-1', scope: 'clinical_read', purpose: 'urgent reason ok' });
    expect(eng.listPending().length).toBe(1);
    eng.now = () => new Date(start.getTime() + 25 * 3600 * 1000);
    expect(eng.listPending().length).toBe(0);
  });

  test('recordAction appends to session.actions', () => {
    const { eng } = setup();
    const s = eng.activate({ userId: 'u-1', scope: 'clinical_read', purpose: 'urgent reason ok' });
    eng.recordAction(s.id, { op: 'read', resource: 'Beneficiary/b-7' });
    const after = eng.storage.get(s.id);
    expect(after.actions.length).toBe(1);
    expect(after.actions[0].op).toBe('read');
  });
});
