/**
 * alert-filters-wave14.test.js — Wave 14.
 *
 * Verifies the dashboard-specific query builders + PII masking layer.
 *
 *   1. Each filter returns the expected category / scope / tier
 *      shape.
 *   2. Branch scope is correctly applied per role tier:
 *      - cross-branch roles see no branch clause
 *      - region-scoped roles get $in: regionBranchIds[]
 *      - everyone else is pinned to user.activeBranchId
 *   3. Live-inbox base (resolvedAt + muted/snoozed) is present.
 *   4. PII masking redacts the documented fields at each viewer
 *      level and preserves everything else verbatim.
 */

'use strict';

const {
  executiveAlertFilter,
  branchAlertFilter,
  clinicalAlertFilter,
  hrAlertFilter,
  financeAlertFilter,
  qualityAlertFilter,
  dpoAlertFilter,
  assignedToMeFilter,
  branchScope,
  liveInboxBase,
  WIDE_PROJECTION,
  EXEC_PROJECTION,
  DPO_PROJECTION,
} = require('../alerts/filters.service');

const {
  maskAlertForViewer,
  maskAlertsForViewer,
  levelForRole,
  VIEWER_LEVELS,
} = require('../alerts/pii-masking.service');

// ─── branchScope helper ──────────────────────────────────────────
describe('branchScope', () => {
  test('cross-branch roles get no clause (null)', () => {
    for (const role of ['super_admin', 'head_office_admin', 'ceo', 'dpo']) {
      expect(branchScope({ role })).toBe(null);
    }
  });

  test('region-scoped roles use regionBranchIds[]', () => {
    const scope = branchScope({
      role: 'regional_director',
      regionBranchIds: ['b-1', 'b-2', 'b-3'],
    });
    expect(scope).toEqual({ branchId: { $in: ['b-1', 'b-2', 'b-3'] } });
  });

  test('regional role without regionBranchIds gets empty $in', () => {
    expect(branchScope({ role: 'regional_director' })).toEqual({ branchId: { $in: [] } });
  });

  test('ordinary role pins to activeBranchId then branchId fallback', () => {
    expect(branchScope({ role: 'manager', activeBranchId: 'b-active' })).toEqual({
      branchId: 'b-active',
    });
    expect(branchScope({ role: 'manager', branchId: 'b-default' })).toEqual({
      branchId: 'b-default',
    });
  });

  test('unauthenticated user gets a "match-nothing" scope', () => {
    expect(branchScope(null)).toEqual({ branchId: null });
  });
});

// ─── liveInboxBase ───────────────────────────────────────────────
describe('liveInboxBase', () => {
  test('always excludes resolved + muted-in-future + snoozed-in-future', () => {
    const now = new Date('2026-05-16T12:00:00Z');
    const base = liveInboxBase(now);
    expect(base.resolvedAt).toBe(null);
    expect(base.$and).toHaveLength(2);
    // Mute clause: null OR mutedUntil < now
    expect(base.$and[0].$or).toEqual([{ mutedUntil: null }, { mutedUntil: { $lt: now } }]);
    expect(base.$and[1].$or).toEqual([{ snoozeUntil: null }, { snoozeUntil: { $lt: now } }]);
  });
});

// ─── executiveAlertFilter ───────────────────────────────────────
describe('executiveAlertFilter', () => {
  test('returns tier-3 OR critical-platform-scope clause', () => {
    const { filter } = executiveAlertFilter({ role: 'ceo' });
    expect(filter.$or).toEqual([
      { 'escalation.currentTier': 3 },
      { severity: 'critical', scope: 'platform' },
    ]);
  });

  test('cross-branch role gets no branch clause', () => {
    const { filter } = executiveAlertFilter({ role: 'super_admin' });
    expect(filter.branchId).toBeUndefined();
  });

  test('non-cross-branch user is constrained to their branch', () => {
    const { filter } = executiveAlertFilter({ role: 'manager', branchId: 'b-1' });
    expect(filter.branchId).toBe('b-1');
  });

  test('uses EXEC_PROJECTION (no subject.id)', () => {
    const { projection } = executiveAlertFilter({ role: 'ceo' });
    expect(projection).toBe(EXEC_PROJECTION);
    expect(projection['subject.id']).toBeUndefined();
  });
});

// ─── branchAlertFilter ──────────────────────────────────────────
describe('branchAlertFilter', () => {
  test('returns live-inbox baseline + branch scope', () => {
    const { filter, projection } = branchAlertFilter({
      role: 'branch_manager',
      activeBranchId: 'b-1',
    });
    expect(filter.resolvedAt).toBe(null);
    expect(filter.branchId).toBe('b-1');
    expect(projection).toBe(WIDE_PROJECTION);
  });

  test('orders by severity DESC then tier DESC then lastSeen DESC', () => {
    const { sort } = branchAlertFilter({ role: 'manager' });
    expect(sort).toEqual({
      severity: -1,
      'escalation.currentTier': -1,
      lastSeenAt: -1,
    });
  });
});

// ─── clinicalAlertFilter ────────────────────────────────────────
describe('clinicalAlertFilter', () => {
  test('filters on category in [clinical, quality]', () => {
    const { filter } = clinicalAlertFilter({ role: 'clinical_director', branchId: 'b-1' });
    expect(filter.category).toEqual({ $in: ['clinical', 'quality'] });
  });

  test('orders by timePressure ASC (immediate first lexicographically)', () => {
    const { sort } = clinicalAlertFilter({ role: 'clinical_director' });
    expect(sort.timePressure).toBe(1);
  });
});

// ─── hrAlertFilter / financeAlertFilter / qualityAlertFilter ────
describe('domain-specific filters', () => {
  test('hr filter scopes to category=hr', () => {
    const { filter } = hrAlertFilter({ role: 'hr_manager' });
    expect(filter.category).toBe('hr');
  });

  test('finance filter scopes to category=financial', () => {
    const { filter } = financeAlertFilter({ role: 'accountant' });
    expect(filter.category).toBe('financial');
  });

  test('quality filter scopes to category=quality', () => {
    const { filter } = qualityAlertFilter({ role: 'quality_coordinator' });
    expect(filter.category).toBe('quality');
  });
});

// ─── dpoAlertFilter ─────────────────────────────────────────────
describe('dpoAlertFilter', () => {
  test('scopes to category=compliance without branch clause', () => {
    // DPO is cross-branch by Wave 0 design — the route layer guards
    // the role check, this builder just trusts it.
    const { filter } = dpoAlertFilter({ role: 'dpo' });
    expect(filter.category).toBe('compliance');
    expect(filter.branchId).toBeUndefined();
  });

  test('uses DPO_PROJECTION (subject.type only)', () => {
    const { projection } = dpoAlertFilter({ role: 'dpo' });
    expect(projection).toBe(DPO_PROJECTION);
    expect(projection['subject.id']).toBeUndefined();
    expect(projection['subject.type.type']).toBe(1);
  });

  test('orders by severity DESC then firstSeen ASC (SLA-at-risk first)', () => {
    const { sort } = dpoAlertFilter({ role: 'dpo' });
    expect(sort).toEqual({ severity: -1, firstSeenAt: 1 });
  });
});

// ─── assignedToMeFilter ─────────────────────────────────────────
describe('assignedToMeFilter', () => {
  test('returns match-nothing when user is missing', () => {
    expect(assignedToMeFilter(null).filter).toEqual({ _id: null });
    expect(assignedToMeFilter({}).filter).toEqual({ _id: null });
  });

  test('scopes to ownership.assignedTo + tier < 3 by default', () => {
    const { filter } = assignedToMeFilter({ id: 'u-1', role: 'manager' });
    expect(filter['ownership.assignedTo']).toBe('u-1');
    expect(filter['escalation.currentTier']).toEqual({ $lt: 3 });
  });

  test('opts.includeTier3=true drops the tier ceiling', () => {
    const { filter } = assignedToMeFilter({ id: 'u-1', role: 'manager' }, { includeTier3: true });
    expect(filter['escalation.currentTier']).toBeUndefined();
  });
});

// ─── PII masking — levelForRole ─────────────────────────────────
describe('pii-masking — levelForRole', () => {
  test('ceo/group_gm are executive level', () => {
    expect(levelForRole('ceo')).toBe(VIEWER_LEVELS.executive);
    expect(levelForRole('group_gm')).toBe(VIEWER_LEVELS.executive);
  });

  test('dpo is dpo level', () => {
    expect(levelForRole('dpo')).toBe(VIEWER_LEVELS.dpo);
  });

  test('admin/manager/branch_manager are branch_manager level', () => {
    expect(levelForRole('admin')).toBe(VIEWER_LEVELS.branch_manager);
    expect(levelForRole('branch_manager')).toBe(VIEWER_LEVELS.branch_manager);
  });

  test('super_admin is super_admin level', () => {
    expect(levelForRole('super_admin')).toBe(VIEWER_LEVELS.super_admin);
  });

  test('unknown role defaults to domain_specialist', () => {
    expect(levelForRole('therapist')).toBe(VIEWER_LEVELS.domain_specialist);
    expect(levelForRole('nurse')).toBe(VIEWER_LEVELS.domain_specialist);
  });
});

// ─── PII masking — maskAlertForViewer ───────────────────────────
describe('pii-masking — maskAlertForViewer', () => {
  function sampleAlert() {
    return {
      _id: 'a-1',
      ruleId: 'r',
      severity: 'critical',
      message: 'msg',
      subject: { type: { type: 'Beneficiary' }, id: 'b-1' },
      ownership: {
        assignedTo: 'u-assignee',
        assignedAt: new Date('2026-05-16'),
        assignedBy: 'u-assigner',
      },
      ackedBy: 'u-ack',
      resolvedBy: 'u-res',
      muteReason: 'duplicated of jira PROD-1234',
      comments: [
        { byUserId: 'u-c1', byRole: 'manager', text: 'hello', at: new Date() },
        { byUserId: 'u-c2', byRole: 'supervisor', text: 'world', at: new Date() },
      ],
    };
  }

  test('returns a NEW object (no mutation of input)', () => {
    const original = sampleAlert();
    const masked = maskAlertForViewer(original, { role: 'ceo' });
    expect(masked).not.toBe(original);
    // Original still has subject.id
    expect(original.subject.id).toBe('b-1');
  });

  test('executive viewer loses subject.id + assignment ids', () => {
    const masked = maskAlertForViewer(sampleAlert(), { role: 'ceo' });
    expect(masked.subject.id).toBeUndefined();
    expect(masked.subject.type.type).toBe('Beneficiary'); // preserved
    expect(masked.ownership.assignedTo).toBeUndefined();
    expect(masked.ownership.assignedBy).toBeUndefined();
    expect(masked.ackedBy).toBeUndefined();
    expect(masked.resolvedBy).toBeUndefined();
    expect(masked.muteReason).toBe('[REDACTED]'); // masked, not deleted
    // Comments lose their user IDs but keep text/role
    expect(masked.comments[0].byUserId).toBeUndefined();
    expect(masked.comments[0].text).toBe('hello');
    expect(masked.comments[0].byRole).toBe('manager');
  });

  test('dpo viewer also loses subject.id (same level as executive on this rule)', () => {
    const masked = maskAlertForViewer(sampleAlert(), { role: 'dpo' });
    expect(masked.subject.id).toBeUndefined();
  });

  test('branch_manager viewer sees everything (level == minLevel of every rule)', () => {
    const masked = maskAlertForViewer(sampleAlert(), { role: 'branch_manager' });
    expect(masked.subject.id).toBe('b-1');
    expect(masked.ownership.assignedTo).toBe('u-assignee');
    expect(masked.muteReason).toBe('duplicated of jira PROD-1234');
    expect(masked.comments[0].byUserId).toBe('u-c1');
  });

  test('super_admin viewer sees every PII field unredacted', () => {
    // Note: we don't compare the whole object because JSON round-trip
    // serializes Dates as strings. We check the *sensitive fields*
    // stay intact — that's the contract this test guards.
    const masked = maskAlertForViewer(sampleAlert(), { role: 'super_admin' });
    expect(masked.subject.id).toBe('b-1');
    expect(masked.ownership.assignedTo).toBe('u-assignee');
    expect(masked.ownership.assignedBy).toBe('u-assigner');
    expect(masked.ackedBy).toBe('u-ack');
    expect(masked.resolvedBy).toBe('u-res');
    expect(masked.muteReason).toBe('duplicated of jira PROD-1234');
    expect(masked.comments[0].byUserId).toBe('u-c1');
    expect(masked.comments[1].byUserId).toBe('u-c2');
  });

  test('therapist (domain_specialist level) sees everything in their domain', () => {
    const masked = maskAlertForViewer(sampleAlert(), { role: 'therapist' });
    expect(masked.subject.id).toBe('b-1'); // they're allowed full alert payload
  });

  test('null / undefined alert is returned as-is', () => {
    expect(maskAlertForViewer(null, { role: 'ceo' })).toBe(null);
    expect(maskAlertForViewer(undefined, { role: 'ceo' })).toBe(undefined);
  });

  test('alert with no comments array doesnt crash', () => {
    const base = { _id: 'a', subject: { id: 'b' } };
    const masked = maskAlertForViewer(base, { role: 'ceo' });
    expect(masked.subject.id).toBeUndefined();
  });
});

// ─── PII masking — maskAlertsForViewer (array form) ─────────────
describe('pii-masking — maskAlertsForViewer (array)', () => {
  test('maps each alert through the masker', () => {
    const alerts = [
      { _id: 'a1', subject: { id: 'b1' } },
      { _id: 'a2', subject: { id: 'b2' } },
    ];
    const masked = maskAlertsForViewer(alerts, { role: 'ceo' });
    expect(masked).toHaveLength(2);
    expect(masked[0].subject.id).toBeUndefined();
    expect(masked[1].subject.id).toBeUndefined();
  });

  test('non-array input returns []', () => {
    expect(maskAlertsForViewer(null, { role: 'ceo' })).toEqual([]);
    expect(maskAlertsForViewer({}, { role: 'ceo' })).toEqual([]);
  });
});
