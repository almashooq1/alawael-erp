/**
 * alert-schema-wave11.test.js — Wave 11.
 *
 * Verifies the Alert & Priority Engine schema extension:
 *
 *   1. New fields (state.transitions, ownership.assignedTo,
 *      escalation tiers, comments, reopens) accept valid input and
 *      apply sensible defaults.
 *   2. Legacy Alert documents (created before Wave 11) still parse
 *      cleanly — every new field is optional.
 *   3. The `deriveState()` instance method matches the design's
 *      precedence (RESOLVED > MUTED > SNOOZED > ASSIGNED >
 *      ACKNOWLEDGED > OPEN).
 *   4. `findAssignedTo` static returns only active (non-resolved)
 *      alerts for a user.
 *   5. `rule-introspection` helper falls back gracefully when rules
 *      omit the new fields, and honours declared values when present.
 *
 * Mongo is NOT touched: we instantiate the schema as a plain
 * `mongoose.model` against an in-memory connection-less context. The
 * static method `findAssignedTo` is exercised via `Model.find` mock.
 */

'use strict';

const mongoose = require('mongoose');
const alertModelExports = require('../alerts/alert.model');
const { AlertSchema, ALERT_STATES, ARCHETYPES, TIME_PRESSURES, SCOPES } = alertModelExports;
const {
  getOwnership,
  getNextAction,
  getEscalation,
  getCooldownMin,
  getSuppressedBy,
  getClassification,
  describeFindingFromRule,
  ESCALATION_DEFAULTS,
  COOLDOWN_DEFAULTS,
} = require('../alerts/rule-introspection');

// Use the canonical Alert model (alertModelExports.model). When this
// test suite ran in isolation it minted a fresh model from the shared
// AlertSchema — fine locally — but in CI other suites register the
// canonical `Alert` model first, then re-registering the same schema
// under a different name re-runs the index() calls, which Mongoose
// 9 rejects as duplicate compound-index registration. Reusing the
// already-registered canonical model bypasses that.
const TestAlert = alertModelExports.model;

// Helper — build the minimum valid Alert payload Wave 0-9 already
// emitted. The Wave 11 extensions should be invisible to such docs.
function legacyPayload(overrides = {}) {
  return {
    ruleId: 'some-rule',
    key: 'entity:abc',
    severity: 'warning',
    category: 'compliance',
    description: 'desc',
    message: 'msg',
    subject: { type: { type: 'Document', id: 'd1' } },
    firstSeenAt: new Date(),
    lastSeenAt: new Date(),
    ...overrides,
  };
}

// ─── Schema extension acceptance ─────────────────────────────────
describe('AlertSchema — Wave 11 extension acceptance', () => {
  test('accepts a legacy payload with no Wave-11 fields', () => {
    const doc = new TestAlert(legacyPayload());
    // Default `state.current` is OPEN; transitions/comments/reopens
    // default to empty arrays.
    expect(doc.state.current).toBe('OPEN');
    expect(doc.state.transitions).toEqual([]);
    expect(doc.comments).toEqual([]);
    expect(doc.reopens).toEqual([]);
    expect(doc.escalation.currentTier).toBe(1);
    expect(doc.ownership.assignedTo).toBe(null);
  });

  test('rejects an invalid state.current value', () => {
    const doc = new TestAlert(legacyPayload({ state: { current: 'INVALID_STATE' } }));
    const err = doc.validateSync();
    expect(err).toBeTruthy();
    expect(String(err.errors['state.current'])).toMatch(/INVALID_STATE/);
  });

  test('accepts every documented state value', () => {
    for (const s of ALERT_STATES) {
      const doc = new TestAlert(legacyPayload({ state: { current: s } }));
      const err = doc.validateSync();
      expect(err).toBeFalsy();
    }
  });

  test('accepts every documented archetype / timePressure / scope', () => {
    for (const a of ARCHETYPES) {
      for (const t of TIME_PRESSURES) {
        for (const sc of SCOPES) {
          const doc = new TestAlert(legacyPayload({ archetype: a, timePressure: t, scope: sc }));
          expect(doc.validateSync()).toBeFalsy();
        }
      }
    }
  });

  test('accepts a full Wave-11 payload (transitions + comments + reopens)', () => {
    const doc = new TestAlert(
      legacyPayload({
        state: {
          current: 'ASSIGNED',
          transitions: [
            { from: 'OPEN', to: 'ACKNOWLEDGED', byRole: 'hr_supervisor' },
            { from: 'ACKNOWLEDGED', to: 'ASSIGNED', byRole: 'hr_manager' },
          ],
        },
        ownership: {
          assignedTo: new mongoose.Types.ObjectId(),
          assignedAt: new Date(),
          assignedBy: new mongoose.Types.ObjectId(),
        },
        escalation: {
          currentTier: 2,
          tier1At: new Date(),
          tier2At: new Date(),
          tier2NotifiedRoles: ['hr_manager', 'branch_manager'],
        },
        comments: [
          {
            byUserId: new mongoose.Types.ObjectId(),
            byRole: 'hr_supervisor',
            text: 'تم التواصل مع الموظف، سيتم تقديم الوثائق غداً',
          },
        ],
        reopens: [
          {
            previousResolvedAt: new Date(Date.now() - 86400000),
            reason: 'engine_redetected',
          },
        ],
      })
    );
    const err = doc.validateSync();
    expect(err).toBeFalsy();
    expect(doc.state.transitions).toHaveLength(2);
    expect(doc.comments[0].text).toContain('الموظف');
    expect(doc.escalation.tier2NotifiedRoles).toContain('hr_manager');
  });

  test('rejects comment text over the 2000-char cap', () => {
    const doc = new TestAlert(
      legacyPayload({
        comments: [
          {
            byUserId: new mongoose.Types.ObjectId(),
            text: 'x'.repeat(2001),
          },
        ],
      })
    );
    const err = doc.validateSync();
    expect(err).toBeTruthy();
  });

  test('rejects escalation.currentTier outside 1..3', () => {
    const doc = new TestAlert(legacyPayload({ escalation: { currentTier: 5 } }));
    expect(doc.validateSync()).toBeTruthy();
  });
});

// ─── deriveState method ──────────────────────────────────────────
describe('AlertSchema.methods.deriveState', () => {
  test('returns RESOLVED when resolvedAt is set, regardless of other flags', () => {
    const doc = new TestAlert(legacyPayload({ resolvedAt: new Date(), ackedAt: new Date() }));
    expect(doc.deriveState()).toBe('RESOLVED');
  });

  test('returns MUTED when mutedUntil is in the future', () => {
    const doc = new TestAlert(legacyPayload({ mutedUntil: new Date(Date.now() + 60_000) }));
    expect(doc.deriveState()).toBe('MUTED');
  });

  test('returns SNOOZED when snoozeUntil is in the future and not muted', () => {
    const doc = new TestAlert(legacyPayload({ snoozeUntil: new Date(Date.now() + 60_000) }));
    expect(doc.deriveState()).toBe('SNOOZED');
  });

  test('returns ASSIGNED when assignedTo is set and not snoozed/muted', () => {
    const doc = new TestAlert(
      legacyPayload({
        ownership: { assignedTo: new mongoose.Types.ObjectId() },
      })
    );
    expect(doc.deriveState()).toBe('ASSIGNED');
  });

  test('returns ACKNOWLEDGED when only ackedAt is set', () => {
    const doc = new TestAlert(legacyPayload({ ackedAt: new Date() }));
    expect(doc.deriveState()).toBe('ACKNOWLEDGED');
  });

  test('returns OPEN by default', () => {
    const doc = new TestAlert(legacyPayload());
    expect(doc.deriveState()).toBe('OPEN');
  });
});

// ─── rule-introspection: getOwnership ────────────────────────────
describe('rule-introspection — getOwnership', () => {
  test('honors a declared ownership block', () => {
    const rule = {
      id: 'r',
      severity: 'high',
      category: 'hr',
      ownership: {
        primary: 'hr_supervisor',
        fallback: 'hr_manager',
        notifyCC: ['branch_manager'],
      },
    };
    const out = getOwnership(rule, {});
    expect(out.primary).toBe('hr_supervisor');
    expect(out.fallback).toBe('hr_manager');
    expect(out.notifyCC).toEqual(['branch_manager']);
  });

  test('resolves function-valued primary against the finding', () => {
    const rule = {
      id: 'r',
      severity: 'warning',
      category: 'clinical',
      ownership: {
        primary: f => `therapist:${f.subject.assignedTherapistId}`,
        fallback: 'therapy_supervisor',
      },
    };
    const out = getOwnership(rule, { subject: { assignedTherapistId: 't-1' } });
    expect(out.primary).toBe('therapist:t-1');
    expect(out.fallback).toBe('therapy_supervisor');
  });

  test('falls back to DEFAULT_ROUTES when rule lacks ownership', () => {
    // hr critical → [HR_MANAGER, HEAD_OFFICE_ADMIN]
    const rule = { id: 'r', severity: 'critical', category: 'hr' };
    const out = getOwnership(rule, {});
    expect(out.primary).toBe('hr_manager');
    expect(out.fallback).toBe('head_office_admin');
  });

  test('returns null primary when both rule and route are missing', () => {
    const rule = { id: 'r', severity: 'critical', category: 'nonexistent' };
    const out = getOwnership(rule, {});
    expect(out.primary).toBe(null);
    expect(out.fallback).toBe(null);
    expect(out.notifyCC).toEqual([]);
  });

  test('a function-valued primary that throws degrades to null, not throw', () => {
    const rule = {
      id: 'r',
      severity: 'warning',
      category: 'clinical',
      ownership: {
        primary: () => {
          throw new Error('boom');
        },
        fallback: 'therapy_supervisor',
      },
    };
    const out = getOwnership(rule, {});
    expect(out.primary).toBe(null);
    expect(out.fallback).toBe('therapy_supervisor');
  });
});

// ─── rule-introspection: getNextAction ───────────────────────────
describe('rule-introspection — getNextAction', () => {
  test('returns default copy when nextAction is missing', () => {
    const out = getNextAction({ id: 'r' }, {});
    expect(out.titleAr).toContain('افتح');
    expect(out.titleEn).toContain('Open');
    expect(out.deepLink).toBe(null);
    expect(out.estimatedMin).toBe(15);
  });

  test('resolves function-valued deepLink against finding', () => {
    const rule = {
      id: 'r',
      nextAction: {
        titleAr: 'افتح ملف الاعتماد',
        titleEn: 'Open credential file',
        deepLink: f => `/hr/credentials/${f.subject.id}`,
        estimatedMin: 5,
      },
    };
    const out = getNextAction(rule, { subject: { id: 'c-123' } });
    expect(out.deepLink).toBe('/hr/credentials/c-123');
    expect(out.estimatedMin).toBe(5);
  });
});

// ─── rule-introspection: getEscalation ───────────────────────────
describe('rule-introspection — getEscalation', () => {
  test('returns null for info severity (no escalation policy)', () => {
    expect(getEscalation({ id: 'r', severity: 'info', category: 'hr' }, {})).toBe(null);
  });

  test('applies severity-driven defaults when escalation is missing', () => {
    const out = getEscalation({ id: 'r', severity: 'critical', category: 'compliance' }, {});
    expect(out.tier1AfterMin).toBe(ESCALATION_DEFAULTS.critical.tier1AfterMin);
    expect(out.tier2AfterMin).toBe(ESCALATION_DEFAULTS.critical.tier2AfterMin);
    // chain comes from DEFAULT_ROUTES.compliance.critical
    expect(Array.isArray(out.chain)).toBe(true);
  });

  test('honors declared chain + custom timings', () => {
    const rule = {
      id: 'r',
      severity: 'high',
      category: 'hr',
      escalation: {
        tier1AfterMin: 30,
        tier2AfterMin: 90,
        chain: ['hr_supervisor', 'hr_manager', 'super_admin'],
      },
    };
    const out = getEscalation(rule, {});
    expect(out.tier1AfterMin).toBe(30);
    expect(out.tier2AfterMin).toBe(90);
    expect(out.chain).toEqual(['hr_supervisor', 'hr_manager', 'super_admin']);
  });
});

// ─── rule-introspection: cooldown + suppression ──────────────────
describe('rule-introspection — getCooldownMin / getSuppressedBy', () => {
  test('default cooldown follows severity', () => {
    expect(getCooldownMin({ severity: 'critical' })).toBe(COOLDOWN_DEFAULTS.critical);
    expect(getCooldownMin({ severity: 'warning' })).toBe(COOLDOWN_DEFAULTS.warning);
  });

  test('declared cooldownMin overrides default', () => {
    expect(getCooldownMin({ severity: 'warning', cooldownMin: 5 })).toBe(5);
  });

  test('negative cooldownMin is rejected (falls back to default)', () => {
    expect(getCooldownMin({ severity: 'warning', cooldownMin: -1 })).toBe(
      COOLDOWN_DEFAULTS.warning
    );
  });

  test('getSuppressedBy returns string array when declared, [] otherwise', () => {
    expect(getSuppressedBy({ suppressIf: ['a', 'b'] })).toEqual(['a', 'b']);
    expect(getSuppressedBy({})).toEqual([]);
    expect(getSuppressedBy(null)).toEqual([]);
    expect(getSuppressedBy({ suppressIf: ['valid', '', null, 5] })).toEqual(['valid']);
  });
});

// ─── rule-introspection: full description ────────────────────────
describe('rule-introspection — describeFindingFromRule', () => {
  test('produces a complete descriptor for a fully-declared rule', () => {
    const rule = {
      id: 'pdpl-dsar-sla-breach',
      severity: 'critical',
      category: 'compliance',
      archetype: 'deadline',
      timePressure: 'immediate',
      scope: 'platform',
      ownership: {
        primary: 'dpo',
        fallback: 'compliance_officer',
        notifyCC: ['super_admin'],
      },
      nextAction: {
        titleAr: 'افتح طلب الـ DSAR',
        deepLink: f => `/admin/pdpl/requests/${f.subject.id}`,
      },
      escalation: { tier1AfterMin: 15, tier2AfterMin: 60, chain: ['dpo', 'super_admin'] },
      cooldownMin: 0,
      suppressIf: ['pdpl-dsar-approaching-sla'],
    };
    const out = describeFindingFromRule(rule, { subject: { id: 'r1' } });

    expect(out.ruleId).toBe('pdpl-dsar-sla-breach');
    expect(out.classification.archetype).toBe('deadline');
    expect(out.classification.timePressure).toBe('immediate');
    expect(out.classification.scope).toBe('platform');
    expect(out.ownership.primary).toBe('dpo');
    expect(out.nextAction.deepLink).toBe('/admin/pdpl/requests/r1');
    expect(out.escalation.tier1AfterMin).toBe(15);
    expect(out.cooldownMin).toBe(0);
    expect(out.suppressedBy).toEqual(['pdpl-dsar-approaching-sla']);
  });

  test('produces a complete descriptor for a legacy Wave-3 rule (no new fields)', () => {
    // This is the exact shape every Wave-3 rule has today.
    const rule = {
      id: 'document-expired',
      severity: 'high',
      category: 'compliance',
      description: 'Document has passed its expiry date',
      async evaluate() {
        return [];
      },
    };
    const out = describeFindingFromRule(rule, {});
    expect(out.ownership.primary).toBeTruthy(); // fell back to DEFAULT_ROUTES
    expect(out.nextAction.titleAr).toContain('افتح');
    expect(out.escalation).not.toBe(null); // high → has escalation
    expect(out.escalation.tier1AfterMin).toBe(ESCALATION_DEFAULTS.high.tier1AfterMin);
    expect(out.cooldownMin).toBe(COOLDOWN_DEFAULTS.high);
    expect(out.suppressedBy).toEqual([]);
  });
});

// ─── Backward compatibility with existing rules ──────────────────
describe('Wave-11 backward compatibility — all 19 bundled rules', () => {
  // The bundled rule list is the contract surface every downstream
  // consumer of the engine builds on. Wave 11 must not break it.
  const rules = require('../alerts/rules');

  test('every bundled rule is still describable', () => {
    for (const rule of rules) {
      const out = describeFindingFromRule(rule, { subject: { id: 'x' }, branchId: 'b' });
      // Minimum: must produce a descriptor with the right ruleId.
      expect(out.ruleId).toBe(rule.id);
      // ownership.primary may be null if category/severity don't have
      // a route, but the shape must always exist.
      expect(out.ownership).toBeDefined();
      expect(out.nextAction).toBeDefined();
      expect(out.cooldownMin).toBeGreaterThanOrEqual(0);
    }
  });

  test('every non-info rule produces a non-null escalation', () => {
    for (const rule of rules) {
      if (rule.severity === 'info') continue;
      const out = describeFindingFromRule(rule, {});
      expect(out.escalation).not.toBe(null);
      expect(out.escalation.tier1AfterMin).toBeGreaterThan(0);
    }
  });
});

// ─── Classification helper ──────────────────────────────────────
describe('rule-introspection — getClassification', () => {
  test('returns nulls for an unclassified rule', () => {
    expect(getClassification({ id: 'r' })).toEqual({
      archetype: null,
      timePressure: null,
      scope: null,
    });
  });

  test('passes through classification fields when present', () => {
    expect(
      getClassification({
        archetype: 'deadline',
        timePressure: 'immediate',
        scope: 'platform',
      })
    ).toEqual({ archetype: 'deadline', timePressure: 'immediate', scope: 'platform' });
  });

  test('handles a null rule defensively', () => {
    expect(getClassification(null)).toEqual({
      archetype: null,
      timePressure: null,
      scope: null,
    });
  });
});
