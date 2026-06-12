'use strict';

/**
 * W1258 — closing the ADR-040 (b) consumer map.
 *
 * Audit findings encoded as tests:
 *   1. The W45 side-effect handlers are DOC-AGNOSTIC — since W1254 they
 *      receive UnifiedCarePlan docs via the family-retry worker. The audit
 *      label must therefore be faithful per source (was hard-coded
 *      'CarePlanVersion' for every entry).
 *   2. UnifiedCarePlan has no familyVersion.body yet (the W43 family-version
 *      generator was never ported) → the notify_family handler must SKIP
 *      faithfully for unified docs (no fabricated family content), with the
 *      correct entityType on the skip audit entry.
 *   3. Legacy docs keep the exact pre-W1258 behavior + label.
 */

const {
  createCarePlanSideEffectHandlers,
  HANDLER_NAMES,
} = require('../intelligence/care-plan-side-effects.service');

function capture() {
  const entries = [];
  return { entries, auditLogger: { log: async e => entries.push(e) } };
}

const unifiedDoc = {
  _id: 'u1',
  planNumber: 'CP-20260612-XYZ',
  version: 1,
  status: 'active',
};

const legacyDoc = {
  _id: 'l1',
  planId: 'PLAN-9',
  versionNumber: 3,
  status: 'family_notification_sent',
  familyVersion: { body: 'نسخة الأسرة المبسطة من الخطة' },
};

describe('W1258 side-effects entityType faithfulness', () => {
  test('unified doc without familyVersion → faithful skip + UnifiedCarePlan label', async () => {
    const cap = capture();
    const handlers = createCarePlanSideEffectHandlers({ auditLogger: cap.auditLogger });
    const res = await handlers[HANDLER_NAMES.NOTIFY_FAMILY]({
      planVersion: unifiedDoc,
      actor: { userId: 'sys', role: 'system' },
      metadata: { channel: 'sms' },
    });
    expect(res.ok).toBe(false);
    expect(res.reason).toBe('no_family_body'); // no fabricated family content
    expect(cap.entries).toHaveLength(1);
    expect(cap.entries[0].entityType).toBe('UnifiedCarePlan');
    expect(cap.entries[0].action).toBe('care-plan.notify_family.side-effect.skipped');
  });

  test('legacy doc with family body + working channel → send + CarePlanVersion label', async () => {
    const cap = capture();
    const handlers = createCarePlanSideEffectHandlers({
      auditLogger: cap.auditLogger,
      familyChannelClient: { dispatch: async () => ({ ok: true }) },
    });
    const res = await handlers[HANDLER_NAMES.NOTIFY_FAMILY]({
      planVersion: legacyDoc,
      actor: { userId: 'sys', role: 'system' },
      metadata: { channel: 'sms', recipient: '+9665xxxxxxx' },
    });
    expect(res.ok).toBe(true);
    const main = cap.entries.find(e => e.action === 'care-plan.notify_family.side-effect');
    expect(main).toBeDefined();
    expect(main.entityType).toBe('CarePlanVersion');
    expect(main.metadata.success).toBe(true);
  });

  test('manual-dispatch path labels the unified source too', async () => {
    const cap = capture();
    const handlers = createCarePlanSideEffectHandlers({ auditLogger: cap.auditLogger });
    const res = await handlers[HANDLER_NAMES.NOTIFY_FAMILY]({
      planVersion: { ...unifiedDoc, familyVersion: { body: 'محتوى' } }, // hypothetical future content
      actor: { userId: 'sys', role: 'system' },
      metadata: { channel: 'portal' },
    });
    expect(res.reason).toBe('manual_dispatch_required'); // no channel client wired
    expect(cap.entries[0].entityType).toBe('UnifiedCarePlan');
  });

  test('entityType detection is conservative (ambiguous → CarePlanVersion)', async () => {
    const cap = capture();
    const handlers = createCarePlanSideEffectHandlers({ auditLogger: cap.auditLogger });
    await handlers[HANDLER_NAMES.NOTIFY_FAMILY]({
      planVersion: { _id: 'x', status: 'approved' }, // neither marker present
      actor: null,
      metadata: {},
    });
    expect(cap.entries[0].entityType).toBe('CarePlanVersion');
  });
});
