'use strict';
/**
 * risk-family-notify.test.js — Wave 293
 *
 * Unit tests for RiskFamilyNotifyService.
 */

jest.unmock('mongoose');

const {
  RiskFamilyNotifyService,
  shouldNotify,
  buildMessage,
} = require('../services/risk-family-notify.service');

function makeAlertModel({ existing = null } = {}) {
  const created = [];
  return {
    _created: created,
    findOne: () => ({
      select: () => ({ lean: async () => existing }),
    }),
    create: async doc => {
      const out = { ...doc, _id: `alert-${created.length + 1}` };
      created.push(out);
      return out;
    },
  };
}

describe('W293 — shouldNotify', () => {
  test('true on first → critical', () => {
    expect(shouldNotify({ tierDelta: 'first', profile: { overallTier: 'critical' } })).toBe(true);
  });
  test('true on escalated → critical', () => {
    expect(shouldNotify({ tierDelta: 'escalated', profile: { overallTier: 'critical' } })).toBe(
      true
    );
  });
  test('false on de-escalation to critical (impossible but defensive)', () => {
    expect(shouldNotify({ tierDelta: 'unchanged', profile: { overallTier: 'critical' } })).toBe(
      false
    );
  });
  test('false on non-critical tiers', () => {
    expect(shouldNotify({ tierDelta: 'escalated', profile: { overallTier: 'high' } })).toBe(false);
    expect(shouldNotify({ tierDelta: 'first', profile: { overallTier: 'moderate' } })).toBe(false);
  });
});

describe('W293 — buildMessage', () => {
  test('uses beneficiary fullName', () => {
    expect(buildMessage('سارة الأحمد')).toContain('سارة الأحمد');
  });
  test('falls back to neutral noun when no name', () => {
    expect(buildMessage('')).toContain('المستفيد');
    expect(buildMessage(undefined)).toContain('المستفيد');
  });
  test('does NOT leak risk score/tier/factors words', () => {
    const msg = buildMessage('علي');
    expect(msg).not.toMatch(/خطورة|score|tier|critical|حرج/i);
  });
});

describe('W293 — RiskFamilyNotifyService.notifyIfFirstCritical', () => {
  const ben = { _id: 'b1', fullName: 'سارة' };
  const critProfile = { overallTier: 'critical' };

  test('rejects when beneficiary missing', async () => {
    const svc = new RiskFamilyNotifyService({ AiAlertModel: makeAlertModel() });
    const r = await svc.notifyIfFirstCritical({});
    expect(r.notified).toBe(false);
    expect(r.reason).toBe('BENEFICIARY_REQUIRED');
  });

  test('no-op when not first-critical', async () => {
    const alert = makeAlertModel();
    const svc = new RiskFamilyNotifyService({ AiAlertModel: alert });
    const r = await svc.notifyIfFirstCritical({
      ben,
      profile: { overallTier: 'high' },
      tierDelta: 'escalated',
    });
    expect(r.reason).toBe('NOT_FIRST_CRITICAL');
    expect(alert._created.length).toBe(0);
  });

  test('AI_ALERT_MODEL_MISSING when no alert model wired', async () => {
    const svc = new RiskFamilyNotifyService({});
    const r = await svc.notifyIfFirstCritical({
      ben,
      profile: critProfile,
      tierDelta: 'first',
    });
    expect(r.reason).toBe('AI_ALERT_MODEL_MISSING');
  });

  test('happy path: creates neutral AiAlert', async () => {
    const alert = makeAlertModel();
    const svc = new RiskFamilyNotifyService({ AiAlertModel: alert });
    const r = await svc.notifyIfFirstCritical({
      ben,
      profile: critProfile,
      tierDelta: 'first',
      sweepRunId: 'sweep-2026-05-23',
    });
    expect(r.notified).toBe(true);
    expect(r.reason).toBe('FAMILY_NOTIFICATION_RAISED');
    expect(alert._created).toHaveLength(1);
    const doc = alert._created[0];
    expect(doc.alert_type).toBe('family_notification_due');
    expect(doc.target_type).toBe('beneficiary');
    expect(doc.target_id).toBe('b1');
    expect(doc.severity).toBe('warning');
    expect(doc.data.code).toBe('FAMILY_NOTIFICATION_DUE');
    expect(doc.data.sweepRunId).toBe('sweep-2026-05-23');
    // Privacy: no score / tier / factor leakage in data payload.
    expect(doc.data.score).toBeUndefined();
    expect(doc.data.tier).toBeUndefined();
    expect(doc.data.topFactors).toBeUndefined();
    expect(doc.message).toContain('سارة');
  });

  test('idempotent on (beneficiary, sweepRunId)', async () => {
    const alert = makeAlertModel({ existing: { _id: 'a-prev' } });
    const svc = new RiskFamilyNotifyService({ AiAlertModel: alert });
    const r = await svc.notifyIfFirstCritical({
      ben,
      profile: critProfile,
      tierDelta: 'first',
      sweepRunId: 'sweep-2026-05-23',
    });
    expect(r.notified).toBe(false);
    expect(r.reason).toBe('ALREADY_NOTIFIED');
    expect(r.alertId).toBe('a-prev');
    expect(alert._created).toHaveLength(0);
  });

  test('returns CREATE_FAILED when alert create throws', async () => {
    const alert = {
      findOne: () => ({ select: () => ({ lean: async () => null }) }),
      create: async () => {
        throw new Error('mongo unavailable');
      },
    };
    const svc = new RiskFamilyNotifyService({ AiAlertModel: alert });
    const r = await svc.notifyIfFirstCritical({
      ben,
      profile: critProfile,
      tierDelta: 'escalated',
      sweepRunId: 'sweep-x',
    });
    expect(r.notified).toBe(false);
    expect(r.reason).toBe('CREATE_FAILED');
  });
});
