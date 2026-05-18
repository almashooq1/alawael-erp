/**
 * access-review-templates-wave80.test.js — Wave 80.
 *
 * Tests the static template registry + pure resolver service. No DB,
 * no notifier — the registry is frozen constants and the resolver
 * is a filter function.
 *
 * Sections:
 *   1. Registry shape — every template has the required fields +
 *      well-formed filter
 *   2. listTemplates / getTemplate / hasTemplate
 *   3. resolveTemplate guards (TEMPLATE_NOT_FOUND, ACTORS_MUST_BE_ARRAY)
 *   4. Filter semantics — one test per filter clause
 *   5. Composite filter (multiple criteria AND-combined)
 *   6. Dormancy threshold passthrough on tier templates
 *   7. Suggested review type / cadence are returned with result
 */

'use strict';

const reg = require('../intelligence/access-review-templates.registry');
const accessReg = require('../intelligence/access-review.registry');
const {
  createAccessReviewTemplatesService,
} = require('../intelligence/access-review-templates.service');

// ─── 1. Registry shape ──────────────────────────────────────────────

describe('access-review-templates.registry — shape', () => {
  test('exposes 10 templates', () => {
    expect(reg.listTemplateIds().length).toBe(10);
  });

  test('every template has id / nameAr / nameEn / descriptionAr / reviewType / defaultCadence / filter', () => {
    for (const t of reg.listTemplates()) {
      expect(typeof t.id).toBe('string');
      expect(typeof t.nameAr).toBe('string');
      expect(typeof t.nameEn).toBe('string');
      expect(typeof t.descriptionAr).toBe('string');
      expect(accessReg.REVIEW_TYPES).toContain(t.reviewType);
      expect(Object.values(accessReg.CADENCE)).toContain(t.defaultCadence);
      expect(t.filter).toBeDefined();
      expect(typeof t.filter).toBe('object');
    }
  });

  test('dormancy templates expose thresholds', () => {
    for (const t of reg.listTemplates()) {
      if (t.reviewType === accessReg.REVIEW_TYPE.DORMANT) {
        expect(t.thresholds).toBeDefined();
        expect(typeof t.thresholds.dormantDays).toBe('number');
        expect(typeof t.thresholds.expiredDays).toBe('number');
        expect(typeof t.thresholds.retiredDays).toBe('number');
        expect(t.thresholds.dormantDays).toBeLessThan(t.thresholds.expiredDays);
        expect(t.thresholds.expiredDays).toBeLessThan(t.thresholds.retiredDays);
      }
    }
  });

  test('every template id is kebab-case', () => {
    for (const id of reg.listTemplateIds()) {
      expect(id).toMatch(/^[a-z][a-z0-9-]*$/);
    }
  });
});

// ─── 2. Helper API ──────────────────────────────────────────────────

describe('access-review-templates.registry — helpers', () => {
  test('getTemplate returns the template for a known id', () => {
    const t = reg.getTemplate('quarterly-clinical');
    expect(t).toBeDefined();
    expect(t.id).toBe('quarterly-clinical');
  });

  test('getTemplate returns null for unknown id', () => {
    expect(reg.getTemplate('made-up')).toBeNull();
  });

  test('hasTemplate boolean check', () => {
    expect(reg.hasTemplate('monthly-privileged')).toBe(true);
    expect(reg.hasTemplate('nope')).toBe(false);
  });
});

// ─── 3. Resolver guards ─────────────────────────────────────────────

describe('access-review-templates.service — guards', () => {
  const svc = createAccessReviewTemplatesService();

  test('rejects unknown templateId', () => {
    const res = svc.resolveTemplate({ templateId: 'made-up', actors: [] });
    expect(res.ok).toBe(false);
    expect(res.reason).toBe('TEMPLATE_NOT_FOUND');
  });

  test('rejects non-array actors', () => {
    const res = svc.resolveTemplate({ templateId: 'quarterly-clinical', actors: 'nope' });
    expect(res.ok).toBe(false);
    expect(res.reason).toBe('ACTORS_MUST_BE_ARRAY');
  });

  test('empty actor list returns empty matched + suggested review type', () => {
    const res = svc.resolveTemplate({ templateId: 'quarterly-clinical', actors: [] });
    expect(res.ok).toBe(true);
    expect(res.matched).toEqual([]);
    expect(res.total).toBe(0);
    expect(res.suggestedReviewType).toBe('quarterly');
    expect(res.suggestedCadence).toBe('quarterly');
  });
});

// ─── 4. Filter semantics — one per clause ──────────────────────────

describe('access-review-templates.service — filter clauses', () => {
  const svc = createAccessReviewTemplatesService({ now: () => new Date('2026-05-18T00:00:00Z') });

  test('roles clause (AT-LEAST-ONE match)', () => {
    const actors = [
      { userId: 'u1', roles: ['therapist'] }, // match (in template roles)
      { userId: 'u2', roles: ['ceo'] }, // no match
      { userId: 'u3', roles: ['receptionist', 'x'] }, // match
    ];
    const res = svc.resolveTemplate({ templateId: 'quarterly-clinical', actors });
    expect(res.total).toBe(2);
    expect(res.matched.map(a => a.userId)).toEqual(['u1', 'u3']);
  });

  test('highSensitivityOnly clause', () => {
    const actors = [
      { userId: 'u1', roles: ['ciso'] }, // HIGH
      { userId: 'u2', roles: ['therapist'] }, // not HIGH
      { userId: 'u3', roles: ['iam.role_granter'] }, // HIGH
    ];
    const res = svc.resolveTemplate({ templateId: 'monthly-privileged', actors });
    expect(res.total).toBe(2);
    expect(res.matched.map(a => a.userId)).toEqual(['u1', 'u3']);
  });

  test('scopes clause (HQ template)', () => {
    const actors = [
      { userId: 'u1', roles: ['x'], scope: 'GLOBAL' },
      { userId: 'u2', roles: ['x'], scope: 'BRANCH' },
      { userId: 'u3', roles: ['x'], scope: 'REGION' },
    ];
    const res = svc.resolveTemplate({ templateId: 'hq-recertification', actors });
    expect(res.total).toBe(2);
    expect(res.matched.map(a => a.userId).sort()).toEqual(['u1', 'u3']);
  });

  test('scopes clause (BRANCH template)', () => {
    const actors = [
      { userId: 'u1', roles: ['x'], scope: 'BRANCH' },
      { userId: 'u2', roles: ['x'], scope: 'GLOBAL' },
    ];
    const res = svc.resolveTemplate({ templateId: 'branch-attestation', actors });
    expect(res.total).toBe(1);
    expect(res.matched[0].userId).toBe('u1');
  });

  test('serviceAccountsOnly clause', () => {
    const actors = [
      { userId: 's1', roles: ['x'], isServiceAccount: true },
      { userId: 'u1', roles: ['x'], isServiceAccount: false },
      { userId: 's2', roles: ['x'], isServiceAccount: true },
    ];
    const res = svc.resolveTemplate({ templateId: 'service-accounts', actors });
    expect(res.total).toBe(2);
    expect(res.matched.map(a => a.userId).sort()).toEqual(['s1', 's2']);
  });

  test('tempElevatedOnly clause', () => {
    const actors = [
      { userId: 'e1', roles: ['x'], isTempElevated: true },
      { userId: 'u1', roles: ['x'], isTempElevated: false },
    ];
    const res = svc.resolveTemplate({ templateId: 'temp-elevated-weekly', actors });
    expect(res.total).toBe(1);
    expect(res.matched[0].userId).toBe('e1');
  });

  test('dormantAtLeastDays clause (standard 90)', () => {
    const FIXED = new Date('2026-05-18T00:00:00Z');
    const mk = days => new Date(FIXED.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
    const svc2 = createAccessReviewTemplatesService({ now: () => FIXED });
    const actors = [
      { userId: 'fresh', roles: ['x'], lastUsedAt: mk(10) }, // < 90, excluded
      { userId: 'dorm', roles: ['x'], lastUsedAt: mk(120) }, // ≥ 90, included
      { userId: 'no-date', roles: ['x'] }, // no lastUsedAt → daysSince=Infinity → included
    ];
    const res = svc2.resolveTemplate({ templateId: 'dormancy-standard', actors });
    expect(res.matched.map(a => a.userId).sort()).toEqual(['dorm', 'no-date']);
    // Dormancy template returns thresholds
    expect(res.dormancyThresholds).toEqual({ dormantDays: 90, expiredDays: 180, retiredDays: 365 });
  });
});

// ─── 5. Composite (multiple AND-combined filters) ──────────────────

describe('access-review-templates.service — composite filters', () => {
  test('aggressive-privileged = highSensitivityOnly + dormantAtLeastDays(30)', () => {
    const FIXED = new Date('2026-05-18T00:00:00Z');
    const mk = days => new Date(FIXED.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
    const svc = createAccessReviewTemplatesService({ now: () => FIXED });
    const actors = [
      // HIGH + 60 days dormant → match
      { userId: 'm1', roles: ['ciso'], lastUsedAt: mk(60) },
      // HIGH + 10 days (too fresh) → no match
      { userId: 'm2', roles: ['ciso'], lastUsedAt: mk(10) },
      // not HIGH + 60 days dormant → no match (fails highSensitivity)
      { userId: 'm3', roles: ['therapist'], lastUsedAt: mk(60) },
      // HIGH + no lastUsedAt → daysSince=Infinity → matches
      { userId: 'm4', roles: ['ciso'] },
    ];
    const res = svc.resolveTemplate({
      templateId: 'dormancy-aggressive-privileged',
      actors,
    });
    expect(res.matched.map(a => a.userId).sort()).toEqual(['m1', 'm4']);
    expect(res.dormancyThresholds).toEqual({ dormantDays: 30, expiredDays: 60, retiredDays: 120 });
  });
});

// ─── 6. Empty-filter template (mover) — passes everything through ──

describe('access-review-templates.service — empty-filter templates', () => {
  test('mover-event-driven matches all actors (no filter clauses)', () => {
    const svc = createAccessReviewTemplatesService();
    const actors = [
      { userId: 'u1', roles: ['x'] },
      { userId: 'u2', roles: ['y'] },
    ];
    const res = svc.resolveTemplate({ templateId: 'mover-event-driven', actors });
    expect(res.total).toBe(2);
    expect(res.suggestedReviewType).toBe('mover');
    expect(res.suggestedCadence).toBe('event-driven');
  });
});

// ─── 7. Suggested review type / cadence passthrough ────────────────

describe('access-review-templates.service — passthrough metadata', () => {
  const svc = createAccessReviewTemplatesService();

  test.each([
    ['quarterly-clinical', 'quarterly', 'quarterly'],
    ['monthly-privileged', 'privileged', 'monthly'],
    ['hq-recertification', 'hq', 'quarterly'],
    ['dormancy-standard', 'dormant', 'continuous'],
    ['temp-elevated-weekly', 'high-risk', 'weekly'],
    ['mover-event-driven', 'mover', 'event-driven'],
  ])('%s suggests reviewType=%s + cadence=%s', (id, type, cadence) => {
    const res = svc.resolveTemplate({ templateId: id, actors: [] });
    expect(res.ok).toBe(true);
    expect(res.suggestedReviewType).toBe(type);
    expect(res.suggestedCadence).toBe(cadence);
  });
});
